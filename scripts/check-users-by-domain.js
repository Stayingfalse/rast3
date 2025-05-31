import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('=== Users by Domain ===');
    
    const usersByDomain = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        domain: true,
        department: true,
        adminLevel: true
      },
      orderBy: [
        { domain: 'asc' },
        { name: 'asc' }
      ]
    });

    let currentDomain = '';
    usersByDomain.forEach(user => {
      if (user.domain !== currentDomain) {
        currentDomain = user.domain || 'No Domain';
        console.log(`\n=== ${currentDomain} ===`);
      }
      console.log(`  - ${user.name} (${user.email})`);
      console.log(`    Department: ${user.department || 'None'}`);
      console.log(`    Admin Level: ${user.adminLevel}`);
    });

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
