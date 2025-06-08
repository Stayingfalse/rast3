// Simple TypeScript test for the logging system
import { loggers, logUtils } from './src/utils/logger';

async function testLoggingSystem() {
  console.log('🧪 Testing RAoSanta Logging System...\n');

  try {
    // Test different log levels
    loggers.auth.info('Testing auth logger', { userId: 'test-123', action: 'login' });
    loggers.api.debug('Testing API debug logging', { endpoint: '/api/test', method: 'GET' });
    loggers.database.warn('Testing database warning', { query: 'SELECT * FROM users', slowQuery: true });
    loggers.oauth.error('Testing OAuth error logging', { provider: 'google', error: 'Invalid token' });

    // Test utility functions
    logUtils.logApiRequest('POST', '/api/kudos', 'user-456', { duration: 125, status: 200 });
    logUtils.logAuthEvent('sign_in', 'user-789', 'discord');
    logUtils.logOAuthEvent('token_exchange', 'google', { success: true, userId: 'user-abc' });
    logUtils.logPerformance('page_load', 850, 'ms', { page: '/admin/settings' });
    logUtils.logSecurityEvent('suspicious_activity', 'high', { ip: '192.168.1.100', action: 'multiple_failed_logins' });
    logUtils.logError(new Error('Test error'), 'test-context', { additionalData: 'some context' });
    logUtils.logAdminAction('user_deletion', 'admin-123', 'user-456');

    console.log('\n✅ Logging system test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing logging system:', error);
  }
}

testLoggingSystem();
