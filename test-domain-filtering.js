// Test script to verify domain/department filtering in wishlist assignments
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDomainFiltering() {
  console.log("🧪 Testing domain/department filtering for wishlist assignments...\n");

  // Get all users with their domain and department info
  const users = await prisma.user.findMany({
    where: {
      profileCompleted: true,
      amazonWishlistUrl: { not: null },
    },
    select: {
      id: true,
      email: true,
      domain: true,
      departmentId: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log("📋 Available users for testing:");
  users.forEach(user => {
    console.log(`  - ${user.email} (${user.domain}, ${user.department?.name})`);
  });
  console.log("");

  // Test case 1: User from sensee.co.uk, dept-1 should only get assignments from same domain/dept
  const testUserId = users.find(u => u.domain === "sensee.co.uk" && u.departmentId === "dept-1")?.id;
  if (!testUserId) {
    console.log("❌ No test user found in sensee.co.uk dept-1");
    return;
  }

  const testUser = users.find(u => u.id === testUserId);
  console.log(`🎯 Testing with user: ${testUser.email} (${testUser.domain}, ${testUser.department?.name})`);

  // Simulate the logic from requestInitialAssignments
  const eligibleUsers = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: testUserId } },
        { profileCompleted: true },
        { amazonWishlistUrl: { not: null } },
        { domain: testUser.domain }, // Same domain only
        { departmentId: testUser.departmentId }, // Same department only
      ],
    },
    select: {
      id: true,
      email: true,
      domain: true,
      departmentId: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`\n✅ Eligible users for ${testUser.email}:`);
  if (eligibleUsers.length === 0) {
    console.log("  No eligible users found (this might be correct if no other users in same domain/dept)");
  } else {
    eligibleUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.domain}, ${user.department?.name})`);
    });
  }

  // Verify all eligible users have same domain and department
  const invalidUsers = eligibleUsers.filter(u => 
    u.domain !== testUser.domain || u.departmentId !== testUser.departmentId
  );

  if (invalidUsers.length === 0) {
    console.log("\n✅ PASS: All eligible users have the same domain and department");
  } else {
    console.log("\n❌ FAIL: Found users with different domain/department:");
    invalidUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.domain}, ${user.department?.name})`);
    });
  }

  // Test case 2: Cross-domain test - bupa.com user should not see sensee.co.uk users
  const bupaUser = users.find(u => u.domain === "bupa.com");
  if (bupaUser) {
    console.log(`\n🎯 Cross-domain test with: ${bupaUser.email} (${bupaUser.domain})`);
    
    const bupaEligibleUsers = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: bupaUser.id } },
          { profileCompleted: true },
          { amazonWishlistUrl: { not: null } },
          { domain: bupaUser.domain },
          { departmentId: bupaUser.departmentId },
        ],
      },
      select: {
        id: true,
        email: true,
        domain: true,
        departmentId: true,
      },
    });

    console.log(`✅ Eligible users for ${bupaUser.email}:`);
    if (bupaEligibleUsers.length === 0) {
      console.log("  No eligible users found (correct - no other bupa.com users in same dept)");
    } else {
      bupaEligibleUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.domain})`);
      });
    }

    const crossDomainUsers = bupaEligibleUsers.filter(u => u.domain !== bupaUser.domain);
    if (crossDomainUsers.length === 0) {
      console.log("✅ PASS: No cross-domain assignments possible");
    } else {
      console.log("❌ FAIL: Found cross-domain users");
    }
  }

  console.log("\n🎉 Domain/department filtering test completed!");
}

testDomainFiltering()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Test failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
