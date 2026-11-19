import type { AppLogLevel, Prisma, PrismaClient } from "@prisma/client";

import { db } from "~/server/db";
import { maskEmail } from "~/server/work-email";
import { createChildLogger } from "~/utils/logger";

/**
 * Our own log (owner, 19 Nov). The host's log collection is a paid extra,
 * so the errors that matter are kept in the database for site admins
 * (Admin › Logs) as well as printed. Writing one never throws and never
 * slows the caller down for long. Kept 30 days (deleteOldAppLogs).
 *
 * Detail is cleaned before it's stored: anything under a key that looks
 * like a secret is dropped, email addresses are masked, long strings are
 * cut and deep objects flattened.
 */
const log = createChildLogger("app-log");

export const APP_LOG_DAYS = 30;
const MAX_STRING = 2000;
const MAX_DEPTH = 4;
const SECRET_KEY = /pass|secret|token|apikey|api_key|authorization|cookie|credential|refresh|access/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Masks email addresses and cuts long text. */
export const cleanText = (s: string) => {
  const masked = s.replace(EMAIL, (m) => maskEmail(m));
  return masked.length > MAX_STRING ? `${masked.slice(0, MAX_STRING)}…` : masked;
};

/** A JSON-safe copy of `value` with secrets dropped and emails masked. */
export function clean(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return clean(errorDetail(value), depth);
  if (depth >= MAX_DEPTH) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => clean(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      out[k] = SECRET_KEY.test(k) ? "[removed]" : clean(v, depth + 1);
    }
    return out;
  }
  // functions and symbols: just their kind
  return `[${typeof value}]`;
}

/**
 * What an error says, including the extra fields mail servers and Auth.js
 * add (a code, the server's reply, the command it failed on, the cause).
 */
export function errorDetail(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: String(error) };
  const e = error as Error & {
    code?: unknown;
    responseCode?: unknown;
    response?: unknown;
    command?: unknown;
    type?: unknown;
    cause?: unknown;
  };
  return {
    name: e.name,
    message: e.message,
    ...(e.code !== undefined ? { code: e.code } : {}),
    ...(e.responseCode !== undefined ? { responseCode: e.responseCode } : {}),
    ...(e.response !== undefined ? { response: e.response } : {}),
    ...(e.command !== undefined ? { command: e.command } : {}),
    ...(e.type !== undefined ? { type: e.type } : {}),
    ...(e.cause !== undefined
      ? { cause: e.cause instanceof Error ? errorDetail(e.cause) : e.cause }
      : {}),
  };
}

/** Records an entry. Never throws; a failure to record is only printed. */
export async function appLog(
  level: AppLogLevel,
  area: string,
  message: string,
  detail?: unknown,
  client: Pick<PrismaClient, "appLog"> = db,
) {
  const data = {
    level,
    area: area.slice(0, 40),
    message: cleanText(message).slice(0, 500),
    ...(detail !== undefined ? { detail: clean(detail) ?? undefined } : {}),
  };
  const print = level === "ERROR" ? log.error.bind(log) : level === "WARN" ? log.warn.bind(log) : log.info.bind(log);
  print({ area: data.area, detail: data.detail }, data.message);
  try {
    await client.appLog.create({ data });
  } catch (error) {
    log.error({ error: error instanceof Error ? error.message : String(error) }, "Could not record an app log entry");
  }
}

/** Deletes entries older than APP_LOG_DAYS. Runs with the hourly schedule. */
export async function deleteOldAppLogs(client: Pick<PrismaClient, "appLog"> = db, now = new Date()) {
  const cutoff = new Date(now.getTime() - APP_LOG_DAYS * 24 * 3600_000);
  const { count } = await client.appLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return { deleted: count, cutoff };
}
