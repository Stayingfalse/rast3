import { randomBytes } from "node:crypto";
import { db } from "~/server/db";

/** Join codes: 8 characters with no look-alikes (no 0/O, 1/I/L), shown as XXXX-XXXX. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newJoinCode(): string {
  return Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Accepts "abcd-efgh", "ABCD EFGH" or a pasted invite link. */
export function normaliseJoinCode(input: string): string {
  const last = input.trim().split("/").filter(Boolean).pop() ?? "";
  return last.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const formatJoinCode = (code: string) =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

export const invitePath = (code: string) => `/join/${code}`;

/** Friends and community groups people can be invited to. */
export const INVITE_KINDS = ["FRIENDS", "COMMUNITY"] as const;

/** Public details shown on an invite page; null if the code isn't usable. */
export async function findInvite(rawCode: string) {
  const joinCode = normaliseJoinCode(rawCode);
  if (joinCode.length !== 8) return null;
  const group = await db.group.findUnique({
    where: { joinCode },
    select: {
      id: true,
      name: true,
      kind: true,
      status: true,
      _count: { select: { memberships: true } },
    },
  });
  if (
    !group ||
    group.status === "DISABLED" ||
    !(INVITE_KINDS as readonly string[]).includes(group.kind)
  ) {
    return null;
  }
  return {
    id: group.id,
    name: group.name,
    kind: group.kind as (typeof INVITE_KINDS)[number],
    status: group.status,
    members: group._count.memberships,
    joinCode,
  };
}
