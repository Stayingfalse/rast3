import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

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
