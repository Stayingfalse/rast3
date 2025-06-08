import { type inferAsyncReturnType } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { logUtils } from '~/utils/logger';

export async function createTRPCContext(opts: CreateNextContextOptions) {
  const { req, res } = opts;
  
  // Start timing for the request
  const startTime = Date.now();
  
  // Log the incoming request
  logUtils.logApiRequest(
    req.method || 'UNKNOWN',
    req.url || 'UNKNOWN',
    undefined, // userId will be added by auth middleware
    {
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    }
  );

  // Add response logging
  const originalWrite = res.write;
  const originalEnd = res.end;
  
  res.write = function(chunk: any, encoding?: any) {
    return originalWrite.call(this, chunk, encoding);
  };
  
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    logUtils.logApiResponse(
      req.method || 'UNKNOWN',
      req.url || 'UNKNOWN',
      res.statusCode,
      duration
    );
    return originalEnd.call(this, chunk, encoding);
  };

  return {
    req,
    res,
    startTime,
  };
}

export type Context = inferAsyncReturnType<typeof createTRPCContext>;
