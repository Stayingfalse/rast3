import { getHandlers } from "~/server/auth-dynamic";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { GET: getHandler } = await getHandlers();
  return getHandler(request);
}

export async function POST(request: NextRequest) {
  const { POST: postHandler } = await getHandlers();
  return postHandler(request);
}
