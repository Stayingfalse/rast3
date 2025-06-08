// Simple logging test
console.log('🧪 Testing Node.js environment for Pino...');

try {
  const pino = require('pino');
  console.log('✅ Pino installed successfully');
  
  const logger = pino({
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  });
  
  logger.info('Test log message');
  logger.debug('Debug message');
  logger.warn('Warning message');
  logger.error('Error message');
  
  console.log('✅ Logging system test completed successfully!');
} catch (error) {
  console.error('❌ Error testing logging system:', error.message);
}
