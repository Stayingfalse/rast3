// Test script to verify wishlist assignment functionality end-to-end
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testWishlistAssignments() {
  console.log("🧪 Testing wishlist assignment functionality...\n");

  // Clean up any existing assignments to start fresh
  await prisma.wishlistAssignment.deleteMany({});
  console.log("🧹 Cleaned up existing assignments\n");

  // Get a test user from dept-1 (should have 2 other users in same dept)
  const testUser = await prisma.user.findFirst({
    where: {
      domain: "sensee.co.uk",
      departmentId: "dept-1",
      profileCompleted: true,
      amazonWishlistUrl: { not: null },
    },
    select: {
      id: true,
      email: true,
      domain: true,
      departmentId: true,
    },
  });

  if (!testUser) {
    console.log("❌ No suitable test user found");
    return;
  }

  console.log(`🎯 Testing with user: ${testUser.email}`);

  // Simulate the requestInitialAssignments logic
  const eligibleUsers = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: testUser.id } },
        { profileCompleted: true },
        { amazonWishlistUrl: { not: null } },
        { domain: testUser.domain },
        { departmentId: testUser.departmentId },
      ],
    },
    select: {
      id: true,
      email: true,
      ownedWishlist: {
        where: { isActive: true },
        select: { assignedUserId: true },
      },
    },
  });

  console.log(`\n📋 Found ${eligibleUsers.length} eligible users for initial assignments`);

  // Sort by assignment count (prioritize users with fewer assignments)
  const sortedUsers = eligibleUsers
    .map(user => ({
      ...user,
      assignmentCount: user.ownedWishlist.length,
    }))
    .sort((a, b) => a.assignmentCount - b.assignmentCount);

  // Select up to 3 users
  const selectedUsers = sortedUsers.slice(0, 3);
  console.log(`✅ Selected ${selectedUsers.length} users for assignment`);

  if (selectedUsers.length === 0) {
    console.log("ℹ️  No users available for assignment (this might be expected if not enough users in same dept)");
    return;
  }

  // Create assignments (simulating the actual database operations)
  const assignments = await Promise.all(
    selectedUsers.map(user =>
      prisma.wishlistAssignment.create({
        data: {
          assignedUserId: testUser.id,
          wishlistOwnerId: user.id,
        },
        include: {
          wishlistOwner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              amazonWishlistUrl: true,
            },
          },
          purchases: true,
          reports: true,
        },
      })
    )
  );

  console.log(`\n🎉 Created ${assignments.length} assignments:`);
  assignments.forEach((assignment, index) => {
    console.log(`  ${index + 1}. ${assignment.wishlistOwner.email} -> ${testUser.email}`);
  });

  // Test the data structure that the frontend expects
  console.log("\n🔍 Testing frontend data structure compatibility:");
  assignments.forEach((assignment, index) => {
    const hasPurchase = !!assignment.purchases;
    const hasReport = assignment.reports.length > 0;
    
    console.log(`  Assignment ${index + 1}:`);
    console.log(`    - Has purchase: ${hasPurchase}`);
    console.log(`    - Has reports: ${hasReport}`);
    console.log(`    - Owner name available: ${!!assignment.wishlistOwner.firstName}`);
    console.log(`    - Wishlist URL available: ${!!assignment.wishlistOwner.amazonWishlistUrl}`);
  });

  // Test purchase creation
  if (assignments.length > 0) {
    console.log("\n💰 Testing purchase creation:");
    const testAssignment = assignments[0];
    
    const purchase = await prisma.purchase.create({
      data: {
        userId: testUser.id,
        wishlistAssignmentId: testAssignment.id,
        notes: "Test purchase for verification",
      },
    });

    console.log(`✅ Created purchase for assignment ${testAssignment.id}`);

    // Fetch the assignment again to test the updated relationship
    const updatedAssignment = await prisma.wishlistAssignment.findUnique({
      where: { id: testAssignment.id },
      include: {
        wishlistOwner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            amazonWishlistUrl: true,
          },
        },
        purchases: true,
        reports: true,
      },
    });

    if (updatedAssignment) {
      const hasPurchase = !!updatedAssignment.purchases;
      console.log(`✅ Updated assignment has purchase: ${hasPurchase}`);
      console.log(`   Purchase ID: ${updatedAssignment.purchases?.id}`);
    }
  }

  console.log("\n🎉 Wishlist assignment test completed successfully!");
}

testWishlistAssignments()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Test failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
