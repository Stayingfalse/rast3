import { promises as dns } from "node:dns";
import net from "node:net";
import tls from "node:tls";

/**
 * Where the connection to the mail server stops (20 Nov). Since 00:24 UTC
 * on 20 Nov every hourly check ended "Connection closed unexpectedly" before
 * the server's greeting, so nodemailer can't say why. This opens plain
 * sockets to each of the server's addresses, on its port and on the other
 * Gmail port (587 ↔ 465), and records what happens: the greeting, a hang-up,
 * a reset or a timeout. On port 587 it also says EHLO, so the reply shows
 * the address the server sees us connecting from. Sends no login and no mail.
 */
export type ProbeOutcome = "greeting" | "closed" | "reset" | "refused" | "timeout" | "error";
export type ProbeAttempt = {
  address: string;
  family: 4 | 6;
  port: number;
  tls: boolean;
  outcome: ProbeOutcome;
  /** time to the outcome */
  ms: number;
  /** the server's first line, when it sent one */
  greeting?: string;
  /** the EHLO reply's first line (Gmail names the address it sees) */
  ehlo?: string;
  error?: string;
};
export type ProbeResult = {
  host: string;
  port: number;
  dns: { v4: string[] | string; v6: string[] | string };
  attempts: ProbeAttempt[];
};

const TIMEOUT = 10_000;
const clip = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 200);

function attempt(address: string, family: 4 | 6, port: number, host: string): Promise<ProbeAttempt> {
  const useTls = port === 465;
  const started = Date.now();
  return new Promise((resolve) => {
    let buffer = "";
    let greeting: string | undefined;
    let done = false;
    const finish = (outcome: ProbeOutcome, extra: Partial<ProbeAttempt> = {}) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      resolve({ address, family, port, tls: useTls, outcome, ms: Date.now() - started, greeting, ...extra });
    };
    const socket: net.Socket = useTls
      ? tls.connect({ host: address, port, servername: host })
      : net.connect({ host: address, port });
    const timer = setTimeout(() => finish("timeout"), TIMEOUT);
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      if (!greeting) {
        const end = buffer.indexOf("\n");
        if (end < 0) return;
        greeting = clip(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
        if (!greeting.startsWith("220") || useTls) {
          socket.write("QUIT\r\n");
          return finish("greeting");
        }
        socket.write("EHLO probe.raosanta.uk\r\n");
        return;
      }
      const end = buffer.indexOf("\n");
      if (end < 0) return;
      socket.write("QUIT\r\n");
      finish("greeting", { ehlo: clip(buffer.slice(0, end)) });
    });
    socket.on("end", () => finish(greeting ? "greeting" : "closed"));
    socket.on("close", () => finish(greeting ? "greeting" : "closed"));
    socket.on("error", (e: NodeJS.ErrnoException) => {
      const outcome: ProbeOutcome =
        e.code === "ECONNRESET" ? "reset" : e.code === "ECONNREFUSED" ? "refused" : "error";
      finish(outcome, { error: clip(`${e.code ?? ""} ${e.message}`) });
    });
  });
}

const lookup = async (family: 4 | 6, host: string) => {
  try {
    return await (family === 4 ? dns.resolve4(host) : dns.resolve6(host));
  } catch (e) {
    // as nodemailer does: the system's lookup (hosts file) when DNS has none
    try {
      const found = await dns.lookup(host, { family, all: true });
      if (found.length) return found.map((f) => f.address);
    } catch {}
    return (e as NodeJS.ErrnoException).code ?? String(e);
  }
};

/** Probes host:port (and the other Gmail port for comparison). Never throws. */
export async function probeSmtp(host: string, port: number): Promise<ProbeResult> {
  const [v4, v6] = await Promise.all([lookup(4, host), lookup(6, host)]);
  const ports = port === 587 || port === 465 ? [port, port === 587 ? 465 : 587] : [port];
  const targets: { address: string; family: 4 | 6; port: number }[] = [];
  if (Array.isArray(v4)) for (const a of v4.slice(0, 2)) targets.push({ address: a, family: 4, port });
  if (Array.isArray(v6)) for (const a of v6.slice(0, 1)) targets.push({ address: a, family: 6, port });
  const first = Array.isArray(v4) ? v4[0] : undefined;
  if (first && ports[1]) targets.push({ address: first, family: 4, port: ports[1] });
  const attempts = await Promise.all(targets.map((t) => attempt(t.address, t.family, t.port, host)));
  return { host, port, dns: { v4, v6 }, attempts };
}

/** One line for a log: "587 v4 closed · 587 v6 timeout · 465 v4 greeting". */
export function probeSummary(p: ProbeResult) {
  if (!p.attempts.length) return `no addresses (v4: ${String(p.dns.v4)}, v6: ${String(p.dns.v6)})`;
  return p.attempts.map((a) => `${a.port} v${a.family} ${a.outcome}`).join(" · ");
}
