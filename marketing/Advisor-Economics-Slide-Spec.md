# Advisor Economics Slide — Content Spec

**Audience:** Vertical-domain experts considering SOCIII advisor role (Eric on aviation, Kim on RE, Scott on commercial RE, future advisors)
**Use cases:** Advisor recruiting decks, Storyhouse follow-up packets, Kent's investor conversations when advisor-team comes up
**Format target:** Single slide for inclusion in 8-12 slide investor and advisor decks
**Designer brief:** Visual reference at bottom. Math is in dollars; design should make the right column ("compound at scale") feel like the punchline.

---

## Headline

> **Build once. Get paid forever. Own a piece.**

Alternative headline options (pick based on deck context):
- "Three revenue layers stacked on top of one Digital Worker."
- "What a SOCIII vertical advisor earns."
- "Vertical advisor economics — the part most platforms don't show you."

---

## Subhead

Vertical advisors at SOCIII contribute domain expertise that becomes the SOPs, rule sets, and governance behind workers in their industry. In return, they earn at three layers — cash from every subscription, cash from every execution, and equity in the upside.

---

## The Three Layers (visual stack)

### Layer 1 — Subscription Share · 75%
For each worker priced at $79/mo (the most common pricing tier for vertical workers), the advisor receives **$59.25/month per active subscriber**, paid through the platform's monthly cycle close. Platform retains 25% for hosting, billing, support, and the trust layer.

### Layer 2 — Inference Margin Share · 20%
On top of subscription revenue, every worker session consumes inference credits. Advisors earn **20% of the platform's margin on inference overage** — usage beyond the included monthly credit allotment. This compounds with worker depth: heavily-used workers (real-time pilot decision support, complex F&I calculations, multi-jurisdiction title analysis) produce ongoing inference revenue that flows back to the advisor.

### Layer 3 — Equity Warrants · 0.5% per Worker, Capped at 2.5%
For each Digital Worker activated under the advisor's name, the advisor receives **0.5% equity in SOCIII Inc.** as a warrant grant. Capped at five workers per advisor (2.5% maximum per individual). Standard four-year vesting with one-year cliff. Maximum advisor count: seven, total advisor pool: 17.5% reserved.

---

## The Math at Three Scales

### Modest adoption — single worker, 100 active subscribers
| Layer | Monthly | Annual |
|------|----------|--------|
| Subscription share | **$5,925** | $71,100 |
| Inference margin (est.) | $500–$1,500 | $6K–$18K |
| Equity warrants (0.5% × SOCIII value) | accumulating | vesting |
| **Total cash** | **$6,425–$7,425** | **$77K–$89K** |

### Strong adoption — single worker, 1,000 active subscribers
| Layer | Monthly | Annual |
|------|----------|--------|
| Subscription share | **$59,250** | $711,000 |
| Inference margin (est.) | $5K–$15K | $60K–$180K |
| Equity warrants (0.5%) | accumulating | vesting |
| **Total cash** | **$64,250–$74,250** | **$771K–$891K** |

### Five workers at strong adoption — the cap scenario
| Layer | Annual cash | Equity |
|------|-------------|--------|
| Subscription share (5 × $711K) | **$3.555M** | — |
| Inference margin share | $300K–$900K | — |
| Equity warrants (2.5% × SOCIII value) | — | **vested** |
| **Total annual cash** | **$3.86M–$4.46M** | + 2.5% equity |

At a SOCIII enterprise valuation of $250M (early Series A target), 2.5% equity represents **$6.25M in equity value** on top of the cash income.

---

## Compared to Traditional Consulting

A vertical domain expert (a Part 135 chief pilot, a 30-year commercial real estate broker, an experienced healthcare compliance officer) typically earns $200-$500/hour in traditional consulting work. To match the single-worker strong-adoption income above, they would need to bill ~$200K/year in consulting hours (200 hrs/month at $300/hr — close to a full-time schedule).

The SOCIII advisor doesn't bill hours. The advisor contributes once (the worker is configured, rules are encoded, governance is reviewed) and earns continuously from every subscriber for the worker's lifetime. The work compounds; consulting hours do not.

---

## Why SOCIII Pays Advisors Differently Than Other Platforms

Most AI agent platforms (e.g., GPT Store, Claude Store, agent marketplaces) pay creators a one-time per-sale share or a small recurring commission. They don't share inference margin and they don't share equity. Their model assumes the platform owns the trust layer and the creator owns the prompt — the prompt is commodity, the trust is the product.

SOCIII's model recognizes that in regulated industries, the domain expertise IS the product. A pilot logbook worker is only valuable because a real pilot designed the rules; an F&I compliance worker is only valuable because a real F&I director encoded the regulatory edge cases. Without the expertise, the platform is hollow.

So SOCIII pays advisors as if they were equity partners in the workers they shape. The 75/20/0.5% stack reflects that the advisor's expertise is co-equal with the platform's trust layer in producing the worker's value.

---

## What an Advisor Owes Back

Advisors are not employees. The expectation is:

- **One worker minimum** to activate the equity grant. Five workers maximum to hit the equity cap.
- **Domain expertise review** at worker design time — defining SOPs, encoding rules, identifying compliance edge cases.
- **Ongoing maintenance** as the underlying industry regulations change (typically a quarterly review per worker).
- **No exclusivity** — advisors can simultaneously hold positions, run their own consulting practices, work for other firms.
- **No fundraising expectation** — fundraising is Sean and Kent's responsibility, not the advisors'.

Advisors are paid for what they know, not what they sell.

---

## Visual Reference (for the designer)

The slide should show three horizontal bars stacked vertically, in SOCIII brand colors:

- **Bar 1 (top): Subscription Share** — purple gradient (#7C3AED → #6D28D9). Most visible. Largest header text: "75%".
- **Bar 2 (middle): Inference Margin** — cyan (#0686D4). Medium emphasis. Header: "20%".
- **Bar 3 (bottom): Equity Warrants** — green (#16A34A) — the "growth" color in the brand system. Header: "0.5% per worker, capped at 2.5%".

To the right of the stack, three columns showing the math at the three scales (modest / strong / cap). Use vertical bar charts to visualize the income compounding from modest → strong → cap.

Bottom of slide, in slate-500 small-caps text: *"Cash payouts monthly. Equity vesting 4 years with 1-year cliff. Maximum 7 vertical advisors across the platform."*

---

## Quotable Lines (for Kent and Sean to deploy verbally)

- "Build once, get paid forever, own a piece."
- "We pay advisors the way Red Hat would have paid Linus, if Red Hat had figured out equity grants in 1995."
- "Three layers of compensation, two of them recurring, one of them with equity upside. Most platforms only do one."
- "The expertise is the product. The platform's job is to package it and distribute it. So the expert gets the bigger share."
- "Our advisors don't bill hours. They build assets."

---

## Open Items for Sean

- [ ] Confirm the 75/25 subscription split is locked (per project_creator_equity_structure_v2.md memory it is, but final attorney review for advisor contracts)
- [ ] Confirm the 20% inference margin share is locked (same)
- [ ] Confirm the 0.5%/worker × 2.5% cap × 7 advisors maximum is locked
- [ ] Determine standard advisor agreement length (recommend 4-year vesting matching the equity schedule)
- [ ] Pick the visual stack representation (horizontal bars vs vertical layers vs nested ovals — recommend horizontal bars for compactness)
- [ ] Designer handoff (Figma file with brand color hex codes and the layout specs from the visual reference section)

---

*Slide content spec produced 2026-05-22. Targeting inclusion in next advisor deck refresh (Sat 2026-05-23 or Mon 2026-05-25 for the Storyhouse follow-up packet).*
