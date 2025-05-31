// Script to manage domain status for testing
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const domainName = args[1];

  if (!command || !domainName) {
    console.log('Usage: node manage-domain.js <command> <domain>');
    console.log('Commands:');
    console.log('  status <domain>    - Show domain status');
    console.log('  enable <domain>    - Enable domain');
    console.log('  disable <domain>   - Disable domain');
    console.log('  delete <domain>    - Delete domain');
    return;
  }

  try {
    switch (command) {
      case 'status':
        const domain = await prisma.domain.findUnique({
          where: { name: domainName },
          include: {
            createdBy: {
              select: { firstName: true, lastName: true, workEmail: true }
            },
            _count: {
              select: { users: true, departments: true }
            }
          }
        });
        
        if (domain) {
          console.log('Domain found:');
          console.log(`  Name: ${domain.name}`);
          console.log(`  Enabled: ${domain.enabled}`);
          console.log(`  Description: ${domain.description || 'None'}`);
          console.log(`  Created: ${domain.createdAt}`);
          console.log(`  Created by: ${domain.createdBy ? `${domain.createdBy.firstName} ${domain.createdBy.lastName} (${domain.createdBy.workEmail})` : 'Unknown'}`);
          console.log(`  Users: ${domain._count.users}`);
          console.log(`  Departments: ${domain._count.departments}`);
        } else {
          console.log(`Domain '${domainName}' not found in database.`);
          console.log('This means you should see the domain setup option when signing up.');
        }
        break;

      case 'enable':
        await prisma.domain.update({
          where: { name: domainName },
          data: { enabled: true }
        });
        console.log(`Domain '${domainName}' enabled successfully.`);
        break;

      case 'disable':
        await prisma.domain.update({
          where: { name: domainName },
          data: { enabled: false }
        });
        console.log(`Domain '${domainName}' disabled successfully.`);
        break;

      case 'delete':
        // First check if there are users
        const userCount = await prisma.user.count({
          where: { workEmail: { endsWith: `@${domainName}` } }
        });
        
        if (userCount > 0) {
          console.log(`Cannot delete domain '${domainName}' - it has ${userCount} users.`);
          console.log('Delete users first or use disable instead.');
          return;
        }

        await prisma.domain.delete({
          where: { name: domainName }
        });
        console.log(`Domain '${domainName}' deleted successfully.`);
        console.log('You should now see the domain setup option when signing up.');
        break;

      default:
        console.log(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
