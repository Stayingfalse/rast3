/**
 * A group's invite link and ready-to-paste invite message: the organiser
 * console's "Bring your team" kit (Day 16) and the organisers' "we're live"
 * email (6 Nov) use the same words.
 */
type InviteGroup = {
  kind: string;
  name: string;
  emailDomain: string | null;
  joinCode: string | null;
};

const formatCode = (c: string) => (c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

/** Workplaces have their own memorable link, raosanta.uk/<domain> (23 Oct); others a join link. */
export function inviteLink(g: InviteGroup, origin: string) {
  if (g.kind === "ORG" && g.emailDomain) return `${origin}/${g.emailDomain}`;
  return g.joinCode ? `${origin}/join/${g.joinCode}` : origin;
}

export function inviteMessage(g: InviteGroup, origin: string) {
  const link = inviteLink(g, origin);
  return g.kind === "ORG"
    ? `Christmas is coming! I've set us up on Random Acts of Santa: no draw, just share your Amazon wishlist and pick up a colleague's whenever you're ready. Join here with your @${g.emailDomain} email: ${link}${g.joinCode ? ` (join code ${formatCode(g.joinCode)})` : ""}`
    : `Christmas is coming! Join ${g.name} on Random Acts of Santa: no draw, just share your Amazon wishlist and pick up someone's whenever you're ready. Join here: ${link}`;
}

/**
 * A team lead's invite (7 Nov): the workplace's link, joining straight into
 * their team.
 */
type Workplace = Omit<InviteGroup, "kind">;

export function teamInviteLink(workplace: Workplace, team: { id: string }, origin: string) {
  const link = inviteLink({ ...workplace, kind: "ORG" }, origin);
  return `${link}${link.includes("?") ? "&" : "?"}team=${encodeURIComponent(team.id)}`;
}

export function teamInviteMessage(workplace: Workplace, team: { id: string; name: string }, origin: string) {
  const link = teamInviteLink(workplace, team, origin);
  return `Christmas is coming! ${team.name} is doing Random Acts of Santa this year: no draw, just share your Amazon wishlist and pick up a colleague's whenever you're ready. Join here with your @${workplace.emailDomain} email and you'll be in ${team.name}: ${link}${workplace.joinCode ? ` (join code ${formatCode(workplace.joinCode)})` : ""}`;
}
