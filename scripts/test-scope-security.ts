/**
 * Test script to verify scope-based hidden post filtering
 * This script helps verify that domain/department admins only see hidden posts within their scope
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  console.log('🔄 Setting up test data...');

  // Create test departments
  const dept1 = await prisma.department.upsert({
    where: { name_domain: { name: 'Engineering', domain: 'company.com' } },
    update: {},
    create: { name: 'Engineering', domain: 'company.com' }
  });

  const dept2 = await prisma.department.upsert({
    where: { name_domain: { name: 'Marketing', domain: 'company.com' } },
    update: {},
    create: { name: 'Marketing', domain: 'company.com' }
  });

  console.log('📁 Created departments:', { dept1: dept1.name, dept2: dept2.name });

  // Create test users
  const siteAdmin = await prisma.user.upsert({
    where: { email: 'site.admin@test.com' },
    update: {},
    create: {
      email: 'site.admin@test.com',
      name: 'Site Admin',
      firstName: 'Site',
      lastName: 'Admin',
      domain: 'company.com',
      departmentId: dept1.id,
      adminLevel: 'SITE'
    }
  });

  const domainAdmin = await prisma.user.upsert({
    where: { email: 'domain.admin@test.com' },
    update: {},
    create: {
      email: 'domain.admin@test.com',
      name: 'Domain Admin',
      firstName: 'Domain',
      lastName: 'Admin',
      domain: 'company.com',
      departmentId: dept1.id,
      adminLevel: 'DOMAIN'
    }
  });

  const deptAdmin = await prisma.user.upsert({
    where: { email: 'dept.admin@test.com' },
    update: {},
    create: {
      email: 'dept.admin@test.com',
      name: 'Dept Admin',
      firstName: 'Department',
      lastName: 'Admin',
      domain: 'company.com',
      departmentId: dept1.id,
      adminLevel: 'DEPARTMENT'
    }
  });

  const regularUser1 = await prisma.user.upsert({
    where: { email: 'user1@test.com' },
    update: {},
    create: {
      email: 'user1@test.com',
      name: 'User One',
      firstName: 'User',
      lastName: 'One',
      domain: 'company.com',
      departmentId: dept1.id
    }
  });

  const regularUser2 = await prisma.user.upsert({
    where: { email: 'user2@test.com' },
    update: {},
    create: {
      email: 'user2@test.com',
      name: 'User Two',
      firstName: 'User',
      lastName: 'Two',
      domain: 'company.com',
      departmentId: dept2.id
    }
  });

  const externalUser = await prisma.user.upsert({
    where: { email: 'external@other.com' },
    update: {},
    create: {
      email: 'external@other.com',
      name: 'External User',
      firstName: 'External',
      lastName: 'User',
      domain: 'other.com',
      departmentId: dept2.id
    }
  });

  console.log('👥 Created users:', {
    siteAdmin: siteAdmin.email,
    domainAdmin: domainAdmin.email,
    deptAdmin: deptAdmin.email,
    regularUser1: regularUser1.email,
    regularUser2: regularUser2.email,
    externalUser: externalUser.email
  });

  // Create test kudos posts (mix of visible and hidden)
  const kudos1 = await prisma.kudos.create({
    data: {
      userId: regularUser1.id,
      message: 'Public post from Engineering user',
      images: JSON.stringify([]),
      hidden: false
    }
  });

  const kudos2 = await prisma.kudos.create({
    data: {
      userId: regularUser1.id,
      message: 'Hidden post from Engineering user',
      images: JSON.stringify([]),
      hidden: true,
      moderatedBy: siteAdmin.id,
      moderatedAt: new Date()
    }
  });

  const kudos3 = await prisma.kudos.create({
    data: {
      userId: regularUser2.id,
      message: 'Hidden post from Marketing user',
      images: JSON.stringify([]),
      hidden: true,
      moderatedBy: siteAdmin.id,
      moderatedAt: new Date()
    }
  });

  const kudos4 = await prisma.kudos.create({
    data: {
      userId: externalUser.id,
      message: 'Hidden post from external domain user',
      images: JSON.stringify([]),
      hidden: true,
      moderatedBy: siteAdmin.id,
      moderatedAt: new Date()
    }
  });

  const kudos5 = await prisma.kudos.create({
    data: {
      userId: regularUser2.id,
      message: 'Public post from Marketing user',
      images: JSON.stringify([]),
      hidden: false
    }
  });

  console.log('📝 Created kudos posts:', {
    publicEngineering: kudos1.id,
    hiddenEngineering: kudos2.id,
    hiddenMarketing: kudos3.id,
    hiddenExternal: kudos4.id,
    publicMarketing: kudos5.id
  });

  return {
    users: { siteAdmin, domainAdmin, deptAdmin, regularUser1, regularUser2, externalUser },
    departments: { dept1, dept2 },
    kudos: { kudos1, kudos2, kudos3, kudos4, kudos5 }
  };
}

async function testVisibilityRules(testData: any) {
  console.log('\n🔍 Testing visibility rules...\n');

  const { users } = testData;

  // Test different scenarios
  const scenarios = [
    {
      name: 'Site Admin - Site Scope',
      userId: users.siteAdmin.id,
      scope: 'site',
      expectedVisible: ['All posts including all hidden posts']
    },
    {
      name: 'Domain Admin - Site Scope',
      userId: users.domainAdmin.id,
      scope: 'site',
      expectedVisible: ['All public posts + hidden posts from company.com domain only']
    },
    {
      name: 'Domain Admin - Domain Scope',
      userId: users.domainAdmin.id,
      scope: 'domain',
      expectedVisible: ['Public posts from company.com + hidden posts from company.com only']
    },
    {
      name: 'Department Admin - Site Scope',
      userId: users.deptAdmin.id,
      scope: 'site',
      expectedVisible: ['All public posts + hidden posts from Engineering dept only']
    },
    {
      name: 'Department Admin - Department Scope',
      userId: users.deptAdmin.id,
      scope: 'department',
      expectedVisible: ['Public posts from Engineering + hidden posts from Engineering only']
    },
    {
      name: 'Regular User - Site Scope',
      userId: users.regularUser1.id,
      scope: 'site',
      expectedVisible: ['Only public posts (no hidden posts)']
    }
  ];

  for (const scenario of scenarios) {
    console.log(`📊 Testing: ${scenario.name}`);
    console.log(`   Expected: ${scenario.expectedVisible.join(', ')}`);

    // Simulate the query logic from the router
    const user = await prisma.user.findUnique({
      where: { id: scenario.userId },
      include: { department: true }
    });

    let whereClause: any = {};
    let scopeFilter: any = {};

    // Apply scope filtering
    if (scenario.scope === 'department' && user?.departmentId) {
      scopeFilter = { user: { departmentId: user.departmentId } };
    } else if (scenario.scope === 'domain' && user?.domain) {
      scopeFilter = { user: { domain: user.domain } };
    }

    // Apply hidden post visibility rules
    const adminLevel = user?.adminLevel;
    const canModerate = adminLevel === 'SITE' || adminLevel === 'DOMAIN' || adminLevel === 'DEPARTMENT';

    if (!canModerate) {
      // Regular users: only see non-hidden posts
      whereClause = {
        hidden: false,
        ...scopeFilter
      };
    } else if (adminLevel === 'SITE') {
      // Site admins: see everything
      whereClause = scopeFilter;
    } else {
      // Domain/Department admins: complex filtering
      if (adminLevel === 'DOMAIN') {
        whereClause = {
          OR: [
            { 
              hidden: false,
              ...scopeFilter
            },
            { 
              AND: [
                { hidden: true },
                { user: { domain: user.domain } },
                ...(Object.keys(scopeFilter).length > 0 ? [scopeFilter] : [])
              ]
            }
          ]
        };
      } else if (adminLevel === 'DEPARTMENT') {
        whereClause = {
          OR: [
            { 
              hidden: false,
              ...scopeFilter
            },
            { 
              AND: [
                { hidden: true },
                { user: { departmentId: user.departmentId } },
                ...(Object.keys(scopeFilter).length > 0 ? [scopeFilter] : [])
              ]
            }
          ]
        };
      }
    }

    const visibleKudos = await prisma.kudos.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            domain: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Found ${visibleKudos.length} posts:`);
    visibleKudos.forEach(kudos => {
      const status = kudos.hidden ? '🔒 HIDDEN' : '👁️  PUBLIC';
      const userInfo = `${kudos.user.name} (${kudos.user.domain}, ${kudos.user.department?.name})`;
      console.log(`     ${status}: ${kudos.message} - by ${userInfo}`);
    });
    console.log('');
  }
}

async function main() {
  try {
    console.log('🚀 Starting scope-based security test...\n');

    const testData = await createTestData();
    await testVisibilityRules(testData);

    console.log('✅ Test completed successfully!');
    console.log('\n📋 Summary of expected behavior:');
    console.log('• Site admins: See all posts including all hidden posts');
    console.log('• Domain admins: See all public posts + hidden posts only from their domain');
    console.log('• Department admins: See all public posts + hidden posts only from their department');
    console.log('• Regular users: See only public posts (no hidden posts)');
    console.log('• Scope filtering (dept/domain/site) applies to all visibility rules');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
