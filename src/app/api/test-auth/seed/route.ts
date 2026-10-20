import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { createOrgGroup, createTeam, setTeam, setWorkplace } from "~/server/groups";
import { isTestAuthAuthorised, testDomain } from "~/server/utils/test-auth";

/**
 * Test-only seed data for dev and e2e tests (same gate as ../login).
 *
 * POST   -> wipe and recreate a realistic, deterministic dataset: one org
 *           (domain e2e.raosanta.test) with three teams, 15 members
 *           with wishlists, assignments, purchases and kudos, plus a "giver"
 *           with a complete profile and no assignments yet.
 * DELETE -> remove everything the seed created.
 *
 * Only rows on the test email domain are ever created or deleted.
 */

const TEAMS = ["Elves Workshop", "Reindeer Logistics", "Sleigh Engineering"];

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

/**
 * Day 9 isolation fixtures. Emails stay on the test domain (so cleanup finds
 * them) but their organisation is set directly: a second, approved
 * organisation, and a member whose organisation is still pending approval.
 */
const RIVALS = ["Rival One", "Rival Two", "Rival Three"];
const RIVAL_KUDOS = "Rival org thank-you: should never show in the seed org's feeds";

function notFound() {
  return new NextResponse("Not Found", { status: 404 });
}

function wishlistUrl(n: number) {
  return `https://www.amazon.co.uk/hz/wishlist/ls/E2E${String(n).padStart(6, "0")}`;
}

async function clearSeed(domain: string) {
  const users = await db.user.deleteMany({
    where: { email: { endsWith: `@${domain}` } },
  });
  // Any test organisation: the seed's own plus ones e2e tests set up
  // (all on subdomains of the test domain)
  const testOrg = { endsWith: `.${domain}` };
  // Team groups and memberships go with the organisation (cascade)
  await db.group.deleteMany({
    where: {
      OR: [{ emailDomain: domain }, { emailDomain: testOrg }],
    },
  });
  return users.count;
}

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();

  // Everything lives under this run's test domain (see testDomain)
  const domain = testDomain(req);
  const RIVAL_DOMAIN = `rival.${domain}`;
  const PENDING_DOMAIN = `pending.${domain}`;
  // The seeded member e2e tests sign in as to walk the wishlist flow
  const GIVER_EMAIL = `giver@${domain}`;
  await clearSeed(domain);

  // Organisations are never created from an email (Day 12), so the seed
  // creates them explicitly, as an admin would: two live, one pending.
  const org = await createOrgGroup(db, domain, { status: "ACTIVE" });
  await db.group.update({
    where: { id: org.id },
    data: { description: "E2E test organisation (seed data)" },
  });
  const teams = [];
  for (const name of TEAMS) teams.push(await createTeam(db, org, name));
  const join = async (userId: string, orgId: string, teamId: string | null, role?: "ADMIN") => {
    await setWorkplace(db, userId, orgId, role);
    if (teamId) await setTeam(db, userId, orgId, teamId);
  };

  const now = new Date();
  const members = [];
  for (const [i, [firstName, lastName]] of MEMBERS.entries()) {
    const email = `${firstName}.${lastName}@${domain}`.toLowerCase();
    members.push(
      await db.user.create({
        data: {
          email,
          workEmail: email,
          emailVerified: now,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          amazonWishlistUrl: wishlistUrl(i + 1),
          profileCompleted: true,
          profileCompletedAt: now,
        },
      }),
    );
    await join(members[i]!.id, org.id, teams[i % teams.length]!.id);
  }
  const teamOf = (i: number) => i % teams.length;

  const giver = await db.user.create({
    data: {
      email: GIVER_EMAIL,
      workEmail: GIVER_EMAIL,
      emailVerified: now,
      name: "Gail Giver",
      firstName: "Gail",
      lastName: "Giver",
      amazonWishlistUrl: wishlistUrl(999),
      profileCompleted: true,
      profileCompletedAt: now,
    },
  });
  await join(giver.id, org.id, teams[0]!.id);

  // Each member holds two wishlists from their own team; every other
  // assignment has been gifted, and some of those gifts have kudos.
  let assignments = 0;
  let purchases = 0;
  let kudos = 0;
  for (const [i, member] of members.entries()) {
    const sameDept = members.filter(
      (m, j) => teamOf(j) === teamOf(i) && m.id !== member.id,
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

  // A second, approved organisation with its own team, members and a
  // thank-you, plus one member of an organisation awaiting approval.
  const rivalOrg = await createOrgGroup(db, RIVAL_DOMAIN, { status: "ACTIVE" });
  await db.group.update({ where: { id: rivalOrg.id }, data: { description: "E2E rival org" } });
  const rivalTeam = await createTeam(db, rivalOrg, "Rival Team");
  const rivals = [];
  for (const [i, name] of RIVALS.entries()) {
    const email = `rival${i + 1}@${domain}`;
    rivals.push(
      await db.user.create({
        data: {
          email,
          emailVerified: now,
          name,
          firstName: name.split(" ")[0],
          lastName: name.split(" ")[1],
          amazonWishlistUrl: wishlistUrl(901 + i),
          profileCompleted: true,
          profileCompletedAt: now,
        },
      }),
    );
    // rival1 organises the rival organisation
    await join(rivals[i]!.id, rivalOrg.id, rivalTeam.id, i === 0 ? "ADMIN" : undefined);
  }
  const rivalAssignment = await db.wishlistAssignment.create({
    data: { assignedUserId: rivals[1]!.id, wishlistOwnerId: rivals[2]!.id },
  });
  const rivalPurchase = await db.purchase.create({
    data: { userId: rivals[1]!.id, wishlistAssignmentId: rivalAssignment.id },
  });
  await db.kudos.create({
    data: {
      userId: rivals[2]!.id,
      purchaseId: rivalPurchase.id,
      message: RIVAL_KUDOS,
      images: "[]",
    },
  });
  const pendingOrg = await createOrgGroup(db, PENDING_DOMAIN, { status: "PENDING" });
  const pending = await db.user.create({
    data: {
      email: `pending@${domain}`,
      emailVerified: now,
      name: "Penny Pending",
      amazonWishlistUrl: wishlistUrl(950),
      profileCompleted: true,
      profileCompletedAt: now,
    },
  });
  await join(pending.id, pendingOrg.id, null);

  const inSeedOrg = {
    OR: [
      { emailDomain: domain },
      { parent: { emailDomain: domain } },
    ],
  };
  const groups = await db.group.count({ where: inSeedOrg });
  const memberships = await db.membership.count({
    where: { group: inSeedOrg },
  });

  return NextResponse.json({
    domain,
    rivalDomain: RIVAL_DOMAIN,
    rivalKudos: RIVAL_KUDOS,
    groups,
    memberships,
    teams: TEAMS,
    members: members.length + 1,
    assignments,
    purchases,
    kudos,
    giver: { email: giver.email, team: TEAMS[0] },
  });
}

export async function DELETE(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();
  return NextResponse.json({ deletedUsers: await clearSeed(testDomain(req)) });
}
