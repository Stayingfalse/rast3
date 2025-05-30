import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const commonDepartments = [
  // Example tech company departments
  { name: "Engineering", domain: "example.com" },
  { name: "Product Management", domain: "example.com" },
  { name: "Design", domain: "example.com" },
  { name: "Data Science", domain: "example.com" },
  { name: "DevOps", domain: "example.com" },
  { name: "QA/Testing", domain: "example.com" },
  { name: "Sales", domain: "example.com" },
  { name: "Marketing", domain: "example.com" },
  { name: "Customer Success", domain: "example.com" },
  { name: "Human Resources", domain: "example.com" },
  { name: "Finance", domain: "example.com" },
  { name: "Operations", domain: "example.com" },
  
  // Gmail for testing
  { name: "Personal", domain: "gmail.com" },
  { name: "Freelance", domain: "gmail.com" },
  
  // Common business domains
  { name: "Engineering", domain: "microsoft.com" },
  { name: "Product", domain: "microsoft.com" },
  { name: "Sales", domain: "microsoft.com" },
  { name: "Marketing", domain: "microsoft.com" },
  
  { name: "Development", domain: "google.com" },
  { name: "Research", domain: "google.com" },
  { name: "Sales", domain: "google.com" },
  { name: "Marketing", domain: "google.com" },
];

async function main() {
  console.log("🌱 Seeding departments...");

  for (const dept of commonDepartments) {
    await prisma.department.upsert({
      where: {
        name_domain: {
          name: dept.name,
          domain: dept.domain,
        },
      },
      update: {},
      create: dept,
    });
  }

  console.log("✅ Departments seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding departments:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
