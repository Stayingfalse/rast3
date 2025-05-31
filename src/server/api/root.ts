import { profileRouter } from "~/server/api/routers/profile";
import { domainRouter } from "~/server/api/routers/domain";
import { userRouter } from "~/server/api/routers/user";
import { wishlistRouter } from "~/server/api/routers/wishlist";
import { linkRouter } from "~/server/api/routers/link";
import { kudosRouter } from "~/server/api/routers/kudos";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  profile: profileRouter,
  domain: domainRouter,
  user: userRouter,
  wishlist: wishlistRouter,
  link: linkRouter,
  kudos: kudosRouter,
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