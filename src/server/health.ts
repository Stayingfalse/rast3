import { readFile } from "node:fs/promises";

import { db } from "~/server/db";

/** Outcome of the startup schema sync (written by docker-entrypoint.sh). */
export async function getSchemaSync() {
  try {
    return JSON.parse(await readFile("/tmp/schema-sync.json", "utf8")) as {
      mode?: string;
      result?: string;
      at?: string;
    };
  } catch {
    return null;
  }
}

/**
 * Prisma migration history: applied count, latest applied migration, and every
 * row with its state (so leftovers from older tooling are visible). null when
 * the _prisma_migrations table doesn't exist.
 */
export async function getMigrations() {
  try {
    const rows = await db.$queryRaw<
      { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
    >`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations
      ORDER BY started_at DESC LIMIT 50`;
    const history = rows.map((r) => ({
      name: r.migration_name,
      state: r.rolled_back_at ? "rolled-back" : r.finished_at ? "applied" : "failed",
    }));
    const applied = history.filter((r) => r.state === "applied");
    return { applied: applied.length, latest: applied[0]?.name ?? null, history };
  } catch {
    return null;
  }
}

/** When this server process started (CI uses it to spot a new build). */
export const processStartedAt = () =>
  new Date(Date.now() - process.uptime() * 1000).toISOString();
