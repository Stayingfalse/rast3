import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { loggers } from "~/utils/logger";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            loggers.api.error("tRPC request failed", {
              path: path ?? "<no-path>",
              error: error.message,
              code: error.code,
              stack: error.stack
            });
          }
        : undefined,
  });

export { handler as GET, handler as POST };
