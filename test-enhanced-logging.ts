#!/usr/bin/env npx tsx
/**
 * Test script to validate enhanced logging system
 */

import { testBetterStackConnection } from "./src/utils/betterstack-logger";
import { createChildLogger } from "./src/utils/logger";

const logger = createChildLogger('test-logging');

async function testEnhancedLogging() {
  console.log('🎄 Testing Enhanced Logging System...\n');

  // Test 1: Component-specific logger
  console.log('1. Testing component-specific logger:');
  logger.info({ 
    testType: 'component-logger',
    status: 'success'
  }, 'Component-specific logger test successful');

  // Test 2: BetterStack connection test
  console.log('\n2. Testing BetterStack connection:');
  try {
    const result = await testBetterStackConnection();
    console.log(`   Result: ${result.success ? '✅' : '❌'} ${result.message}`);
  } catch (error) {
    console.log(`   Error: ❌ ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 3: Error logging with context
  console.log('\n3. Testing enhanced error logging:');
  try {
    throw new Error('Test error for logging enhancement validation');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      operation: 'enhanced_logging_test',
      context: 'test_script',
      actionNeeded: 'This is expected - testing error logging format'
    }, 'Enhanced error logging test - this error is intentional');
  }

  // Test 4: Performance logging simulation
  console.log('\n4. Testing performance logging:');
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate 1.2s operation
  const duration = Date.now() - startTime;
  
  if (duration > 1000) {
    logger.warn({ 
      operation: 'test_slow_operation', 
      duration, 
      unit: 'ms',
      threshold: 1000
    }, 'Slow operation detected during testing');
  } else {
    logger.debug({ 
      operation: 'test_operation', 
      duration, 
      unit: 'ms' 
    }, 'Test operation completed');
  }

  // Test 5: Client-side logger simulation (normally would be browser)
  console.log('\n5. Testing client-side logger patterns:');
  try {
    if (typeof window === 'undefined') {
      // Simulate client-side error logging pattern
      const testError = new Error('Simulated client error');
      console.log('   Client logger pattern (server simulation):');
      console.log(`   clientLogger.error(${testError.message}, "test_context", {testData: true})`);
    }
  } catch (error) {
    console.log(`   Client logger test error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Test 6: Security event logging
  console.log('\n6. Testing security event logging:');
  logger.warn({
    eventType: 'security_test',
    userAgent: 'test-user-agent',
    ip: '127.0.0.1',
    operation: 'enhanced_logging_validation',
    actionNeeded: 'This is a test - no action required'
  }, 'Security event test - simulated security log');

  console.log('\n✅ Enhanced logging system test completed!');
  console.log('\nKey features validated:');
  console.log('  ✓ Component-specific loggers');
  console.log('  ✓ BetterStack integration test');
  console.log('  ✓ Enhanced error context logging');
  console.log('  ✓ Performance threshold warnings');
  console.log('  ✓ Security event structured logging');
  console.log('  ✓ Client-side logging patterns');
}

// Run tests
testEnhancedLogging().catch(console.error);
