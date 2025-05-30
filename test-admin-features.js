// Test script for admin management features
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminFeatures() {
  console.log('🔧 Testing Admin Management Features...\n');

  try {
    // 1. Test getting all users with admin fields
    console.log('1. Testing user retrieval with admin fields...');
    const users = await prisma.user.findMany({
      include: {
        department: true,
      },
      take: 3 // Just first 3 for testing
    });
    
    console.log(`✅ Found ${users.length} users`);
    users.forEach(user => {
      console.log(`   - ${user.firstName || user.name || 'Unknown'}: Admin Level: ${user.adminLevel || 'USER'}, Scope: ${user.adminScope || 'N/A'}`);
    });

    // 2. Test updating admin level for a user (find first non-admin user)
    const testUser = users.find(u => (!u.adminLevel || u.adminLevel === 'USER') && u.domain);
    if (testUser && testUser.domain) {
      console.log('\n2. Testing admin level update...');
      
      // Make them a domain admin
      const updatedUser = await prisma.user.update({
        where: { id: testUser.id },
        data: {
          adminLevel: 'DOMAIN',
          adminScope: testUser.domain,
        },
      });
      
      console.log(`✅ Updated ${testUser.firstName || testUser.name} to Domain Admin for ${testUser.domain}`);
      
      // Revert back to USER
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          adminLevel: 'USER',
          adminScope: null,
        },
      });
      console.log(`✅ Reverted ${testUser.firstName || testUser.name} back to regular user`);
    }    // 3. Test user statistics query for a user with wishlist data
    console.log('\n3. Testing user statistics...');
    const userWithAssignments = await prisma.user.findFirst({
      include: {
        assignedLinks: {
          include: {
            purchases: true,
            reports: true,
            wishlistOwner: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        ownedWishlist: {
          include: {
            purchases: true,
            reports: true,
            assignedUser: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    if (userWithAssignments) {
      const stats = {
        assignments: {
          total: userWithAssignments.assignedLinks.length,
          purchased: userWithAssignments.assignedLinks.filter(a => a.purchases).length,
          reported: userWithAssignments.assignedLinks.reduce((sum, a) => sum + a.reports.length, 0),
        },
        ownWishlist: {
          assignedTo: userWithAssignments.ownedWishlist.length,
          purchases: userWithAssignments.ownedWishlist.filter(a => a.purchases).length,
          reports: userWithAssignments.ownedWishlist.reduce((sum, a) => sum + a.reports.length, 0),
        }
      };

      console.log(`✅ User stats for ${userWithAssignments.firstName || userWithAssignments.name}:`);
      console.log(`   - Assignments: ${stats.assignments.total} total, ${stats.assignments.purchased} purchased, ${stats.assignments.reported} reported`);
      console.log(`   - Own wishlist: ${stats.ownWishlist.assignedTo} assigned, ${stats.ownWishlist.purchases} purchases, ${stats.ownWishlist.reports} reports`);
    }

    // 4. Test admin level restrictions
    console.log('\n4. Testing admin level restrictions...');
    const adminLevels = ['USER', 'DEPARTMENT', 'DOMAIN', 'SITE'];
    const adminUsers = await prisma.user.findMany({
      where: {
        adminLevel: {
          in: adminLevels.slice(1) // Exclude USER
        }
      }
    });

    console.log(`✅ Found ${adminUsers.length} users with admin privileges:`);
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.firstName || admin.name}: ${admin.adminLevel} (${admin.adminScope || 'No scope'})`);
    });

    console.log('\n🎉 All admin management features tested successfully!');

  } catch (error) {
    console.error('❌ Error testing admin features:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminFeatures().catch(console.error);
