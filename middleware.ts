import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Note: We can't import our logger here directly as middleware runs in Edge Runtime
// Instead, we'll create a lightweight logging approach for middleware

export function middleware(request: NextRequest) {
  // Start timing for performance logging
  const startTime = Date.now();
    // Get request details
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  
  // Skip logging for static assets and Next.js internals
  const shouldSkipLogging = pathname.startsWith('/_next/') || 
                           pathname.startsWith('/api/_') ||
                           pathname.includes('.') && !pathname.startsWith('/api/');

  if (!shouldSkipLogging && process.env.NODE_ENV === 'development') {
    console.log(`[MIDDLEWARE] ${method} ${pathname}${search} - IP: ${ip}`);
  }

  // Continue with the request
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add custom headers for logging context
  const duration = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  if (!shouldSkipLogging && process.env.NODE_ENV === 'development') {
    console.log(`[MIDDLEWARE] ${method} ${pathname} completed in ${duration}ms`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
