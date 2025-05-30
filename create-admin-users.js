const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdminUsers() {
  try {
    // Update some existing users to have admin privileges
    const users = await prisma.user.findMany({
      take: 3,
      orderBy: { id: 'asc' }
    });

    if (users.length >= 3) {
      // Make first user a SITE admin
      await prisma.user.update({
        where: { id: users[0].id },
        data: { 
          adminLevel: 'SITE',
          name: users[0].name || 'Site Admin User'
        }
      });
      console.log(`✅ Updated user ${users[0].id} (${users[0].email}) to SITE admin`);

      // Make second user a DOMAIN admin
      await prisma.user.update({
        where: { id: users[1].id },
        data: { 
          adminLevel: 'DOMAIN',
          name: users[1].name || 'Domain Admin User'
        }
      });
      console.log(`✅ Updated user ${users[1].id} (${users[1].email}) to DOMAIN admin`);

      // Make third user a DEPARTMENT admin
      await prisma.user.update({
        where: { id: users[2].id },
        data: { 
          adminLevel: 'DEPARTMENT',
          name: users[2].name || 'Department Admin User'
        }
      });
      console.log(`✅ Updated user ${users[2].id} (${users[2].email}) to DEPARTMENT admin`);
    }

    // Show all users with their admin levels
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        adminLevel: true
      }
    });

    console.log('\n📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Admin Level: ${user.adminLevel}`);
    });

  } catch (error) {
    console.error('❌ Error creating admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUsers();
