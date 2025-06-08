import { loggers, logUtils } from '../src/utils/logger.js';

console.log('🧪 Testing BetterStack Integration...\n');

// Test different log levels to verify BetterStack is receiving logs
loggers.auth.info('BetterStack Test - Auth Event', { 
  userId: 'test-user-123', 
  action: 'login_test',
  provider: 'discord',
  timestamp: new Date().toISOString()
});

loggers.api.warn('BetterStack Test - API Warning', { 
  endpoint: '/api/test',
  method: 'POST',
  statusCode: 429,
  message: 'Rate limit exceeded'
});

loggers.security.error('BetterStack Test - Security Alert', { 
  severity: 'high',
  event: 'suspicious_login_attempt',
  ip: '192.168.1.100',
  userAgent: 'Test-Agent/1.0'
});

logUtils.logPerformance('betterstack_test_metric', 1250, 'ms', {
  page: '/admin/dashboard',
  loadType: 'initial'
});

logUtils.logError(new Error('Test error for BetterStack'), 'betterstack_integration_test', {
  testRun: true,
  environment: 'development'
});

console.log('✅ BetterStack test logs sent!');
console.log('📊 Check your BetterStack dashboard to verify logs are being received.');
console.log('🔗 Dashboard: https://logs.betterstack.com/');
