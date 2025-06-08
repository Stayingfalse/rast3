/**
 * Simple test script to verify BetterStack logging integration
 */

import { logger, loggers } from './src/utils/logger.js';
import { testBetterStackConnection } from './src/utils/betterstack-logger.js';

async function testLogging() {
  console.log('🧪 Testing RAoSanta Logging System...\n');

  // Test 1: Basic logging levels
  console.log('📝 Testing basic logging levels...');
  logger.info('Application startup test');
  logger.warn('This is a test warning');
  logger.error(new Error('Test error'), 'Test error logging');

  // Test 2: Specialized loggers
  console.log('🔧 Testing specialized loggers...');
  loggers.auth.info('User authentication test', { userId: 'test-user-123' });
  loggers.api.info('API endpoint test', { endpoint: '/api/test', method: 'GET' });
  loggers.security.warn('Security test event', { event: 'test_access', severity: 'medium' });
  loggers.performance.info('Performance test', { 
    metric: 'api_response_time', 
    value: 125, 
    unit: 'ms' 
  });

  // Test 3: BetterStack connection
  console.log('🌟 Testing BetterStack connection...');
  const result = await testBetterStackConnection();
  console.log('BetterStack test result:', result);

  // Test 4: Admin action logging
  loggers.admin.warn('Admin test action', {
    action: 'system_health_check',
    adminId: 'system',
    details: { component: 'logging_system', status: 'healthy' }
  });

  console.log('\n✅ Logging system test completed!');
  console.log('Check your BetterStack dashboard for logs at: https://s1340543.eu-nbg-2.betterstackdata.com');
}

// Run the test
testLogging().catch(console.error);
