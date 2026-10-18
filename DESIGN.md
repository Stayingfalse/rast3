---
name: Random Acts of Santa
description: Anonymous Christmas gifting from Amazon wishlists, dressed as the Christmas post.
colors:
  night: "#13264d"
  night-deep: "#0c1a37"
  night-raised: "#1b3363"
  frost: "#e6ecf7"
  frost-soft: "#aebbd4"
  label: "#f6f0e2"
  label-shade: "#ebe2cd"
  rule: "#cdbf9f"
  ink: "#18223a"
  ink-soft: "#4b5670"
  post: "#b8262c"
  post-deep: "#941c21"
  post-bright: "#ec6a64"
  paper: "#fffdf8"
  post-tint: "#f3dcd8"
  gold: "#caa24c"
  gold-soft: "#e5cf98"
  gold-ink: "#9c7a2a"
  pine: "#1f5c47"
  pine-tint: "#d9e9df"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  display-narrow:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    fontVariation: "'wdth' 125"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 125"
  figures:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    fontFeature: "'tnum' 1, 'lnum' 1"
    fontVariation: "'wdth' 125"
rounded:
  tag: "2px"
  label: "6px"
  pill: "9999px"
spacing:
  label-x: "20px"
  card: "16px"
  card-roomy: "24px"
  page-gutter: "16px"
  page-gutter-sm: "24px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.post}"
    textColor: "#ffffff"
    rounded: "{rounded.label}"
    padding: "10px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.post-deep}"
    textColor: "#ffffff"
  button-quiet-on-night:
    backgroundColor: "transparent"
    textColor: "{colors.frost}"
    rounded: "{rounded.label}"
    padding: "10px 18px"
    height: "44px"
  button-quiet-on-label:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    padding: "10px 18px"
    height: "44px"
  label-card:
    backgroundColor: "{colors.label}"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    padding: "16px"
  label-footer:
    backgroundColor: "{colors.label-shade}"
    textColor: "{colors.ink-soft}"
    padding: "16px 20px"
  tag-gift-sent:
    backgroundColor: "{colors.pine-tint}"
    textColor: "{colors.pine}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  tag-issue:
    backgroundColor: "{colors.post-tint}"
    textColor: "{colors.post-deep}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  input-on-label:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    padding: "12px 16px"
---

# Design System: Random Acts of Santa

## Overview

**Creative North Star: "The Christmas Post"**

Every gift on Random Acts of Santa is a parcel sent to someone whose address you never learn, so the whole interface is built from the Christmas post: a night-navy winter sky as the ground, the hanging post above it (baubles, stamps and luggage tags on gold thread), and working surfaces cut from cream label stock with hairline ink rules, an airmail band on the edge, perforated stamps and gold date-stamp postmarks. It is festive without being religious or childish: the season comes from the post office and the night sky, not from snowmen and emoji.

Density is calm. A screen holds one held moment (on the home page, the parcel label itself is the hero) and everything else sits on a strict ruled grid: label rows, numbered stations on a line, cards in even columns. Live data is part of the material, not a widget: counts are franked onto labels and set in tabular figures. Type is one family, Archivo, used across its width axis: expanded weight for the wordmark, expanded caps for headings and label captions, regular width for reading.

There is one authored motion, the frank: a postmark pressing onto a label once, on load or when a wishlist is marked Gifted. Everything else is still.

**Key Characteristics:**
- Two grounds only: night sky (dark) and label stock (cream). No third surface family.
- Postal red is the one action colour; gold is the postmark ink; pine means sent.
- Archivo across widths: expanded for marks and captions, normal for reading.
- Hairline rules and the airmail band do the structuring; no decorative chrome.
- Counts in tabular figures; public totals rounded and shown as "N+".
- One motion: the frank. Reduced motion shows the postmark at rest.

## Colors

A winter-night navy paired with cream postal stationery, with red, gold and pine used as inks rather than as fills.

### Primary
- **Postal Red** (post): the one action colour. Primary buttons, inline links on label stock, destructive text, the red stripe of the airmail band, and the text caret. Hover darkens to **Pillar-Box Shade** (post-deep), which also sets the text of the "Issue reported" and "Hidden" tags on **Red Tint** (post-tint).
- **Lamp Red** (post-bright): red that reads on navy (4.82:1 on night). Retired from the wordmark in the 2026 brand mark (the red now lives in the stamp's bauble); kept as a token for red text on navy should an action ever need it. It is not an emphasis colour.

### Secondary
- **Postmark Gold** (gold): postmark rings on navy, the season year mark, route station numbers and dots, focus rings and text selection (6.22:1 on night).
- **Pale Gold** (gold-soft): emphasis inside headings on navy (e.g. "to doorstep") and fine detail inside stamps.
- **Postmark Ink** (gold-ink): the same postmark when it is stamped onto cream label stock, where plain gold would be too faint.

### Tertiary
- **Pine** (pine): the delivered state. The band on a gifted wishlist card, its "SENT" postmark and the "Gift sent" tag text (6.90:1 on label), set on **Pine Tint** (pine-tint).

### Neutral
- **Stamp Paper** (paper): the punched paper of the stamp mark, and button text on postal red (6.3:1).
- **Night Sky** (night): the page ground, under a faint plaid texture and the hanging-post band.
- **Deep Night** (night-deep): modal scrims (at 75%) and scrollbar track.
- **Raised Night** (night-raised): scrollbar thumb and any raised navy surface.
- **Frost** (frost): body and heading text on navy.
- **Frost Soft** (frost-soft): secondary text on navy (7.69:1 on night); hairline rules on navy use frost at 25%.
- **Label Stock** (label): every working surface: cards, modals, the small print, the cookie notice.
- **Label Shade** (label-shade): a recessed band on a label, such as the franking footer or a note box.
- **Hairline** (rule): 1px rules and borders on label stock.
- **Ink** (ink): text on label stock.
- **Ink Soft** (ink-soft): captions and secondary text on label stock (6.45:1 on label).

### Named Rules
**The One Stamp Of Red Rule.** Postal red marks what you can do: buttons, links, destructive actions. It never decorates a heading or a panel. The only red that is not an action is the bauble inside the brand stamp; emphasis on navy uses pale gold.

**The Gold Is Ink Rule.** Gold is postmark ink and the year mark. It is never a button, a fill or a background. On label stock, postmarks switch to postmark ink (gold-ink).

**The Pine Means Sent Rule.** Pine appears only for the gifted/sent state, and always with words ("Gift sent", "SENT"), never as colour alone.

Measured contrast: white on postal red 6.27:1; lamp red on night 4.82:1; frost soft on night 7.69:1; gold on night 6.22:1; ink soft on label 6.45:1; pine on label 6.90:1.

## Typography

**Display Font:** Archivo variable (width axis), loaded with next/font, falling back to ui-sans-serif and system-ui
**Body Font:** Archivo at normal width
**Label Font:** Archivo expanded caps

**Character:** One grotesque stretched to do two jobs. At 125% width and heavy weight it is the ink of a rubber stamp and the print of a shipping label; at normal width it reads plainly for long sentences.

### Hierarchy
- **Display** (800, 1.875rem rising to 3.75rem, line-height 0.95, expanded, mixed case): the wordmark only, on two lines ("Random Acts" / "of Santa", with "of" at regular weight and width), each line kept whole, beside the stamp mark. Below 360px wide it steps down to 1.625rem (display-narrow) so each line stays whole. A slim masthead version runs at 1.125 to 1.25rem.
- **Headline** (800, 1.875 to 2.25rem, line-height 1, expanded, uppercase on navy section heads): section headings such as "From wishlist to doorstep" and "The small print". The hero hook is a bold (700) expanded headline at 1.5 to 1.875rem in sentence case.
- **Title** (700, 1.25rem, expanded): station titles, modal titles (800 at 1.25 to 1.5rem), card names.
- **Body** (400, 1rem to 1.125rem, line-height 1.625): reading text, in frost-soft on navy or ink-soft on label; keep to roughly 36rem (max-w-xl) beside the hero.
- **Label** (700, 0.6875rem, letter-spacing 0.08em, expanded, uppercase): label field captions (To, From, Deliver to), card headers ("Wishlist No. 01"), state tags and form field labels.
- **Figures** (800, expanded, tabular lining numerals): every count, date and number: franked totals, station numbers, "No. 01", purchase dates.

### Named Rules
**The Field Caption Rule.** Expanded caps are captions for a field or a mark (a label row, a tag, a postmark), never a kicker stacked above a heading.

**The Tabular Count Rule.** Numbers are always set in tabular lining figures. Public totals are rounded before display: under 10 hidden, floored to the nearest 10, to the nearest 50 above 1,000, and shown as "N+".

## Layout

A single centred column, max 72rem (max-w-6xl), with a 16px side gutter on phones and 24px from small screens. The hanging-post band hangs across the top (150px tall on phones, 260px from small screens) in two fixed-size clusters pinned to the left and right edges, so the centre stays open at every width; content starts below it. The page frame clips horizontal overflow, so corner postmarks can hang off a label without causing sideways scroll. Major sections are separated by 96px (gap-24).

The home hero is a two-column grid on large screens (1.1fr text, 1fr label), stacking text-then-label on phones. Below it, the route is a ruled timeline of four numbered stations: a frost hairline across the top with a gold dot on each station, four columns from medium width, stacked rows with hairlines between on phones. Card collections (wishlist parcels, thank-you postcards) run in an even grid of one, two, then three columns.

Inside labels, rhythm comes from rules rather than boxes: rows in a two-column grid (a 6.5rem caption column and the value), divided by hairlines, 12px vertical padding per row and 20px side padding.

**The Ruled Grid Rule.** Structure comes from hairline rules and fixed columns, not from nested cards. If a group needs separating, rule it.

## Elevation & Depth

Depth is physical and low: paper lying on a dark table. Label stock carries a soft drop shadow and a faint highlight on its top edge, as if it were card; modals lift a little higher. Navy surfaces are flat. The parcel label in the hero is tilted 1.25deg and the stamp on it -3deg, which is the only rotation besides postmarks.

### Shadow Vocabulary
- **Label** (`box-shadow: 0 1px 0 rgb(255 255 255 / 0.6) inset, 0 12px 28px -12px rgb(4 10 26 / 0.55), 0 2px 6px -2px rgb(4 10 26 / 0.35)`): every label-stock surface at rest.
- **Lift** (`box-shadow: 0 18px 40px -16px rgb(4 10 26 / 0.65), 0 4px 10px -4px rgb(4 10 26 / 0.4)`): modals and the cookie notice, which sit above the page.
- **Button press** (`box-shadow: 0 1px 0 rgb(255 255 255 / 0.18) inset, 0 6px 16px -8px rgb(148 28 33 / 0.9)`): the red glow under the primary button only.

### Named Rules
**The Paper Not Glass Rule.** Surfaces are opaque paper. No translucency, blur or glass panels; the one exception is the dark scrim behind a modal.

## Shapes

Gently squared corners everywhere (6px, the label radius) on cards, buttons, inputs and modals; state tags are nearly square (2px). Circles belong to postmarks, the gold station dots and icon discs. Three recurring silhouettes carry the world:

- **Airmail band:** a 10px strip of diagonal red, cream and navy stripes along the top edge of a label (cards, modals, the small print). On a gifted card it turns solid pine.
- **Perforated stamp:** a stamp with a punched paper edge (a white ring of holes around a navy face) carrying a red bauble on gold thread. This is also the brand mark (see Brand Mark).
- **Postmark:** a double-ring date stamp with text set on the ring, a large centre line (the year or "SENT") and optional wavy cancellation lines, drawn as SVG so the text stays real.

## Components

### Buttons
Tactile and plain: a single red button and a quiet outline.
- **Shape:** gently squared (6px), minimum height 44px for touch.
- **Primary:** postal red with white text, bold slightly expanded (112% width), 10px by 20px padding, a faint red glow beneath. Used for "Join Santa", "Accept All" and each modal's main action.
- **Hover / Focus / Active:** hover darkens to post-deep over 160ms; press nudges down 1px; focus shows a 2px gold outline offset 3px (all focusable elements). Disabled turns slate grey (#8b8f99) and drops the glow.
- **Quiet:** transparent with a 1px border in the current text colour (frost on navy, ink on label), semibold; hover tints the background with 10% of the text colour.

### Tags
- **Style:** label caps on a tint, nearly square (2px), 4px by 8px.
- **State:** "Gift sent" in pine on pine tint; "Issue reported" and "Hidden" in post-deep on red tint. The words carry the state, not the colour.

### Cards / Containers (label stock)
- **Corner Style:** 6px.
- **Background:** label stock, with a label-shade band for footers and note boxes.
- **Shadow Strategy:** Label shadow at rest, Lift for modals (see Elevation).
- **Border:** 1px hairline; internal rows divided by hairlines.
- **Internal Padding:** 16px (cards), 20px (label rows and kudos postcards), 24 to 40px (the small print).

### Parcel Card (wishlist assignment)
A shipping label per picked-up wishlist: airmail band, a header with "Wishlist No. 01" in label caps and the route (your department, another department, another organisation), a state tag at the right, then details and actions. When marked Gifted the band turns pine and a pine "SENT" postmark franks the card.

### Postcard (kudos)
A label-stock card with the photo carousel across the top, the message in ink, and a ruled footer with the sender's festive identity in expanded bold and the time in ink-soft.

### Inputs / Fields
- **Style:** white field on label stock, 1px hairline border, 6px radius, ink text, ink-soft placeholder, 12px by 16px padding.
- **Label:** label caps in ink-soft above the field.
- **Focus:** the global 2px gold outline.

### Navigation
Minimal. A quiet "Sign in" button sits fixed at the top right over the hanging post (frost text on solid night). Signed in, the wordmark shrinks to a slim masthead.

### Modals and the Cookie Notice
Modals are label-stock sheets with an airmail band, Lift shadow, over a 75% deep-night scrim; they sit at the bottom on phones and centre from small screens. The cookie notice is a label-stock bar across the bottom with a hairline top edge, a red link, a primary "Accept All" and a quiet "Decline Optional".

### Parcel Label (hero signature)
The home page's held moment: a label at real proportions (max 28rem), tilted 1.25deg, with airmail band, "Christmas Post" caption, the brand stamp, ruled To / From / Deliver to / Contents rows ("Address withheld"), and a label-shade franking footer holding the live gifts total in large tabular figures. A gold-ink postmark with cancellation lines is franked across its bottom-right corner on load.

### Brand Mark
The 2026 mark is a portrait perforated stamp: cream paper with punched edges, a night-navy face, and a red bauble with a cream and gold band hanging on gold thread. The lockup puts the stamp (tilted -4deg) beside the name on two lines in Archivo expanded 800, "of" in regular. The season year is printed at the foot of the stamp in pale gold, set live in Archivo over the artwork so it can change each year. The bare stamp, with no year, is the favicon, app icon and PWA icon; at 16px it still reads as a navy square with a red ball. Artwork is generated from `scripts/brand/marks.mjs` by `node scripts/brand/build.mjs`, which writes `public/brand/*.svg`, every icon size, `favicon.ico` and the social preview `public/og.png`. Never redraw the icons by hand; edit the generator and rebuild.

### Sky (the hanging post)
Two authored clusters (`public/brand/sky-left.svg`, `sky-right.svg`, 560×260 each) of flat-print ornaments on gold thread: red, ice-blue and gold baubles, small stamps, cream luggage tags with ruled lines, and four-point gold stars. They replace the 2025 raster bauble illustration (186 KB → about 11 KB). Same palette as the page; no gradients, no glow.

### Motion: the Frank
One authored animation: the postmark lands (520ms, cubic-bezier(0.16, 1, 0.3, 1)), scaling from 1.35 and -14deg with a slight blur to rest at -10deg. Used on the hero label's postmark and on a newly gifted parcel card. Under reduced motion every animation and transition collapses to an instant, so the postmark simply appears at rest.

## Do's and Don'ts

### Do:
- **Do** keep the page on two grounds: night sky for the page, label stock for anything you read closely or act on.
- **Do** use postal red only for actions (buttons, links, destructive text); use pale gold for emphasis inside navy headings.
- **Do** switch postmarks to gold-ink on label stock and pine for the sent state.
- **Do** set every number in tabular figures, and round public totals (hide under 10, floor to 10, to 50 above 1,000, show as "N+").
- **Do** separate content with hairline rules and the airmail band rather than extra boxes.
- **Do** keep touch targets at 44px and check every change at 1280x800 and Pixel 7 widths.
- **Do** keep the frank as the only authored motion and honour reduced motion.

### Don't:
- **Don't** use emoji as icons; draw icons as SVG.
- **Don't** put an eyebrow kicker above a heading; expanded caps are for field captions, tags and marks only.
- **Don't** use gradient text, glass or blurred translucent panels.
- **Don't** mark a card with a coloured side stripe; state goes in the top band, a tag and words.
- **Don't** set any part of the name in red; red belongs to actions and to the stamp's bauble.
- **Don't** use gold for buttons, fills or backgrounds.
- **Don't** show exact small counts, names or per-organisation numbers in public stats.
