import type { Prisma } from "@prisma/client";

import { maskEmail } from "~/server/work-email";

/**
 * Error details for logs and admin screens (19 Nov): what an error says,
 * including the extra fields mail servers and Auth.js add, cleaned so it can
 * be shown or sent to the log service. Secrets are dropped by key, email
 * addresses masked and long text cut.
 */
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
