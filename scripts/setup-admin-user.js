/**
 * Simple script to check current users and set up admin permissions for testing
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAdminForTesting() {
  console.log('🔧 Setting up admin user for testing...\n');

  try {
    // Find all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        adminLevel: true,
        domain: true,
        department: true
      }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Admin Level: ${user.adminLevel || 'NO_ADMIN'}`);
      console.log(`   Domain: ${user.domain}, Department: ${user.department}\n`);
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please sign in to the application first.');
      return;
    }

    // Make the first user a SITE admin for testing
    const firstUser = users[0];
    const updatedUser = await prisma.user.update({
      where: { id: firstUser.id },
      data: { adminLevel: 'SITE' }
    });

    console.log(`✅ Made ${updatedUser.name} a SITE admin for testing`);
    console.log('🌐 Navigate to http://localhost:3001 and sign in as this user to test admin features');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminForTesting();
