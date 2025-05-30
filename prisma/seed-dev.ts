import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding development database with extensive data...");

  // Create multiple domains
  const domains = ["example.com", "company.org", "startup.io", "enterprise.net"];
  
  await Promise.all(
    domains.map((domain) =>
      prisma.domain.upsert({
        where: { name: domain },
        update: {},
        create: {
          name: domain,
          enabled: Math.random() > 0.2, // 80% enabled
        },
      })
    )
  );

  // Create departments for each domain
  const departmentNames = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"];
  const departments = [];
  
  for (const domain of domains) {
    for (const deptName of departmentNames.slice(0, Math.floor(Math.random() * 4) + 2)) {
      const dept = await prisma.department.create({
        data: {
          name: deptName,
          domain: domain,
        },
      });
      departments.push(dept);
    }
  }

  // Generate users
  const firstNames = ["John", "Jane", "Bob", "Alice", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
  
  const users = [];
  for (let i = 0; i < 25; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]!;
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]!;
    const domain = domains[Math.floor(Math.random() * domains.length)]!;
    const department = departments.find(d => d.domain === domain);
    
    const user = await prisma.user.create({
      data: {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        domain,
        profileCompleted: Math.random() > 0.3, // 70% completed
        departmentId: department?.id || null,
        role: i === 0 ? "ADMIN" : "USER", // First user is admin
      },
    });
    users.push(user);
  }

  // Generate links
  const linkTitles = [
    "Company Portal", "Documentation Hub", "Time Tracking", "Expense Reports",
    "Project Management", "Team Calendar", "Resource Library", "Training Center",
    "Support Desk", "Analytics Dashboard", "Code Repository", "Design System",
    "API Documentation", "Internal Wiki", "Meeting Rooms", "Benefits Portal"
  ];

  const linkDescriptions = [
    "Main company portal for employees",
    "Comprehensive documentation and guides",
    "Track your work hours and projects",
    "Submit and manage expense reports",
    "Manage projects and collaborate with teams",
    "Shared calendar for team events",
    "Access to company resources and tools",
    "Professional development and training",
    "Get help and submit support tickets",
    "Business intelligence and metrics",
    "Source code and version control",
    "UI components and design guidelines",
    "API references and examples",
    "Knowledge base and company information",
    "Book conference rooms and spaces",
    "Employee benefits and HR resources"
  ];

  const tags = [
    ["portal", "main", "dashboard"],
    ["docs", "help", "reference"],
    ["time", "tracking", "hours"],
    ["expense", "finance", "reports"],
    ["project", "collaboration", "teams"],
    ["calendar", "events", "meetings"],
    ["resources", "tools", "assets"],
    ["training", "development", "learning"],
    ["support", "help", "tickets"],
    ["analytics", "metrics", "data"],
    ["code", "git", "development"],
    ["design", "ui", "components"],
    ["api", "docs", "reference"],
    ["wiki", "knowledge", "information"],
    ["rooms", "booking", "facilities"],
    ["benefits", "hr", "employee"]
  ];

  for (let i = 0; i < linkTitles.length; i++) {
    const domain = domains[Math.floor(Math.random() * domains.length)]!;
    const department = Math.random() > 0.4 ? departments.find(d => d.domain === domain) : null;
    const creator = users.find(u => u.domain === domain) || users[0]!;
    
    await prisma.link.create({
      data: {
        title: linkTitles[i]!,
        url: `https://${linkTitles[i]!.toLowerCase().replace(/\s+/g, '-')}.${domain}`,
        description: linkDescriptions[i]!,
        domain,
        departmentId: department?.id || null,
        createdById: creator.id,
        isPublic: Math.random() > 0.3, // 70% public
        tags: tags[i] || ["general"],
      },
    });
  }

  const stats = await prisma.user.groupBy({
    by: ['domain'],
    _count: true,
  });

  console.log(`✅ Created ${domains.length} domains`);
  console.log(`✅ Created ${departments.length} departments`);
  console.log(`✅ Created ${users.length} users`);
  console.log(`✅ Created ${linkTitles.length} links`);
  console.log("📊 Users by domain:", stats);
  console.log("🎉 Development seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Development seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
