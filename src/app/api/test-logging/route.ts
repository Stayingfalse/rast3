import { type NextRequest, NextResponse } from 'next/server';
import { loggers, logUtils } from '~/utils/logger';
import { testBetterStackConnection } from '~/utils/betterstack-logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log the test request
    loggers.api.info('Test logging endpoint accessed', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Test different log levels
    loggers.auth.debug('Debug log test', { testId: 'debug-001' });
    loggers.auth.info('Info log test', { testId: 'info-001' });
    loggers.auth.warn('Warning log test', { testId: 'warn-001' });
    
    // Test utility functions
    logUtils.logPerformance('test_endpoint_processing', 50, 'ms', {
      endpoint: '/api/test-logging'
    });

    logUtils.logSecurityEvent('test_access', 'low', {
      endpoint: '/api/test-logging',
      testRun: true
    });

    // Simulate an admin action
    logUtils.logAdminAction('test_logging_endpoint_access', 'system', undefined, {
      testRun: true,
      timestamp: new Date().toISOString()
    });

    const duration = Date.now() - startTime;
    
    // Test BetterStack connection
    const betterstackResult = await testBetterStackConnection();
    
    // Log successful response
    logUtils.logApiRequest('GET', '/api/test-logging', 'test-user', {
      duration,
      status: 200,
      testRun: true
    });

    return NextResponse.json({
      success: true,
      message: 'Logging test completed successfully',
      duration,
      logsGenerated: [
        'API request log',
        'Debug log',
        'Info log', 
        'Warning log',
        'Performance metric',
        'Security event',
        'Admin action'      ],
      betterStackConfigured: !!process.env.BETTERSTACK_SOURCE_TOKEN,
      betterStackTest: betterstackResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Test error logging
    logUtils.logError(error, 'test-logging-endpoint', {
      endpoint: '/api/test-logging',
      testRun: true
    });

    return NextResponse.json({
      success: false,
      error: 'Logging test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
