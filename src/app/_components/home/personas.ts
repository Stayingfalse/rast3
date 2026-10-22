/**
 * The stamp rack (owner, 22 Oct 2026): the home page asks who is posting and
 * re-prints itself as that visitor's pitch. Every claim here is true of the
 * product as built: groups are approved by a site admin, workplaces can
 * require a join code and have a printable poster, Discord groups can
 * require a role, pick-ups go fewest gifts first with at most five held.
 */
export const PERSONAS = ["invited", "workplace", "discord", "friends"] as const;
export type Persona = (typeof PERSONAS)[number];

export const isPersona = (v: unknown): v is Persona =>
  typeof v === "string" && (PERSONAS as readonly string[]).includes(v);

type Pitch = {
  /** the rubber stamp's face, two short lines */
  stamp: [string, string];
  /** the parcel label's To line */
  to: string;
  /** the postmark's small line */
  mark: string;
  headline: string;
  intro: string;
  /** what this visitor is worried about, and the answer */
  worries: { q: string; a: string }[];
  steps: { title: string; body: string }[];
  cta: string;
};

export const PITCH: Record<Persona, Pitch> = {
  invited: {
    stamp: ["I've been", "invited"],
    to: "Someone in your group",
    mark: "INVITED",
    headline: "Someone wants to send you a Christmas present. Here's the catch: there isn't one.",
    intro:
      "You share your Amazon wishlist. People in your group pick up random lists, maybe yours, and send something from it. You can do the same as often as you like, or simply receive.",
    worries: [
      {
        q: "Do I have to give out my address?",
        a: "No. Amazon delivers to the gift address on your wishlist. Your Santa only ever sees the list.",
      },
      {
        q: "Do I have to buy anything?",
        a: "No. Giving is optional, there's no minimum, and nobody keeps score.",
      },
      {
        q: "Will they know it was me?",
        a: "Only if you tell them. Gifts are anonymous both ways, right up to the thank-you.",
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
  workplace: {
    stamp: ["I run a", "workplace"],
    to: "Someone two floors up",
    mark: "WORKPLACE",
    headline: "Christmas spirit for a team that's never all in the same room.",
    intro:
      "Office Secret Santa falls apart when half the team is remote, nobody knows anyone's address and someone always gets forgotten. Random Acts fixes all three, and you never run a draw.",
    worries: [
      {
        q: "I'd have to collect home addresses.",
        a: "You never see one. Gifts go through each person's Amazon wishlist to their gift address.",
      },
      {
        q: "Not everyone will want to join in.",
        a: "Giving is optional. People can share a list and just receive. Nobody is ranked or chased.",
      },
      {
        q: "Someone always gets left out.",
        a: "Lists with the fewest gifts are handed out first, and nobody can sit on more than five at once.",
      },
      {
        q: "It'll turn into a part-time job.",
        a: "No draw, no spreadsheet, no chasing. Colleagues join with their work email and pick up lists themselves.",
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
  discord: {
    stamp: ["I run a", "Discord"],
    to: "A member you've only met in voice chat",
    mark: "COMMUNITY",
    headline: "A Christmas your server will talk about, without anyone handing a stranger their address.",
    intro:
      "Your members live in different places and know each other by username. That's fine: nobody here ever sees an address, and you don't run anything by hand.",
    worries: [
      {
        q: "Members would be sharing addresses with strangers.",
        a: "Never. Amazon delivers to each member's gift address. Santas only see a wishlist.",
      },
      {
        q: "I only want real members joining.",
        a: "Link your server, and require a role if you want one. Members join with their Discord account.",
      },
      {
        q: "Gift swaps always leave people out.",
        a: "Lists with the fewest gifts go first, and nobody can hoard: five un-gifted lists at a time.",
      },
      {
        q: "I don't have time to organise it.",
        a: "No draw and no spreadsheet. Once your group is approved, members pick up lists on their own.",
      },
    ],
    steps: [
      { title: "Start a community", body: "Sign in with Discord and start a community group. We check it before gifting opens." },
      { title: "Link your server", body: "Connect the server you run, and choose a role members need, if any." },
      { title: "Members join", body: "They join through Discord, add a wishlist and pick up lists whenever they're ready." },
      { title: "Thank-yous roll in", body: "Postcards from happy members fill your group's feed all season." },
    ],
    cta: "Link your Discord server",
  },
  friends: {
    stamp: ["Me and my", "friends"],
    to: "Your mate who moved again",
    mark: "FRIENDS",
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
      },
      {
        q: "Organising the draw is a pain.",
        a: "There isn't one. Start a group in a minute and share the invite link.",
      },
      {
        q: "We can never agree on a budget.",
        a: "You don't have to. Everyone picks from the list whatever suits them.",
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
