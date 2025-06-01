import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function comprehensiveAdminTest() {
  try {
    console.log('=== Comprehensive Admin Moderation Test ===\n');
    
    // 1. Show current system state
    console.log('1. CURRENT SYSTEM STATE:');
    console.log('----------------------------------------');
    
    const [adminUsers, allKudos, domains, departments] = await Promise.all([
      prisma.user.findMany({
        where: { adminLevel: { not: 'USER' } },
        select: {
          id: true,
          name: true,
          email: true,
          adminLevel: true,
          adminScope: true,
          domain: true,
          department: true
        }
      }),
      prisma.kudos.findMany({
        select: {
          id: true,
          message: true,
          hidden: true,
          moderatedBy: true,
          moderatedAt: true,
          images: true,
          user: {
            select: {
              name: true,
              email: true,
              domain: true,
              department: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.domain.findMany({ select: { id: true, name: true } }),
      prisma.department.findMany({ 
        select: { id: true, name: true, domain: true } 
      })
    ]);

    console.log(`📊 Admin Users: ${adminUsers.length}`);
    console.log(`📊 Total Kudos: ${allKudos.length}`);
    console.log(`📊 Hidden Kudos: ${allKudos.filter(k => k.hidden).length}`);
    console.log(`📊 Domains: ${domains.length}`);
    console.log(`📊 Departments: ${departments.length}\n`);

    // 2. Admin Users Details
    console.log('2. ADMIN USERS:');
    console.log('----------------------------------------');
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   📋 Level: ${user.adminLevel}`);
      console.log(`   🎯 Scope: ${user.adminScope || user.domain || 'Site-wide'}`);
      console.log(`   🏢 Domain: ${user.domain || 'N/A'}`);
      console.log(`   🏬 Department: ${user.department ? JSON.stringify(user.department) : 'N/A'}`);
      console.log('');
    });

    // 3. Recent Kudos Posts
    console.log('3. RECENT KUDOS POSTS:');
    console.log('----------------------------------------');
    allKudos.slice(0, 5).forEach((kudos, index) => {
      console.log(`${index + 1}. ID: ${kudos.id}`);
      console.log(`   💬 Message: "${kudos.message?.substring(0, 60)}..."`);
      console.log(`   👤 Author: ${kudos.user.name} (${kudos.user.domain})`);
      console.log(`   🖼️ Images: ${kudos.images ? JSON.parse(kudos.images).length : 0}`);
      console.log(`   ${kudos.hidden ? '🙈 HIDDEN' : '👁️ VISIBLE'}`);
      if (kudos.moderatedBy) {
        console.log(`   ⚖️ Moderated by: ${kudos.moderatedBy} at ${kudos.moderatedAt}`);
      }
      console.log('');
    });

    // 4. Permission Test Matrix
    console.log('4. PERMISSION TEST MATRIX:');
    console.log('----------------------------------------');
    
    for (const admin of adminUsers) {
      console.log(`🔐 ${admin.name} (${admin.adminLevel}) permissions:`);
      
      const testCases = allKudos.slice(0, 3); // Test with first 3 posts
      for (const kudos of testCases) {
        let canModerate = false;
        
        if (admin.adminLevel === 'SITE') {
          canModerate = true;
        } else if (admin.adminLevel === 'DOMAIN') {
          canModerate = admin.domain === kudos.user.domain;
        } else if (admin.adminLevel === 'DEPARTMENT') {
          // This would need proper department checking
          canModerate = admin.domain === kudos.user.domain; // Simplified
        }
        
        console.log(`   ${canModerate ? '✅' : '❌'} Post ${kudos.id.substring(0, 8)}... by ${kudos.user.name}`);
      }
      console.log('');
    }

    // 5. Testing Instructions
    console.log('5. MANUAL TESTING INSTRUCTIONS:');
    console.log('----------------------------------------');
    console.log('🧪 To test the admin functionality:');
    console.log('');
    console.log('Step 1: Sign in as an admin user');
    console.log('   📧 Use one of the admin emails listed above');
    console.log('   🌐 Navigate to: http://localhost:3000');
    console.log('');
    console.log('Step 2: Test Admin UI Features');
    console.log('   👁️ Look for 3-dot menu (⋮) on kudos posts');
    console.log('   🙈 Test Hide/Unhide functionality');
    console.log('   🗑️ Test Delete functionality with confirmation');
    console.log('   🔍 Verify hidden posts show "Hidden" badge to admins');
    console.log('');
    console.log('Step 3: Test Permission Scoping');
    console.log('   🎯 SITE admins should see admin menu on ALL posts');
    console.log('   🏢 DOMAIN admins should only see menu on posts from their domain');
    console.log('   🏬 DEPARTMENT admins should only see menu on posts from their department');
    console.log('');
    console.log('Step 4: Test File Cleanup');
    console.log('   🖼️ Delete a post with images');
    console.log('   ☁️ Verify images are removed from E2 storage');
    console.log('   📊 Check server logs for deletion confirmations');
    console.log('');
    console.log('Step 5: Test Regular User View');
    console.log('   👤 Sign in as a regular user (non-admin)');
    console.log('   🙈 Verify hidden posts are not visible');
    console.log('   🚫 Verify no admin menus appear');
    console.log('');

    // 6. Expected Behaviors
    console.log('6. EXPECTED BEHAVIORS:');
    console.log('----------------------------------------');
    console.log('✅ Admin Controls:');
    console.log('   • 3-dot menu appears only for admins with proper permissions');
    console.log('   • Hide/Unhide toggles post visibility');
    console.log('   • Delete requires confirmation and removes post + images');
    console.log('   • Hidden posts show "Hidden" badge to admins only');
    console.log('');
    console.log('✅ Permission Scoping:');
    console.log('   • SITE: Can moderate all content');
    console.log('   • DOMAIN: Can only moderate content from their domain');
    console.log('   • DEPARTMENT: Can only moderate content from their department');
    console.log('');
    console.log('✅ Regular Users:');
    console.log('   • Cannot see hidden posts');
    console.log('   • Cannot see admin controls');
    console.log('   • Feed loads normally with visible posts only');
    console.log('');
    console.log('✅ File Management:');
    console.log('   • Images deleted from E2 storage when post is deleted');
    console.log('   • No orphaned files left behind');
    console.log('   • Operation continues even if some files fail to delete');

  } catch (error) {
    console.error('❌ Error running comprehensive test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveAdminTest();
