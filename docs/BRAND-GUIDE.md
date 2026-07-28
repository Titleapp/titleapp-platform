# SOCIII Brand Guide
*Internal reference · July 2026*

---

## The One Rule

**Switzerland, not Disneyland.**

SOCIII sells trust. The product is an immutable record — cryptographically anchored, permanently auditable, governed by rules. The brand has to feel like that. Refined. Precise. Quietly confident. The kind of thing a serious operator would leave on a conference table without explanation.

Everything else in this guide follows from that.

---

## Voice and Tone

### What we sound like

- **Direct.** We state what the product does and what it costs. No hedging, no qualifiers, no "best-in-class."
- **Serious but not stiff.** We're talking to Chief Pilots and title attorneys and nursing program directors. They have no patience for hype. They respond to specificity.
- **Confident without overclaiming.** We have a pending patent application. We have live deployments. We have real customers. We say that — precisely, not expansively.
- **Picture-first.** We use numbers, tables, and before/after comparisons before we use adjectives.

### What we do not sound like

- No exclamation marks. Not in copy, not in email, not in presentations.
- No emoji in professional materials.
- No superlatives without evidence: not "the most powerful," "revolutionary," "industry-leading."
- No "we're disrupting" or "we're transforming" — show the disruption in the numbers, not in the language.
- No vague verbs: "streamline," "leverage," "empower," "unlock." Use the specific action.

### Naming conventions

| Term | Use | Do not use |
|---|---|---|
| **Alex** | Always just "Alex" | "the AI," "the bot," "the system" |
| **Chief of Staff** | Alex's role title | "operations coordinator," "AI coordinator," "assistant" |
| **Digital Workers** | User-facing name for AI agents | "bots," "automations," "AI tools" |
| **RAAS** | Internal/technical only | Use "Digital Workers" in all user-facing text |
| **Append-only record** | Technical description of the architecture | "blockchain database," "crypto ledger," "immutable DB" |
| **Patent-pending** | Status of USPTO filings (May 2026) | "patented," "we own the patent," "the patent covers" |

---

## Color Palette

### Primary

| Name | Hex | Usage |
|---|---|---|
| **Indigo** | `#5234C6` | Primary accent — section borders, links, highlights, eyebrow text, CTAs |
| **Ink** | `#0f172a` | Headlines, primary text, logo wordmark |
| **Charcoal** | `#1a202c` | Body text |

### Secondary

| Name | Hex | Usage |
|---|---|---|
| **Slate** | `#475569` | Subtitles, secondary body, captions |
| **Muted Slate** | `#64748b` | Labels, metadata, form labels |
| **Faint Slate** | `#94a3b8` | Footer text, timestamps, deemphasized content |
| **Rule** | `#cbd5e1` | Table borders, dividers |
| **Light Rule** | `#e2e8f0` | Section separators, subtle backgrounds |
| **Surface** | `#f8fafc` | Table header backgrounds, card fills |
| **White** | `#ffffff` | Page background |

### Dark surface (for brand headers, covers, and presentation title slides)

| Name | Hex | Usage |
|---|---|---|
| **Deep Navy** | `#010918` | Brand header background, presentation covers |

The brand wordmark (white or light on `#010918`) is the correct cover treatment. The Indigo accent (`#5234C6`) is used for section rule lines and accent elements on white backgrounds.

**What we do not use:**
- Gradients
- Neon or fluorescent colors
- Color backgrounds on body text pages (white only)
- Drop shadows on type

---

## Typography

### Primary typeface — Helvetica Neue (or system equivalent: Arial)

Used for all brand-facing materials: headlines, subheadings, navigation, tables, labels, one-pagers, presentations.

| Role | Weight | Size (print) | Treatment |
|---|---|---|---|
| Wordmark | 700 Bold | 28pt | Letter-spacing: 1.5px · Color: `#1a202c` |
| Cover headline | 700 Bold | 30pt | Line-height: 1.15 · Color: `#0f172a` |
| Section header | 700 Bold | 11pt | Uppercase · Letter-spacing: 0.5px · Border-bottom: `#5234C6` |
| Eyebrow / label | 600 SemiBold | 9pt | Uppercase · Letter-spacing: 2px · Color: `#5234C6` |
| Body | 400 Regular | 10–11pt | Line-height: 1.55 |
| Caption / metadata | 400 Regular | 8.5pt | Color: `#64748b` |

### Secondary typeface — Georgia (for legal and formal documents only)

Used in legal agreements, advisor/equity docs, and formal correspondence. Not used in sales materials, presentations, or product UI.

---

## Logo and Brand Mark

### Files

Located in `docs/specs/Investor-Memorandum-2026-05-25/`:

| File | Use |
|---|---|
| `brand-mark.svg` | Icon only — square format, for favicons, app icons, small lockups |
| `brand-wordmark.svg` | Full wordmark — horizontal, for document headers and email signatures |
| `brand-header.svg` / `.png` | Full-bleed header with dark background — for presentation covers, PDF covers, email headers |

### Usage rules

- **Minimum clear space:** equal to the height of the "S" in SOCIII on all sides.
- **On white backgrounds:** Ink (`#0f172a`) wordmark, or full brand header at full width.
- **On dark backgrounds:** White wordmark. Never use the Ink wordmark on dark.
- **Do not:** stretch, recolor, add drop shadows, or place the mark on busy photographic backgrounds.
- **Do not** use the wordmark at smaller than 100px wide in digital contexts.

---

## Writing Standards for Sales Materials

### Headlines

Lead with the customer's problem, not the product. Compare:

| Wrong | Right |
|---|---|
| "SOCIII: AI Operations for Title Companies" | "Your closers are spending their time tracking documents, not closing." |
| "Revolutionize Your Aviation Operations" | "Your Chief Pilot shouldn't be the dispatch system." |

### Financial comparisons

Use a two-column table. Left column: what they're paying now (specific, named). Right column: SOCIII. No ranges wider than 2:1 on either side — if the real range is $200–900/month, say "$200–900/month," not "as low as $200."

Example format:

| What you're paying now | SOCIII |
|---|---|
| Transaction coordinator: $45–65K/year | $150–250/month |
| CRM + tools: $3–8K/year | Included |

### The force multiplier statement

One before/after. Format: `[Role] + [what they're also doing] → [same role] + SOCIII`

Examples:
- "Chief Pilot + Director of Operations + Director of Training → Chief Pilot + SOCIII"
- "1 closer managing 3–5 active orders → 1 closer managing 10+ active orders"

### Just talk to it

Every one-pager and deck ends with a verbatim Alex example. Use italic for the user input. Format:

*"I run a 5-aircraft charter operation out of Centennial. Which pilots are current this week?"*

Alex pulls all currency dates and flags anyone within 30 days of expiration. Before you finish the sentence.

---

## Document Footers

All sales and marketing materials use this footer format:

```
Patent pending (USPTO filings May 2026) · sean@sociii.ai · sociii.ai
```

For vertical-specific documents, add the vertical line first:

```
SOCIII Inc. · [Vertical] vertical — [pilot reference if applicable]
Patent pending (USPTO filings May 2026) · sean@sociii.ai · sociii.ai
```

---

## Presentation Deck Structure (10-Slide Standard)

Each vertical deck follows this slide sequence:

| Slide | Title | Purpose |
|---|---|---|
| 1 | Cover | Brand header + headline stating the customer's problem |
| 2 | The Wave | Why this is happening now (not optional, not speculatable) |
| 3 | The Old Model | What it costs and why it breaks |
| 4 | The SOCIII Answer | What the product actually does (not features — outcomes) |
| 5 | The Financial Case | Side-by-side cost comparison table |
| 6 | The Force Multiplier | Before/after statement + the math |
| 7 | The Architecture | Append-only record + blockchain anchoring in plain language |
| 8 | The Stack | Worker list with record types |
| 9 | The Pilot | Anonymized but specific — resort market team, Western US developer, etc. |
| 10 | Just Talk to It | Three Alex conversation examples + CTA |

**Cover design:** Full-bleed `#010918` background. White wordmark top-left. Headline in white 30pt Helvetica Neue Bold. Vertical name in `#5234C6` eyebrow treatment above headline.

**Body slides:** White background. `#5234C6` section rule at top. Ink headlines. Content in two columns or table where possible. No bullet lists longer than 4 items.

---

## What This Is Not

- Not a crypto product. The blockchain anchoring is a record-integrity feature, not a cryptocurrency or token product. Never frame it as "our blockchain" or "on-chain assets."
- Not a replacement. Every sales document explicitly states that Alex makes the humans more effective — it does not eliminate roles.
- Not vaporware. Every claim must be backed by either a live deployment, an active pilot, or a specific real-world reference. No hypotheticals presented as capabilities.

---

*SOCIII Inc. · Internal use · Not for distribution*
*Brand assets: `docs/specs/Investor-Memorandum-2026-05-25/`*
