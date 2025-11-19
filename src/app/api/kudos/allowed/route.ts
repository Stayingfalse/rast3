import { NextResponse } from "next/server";
import { getAuth } from "~/server/auth-dynamic";
import { db } from "~/server/db";

export async function GET() {
  try {
    const auth = await getAuth();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ allowed: false });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { department: true },
    });

    if (!user?.domain) {
      return NextResponse.json({ allowed: false });
    }

    const domain = await db.domain.findUnique({ where: { name: user.domain } });

    return NextResponse.json({ allowed: domain?.enabled ?? false });
  } catch {
    return NextResponse.json({ allowed: false });
  }
}
