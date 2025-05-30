// Test script to verify profile system functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDebugLogin() {
  console.log('🧪 Testing debug login...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/debug-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('✅ Debug login response:', result);
    return result;
  } catch (error) {
    console.error('❌ Debug login failed:', error);
    return null;
  }
}

async function testProfileEndpoints() {
  console.log('🧪 Testing profile endpoints...');
  
  // Note: These tests won't work without proper session cookies
  // This is just to verify the endpoints are accessible
  
  const endpoints = [
    '/api/trpc/profile.getCurrentProfile',
    '/api/trpc/profile.getDepartmentsByDomain?input={"json":{"domain":"example.com"}}',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const result = await response.text();
      console.log(`📡 ${endpoint}:`, response.status, result.substring(0, 100) + '...');
    } catch (error) {
      console.error(`❌ ${endpoint} failed:`, error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting profile system tests...\n');
  
  await testDebugLogin();
  console.log('');
  await testProfileEndpoints();
  
  console.log('\n✨ Tests completed! Check the browser at:');
  console.log('- Main app: http://localhost:3000');
  console.log('- No-auth test: http://localhost:3000/no-auth-test');
  console.log('- Comprehensive test: http://localhost:3000/comprehensive-test');
  console.log('- Admin interface: http://localhost:3000/admin');
}

runTests().catch(console.error);
