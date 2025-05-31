import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function POST(_req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Debug login only available in development" }, { status: 403 });
  }

  try {
    // Create or find the debug user
    let debugUser = await db.user.findUnique({
      where: { email: "debug@example.com" },
    });

    if (!debugUser) {
      debugUser = await db.user.create({
        data: {
          id: "debug-user-123",
          email: "debug@example.com",
          name: "Debug User",
          image: "https://avatar.vercel.sh/debug",
          emailVerified: new Date(),
          // Initialize with no profile completed to test the flow
          profileCompleted: false,
        },
      });

      // Also create a debug account entry for NextAuth
      await db.account.create({
        data: {
          userId: debugUser.id,
          type: "oauth",
          provider: "debug",
          providerAccountId: "debug-123",
          access_token: "debug-token",
        },
      });

      // Create a session for immediate login
      await db.session.create({
        data: {
          userId: debugUser.id,
          sessionToken: "debug-session-" + Date.now(),
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Debug user created/found. Please refresh the page to see the login state.",
      user: {
        id: debugUser.id,
        email: debugUser.email,
        name: debugUser.name,
        image: debugUser.image,
      }
    });
  } catch (error) {
    console.error("Debug login error:", error);
    return NextResponse.json({ error: "Failed to create debug user", details: String(error) }, { status: 500 });
  }
}
