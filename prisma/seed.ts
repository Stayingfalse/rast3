import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create domains first
  const domains = await Promise.all([
    prisma.domain.upsert({
      where: { name: "sensee.co.uk" },
      update: {},
      create: {
        name: "sensee.co.uk",
        enabled: true,
      },
    }),
    prisma.domain.upsert({
      where: { name: "bupa.com" },
      update: {},
      create: {
        name: "bupa.com",
        enabled: true,
      },
    }),
  ]);

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { id: "dept-1" },
      update: {},
      create: {
        id: "dept-1",
        name: "Bupa Technology",
        domain: "sensee.co.uk",
      },
    }),
    prisma.department.upsert({
      where: { id: "dept-2" },
      update: {},
      create: {
        id: "dept-2",
        name: "Bupa Digital Health",
        domain: "sensee.co.uk",
      },
    }),
    prisma.department.upsert({
      where: { id: "dept-3" },
      update: {},
      create: {
        id: "dept-3",
        name: "Bupa Operations",
        domain: "sensee.co.uk",
      },
    }),
    prisma.department.upsert({
      where: { id: "dept-4" },
      update: {},
      create: {
        id: "dept-4",
        name: "Bupa Clinical",
        domain: "bupa.com",
      },
    }),
  ]);

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@sensee.co.uk" },
      update: {},
      create: {
        email: "admin@sensee.co.uk",
        workEmail: "admin@sensee.co.uk",
        name: "Admin User",
        firstName: "Admin",
        lastName: "User",
        domain: "sensee.co.uk",
        profileCompleted: true,
        adminLevel: "USER",
        amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/1ABCDEFGHIJKL",
        department: {
          connect: { id: "dept-1" }
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "john.smith@sensee.co.uk" },
      update: {},
      create: {
        email: "john.smith@sensee.co.uk",
        workEmail: "john.smith@sensee.co.uk",
        name: "John Smith",
        firstName: "John",
        lastName: "Smith",
        domain: "sensee.co.uk",
        profileCompleted: true,
        amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/2BCDEFGHIJKLM",
        department: {
          connect: { id: "dept-1" }
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "sarah.jones@sensee.co.uk" },
      update: {},
      create: {
        email: "sarah.jones@sensee.co.uk",
        workEmail: "sarah.jones@sensee.co.uk",
        name: "Sarah Jones",
        firstName: "Sarah",
        lastName: "Jones",
        domain: "sensee.co.uk",
        profileCompleted: true,
        amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/3CDEFGHIJKLMN",
        department: {
          connect: { id: "dept-2" }
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "mike.taylor@sensee.co.uk" },
      update: {},
      create: {
        email: "mike.taylor@sensee.co.uk",
        workEmail: "mike.taylor@sensee.co.uk",
        name: "Mike Taylor",
        firstName: "Mike",
        lastName: "Taylor",
        domain: "sensee.co.uk",
        profileCompleted: false,
        amazonWishlistUrl: null, // Incomplete profile, no wishlist yet
        department: {
          connect: { id: "dept-1" }
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "emma.wilson@sensee.co.uk" },
      update: {},
      create: {
        email: "emma.wilson@sensee.co.uk",
        workEmail: "emma.wilson@sensee.co.uk",
        name: "Emma Wilson",
        firstName: "Emma",
        lastName: "Wilson",
        domain: "sensee.co.uk",
        profileCompleted: true,
        amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/4DEFGHIJKLMNO",
        department: {
          connect: { id: "dept-3" }
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "david.brown@sensee.co.uk" },
      update: {},
      create: {
        email: "david.brown@sensee.co.uk",
        workEmail: "david.brown@sensee.co.uk",
        name: "David Brown",
        firstName: "David",
        lastName: "Brown",
        domain: "sensee.co.uk",
        profileCompleted: false,
        amazonWishlistUrl: null, // Incomplete profile, no wishlist yet
        department: {
          connect: { id: "dept-2" }
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "lisa.garcia@sensee.co.uk" },
      update: {},
      create: {
        email: "lisa.garcia@sensee.co.uk",
        workEmail: "lisa.garcia@sensee.co.uk",
        name: "Lisa Garcia",
        firstName: "Lisa",
        lastName: "Garcia",
        domain: "sensee.co.uk",
        profileCompleted: true,
        amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/5EFGHIJKLMNOP",
        department: {
          connect: { id: "dept-1" }
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "dr.james.clark@bupa.com" },
      update: {},
      create: {
        email: "dr.james.clark@bupa.com",
        workEmail: "dr.james.clark@bupa.com",
        name: "Dr. James Clark",
        firstName: "James",
        lastName: "Clark",
        domain: "bupa.com",
        profileCompleted: true,
        amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/6FGHIJKLMNOPQ",
        department: {
          connect: { id: "dept-4" }
        },
      },
    }),
  ]);

  console.log(`✅ Created ${domains.length} domains`);
  console.log(`✅ Created ${departments.length} departments`);
  console.log(`✅ Created ${users.length} users`);
  console.log("🎉 Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
