/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { checkAdminPermissions } from "~/server/utils/admin-permissions";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger('trpc');

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */

interface CreateContextOptions {
  session: Session | null;
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts (RAoSanta uses tRPC for end-to-end typesafe APIs)
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
  };
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (_opts: { headers: Headers }) => {
  // Get the session using NextAuth v5's auth() function
  let session: Session | null = null;
  try {
    session = await auth();
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, "Error getting session in tRPC context");
    // Session remains null, which is fine for public procedures
  }

  // Check for impersonation cookie in incoming headers. If present and the current session
  // belongs to a SITE admin, override the session to act as the impersonated user.
  try {
    const cookieHeader = _opts.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|; )impersonate_user=([^;]+)/);
    const impersonateId = match ? decodeURIComponent(match[1]) : null;
    if (impersonateId && session?.user) {
      // Verify current user is SITE admin
      const adminCheck = await checkAdminPermissions(session.user.id);
      if (adminCheck.canModerate && adminCheck.adminLevel === "SITE") {
        const targetUser = await db.user.findUnique({
          where: { id: impersonateId },
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            adminLevel: true,
            departmentId: true,
            domain: true,
          },
        });
        if (targetUser) {
          // Create a shallow cloned session and replace user fields with target user's info
          session = {
            ...session,
            user: {
              ...session.user,
              id: targetUser.id,
              name: targetUser.name ?? session.user.name,
              email: targetUser.email ?? session.user.email,
              // Attach minimal impersonation metadata
              impersonatorId: session.user.id,
              adminLevel: targetUser.adminLevel as unknown as string | undefined,
              departmentId: targetUser.departmentId ?? undefined,
              domain: targetUser.domain ?? undefined,
            } as unknown as Session["user"],
          };
        }
      }
    }
  } catch (e) {
    // Non-fatal; continue with original session
    logger.debug({ err: e instanceof Error ? e.message : String(e) }, "Impersonation check failed");
  }

  return createInnerTRPCContext({
    session,
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  const duration = end - start;
  
  // Log at different levels based on performance and environment
  if (duration > 1000) {
    // Slow queries should be logged as warnings
    logger.warn({
      path,
      duration,
      unit: "ms"
    }, "Slow tRPC procedure execution");
  } else if (t._config.isDev) {
    // In development, log all procedures at debug level
    logger.debug({
      path,
      duration,
      unit: "ms"
    }, "tRPC procedure execution time");
  } else {
    // In production, only log timing at debug level (will be filtered out at info level)
    logger.debug({
      path,
      duration,
      unit: "ms"
    }, "tRPC procedure execution time");
  }

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
