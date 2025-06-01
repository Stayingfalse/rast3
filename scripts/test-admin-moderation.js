import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminModeration() {
  try {
    console.log('=== Testing Admin Moderation Features ===\n');
    
    // Check existing kudos posts
    console.log('1. Current Kudos Posts:');
    const allKudos = await prisma.kudos.findMany({
      select: {
        id: true,
        message: true,
        hidden: true,
        moderatedBy: true,
        moderatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            domain: true,
            department: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (allKudos.length === 0) {
      console.log('   No kudos posts found. Please create some test posts first.\n');
    } else {
      allKudos.forEach((kudos, index) => {
        console.log(`   ${index + 1}. ID: ${kudos.id}`);
        console.log(`      Message: ${kudos.message?.substring(0, 50)}...`);
        console.log(`      Author: ${kudos.user.name} (${kudos.user.email})`);
        console.log(`      Domain: ${kudos.user.domain}`);
        console.log(`      Hidden: ${kudos.hidden ? 'YES' : 'NO'}`);
        if (kudos.moderatedBy) {
          console.log(`      Moderated by: ${kudos.moderatedBy} at ${kudos.moderatedAt}`);
        }
        console.log('');
      });
    }

    // Check admin users
    console.log('2. Admin Users Available for Testing:');
    const adminUsers = await prisma.user.findMany({
      where: {
        adminLevel: {
          not: 'USER'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        adminLevel: true,
        adminScope: true,
        domain: true,
        department: true
      }
    });

    adminUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      Level: ${user.adminLevel}`);
      console.log(`      Scope: ${user.adminScope || user.domain || 'Site-wide'}`);
      console.log('');
    });

    // Test recommendations
    console.log('3. Testing Recommendations:');
    console.log('   a) Sign in with one of the admin users above');
    console.log('   b) Navigate to the home page to see the kudos feed');
    console.log('   c) Look for the 3-dot menu on kudos posts (should appear for admins)');
    console.log('   d) Test hiding/unhiding posts');
    console.log('   e) Test deleting posts (ensure images are cleaned up)');
    console.log('   f) Verify scope permissions work correctly');
    console.log('\n   Expected behavior:');
    console.log('   - SITE admins can moderate all posts');
    console.log('   - DOMAIN admins can only moderate posts from their domain');
    console.log('   - DEPARTMENT admins can only moderate posts from their department');
    console.log('   - Hidden posts show "Hidden" badge for admins but are invisible to regular users');

  } catch (error) {
    console.error('Error testing admin moderation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminModeration();
