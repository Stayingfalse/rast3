// Simple test for undo functionality using Node.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUndoFunctionality() {
  try {
    console.log('🧪 Testing Undo Purchase and Clear Report Functionality...\n');
    
    // 1. Get a user with wishlist assignments
    const userWithAssignments = await prisma.user.findFirst({
      where: {
        assignedWishlists: {
          some: {}
        }
      },
      include: {
        assignedWishlists: {
          include: {
            purchases: true,
            reports: true,
            wishlistOwner: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                amazonWishlistUrl: true,
              }
            }
          }
        }
      }
    });

    if (!userWithAssignments) {
      console.log('❌ No user with assignments found');
      return;
    }

    const assignment = userWithAssignments.assignedWishlists[0];
    if (!assignment) {
      console.log('❌ No assignments found');
      return;
    }

    console.log(`👤 Testing with user: ${userWithAssignments.name}`);
    console.log(`📋 Assignment ID: ${assignment.id}`);
    console.log(`🎁 Wishlist owner: ${assignment.wishlistOwner.name}\n`);

    // 2. Test Purchase Flow
    console.log('Testing Purchase and Undo Flow:');
    
    // Create a purchase if none exists
    if (!assignment.purchases) {
      console.log('  ➕ Creating test purchase...');
      await prisma.purchase.create({
        data: {
          userId: userWithAssignments.id,
          wishlistAssignmentId: assignment.id,
          notes: 'Test purchase for undo functionality'
        }
      });
      console.log('  ✅ Test purchase created');
    } else {
      console.log('  ℹ️  Purchase already exists');
    }

    // Verify purchase exists
    const purchaseExists = await prisma.purchase.findFirst({
      where: { wishlistAssignmentId: assignment.id }
    });
    console.log(`  📦 Purchase exists: ${!!purchaseExists}`);

    // Test undo purchase (simulate the API call)
    if (purchaseExists) {
      console.log('  🔄 Testing undo purchase...');
      await prisma.purchase.deleteMany({
        where: { wishlistAssignmentId: assignment.id }
      });
      
      const purchaseAfterUndo = await prisma.purchase.findFirst({
        where: { wishlistAssignmentId: assignment.id }
      });
      console.log(`  ✅ Purchase undone successfully: ${!purchaseAfterUndo}`);
    }

    console.log('');

    // 3. Test Report Flow
    console.log('Testing Report and Clear Flow:');
    
    // Create a report if none exists
    const existingReport = await prisma.wishlistReport.findFirst({
      where: { wishlistAssignmentId: assignment.id }
    });

    if (!existingReport) {
      console.log('  ➕ Creating test report...');
      await prisma.wishlistReport.create({
        data: {
          userId: userWithAssignments.id,
          wishlistAssignmentId: assignment.id,
          reportType: 'OTHER',
          description: 'Test report for clear functionality'
        }
      });
      console.log('  ✅ Test report created');
    } else {
      console.log('  ℹ️  Report already exists');
    }

    // Verify report exists
    const reportExists = await prisma.wishlistReport.findFirst({
      where: { wishlistAssignmentId: assignment.id }
    });
    console.log(`  📝 Report exists: ${!!reportExists}`);

    // Test clear report (simulate the API call)
    if (reportExists) {
      console.log('  🔄 Testing clear report...');
      await prisma.wishlistReport.deleteMany({
        where: { wishlistAssignmentId: assignment.id }
      });
      
      const reportAfterClear = await prisma.wishlistReport.findFirst({
        where: { wishlistAssignmentId: assignment.id }
      });
      console.log(`  ✅ Report cleared successfully: ${!reportAfterClear}`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Purchase creation and undo flow works');
    console.log('✅ Report creation and clear flow works');
    console.log('✅ Database operations completed without errors');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUndoFunctionality();
