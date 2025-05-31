import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    console.log('=== Starting admin users check ===');
    console.log('=== Current Admin Users ===');
    
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

    console.log(`Found ${adminUsers.length} admin users:`);
    
    adminUsers.forEach(user => {
      console.log(`\n- ${user.name} (${user.email})`);
      console.log(`  Admin Level: ${user.adminLevel}`);
      console.log(`  Admin Scope: ${user.adminScope || 'N/A'}`);
      console.log(`  Domain: ${user.domain || 'N/A'}`);
      console.log(`  Department: ${user.department || 'N/A'}`);
    });    console.log('\n=== Domains ===');
    const domains = await prisma.domain.findMany({
      select: {
        id: true,
        name: true
      }
    });

    domains.forEach(domain => {
      console.log(`\n- ${domain.name} (ID: ${domain.id})`);
    });    console.log('\n=== Departments ===');
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        domain: true
      }
    });

    departments.forEach(dept => {
      console.log(`\n- ${dept.name} (ID: ${dept.id})`);
      console.log(`  Domain: ${dept.domain}`);
    });

  } catch (error) {
    console.error('Error checking admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();
