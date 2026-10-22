/**
 * The stamp rack (owner, 22 Oct 2026): the home page asks who is posting and
 * re-prints itself as that visitor's pitch. Three kinds of group, each with
 * two kinds of visitor (owner: "the organisers and the users"), so six
 * pitches. Every claim here is true of the product as built: groups are
 * approved by a site admin, workplaces can require a join code and have a
 * printable poster, Discord groups only admit members of the linked server
 * (no role gating yet), pick-ups go fewest gifts first with at most five held.
 */
export const KINDS = ["workplace", "discord", "friends"] as const;
export const ROLES = ["join", "run"] as const;
export type Kind = (typeof KINDS)[number];
export type Role = (typeof ROLES)[number];
export type Persona = `${Kind}-${Role}`;

/** Small-print subjects a pitch may already have answered. */
export type Topic = "address" | "money" | "anonymous" | "secret-santa" | "dates" | "who" | "free";

export const KIND_STAMP: Record<Kind, [string, string]> = {
  workplace: ["Our", "workplace"],
  discord: ["Our Discord", "server"],
  friends: ["Friends &", "family"],
};

export const ROLE_STAMP: Record<Role, string> = {
  join: "I've been invited",
  run: "I'm organising it",
};

/** The postmark's ring text for each kind. */
export const KIND_MARK: Record<Kind, string> = {
  workplace: "WORKPLACE POST",
  discord: "COMMUNITY POST",
  friends: "FRIENDS POST",
};

/** ?for= values from the first version of the rack still work. */
const LEGACY: Record<string, Persona> = {
  invited: "friends-join",
  workplace: "workplace-run",
  discord: "discord-run",
  friends: "friends-run",
};

export function parsePersona(v: unknown): Persona | null {
  if (typeof v !== "string") return null;
  if (LEGACY[v]) return LEGACY[v];
  const [kind, role] = v.split("-");
  return (KINDS as readonly string[]).includes(kind ?? "") && (ROLES as readonly string[]).includes(role ?? "")
    ? (v as Persona)
    : null;
}

type Pitch = {
  /** the parcel label's To line */
  to: string;
  headline: string;
  intro: string;
  /** what this visitor is worried about, and the answer */
  worries: { q: string; a: string; topic?: Topic }[];
  steps: { title: string; body: string }[];
  cta: string;
};

export const PITCH: Record<Persona, Pitch> = {
  "workplace-join": {
    to: "Someone two floors up",
    headline: "Your workplace is doing Christmas presents differently this year.",
    intro:
      "No names in a hat and no one stuck buying for the person they've never spoken to. Share your Amazon wishlist, pick up a colleague's whenever you like, and send them something anonymously.",
    worries: [
      {
        q: "Do I have to give work my home address?",
        a: "No. Amazon delivers to the gift address on your wishlist. Nobody at work ever sees it.",
        topic: "address",
      },
      {
        q: "Do I have to take part?",
        a: "Giving is optional. You can share a list and just receive, and nobody is ranked or chased.",
        topic: "money",
      },
      {
        q: "Will they know it was me?",
        a: "Only if you tell them. Gifts are anonymous both ways, right up to the thank-you.",
        topic: "anonymous",
      },
      {
        q: "What do I need?",
        a: "Your work email and an Amazon UK wishlist set to shared, with your gift address on it.",
      },
    ],
    steps: [
      { title: "Sign in", body: "Use Google, Discord or an email link, then add your work email to join your workplace." },
      { title: "Add your wishlist", body: "Paste your Amazon UK wishlist link. A range of prices helps every Santa find something." },
      { title: "Your team first", body: "Pick up to three lists from your own team, then gift across the organisation if you like." },
      { title: "Say thank you", body: "When a parcel lands, post a thank-you postcard to your organisation's feed." },
    ],
    cta: "Join your workplace",
  },
  "workplace-run": {
    to: "Someone two floors up",
    headline: "Christmas spirit for a team that's never all in the same room.",
    intro:
      "Office Secret Santa falls apart when half the team is remote, nobody knows anyone's address and someone always gets forgotten. Random Acts fixes all three, and you never run a draw.",
    worries: [
      {
        q: "I'd have to collect home addresses.",
        a: "You never see one. Gifts go through each person's Amazon wishlist to their gift address.",
        topic: "address",
      },
      {
        q: "Not everyone will want to join in.",
        a: "Giving is optional. People can share a list and just receive. Nobody is ranked or chased.",
        topic: "money",
      },
      {
        q: "Someone always gets left out.",
        a: "Lists with the fewest gifts are handed out first, and nobody can sit on more than five at once.",
      },
      {
        q: "It'll turn into a part-time job.",
        a: "No draw, no spreadsheet, no chasing. Colleagues join with their work email and pick up lists themselves.",
        topic: "secret-santa",
      },
    ],
    steps: [
      { title: "Start your workplace", body: "Sign in, add your work email and start your organisation. We check it before gifting opens." },
      { title: "Bring the team", body: "Share the invite message or print the poster for the kitchen. Require a join code if you like." },
      { title: "Teams go first", body: "Colleagues start with up to three lists from their own team, then gift across the organisation." },
      { title: "Watch it add up", body: "Thank-yous fill your organisation's feed, and you can share how many gifts went out." },
    ],
    cta: "Set up your workplace",
  },
  "discord-join": {
    to: "A member you've only met in voice chat",
    headline: "Your server's doing Christmas. You never have to tell a stranger where you live.",
    intro:
      "Share your Amazon wishlist with the server. Members pick up random lists, maybe yours, and send something from them. You can do the same as often as you like, or simply receive.",
    worries: [
      {
        q: "I'm not giving my address to people I met online.",
        a: "You don't. Amazon delivers to the gift address on your wishlist, and Santas only ever see the list.",
        topic: "address",
      },
      {
        q: "Do I have to buy anything?",
        a: "No. Giving is optional, there's no minimum, and nobody keeps score.",
        topic: "money",
      },
      {
        q: "Will they know it was me?",
        a: "Only if you tell them. Thank-yous go out under a festive pseudonym, not your username.",
        topic: "anonymous",
      },
      {
        q: "What do I need?",
        a: "A Discord account that's in the server, plus an Amazon UK wishlist with your gift address on it.",
      },
    ],
    steps: [
      { title: "Sign in with Discord", body: "We check you're in the server, then you join its group in one tap." },
      { title: "Add your wishlist", body: "Paste your Amazon UK wishlist link, with your gift address set on Amazon." },
      { title: "Pick some up", body: "Whenever you're ready, pick up a random list or a few. Fewest gifts come first." },
      { title: "Say thank you", body: "When a parcel lands, post a thank-you postcard to the group's feed." },
    ],
    cta: "Join with Discord",
  },
  "discord-run": {
    to: "A member you've only met in voice chat",
    headline: "A Christmas your server will talk about, without anyone handing a stranger their address.",
    intro:
      "Your members live in different places and know each other by username. That's fine: nobody here ever sees an address, and you don't run anything by hand.",
    worries: [
      {
        q: "Members would be sharing addresses with strangers.",
        a: "Never. Amazon delivers to each member's gift address. Santas only see a wishlist.",
        topic: "address",
      },
      {
        q: "I only want real members joining.",
        a: "Link your server: only people in it can join, and they sign in with their Discord account.",
        topic: "who",
      },
      {
        q: "Gift swaps always leave people out.",
        a: "Lists with the fewest gifts go first, and nobody can hoard: five un-gifted lists at a time.",
      },
      {
        q: "I don't have time to organise it.",
        a: "No draw and no spreadsheet. Once your group is approved, members pick up lists on their own.",
        topic: "secret-santa",
      },
    ],
    steps: [
      { title: "Start a community", body: "Sign in with Discord and start a community group. We check it before gifting opens." },
      { title: "Link your server", body: "Connect a server you run. Only its members can join the group." },
      { title: "Members join", body: "They join through Discord, add a wishlist and pick up lists whenever they're ready." },
      { title: "Thank-yous roll in", body: "Postcards from happy members fill your group's feed all season." },
    ],
    cta: "Link your Discord server",
  },
  "friends-join": {
    to: "Someone in your group",
    headline: "Someone wants to send you a Christmas present. Here's the catch: there isn't one.",
    intro:
      "You share your Amazon wishlist. People in your group pick up random lists, maybe yours, and send something from it. You can do the same as often as you like, or simply receive.",
    worries: [
      {
        q: "Do I have to give out my address?",
        a: "No. Amazon delivers to the gift address on your wishlist. Your Santa only ever sees the list.",
        topic: "address",
      },
      {
        q: "Do I have to buy anything?",
        a: "No. Giving is optional, there's no minimum, and nobody keeps score.",
        topic: "money",
      },
      {
        q: "Will they know it was me?",
        a: "Only if you tell them. Gifts are anonymous both ways, right up to the thank-you.",
        topic: "anonymous",
      },
      {
        q: "What do I need?",
        a: "An Amazon UK wishlist set to shared, with your gift address on it. It takes about two minutes.",
      },
    ],
    steps: [
      { title: "Open your invite", body: "Follow the link you were sent and sign in with Google, Discord or an email link." },
      { title: "Add your wishlist", body: "Paste your Amazon UK wishlist link. A range of prices helps every Santa find something." },
      { title: "Pick some up", body: "Whenever you're ready, pick up a random list or a few. The ones with the fewest gifts come first." },
      { title: "Say thank you", body: "When a parcel lands, post a thank-you postcard. Your Santa sees it, but never who you are." },
    ],
    cta: "Join your group",
  },
  "friends-run": {
    to: "Your mate who moved again",
    headline: "Family Secret Santa, minus the draw, the group-chat spreadsheet and the cousin who drops out.",
    intro:
      "Start a group, send the link, and everyone gifts whoever they pick up, as many as they like. Nobody is stuck with one name, and nobody needs anyone's new address.",
    worries: [
      {
        q: "Someone always ends up with nothing.",
        a: "Lists with the fewest gifts are handed out first, so everyone gets picked.",
      },
      {
        q: "Half of us have moved.",
        a: "Addresses don't matter. Amazon delivers to each person's gift address.",
        topic: "address",
      },
      {
        q: "Organising the draw is a pain.",
        a: "There isn't one. Start a group in a minute and share the invite link.",
        topic: "secret-santa",
      },
      {
        q: "We can never agree on a budget.",
        a: "You don't have to. Everyone picks from the list whatever suits them.",
        topic: "money",
      },
    ],
    steps: [
      { title: "Start a group", body: "Sign in and start a friends group. We give it a quick check before gifting opens." },
      { title: "Send the link", body: "Share the invite link or code in your group chat." },
      { title: "Everyone joins in", body: "Each person adds a wishlist and picks up lists when they're ready." },
      { title: "Thank-yous all round", body: "Post a thank-you when your parcel arrives. Your Santa stays a mystery." },
    ],
    cta: "Start a friends group",
  },
};
