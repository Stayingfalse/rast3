import { NextResponse, type NextRequest } from "next/server";

import { getHandlers } from "~/server/auth-dynamic";
import { allowSignInRequest, clientIp } from "~/server/sign-in-limits";

export async function GET(request: NextRequest) {
  const { GET: getHandler } = await getHandlers();
  return getHandler(request);
}

export async function POST(request: NextRequest) {
  // asking for an email sign-in link: at most a few per network address
  // (audit, 26 Nov); the per-address and site limits are in auth-dynamic
  if (request.nextUrl.pathname.endsWith("/signin/nodemailer") && !allowSignInRequest(clientIp(request.headers))) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const origin = host ? `${proto}://${host}` : request.nextUrl.origin;
    const url = new URL("/auth/error?error=TooManyRequests", origin).toString();
    // next-auth's signIn() asks for JSON and reads the error from the URL
    return request.headers.get("x-auth-return-redirect")
      ? NextResponse.json({ url })
      : NextResponse.redirect(url, 303);
  }
  const { POST: postHandler } = await getHandlers();
  return postHandler(request);
}
