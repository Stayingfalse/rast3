import { arrivalPath } from "~/server/gifts";
import { inviteLink, inviteMessage } from "~/lib/invite-message";
import { siteUrl, unsubscribeUrl } from "./unsubscribe";
import type { Message } from "./mailer";

/**
 * Reminder emails in the site's Christmas Post look: night-blue page, a
 * cream label with the airmail stripe, one red button. Plain tables and
 * inline styles, so they hold up in Outlook and Gmail.
 */
const C = {
  night: "#13264d",
  label: "#f6f0e2",
  ink: "#18223a",
  inkSoft: "#4b5670",
  post: "#b8262c",
  frostSoft: "#aebbd4",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Parts = {
  userId: string;
  subject: string;
  /** small capitals line above the heading */
  kicker: string;
  heading: string;
  paragraphs: string[];
  /** a boxed passage after the paragraphs, e.g. a message to copy and paste */
  quote?: string;
  /** figures in a two-column table after the paragraphs */
  rows?: [string, string][];
  /** after the quote and the figures */
  after?: string[];
  button: { label: string; path: string };
};

const para = (t: string) =>
  `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${C.ink};">${esc(t)}</p>`;

function render(p: Parts): Message {
  const url = `${siteUrl()}${p.button.path}`;
  const unsubscribe = unsubscribeUrl(p.userId);
  const stripe = `repeating-linear-gradient(135deg, ${C.post} 0 12px, ${C.label} 12px 18px, ${C.night} 18px 30px, ${C.label} 30px 36px)`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(p.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.night};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.night};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#e6ecf7;">Random Acts of Santa</td></tr>
<tr><td style="background:${C.label};border-radius:6px;overflow:hidden;">
<div style="height:10px;background:${C.post};background-image:${stripe};"></div>
<div style="padding:28px 28px 32px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${C.inkSoft};">${esc(p.kicker)}</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:${C.ink};">${esc(p.heading)}</h1>
${p.paragraphs.map(para).join("\n")}
${
  p.quote
    ? `<div style="margin:0 0 14px;padding:12px 14px;border-left:4px solid ${C.post};background:#ffffff;font-size:15px;line-height:1.5;color:${C.ink};">${esc(p.quote)}</div>`
    : ""
}${
  p.rows?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 14px;border-collapse:collapse;">${p.rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px 6px 0;border-bottom:1px solid #e2d9c4;font-size:15px;color:${C.inkSoft};">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #e2d9c4;font-size:15px;font-weight:bold;color:${C.ink};text-align:right;">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`
    : ""
}
${(p.after ?? []).map(para).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 0;"><tr><td style="background:${C.post};border-radius:6px;">
<a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(p.button.label)}</a>
</td></tr></table>
</div></td></tr>
<tr><td style="padding:20px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${C.frostSoft};">
You're getting this because you have a Random Acts of Santa account. Sign-in links still arrive if you stop these.<br>
<a href="${esc(unsubscribe)}" style="color:${C.frostSoft};">Stop reminder emails</a>
</td></tr>
</table></td></tr></table>
</body></html>`;
  const text = [
    p.kicker.toUpperCase(),
    "",
    p.heading,
    "",
    ...p.paragraphs.flatMap((t) => [t, ""]),
    ...(p.quote ? [...p.quote.split("\n").map((l) => `> ${l}`), ""] : []),
    ...(p.rows?.length ? [...p.rows.map(([k, v]) => `${k}: ${v}`), ""] : []),
    ...(p.after ?? []).flatMap((t) => [t, ""]),
    `${p.button.label}: ${url}`,
    "",
    "--",
    "You're getting this because you have a Random Acts of Santa account.",
    `Stop reminder emails: ${unsubscribe}`,
  ].join("\n");
  return { subject: p.subject, html, text };
}

const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });

/** Before the season: returning members confirm their wishlist (check in). */
export const checkInNudge = (userId: string, season: number, opensAt: Date) =>
  render({
    userId,
    subject: `Christmas ${season}: check in so your wishlist is handed out`,
    kicker: `Christmas ${season}`,
    heading: "Are you in this Christmas?",
    paragraphs: [
      `Random Acts of Santa opens for gifting on ${day(opensAt)}.`,
      "Take a minute to check in: confirm your Amazon wishlist (or swap in this year's) and your groups. Until you do, your list isn't handed out and you can't pick anyone else's up.",
    ],
    button: { label: "Check in", path: "/" },
  });

/** Gifting has opened. */
export const seasonOpen = (
  userId: string,
  season: number,
  closesAt: Date,
  checkedIn: boolean,
) =>
  render({
    userId,
    subject: checkedIn
      ? `Gifting is open: pick up a wishlist`
      : `Gifting is open: check in to take part`,
    kicker: `Christmas ${season}`,
    heading: "Gifting is open",
    paragraphs: checkedIn
      ? [
          "Wishlists from your groups are ready to pick up. There's no draw: pick one up whenever you're ready, send a gift anonymously, and pick up another if you like.",
          `Gifting closes on ${day(closesAt)}.`,
        ]
      : [
          "Wishlists from your groups are ready to pick up, but you haven't checked in for this Christmas yet.",
          "Check in to confirm your wishlist: then yours is handed out too, and you can pick up others.",
        ],
    button: checkedIn
      ? { label: "Pick up a wishlist", path: "/" }
      : { label: "Check in", path: "/" },
  });

/**
 * A few days after a Santa marked a gift to your list, if you haven't
 * posted a thank-you. Worded as a check-in, never "you've been sent a gift",
 * so the surprise is kept (owner, 22 Oct). The button says it arrived in
 * one tap (Day 26), from a signed link for the gift this email is about.
 */
export const giftCheckIn = (userId: string, season: number, purchaseId: string) =>
  render({
    userId,
    subject: "Checking in: has anything turned up?",
    kicker: `Christmas ${season}`,
    heading: "How's your Christmas shaping up?",
    paragraphs: [
      "Just checking in. If a parcel from a mystery Santa has arrived, tap below to let them know it got to you. You can post them a thank-you postcard too, if you like.",
      "Nothing yet? There's nothing you need to do.",
    ],
    button: { label: "Something's arrived", path: arrivalPath(purchaseId) },
  });

const and = (names: string[]) =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/**
 * Day 24: new members' wishlists that haven't had a gift yet, for people
 * who are already gifting this season. At most weekly.
 */
export const newLists = (
  userId: string,
  season: number,
  count: number,
  groups: string[],
  closesAt: Date,
) =>
  render({
    userId,
    subject: count === 1 ? "A new wishlist to pick up" : `${count} new wishlists to pick up`,
    kicker: `Christmas ${season}`,
    heading: count === 1 ? "Someone new is waiting for a Santa" : `${count} new lists are waiting for a Santa`,
    paragraphs: [
      `Since we last wrote, ${count === 1 ? "someone" : `${count} people`} in ${and(groups.slice(0, 3))}${
        groups.length > 3 ? " and more" : ""
      } ${count === 1 ? "has" : "have"} joined in this Christmas, and ${
        count === 1 ? "their wishlist hasn't" : "their wishlists haven't"
      } had a gift yet.`,
      "Pick one up whenever you're ready. There's no draw, and nobody keeps score.",
      `Gifting closes on ${day(closesAt)}.`,
    ],
    button: { label: "Pick up a wishlist", path: "/" },
  });

/**
 * 6 Nov: to each organiser of a live group on the day gifting opens: the
 * group's invite link, a message to paste into the group chat, and where
 * the Wall of Kindness will be once there are enough thank-yous.
 */
export const organiserLive = (
  userId: string,
  season: number,
  group: { id: string; name: string; kind: string; emailDomain: string | null; joinCode: string | null },
  closesAt: Date,
  wallMinThanks: number,
) => {
  const link = inviteLink(group, siteUrl());
  const isOrg = group.kind === "ORG";
  return render({
    userId,
    subject: `Gifting is open in ${group.name}`,
    kicker: `Christmas ${season} · for organisers`,
    heading: `${group.name} is live`,
    paragraphs: [
      `Gifting is open on Random Acts of Santa, and ${group.name} is ready to go. Thank you for organising it.`,
      `The first couple of days are when groups take off, so now is a great time to send the invite. ${
        isOrg ? `Colleagues join with their @${group.emailDomain} email here` : "People join here"
      }: ${link}`,
      "A message you can paste into Discord, Slack, Teams or WhatsApp:",
    ],
    quote: inviteMessage(group, siteUrl()),
    after: [
      `Once your group has ${wallMinThanks} thank-yous, you can make its Wall of Kindness on your organiser page: one page of the group's thank-yous to share, under festive names.`,
      `Gifting closes on ${day(closesAt)}.`,
    ],
    button: { label: "Open your organiser page", path: `/groups/${group.id}/manage` },
  });
};

export type StatusSummary = {
  attention: string[];
  rows: [string, string][];
};

/**
 * 6 Nov: site admins' morning status email in launch week. Counts only:
 * never a member's name or email.
 */
export const adminStatus = (userId: string, season: number, date: Date, s: StatusSummary) =>
  render({
    userId,
    subject: `Launch status, ${day(date)}: ${
      s.attention.length ? `${s.attention.length} to look at` : "all clear"
    }`,
    kicker: `Christmas ${season} · site admins`,
    heading: s.attention.length ? "Something needs a look" : "Nothing needs attention",
    paragraphs: s.attention.length
      ? s.attention
      : ["All of Admin › Status's checks looked fine when this was sent."],
    rows: s.rows,
    after: ["Figures are for the last 24 hours, without test accounts."],
    button: { label: "Open Admin › Status", path: "/admin/status" },
  });
