const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuthProvider() {
  try {
    console.log('Testing AuthProvider model access...');
    
    // List all available methods on prisma
    console.log('Available Prisma methods:');
    console.log(Object.getOwnPropertyNames(prisma).filter(name => !name.startsWith('_') && name !== 'constructor'));
    
    // Try to access authProvider
    if (prisma.authProvider) {
      const count = await prisma.authProvider.count();
      console.log('AuthProvider count:', count);
    } else {
      console.log('authProvider not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthProvider();
