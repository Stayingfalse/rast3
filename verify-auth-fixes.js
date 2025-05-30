#!/usr/bin/env node

/**
 * Quick verification script to confirm authentication fixes are properly implemented
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = __dirname;

function checkFile(filePath, expectedPatterns, description) {
  console.log(`\n🔍 Checking ${description}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let allPatternsFound = true;
  
  expectedPatterns.forEach(pattern => {
    if (pattern.test && pattern.test(content)) {
      console.log(`✅ ${pattern.description}`);
    } else if (typeof pattern === 'string' && content.includes(pattern)) {
      console.log(`✅ Found: ${pattern}`);
    } else {
      console.log(`❌ Missing: ${pattern.description || pattern}`);
      allPatternsFound = false;
    }
  });
  
  return allPatternsFound;
}

function main() {
  console.log('🚀 Verifying Authentication Fixes...\n');
  
  // Check AdminLayout component
  const adminLayoutPath = path.join(projectRoot, 'src/app/_components/admin-layout.tsx');
  const adminLayoutPatterns = [
    {
      test: (content) => content.includes('["DEPARTMENT", "DOMAIN", "SITE"].includes(user.adminLevel'),
      description: 'Uses whitelist approach for admin permissions'
    },
    {
      test: (content) => content.includes('{ enabled: !!sessionData?.user }'),
      description: 'Has authentication guard for tRPC calls'
    },
    {
      test: (content) => content.includes('useSession'),
      description: 'Imports and uses NextAuth session'
    }
  ];
  
  const adminLayoutOk = checkFile(adminLayoutPath, adminLayoutPatterns, 'AdminLayout security fixes');
  
  // Check AuthShowcase component
  const authShowcasePath = path.join(projectRoot, 'src/app/_components/auth-showcase.tsx');
  const authShowcasePatterns = [
    {
      test: (content) => content.includes('{ enabled: !!sessionData?.user }'),
      description: 'Has authentication guard for profile query'
    },
    {
      test: (content) => {
        // Check that useSession comes before conditional returns
        const useSessionIndex = content.indexOf('useSession');
        const firstReturnIndex = content.indexOf('return');
        return useSessionIndex < firstReturnIndex && useSessionIndex !== -1;
      },
      description: 'Hooks are called before conditional returns'
    }
  ];
  
  const authShowcaseOk = checkFile(authShowcasePath, authShowcasePatterns, 'AuthShowcase hooks fixes');
  
  // Check WishlistManager component
  const wishlistManagerPath = path.join(projectRoot, 'src/app/_components/wishlist-manager.tsx');
  const wishlistManagerPatterns = [
    {
      test: (content) => content.includes('{ enabled: !!sessionData?.user }'),
      description: 'Has authentication guard for profile query'
    },
    {
      test: (content) => {
        // Check that all hooks come before first conditional return
        const lines = content.split('\n');
        let firstHookIndex = -1;
        let firstReturnIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if ((line.includes('useState') || line.includes('useQuery') || line.includes('useMutation') || line.includes('useSession')) && firstHookIndex === -1) {
            firstHookIndex = i;
          }
          if (line.startsWith('return') && line.includes('null') && firstReturnIndex === -1) {
            firstReturnIndex = i;
          }
        }
        
        return firstHookIndex < firstReturnIndex && firstHookIndex !== -1;
      },
      description: 'All hooks are called before conditional returns'
    }
  ];
  
  const wishlistManagerOk = checkFile(wishlistManagerPath, wishlistManagerPatterns, 'WishlistManager hooks fixes');
  
  // Summary
  console.log('\n📋 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`AdminLayout Security Fix: ${adminLayoutOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`AuthShowcase Hooks Fix: ${authShowcaseOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`WishlistManager Hooks Fix: ${wishlistManagerOk ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = adminLayoutOk && authShowcaseOk && wishlistManagerOk;
  console.log(`\nOverall Status: ${allPassed ? '✅ ALL FIXES VERIFIED' : '❌ SOME ISSUES REMAIN'}`);
  
  if (allPassed) {
    console.log('\n🎉 Authentication fixes have been successfully implemented!');
    console.log('📝 Next steps:');
    console.log('   1. Use Prisma Studio (http://localhost:5555) to create admin users');
    console.log('   2. Test authentication flow manually');
    console.log('   3. Verify admin dashboard access works correctly');
  } else {
    console.log('\n⚠️  Some fixes may need attention. Please review the failed checks above.');
  }
}

main();
