import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger('api');

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            logger.error({
              path: path ?? "<no-path>",
              error: error.message,
              code: error.code,
              stack: error.stack
            }, "tRPC request failed");
          }
        : undefined,
  });

export { handler as GET, handler as POST };
