// Test script to verify cross-department assignment functionality
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testCrossDepartmentAssignments() {
  console.log("🧪 Testing cross-department assignment functionality...\n");

  // Find a user from dept-2 (should not have anyone else in same dept for same-dept assignments)
  const testUser = await prisma.user.findFirst({
    where: {
      domain: "sensee.co.uk",
      departmentId: "dept-2",
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

  if (!testUser) {
    console.log("❌ No suitable test user found in dept-2");
    return;
  }

  console.log(`🎯 Testing with user: ${testUser.email} (${testUser.department?.name})`);

  // Check same-department users (should be very limited or none)
  const sameDeptUsers = await prisma.user.findMany({
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
      email: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`\n📋 Same-department users available: ${sameDeptUsers.length}`);
  sameDeptUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.department?.name})`);
  });

  // Check cross-department users (should have several from dept-1 and dept-3)
  const crossDeptUsers = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: testUser.id } },
        { profileCompleted: true },
        { amazonWishlistUrl: { not: null } },
        { domain: testUser.domain },
        { departmentId: { not: testUser.departmentId } },
      ],
    },
    select: {
      email: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`\n🔄 Cross-department users available: ${crossDeptUsers.length}`);
  crossDeptUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.department?.name})`);
  });

  if (sameDeptUsers.length === 0 && crossDeptUsers.length > 0) {
    console.log("\n✅ Perfect scenario for testing:");
    console.log("  - No same-department assignments available");
    console.log("  - Cross-department assignments available");
    console.log("  - Modal should trigger when requesting additional assignments");
  } else {
    console.log("\n📝 Test scenario:");
    console.log(`  - ${sameDeptUsers.length} same-department users available`);
    console.log(`  - ${crossDeptUsers.length} cross-department users available`);
  }

  console.log("\n🎉 Cross-department test analysis completed!");
}

testCrossDepartmentAssignments()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Test failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
