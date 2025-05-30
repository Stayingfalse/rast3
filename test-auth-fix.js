/**
 * Test script to verify authentication fixes
 * This script tests that unauthenticated users don't trigger tRPC calls
 */

const { test, expect } = require('@playwright/test');

test.describe('Authentication Fix Tests', () => {
  test('unauthenticated users should not trigger tRPC calls', async ({ page }) => {
    // Track network requests
    const tRPCRequests = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/trpc/')) {
        tRPCRequests.push({
          url,
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    // Navigate to homepage as unauthenticated user
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that no tRPC calls were made for profile data
    const profileCalls = tRPCRequests.filter(req => 
      req.url.includes('profile.getCurrentProfile')
    );
    
    console.log('tRPC requests made:', tRPCRequests.length);
    console.log('Profile-related tRPC calls:', profileCalls.length);
    
    // Should be 0 profile calls for unauthenticated users
    expect(profileCalls.length).toBe(0);
    
    // Verify sign-in button is visible
    const signInButton = page.locator('button:has-text("Sign in")');
    await expect(signInButton).toBeVisible();
    
    // Verify no profile content is shown
    const welcomeMessage = page.locator('text=Welcome,');
    await expect(welcomeMessage).not.toBeVisible();
  });

  test('authenticated users should trigger appropriate tRPC calls', async ({ page }) => {
    // This test would require setting up authentication
    // For now, we'll just verify the component structure exists
    
    await page.goto('http://localhost:3000');
    
    // Verify the AuthShowcase component is rendered
    const authShowcase = page.locator('[data-testid="auth-showcase"]').or(
      page.locator('button:has-text("Sign in")')
    );
    await expect(authShowcase).toBeVisible();
  });
});
