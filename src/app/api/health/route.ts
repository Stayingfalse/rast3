import { readFile } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

/** Outcome of the startup schema sync (written by docker-entrypoint.sh). */
async function getSchemaSync() {
  try {
    return JSON.parse(await readFile("/tmp/schema-sync.json", "utf8")) as unknown;
  } catch {
    return null;
  }
}

/**
 * Prisma migration history: applied count, latest applied migration, and every
 * row with its state (so leftovers from older tooling are visible). null when
 * the _prisma_migrations table doesn't exist.
 */
async function getMigrations() {
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

export async function GET(_req: NextRequest) {
  try {
    // Test database connection
    const userCount = await db.user.count();
    const departmentCount = await db.department.count();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        users: userCount,
        departments: departmentCount,
      },
      migrations: await getMigrations(),
      schemaSync: await getSchemaSync(),
      environment: process.env.NODE_ENV,
      // CI waits for a start time after its deploy call to know the new build is live
      process: {
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: String(error),
        environment: process.env.NODE_ENV,
      },
      { status: 500 },
    );
  }
}
