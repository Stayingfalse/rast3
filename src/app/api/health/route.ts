import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { getMigrations, getSchemaSync, processStartedAt } from "~/server/health";

export async function GET(_req: NextRequest) {
  try {
    // Test the database connection (no counts: exact numbers aren't public)
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: { connected: true },
      migrations: await getMigrations(),
      schemaSync: await getSchemaSync(),
      environment: process.env.NODE_ENV,
      // CI waits for a start time after its deploy call to know the new build is live
      process: { startedAt: processStartedAt() },
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
