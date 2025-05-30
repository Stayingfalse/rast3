import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking current users...');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      adminLevel: true
    }
  });

  console.log(`Found ${users.length} users:`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} - ${user.name} - Admin Level: ${user.adminLevel || 'USER'}`);
  });

  if (users.length >= 3) {
    console.log('\n🔧 Updating admin levels...');
    
    // Update first three users to have admin privileges
    await prisma.user.update({
      where: { id: users[0].id },
      data: { adminLevel: 'SITE' }
    });
    console.log(`✅ ${users[0].email} updated to SITE admin`);

    await prisma.user.update({
      where: { id: users[1].id },
      data: { adminLevel: 'DOMAIN' }
    });
    console.log(`✅ ${users[1].email} updated to DOMAIN admin`);

    await prisma.user.update({
      where: { id: users[2].id },
      data: { adminLevel: 'DEPARTMENT' }
    });
    console.log(`✅ ${users[2].email} updated to DEPARTMENT admin`);
    
    console.log('\n🎉 Admin users created successfully!');
    console.log('\nYou can now test admin access by logging in with:');
    console.log(`- Site Admin: ${users[0].email}`);
    console.log(`- Domain Admin: ${users[1].email}`);
    console.log(`- Department Admin: ${users[2].email}`);
  } else {
    console.log('❌ Not enough users found. Please run: npx prisma db seed');
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
