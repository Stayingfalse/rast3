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

/** Latest applied Prisma migration, or null if migrations aren't in use yet. */
async function getMigrations() {
  try {
    const rows = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY finished_at DESC`;
    return { applied: rows.length, latest: rows[0]?.migration_name ?? null };
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
