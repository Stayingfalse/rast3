import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";
import {
  isTestAuthAuthorised,
  TEST_EMAIL_DOMAIN,
} from "~/server/utils/test-auth";

/**
 * Test-only seed data for dev and e2e tests (same gate as ../login).
 *
 * POST   -> wipe and recreate a realistic, deterministic dataset: one org
 *           (domain e2e.raosanta.test) with three departments, 15 members
 *           with wishlists, assignments, purchases and kudos, plus a "giver"
 *           with a complete profile and no assignments yet.
 * DELETE -> remove everything the seed created.
 *
 * Only rows on the test email domain are ever created or deleted.
 */

const DEPARTMENTS = ["Elves Workshop", "Reindeer Logistics", "Sleigh Engineering"];

const MEMBERS: [first: string, last: string][] = [
  ["Holly", "Berry"], ["Jingle", "Bell"], ["Noel", "Frost"], ["Ivy", "Wreath"], ["Rudy", "Antler"],
  ["Candy", "Cane"], ["Gus", "Gingerbread"], ["Tinsel", "Sparks"], ["Mistle", "Toe"], ["Carol", "Singer"],
  ["Frosty", "Snow"], ["Bauble", "Shine"], ["Pip", "Pudding"], ["Star", "Topper"], ["Sprout", "Brussel"],
];

const KUDOS_MESSAGES = [
  "Thank you, mystery Santa! The book was exactly what I wanted 📚",
  "Whoever sent the fluffy socks: my feet thank you 🧦",
  "The board game arrived and the whole family played it on Christmas Eve 🎲",
  "Such a lovely surprise on a grey Monday. Thank you, elf! ✨",
];

/** The seeded member e2e tests sign in as to walk the wishlist flow. */
const GIVER_EMAIL = `giver@${TEST_EMAIL_DOMAIN}`;

function notFound() {
  return new NextResponse("Not Found", { status: 404 });
}

function wishlistUrl(n: number) {
  return `https://www.amazon.co.uk/hz/wishlist/ls/E2E${String(n).padStart(6, "0")}`;
}

async function clearSeed() {
  const users = await db.user.deleteMany({
    where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
  });
  await db.department.deleteMany({ where: { domain: TEST_EMAIL_DOMAIN } });
  await db.domain.deleteMany({ where: { name: TEST_EMAIL_DOMAIN } });
  return users.count;
}

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();

  await clearSeed();

  await db.domain.create({
    data: {
      name: TEST_EMAIL_DOMAIN,
      enabled: true,
      description: "E2E test organisation (seed data)",
    },
  });

  const departments = await Promise.all(
    DEPARTMENTS.map((name) =>
      db.department.create({ data: { name, domain: TEST_EMAIL_DOMAIN } }),
    ),
  );

  const now = new Date();
  const members = [];
  for (const [i, [firstName, lastName]] of MEMBERS.entries()) {
    const email = `${firstName}.${lastName}@${TEST_EMAIL_DOMAIN}`.toLowerCase();
    members.push(
      await db.user.create({
        data: {
          email,
          workEmail: email,
          emailVerified: now,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          domain: TEST_EMAIL_DOMAIN,
          departmentId: departments[i % departments.length]!.id,
          amazonWishlistUrl: wishlistUrl(i + 1),
          profileCompleted: true,
          profileCompletedAt: now,
        },
      }),
    );
  }

  const giver = await db.user.create({
    data: {
      email: GIVER_EMAIL,
      workEmail: GIVER_EMAIL,
      emailVerified: now,
      name: "Gail Giver",
      firstName: "Gail",
      lastName: "Giver",
      domain: TEST_EMAIL_DOMAIN,
      departmentId: departments[0]!.id,
      amazonWishlistUrl: wishlistUrl(999),
      profileCompleted: true,
      profileCompletedAt: now,
    },
  });

  // Each member holds two wishlists from their own department; every other
  // assignment has been gifted, and some of those gifts have kudos.
  let assignments = 0;
  let purchases = 0;
  let kudos = 0;
  for (const [i, member] of members.entries()) {
    const sameDept = members.filter(
      (m) => m.departmentId === member.departmentId && m.id !== member.id,
    );
    for (const k of [0, 1]) {
      const owner = sameDept[(i + k) % sameDept.length]!;
      const assignment = await db.wishlistAssignment.create({
        data: { assignedUserId: member.id, wishlistOwnerId: owner.id },
      });
      assignments++;
      if ((i + k) % 2 === 0) {
        const purchase = await db.purchase.create({
          data: {
            userId: member.id,
            wishlistAssignmentId: assignment.id,
            notes: k === 0 ? "Something cosy for winter" : null,
          },
        });
        purchases++;
        if (kudos < KUDOS_MESSAGES.length && i % 3 === 0) {
          await db.kudos.create({
            data: {
              userId: owner.id,
              purchaseId: purchase.id,
              message: KUDOS_MESSAGES[kudos]!,
              images: "[]",
            },
          });
          kudos++;
        }
      }
    }
  }

  // The giver thanked their Santa last Christmas, so their stamp album has a
  // collected 2025 stamp (seasons run August to July; see src/server/stamps.ts).
  await db.kudos.create({
    data: {
      userId: giver.id,
      message: "Last year's parcel was perfect. Thank you, Santa!",
      images: "[]",
      createdAt: new Date("2025-12-20T10:00:00Z"),
    },
  });
  kudos++;

  return NextResponse.json({
    domain: TEST_EMAIL_DOMAIN,
    departments: departments.map((d) => d.name),
    members: members.length + 1,
    assignments,
    purchases,
    kudos,
    giver: { email: giver.email, department: DEPARTMENTS[0] },
  });
}

export async function DELETE(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();
  return NextResponse.json({ deletedUsers: await clearSeed() });
}
