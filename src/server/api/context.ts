import { type inferAsyncReturnType } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { logUtils } from '~/utils/logger';

export async function createTRPCContext(opts: CreateNextContextOptions) {
  const { req, res } = opts;
  
  // Start timing for the request
  const startTime = Date.now();
    // Log the incoming request
  logUtils.logApiRequest(
    req.method ?? 'UNKNOWN',
    req.url ?? 'UNKNOWN',
    undefined, // userId will be added by auth middleware
    {
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] ?? req.connection?.remoteAddress,
    }
  );  // Add response logging with proper binding
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  
  res.write = originalWrite;
  res.end = originalEnd;

  return {
    req,
    res,
    startTime,
  };
}

export type Context = inferAsyncReturnType<typeof createTRPCContext>;
