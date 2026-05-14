# Investor Doc Audit — 2026-05-09

**Owner:** Sean (review) · Claude (audit)
**Status:** Audit complete · refresh work pending Sean approval
**Trigger:** CODEX 50.18 day; Apollo + Fundraise dogfood verified; tracker import in progress; investor docs need refresh before Conviction Embed Demo Day (May 14)

---

## TL;DR

Current investor docs are **dated March 2026** and reflect platform state from ~7 weeks ago. The most-cited material — **One-Pager v7** — has multiple stale claims that hurt credibility with investors who ask "is this still true?" Specifically: brand name, worker count, raise number, and missing pillars/features that have shipped since.

**Recommended action:** refresh the One-Pager FIRST (highest-leverage, used in cold outreach), then Pitch Deck v7, then Business Plan v5. ~half-day for One-Pager + Deck if I draft, you review.

---

## What exists

| File | Path | Last modified | Format |
|---|---|---|---|
| **One-Pager v7** | `docs/investor/current/TitleApp_One_Pager_v7.pdf` | Mar 10, 2026 | PDF (4.7KB) |
| **Pitch Deck v7** | `docs/investor/current/TitleApp_Pitch_Deck_v7.pptx` | Mar 10, 2026 | PowerPoint (415KB) |
| **Business Plan v5** | `docs/investor/current/TitleApp_Business_Plan_March2026_v5.docx` | Mar 10, 2026 | Word (13.9KB, ~7,500 words) |
| **Financial Model v2** | `docs/investor/current/TitleApp_Financial_Model_v2.xlsx` | Mar 10, 2026 | Excel (11KB) |
| **RE Development Deck v4** | `docs/investor/current/TitleApp-RE-Development-v4.pptx` | Mar 10, 2026 | PowerPoint (302KB) |

Archive: `docs/investor/archive/v6/` (older Pitch Deck + Financial Model)
`docs/investor/v3/` is empty.

What we **don't** have in the repo:
- Demo video (none)
- Reference customer / case study one-pagers (none)
- Term sheet template (none)
- Cap table snapshot (separate Cap Table service exists, not exported as a doc)
- Data room file pack to attach to share-links (`allowedFiles: []` in the dogfood test)

---

## Stale claims found (One-Pager v7 — used as the canonical proxy)

| # | Stale claim | Current truth |
|---|---|---|
| 1 | Brand: **"TITLEAPP"** | **"TITLEAPP AI"** (canonical as of 2026-05-08, Sean's call) |
| 2 | "**1,000+ Digital Workers**" | 226 catalog workers, 238 in Firestore. 1,000 was forward-looking; 226 is actual |
| 3 | "**12 Industry Suites**" | 8 verticals shipped; Health/EMS in development (would be 9 at launch). 12 is aspirational |
| 4 | Raise: **"$2.5M, $15M cap, 20% discount"** | Tracker shows target **$1–2M seed** (Kent owns) |
| 5 | Date: "**March 2026**" | May 2026 |
| 6 | Address: 2411 Chestnut St, SF | Verify with Sean |
| 7 | Phone: (310) 430-0780 | Verify with Sean |
| 8 | Architecture framing: **"4-tier rules stack"** | Shipped: Job RAAS vs Constraint RAAS distinction, 3 enforcement points (pre-gen / post-gen / pre-publish), constraint module versioning, multi-source loader |
| 9 | Positioning: **"Built for regulated industries"** | Updated to broader: "Anyone who builds digital workers that produce verifiable, audit-grade output" — regulated industries are the strongest example, not the boundary |
| 10 | Pillars: 4 mentioned (Vault, RAAS, Alex, Document Control) | **5 pillars** as of 2026-05-08 — added "**Build Without Code**" (the accessibility moat that makes the other 4 matter at scale) |

## Missing claims worth adding (shipped but not in current docs)

| # | Capability | Status | Source |
|---|---|---|---|
| 1 | **Securities Compliance v1 RAAS module** — 52 jurisdictions, 24 sections, blue-sky 50-state | Live in production | CODEX 50.17 |
| 2 | **OFAC SDN screening** — 18,927 entries, end-to-end working | Live in production | CODEX 50.17 P0-2 |
| 3 | **User-counsel attestation pattern** — TitleApp AI is not a law firm; user's counsel attests | Architectural decision | 2026-05-08 |
| 4 | **Universal data-credit billing v1** — every external API call (Apollo, ATTOM, First American, MLS, Treasury) bills users with markup, with three-tier confirmation UX (silent / warn / confirm) | Live in production | CODEX-derivative 2026-05-08 |
| 5 | **Multi-persona contacts (spine_v2.1)** — same contact can be friend + client + collaborator simultaneously, with per-persona engagement | Live, tested today | CODEX 50.18 |
| 6 | **Fundraise worker (BANK-FUND-001)** — Reg D 506(b)/(c) gates, KYC state machine, accreditation tracking, scoped share-links | Verified end-to-end today | CODEX 50.15 P0-13/14/15/16 |
| 7 | **Apollo integration** — investor + creator + client prospecting, real-time burn tracking, $4,020/mo budget | Live | CODEX 50.15 P0-8 |
| 8 | **Aviation CoPilots** — 11 live (AV-P01 through AV-P11), PC12-NG reference implementation with 4,209 pages of FSI material indexed | Live | CODEX 34.5 |
| 9 | **Document Control 4th pillar** — version control, distribution, acknowledgment tracking with Dropbox Sign, blockchain-anchored audit trail | Live | CODEX 34.10-T2 |
| 10 | **Build Without Code (5th pillar)** — domain experts (nurse, mechanic, broker, pilot, instructor) author workers without coding fluency. The accessibility moat. | Architectural decision 2026-05-08 |
| 11 | **Active Real Estate thesis** — direct-to-consumer disruption of RE sales/leasing/lending/financing/title; "$500/hour problem" pricing anchor | Strategy memo 2026-05-09 |
| 12 | **White-labeling roadmap** — Enterprise tier, brand tokens designed in now | Decision 2026-05-08 |

---

## Recommended refresh — sequence and content

### Priority 1: One-Pager v8 (refresh today/tomorrow — used in cold outreach)

Single page. Replace v7 with these changes:

- **Header brand:** `TITLEAPP AI` (not `TITLEAPP`)
- **Tagline:** "Verifiable AI Digital Workers — built by domain experts, governed by RAAS, anchored on-chain"
- **Stat row:** `226+ Digital Workers` · `8 Verticals Shipped` · `52 Securities Jurisdictions` · `18,927 OFAC Entries`
- **What We Do:** rewrite around Five Pillars (Vault, RAAS, Alex, Document Control, **Build Without Code**)
- **Differentiation paragraph:** add "verifiable" framing, mention OFAC + Securities + audit trail as concrete proof
- **Market Opportunity:** keep the TAM/SAM/SOM math; add "Beyond regulated: continuing-ed, EU DPP, internal-knowledge, creators"
- **Revenue Model:** unchanged ($0/$29/$49/$79, 75% creator share, $0.02/credit overage)
- **Revenue Projections:** confirm with Kent — current scenarios may need re-calibration based on 226-worker reality vs 1,000-worker projection
- **Team:** unchanged (verify Vishal/Manpreet engagement, Kim's title, Scott's advisor status)
- **Current Raise:** **$1–2M seed** per tracker. Keep SAFE structure if that's still the call. Verify cap + discount with Kent.
- **Date:** May 2026
- **Footer disclaimer:** unchanged ("not an offer to sell securities")

### Priority 2: Pitch Deck v8 (refresh week of May 12 — needed for Conviction Embed Demo Day May 14)

Slide-by-slide diff against v7. Without seeing v7 contents I'd guess these slides need rework:
- Title slide — brand
- Stat cover — worker count + new metrics
- Problem slide — keep, possibly sharpen with the "verifiable" angle
- Solution / pillars — was 4, should be 5 (add Build Without Code)
- Architecture — replace "4-tier rules stack" with the 3-enforcement-points story + constraint module diagram
- Verticals — current count + Health/EMS as "next"
- Traction — add OFAC entry count, Securities module jurisdictions, Apollo integration, etc. as proof points
- Team — same as One-Pager
- Raise — $1–2M
- Ask / use of funds — recompute against $1–2M not $2.5M

I can extract v7 slide content if Sean wants a precise diff before drafting v8.

### Priority 3: Business Plan v6 (refresh after launch — for due diligence)

Long-form (~7,500 words currently). Used by VCs in deep due diligence, not in first-touch.
- Same brand + count + pillar updates as One-Pager
- Add "Beyond regulated industries" section (per docs outline framing)
- Add "What we built since v5" section: CODEX 50.15, 50.17, 50.18 highlights
- Update "Current Status" to reflect soft-launch readiness
- Add the user-counsel attestation pattern under Compliance
- Refresh Financial Model v2 → v3 with current burn + recalibrated projections (Kent owns)

### Priority 4: Data room file pack (refresh before sending any share-link to a real investor)

The Fundraise share-link mints with `allowedFiles: []`. Need actual files in Firebase Storage that the share-link can serve:
- One-Pager v8 (PDF)
- Pitch Deck v8 (PDF export of pptx)
- Business Plan v6 (PDF or DOCX)
- Financial Model v3 (XLSX)
- Cap Table snapshot (PDF export of cap table service)
- Term sheet template (DOCX)

**Action:** when these files are ready, upload to Storage and call `dr.attachFiles(fundraiseId, fileRefs)` (or similar — verify the API in `services/fundraise/dataRoom.js`). Then share-links will actually have content.

---

## What I can do tonight if Sean greenlights

- **Draft One-Pager v8 markdown** (~30 min) — produces a markdown source file you can convert to PDF via pandoc or hand to a designer. Single source of truth that the docs site can also reference.
- **Extract Pitch Deck v7 slide titles + content** (~15 min) — gives us a precise diff target. I can read pptx via the xlsx-style approach (pptx is also a zip).
- **Draft Pitch Deck v8 outline** (~45 min) — slide-by-slide structure with bullet content, ready to drop into a designer's hand or rebuild in Slidev/markdown.
- **Verify the BAN-FUND-001 worker exposes a `dr.attachFiles` API or equivalent for share-link content** (~10 min) — clarifies the data-room-population gap.

---

## Acceptance criteria

A refreshed investor doc set that:
1. Uses "TitleApp AI" canonically throughout
2. Cites accurate worker counts (226, not 1,000)
3. Names all five pillars
4. Reflects the user-counsel attestation pattern (no overclaim of being a law firm)
5. Reflects current raise size from the tracker
6. Highlights post-March-2026 shipped work (OFAC, Securities module, Fundraise worker, Multi-persona, Apollo, Universal data-credit billing)
7. Aligns with the broader docs outline's "anyone who builds verifiable AI" framing
8. Is dated within ~1 week of the date of first send to any investor (don't ship "May 9" doc to someone in late May)
