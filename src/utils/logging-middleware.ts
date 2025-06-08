import { type NextRequest, type NextResponse } from 'next/server';
import { logUtils } from '~/utils/logger';

export function withLogging<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const { method, url, headers } = req;
    
    // Log incoming request
    logUtils.logApiRequest(method, url, undefined, {
      userAgent: headers.get('user-agent'),
      ip: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
      contentType: headers.get('content-type'),
    });

    try {
      const response = await handler(req, ...args);
      const duration = Date.now() - startTime;
      
      // Log successful response
      logUtils.logApiResponse(method, url, response.status, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error response
      logUtils.logError(error, `API Route: ${method} ${url}`, {
        duration,
        method,
        url,
      });
      
      // Re-throw the error so it can be handled by the calling code
      throw error;
    }
  };
}

export function logMiddleware(req: NextRequest) {
  // Only log non-static requests
  if (
    req.nextUrl.pathname.startsWith('/_next/') ||
    req.nextUrl.pathname.startsWith('/favicon') ||
    req.nextUrl.pathname.endsWith('.ico') ||
    req.nextUrl.pathname.endsWith('.png') ||
    req.nextUrl.pathname.endsWith('.jpg') ||
    req.nextUrl.pathname.endsWith('.jpeg') ||
    req.nextUrl.pathname.endsWith('.gif') ||
    req.nextUrl.pathname.endsWith('.svg') ||
    req.nextUrl.pathname.endsWith('.css') ||
    req.nextUrl.pathname.endsWith('.js')
  ) {
    return;
  }

  logUtils.logApiRequest(
    req.method,
    req.nextUrl.pathname + req.nextUrl.search,
    undefined,
    {
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      referer: req.headers.get('referer'),
    }
  );
}
