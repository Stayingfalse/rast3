/**
 * Simple test to verify authentication fixes work
 * Run this with: node test-auth-fix-simple.js
 */

const { chromium } = require('playwright');

async function testAuthenticationFix() {
  console.log('Starting authentication fix test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Track network requests
  const tRPCRequests = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/trpc/')) {
      tRPCRequests.push({
        url,
        method: request.method(),
        timestamp: new Date().toISOString()
      });
      console.log(`tRPC Request: ${request.method()} ${url}`);
    }
  });

  try {
    // Navigate to homepage as unauthenticated user
    console.log('Navigating to homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait a bit more to catch any delayed requests
    await page.waitForTimeout(3000);
    
    // Check that no profile-related tRPC calls were made
    const profileCalls = tRPCRequests.filter(req => 
      req.url.includes('profile.getCurrentProfile')
    );
    
    console.log(`\nTest Results:`);
    console.log(`Total tRPC requests: ${tRPCRequests.length}`);
    console.log(`Profile-related tRPC calls: ${profileCalls.length}`);
    
    if (profileCalls.length === 0) {
      console.log('✅ SUCCESS: No profile tRPC calls made for unauthenticated users');
    } else {
      console.log('❌ FAILURE: Profile tRPC calls were made for unauthenticated users');
      profileCalls.forEach(call => {
        console.log(`  - ${call.method} ${call.url} at ${call.timestamp}`);
      });
    }
    
    // Check that sign-in button is visible
    const signInButton = await page.locator('button:has-text("Sign in")').isVisible();
    console.log(`Sign-in button visible: ${signInButton ? '✅' : '❌'}`);
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'auth-test-result.png' });
    console.log('Screenshot saved as auth-test-result.png');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test if playwright is available
if (require.resolve('playwright')) {
  testAuthenticationFix().catch(console.error);
} else {
  console.log('Playwright not available. Please check manually:');
  console.log('1. Open http://localhost:3000 in browser');
  console.log('2. Check Network tab for tRPC calls');
  console.log('3. Verify no profile.getCurrentProfile calls are made when not logged in');
}
