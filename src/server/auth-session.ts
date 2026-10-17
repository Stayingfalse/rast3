import type { Session, User } from "next-auth";

/**
 * Builds the session sent to the browser (/api/auth/session, useSession).
 *
 * With the database strategy, Auth.js hands the callback the full session row
 * (including the secret sessionToken) and the full user record. Only return
 * what the client needs: never spread those objects into the response.
 */
export function toClientSession({
  session,
  user,
}: {
  session: Session;
  user: User;
}): Session {
  return {
    expires: session.expires,
    user: {
      id: user.id!,
      name: user.name ?? null,
      email: user.email ?? "",
      image: user.image ?? null,
      adminLevel: user.adminLevel,
      adminScope: user.adminScope ?? null,
    },
  };
}
