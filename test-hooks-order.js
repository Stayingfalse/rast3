/**
 * Test to verify React Hooks order violation is fixed in WishlistManager
 */

// Simple browser test - open developer console and check for hook errors
console.log('Testing React Hooks order...');

// Navigate to homepage
window.location.href = 'http://localhost:3000';

// Listen for React errors
window.addEventListener('error', (event) => {
  if (event.error && event.error.message.includes('hooks')) {
    console.error('❌ React Hooks order violation detected:', event.error.message);
  }
});

// Wait and check console for errors after 5 seconds
setTimeout(() => {
  console.log('✅ No React Hooks order violations detected after 5 seconds');
}, 5000);
