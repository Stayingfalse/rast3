import { groupsRouter } from "~/server/api/routers/groups";
import { adminRouter } from "~/server/api/routers/admin";
import { authProviderRouter } from "~/server/api/routers/auth-provider";
import { kudosRouter } from "~/server/api/routers/kudos";
import { linkRouter } from "~/server/api/routers/link";
import { profileRouter } from "~/server/api/routers/profile";
import { shareRouter } from "~/server/api/routers/share";
import { stampsRouter } from "~/server/api/routers/stamps";
import { wishlistRouter } from "~/server/api/routers/wishlist";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  profile: profileRouter,
  wishlist: wishlistRouter,
  link: linkRouter,
  kudos: kudosRouter,
  authProvider: authProviderRouter,
  admin: adminRouter,
  stamps: stampsRouter,
  share: shareRouter,
  groups: groupsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
