import { getAuth } from "~/server/auth-dynamic";

export async function getServerSession() {
  const auth = await getAuth();
  return auth();
}
