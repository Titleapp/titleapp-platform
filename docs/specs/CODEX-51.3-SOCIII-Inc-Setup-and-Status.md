# CODEX 51.3 — SOCIII Inc. Setup and Status

**Status:** Captured. Comprehensive record of SOCIII Inc.'s formation, identity, banking, brand, documentation, and fundraise readiness as of 2026-05-21.
**Period:** 2026-05-19 (formation) through 2026-05-21 (Storyhouse meeting + EIN issuance)
**Companion records:** CODEX 51.2 (General Dev), CODEX 51.4 (Knowledge Capture Pipeline)

---

## Purpose

This is the state-of-the-union for SOCIII Inc. at the end of its first operational window. Captures every structural decision, every shipped artifact, every external relationship engaged, and every open item. Intended to be readable in 15 minutes by a future Sean, a future Claude session, or a counterparty doing diligence.

---

## Entity Snapshot

| Field | Value |
|---|---|
| Legal name | SOCIII, Inc. |
| Entity type | Delaware C-Corporation |
| Formation date | 2026-05-19 |
| Formation vehicle | Stripe Atlas |
| EIN | Issued 2026-05-20 (within 24 hours of Atlas approval) |
| Principal office | 1810 E Sahara Avenue, STE 75942, Las Vegas, NV 89104 (Stable virtual address) |
| Registered agent | Delaware registered agent through Stripe Atlas |
| Tax year | Calendar (Jan-Dec) |
| Accounting method | Accrual |
| Patent status | Three provisional applications queued for filing (Task #239) |

---

## Identity & Communications

### DNS

| Domain | Status | Notes |
|---|---|---|
| sociii.ai | Cloudflare authoritative (titleapp.core@gmail.com account) | DNS propagating; landing live at workers.dev URL |
| sociii.net | Owned, dormant | Held for protection |
| titleappai.com, comparedigitalworkers, aiworkers.reviews, raascompliance | Owned, dormant | Held for protection |

### Google Workspace

| User | Email | Status |
|---|---|---|
| Sean Lee Combs | sean@sociii.ai | Active (separate user, $6-12/month seat) |
| Alex (AI Chief of Staff) | alex@sociii.ai | Active (separate user) |
| Kent Redwine | kent@sociii.ai | Provisioned, activates on cofounder agreement countersignature |
| Domain authentication | DKIM + SPF + MX records | All verified |

### SendGrid

| Item | Status |
|---|---|
| Free plan | Active (after trial-end resolution 2026-05-19) |
| Single Sender Verification — alex@titleapp.ai | Verified |
| Single Sender Verification — sean@sociii.ai | Verified |
| Single Sender Verification — alex@sociii.ai | Verified |
| Domain Authentication for sociii.ai | Deferred to post-Storyhouse |
| Duplicate SPF record cleanup | Deferred to Domain Auth pass |

### Banking

| Item | Status |
|---|---|
| Stripe Treasury (primary) | Application complete; Financial Account provisioning |
| Mercury (backup, planned) | Open after seed close as continuity insurance |
| Opening balance | $1,000 shareholder loan from Sean Lee Combs (test $100 transfer pending) |
| Connected funding source | Sean's personal bank via Plaid (after disconnecting incorrectly auto-linked TitleApp LLC account) |
| Stripe Issuing corporate card | Pending Financial Account activation |
| Stripe API keys → platform | Pending Financial Account activation; will wire `STRIPE_TREASURY_SECRET_KEY` into Firebase Secret Manager |

---

## Brand System

| Asset | Source | Status |
|---|---|---|
| Mark + wordmark | OpenAI brand board (`~/Downloads/Technical Brand Board.png`) | Canonical |
| Color palette | #7C3AED purple primary · #6D28D9 purple dark · #16A34A green accent · #0686D4 cyan accent · #0F172A slate | Canonical |
| Tagline | Collaborative Intelligence · Participation | Canonical |
| Hero copy | "A platform where people create, share, and earn from AI workers." | Canonical |
| Four pillars | Power to the Workers · Built on Trust · Open Ecosystem · You Hold the Key | Canonical |
| Loader states | idle → connecting → synchronizing → processing → activated (matches BrandLoader.jsx) | Canonical |
| Reference SVGs | Best-effort recreation at `~/Downloads/SOCIII-logo-mark-v3.svg` + `lockup-v3.svg` | Awaiting OpenAI vector export |

---

## Workspace in Platform

| Item | Value |
|---|---|
| Tenant ID | `ws_1779168732286_42qw6m` |
| Workspace name | SOCIII, Inc. |
| Sean's role | Admin |
| Active workers (visible) | 34 (full catalog inherited) |
| Live spine workers | Alex (CoS), Marketing & Content, Accounting, HR & People, Contacts, Fundraise, Control Center Pro |

---

## Contacts Population

| Source | Count |
|---|---|
| Ported from TitleApp AI tenant | 3,178 (one dupe skipped) |
| Net-new from Apollo (`fundraise:angels` segment) | 50 |
| **Total active contacts in SOCIII tenant** | **3,228** |

### Pre-existing segment carry-over (from port)

| Segment | Count |
|---|---|
| `network_kent` | 1,547 |
| `network_sean` | 1,343 |
| `sales_prospects` | 2,199 |
| `kent-investor-candidates` | 451 |
| `investor-candidate` | 380 |
| `titleapp_shareholders` | 114 |
| `accelerators-fundraise` | 25 |
| `accelerator-program` | 13 |
| `advisors` | 13 |
| `legal-counsel` | 31 |

### New segment created this period

| Segment | Count | Source |
|---|---|---|
| `fundraise:angels` | 50 | Apollo lead-gen mining |

---

## Cap Table Structure (pre-seed, post-formation)

| Bucket | % of fully diluted | Vehicle |
|---|---|---|
| Founder (Sean Lee Combs) | 60% | Founder RSPA, fully vested (or as restructured at Series Seed close) |
| Cofounder (Kent Redwine) | 15% | Milestone-vested RSPA, three gates × 5% |
| Other advisors (6 × 2%) | 12% | Standard FAST agreements + RSPAs, 24-month monthly vest no cliff |
| Combined creator pool (HOM warrants + advisor super-creator equity) | 13% | Warrants for HOM contributors; up-to-2.5% advisor equity grants |
| **Total non-founder pre-seed** | **40%** | |
| **Total** | **100%** | |

Series Seed dilution + 10-15% option-pool refresh applied pro-rata at round close.

### Creator equity v2 (bounded structure)

- **HOM contributors (167):** cash economics (75% sub + 20% data fee margin) + warrants sized by Sean's discretionary recognition. NO equity grants for shipping workers.
- **Advisors (7 max — Kent + 6 vertical):** base equity per RSPA + cash economics + up to 2.5% additional equity for shipped Qualifying Workers (0.5% per worker, max 5 workers).
- **General creators (post-launch):** cash economics only.
- Total worst-case dilution from creator pool: ~13% (constrained by pool size and per-creator cap).

---

## Known Liabilities (full disclosure)

| Creditor | Amount | Status |
|---|---|---|
| Robert Rosenstien | $100,000 | Formalized at 4% p.a. simple interest, quarterly payments, personal guaranty by Sean Lee Combs. Assumed by SOCIII Inc. with creditor consent. |
| Zuber Lawler (legal fees from prior representation) | $78,000 | Wind-down counsel for TitleApp LLC (dual role disclosed); formalized as payable on negotiated schedule. |
| Hampsons & Company | $25,000 | Formalized on same pattern (formal note, nominal interest, assumed by SOCIII Inc.) or paid current per Hampsons' choice. |
| Chris Dunn | $15,000 | Formalized on same pattern. Creditor has statutory walk-away option; plan is to honor through formal note. |
| HOM DAO inherited AP | ~$100,000 (consolidated) | Itemization pending; Cayman Foundation wind-down runs on separate track. |
| Founder Reimbursement Payable | running balance | Sean's personal-card spend tracked monthly. Sweep at seed close or APIC conversion. |

---

## TitleApp LLC Wind-Down (Predecessor Entity)

| Item | Status |
|---|---|
| Manager's Written Consent to Dissolve | Drafted; ready to sign 2026-05-20 |
| Notice to Members | Drafted; ready to issue |
| Notice to Creditors (5 versions) | Drafted; ready to issue |
| Counsel | Zuber Lawler (limited to wind-down scope) |
| HOM DAO tokens in LLC treasury | Disclosed as LLC asset, de minimis market value, disposition during wind-up |
| Creditor claim period | 120 days from notice issuance per 6 Del. C. § 18-804(b)(3) |
| Expected close | Late Q3 2026 (Cert of Cancellation after claim period) |
| Final tax returns | Federal + Delaware, prepared by accountant in Q4 2026 |

---

## Documentation Suite Produced

### For external delivery (Kent, Dorf, advisors, investors)

| Document | Purpose |
|---|---|
| `Kent-Email-Tomorrow.docx` | Original Sean → Kent cofounder offer email (5-section structure) |
| `Kent-Cofounder-Offer-Outline.docx` | Standalone offer terms document for Kent's review with counsel |
| `Kent-to-Dorf-Intro-Email.docx` | Warm intro email from Kent to Dorf, with dogfood and KYC framing |
| `Kent-Storyhouse-Talking-Notes.docx` | 1-page tactical brief for Storyhouse Thursday |
| `Kent-AI-Prep-Prompt.md` | Paste-into-Claude prompt for Kent's pre-meeting prep |
| `TitleApp-LLC-Wind-Down-Packet.docx` | Manager's Consent + Notice to Members + 5 creditor notices + Next-Steps checklist |
| `SOCIII-Inc-Fact-Sheet.docx` | Corporate snapshot for investors and advisors |
| `SOCIII-Executive-Summary.docx` | Standalone exec summary (Nepal medevac opener, real bios, revenue model, moat) |
| `SOCIII-Investor-Pitch-Document.docx` | Exec summary + 7-template drip campaign for broader outreach |
| `SOCIII-InvestorDeck-v2.pptx` | Investor deck (Kent finalizes for Storyhouse) |
| `SOCIII-AdvisorDeck-v1.pptx` | Advisor onboarding deck |
| `SOCIII-Creator-Deck-Content.md` | 9-slide creator deck content (post-seed close use) |
| `HOM-Contributor-Letter.docx` | Personal recognition letter from Sean (held until post-seed close) |
| `SOCIII-Inc-Corporate-Document-Packet.docx` | 20-template suite for Dorf review (founder/cofounder/advisor/creator/forms) |

### For platform integration

| File | Purpose |
|---|---|
| `~/Downloads/SOCIII-HR-Roster.csv` | HR & People worker import for the 10-person team roster |
| `~/Downloads/SOCIII-Accounting-Setup-Instructions.md` | Reference doc for Accounting worker setup (personal-card model, opening balance, projected budget) |

---

## External Relationships Engaged

| Counterparty | Role | Status |
|---|---|---|
| Stripe Atlas | Formation vehicle | Filing complete; EIN issued |
| Stripe Treasury | Primary banking | Financial Account provisioning |
| Mercury | Backup banking | Deferred to post-seed |
| Google Workspace | Email + Drive | Active |
| SendGrid | Email infrastructure | Active (free tier) |
| Apollo | Lead-gen + enrichment | Active (Pro tier, 4,020 credits/month) |
| Cloudflare | DNS + Workers | Active (titleapp.core account) |
| Firebase / Google Cloud | Platform infrastructure | Active |
| OpenAI | Brand identity production | Complete |
| Zuber Lawler | Wind-down counsel for TitleApp LLC only | Engaged |
| Dorf | SOCIII Inc. corporate counsel | Intro email sent by Kent; engagement letter pending |
| Storyhouse Ventures | First lead investor conversation | Meeting Thursday 2026-05-21 |

---

## Team Roster

| Role | Name | Credential | Status |
|---|---|---|---|
| Founder, CEO, Sole Director | Sean Lee Combs | Airline + medevac pilot, title operator, platform architect | Active |
| Cofounder (IR) | Kent Redwine | Banc of America + Thomas Weisel; institutional capital markets | Terms agreed 2026-05-21; FAST + RSPA pending Dorf draft |
| Advisor — Data Center / IT | Robert Rosenstien | Oracle; infrastructure, legal, compliance | Pending FAST execution |
| Advisor — Aviation | Eric Altshuler | Naval Aviator, FedEx 777 Pilot | Pending FAST execution |
| Advisor — Nursing / EMS | Ruthie Clearwater, PhD | Lead Program Director, University of Hawaiʻi Nursing School; EMS flight nurse | Pending FAST execution |
| Advisor — Real Estate Development | Scott Eschelman | Principal of BuildSF | Pending FAST execution |
| Advisor — Title & Real Estate Data | Kim Bennett | Helped create PropertyRadar; pioneered real estate data services | Pending FAST execution |
| Advisor — EU Digital Product Passport / EU Ecommerce | Elise van der Bel | Leading expert on EU DPP regime | Pending FAST execution |
| Engineering Contractor | Vishal Kumar | Upwork, $25/hr; Shopify + Python + Anthropic | Active |
| Engineering Contractor | Manpreet Kaur | Upwork, $25/hr; Shopify + Python + Anthropic | Active |

---

## Storyhouse Thursday Meeting (2026-05-21)

| Item | Value |
|---|---|
| Meeting date | 2026-05-21 (Thursday) |
| Lead in room | Kent Redwine |
| Reachable by phone | Sean Lee Combs |
| Materials | Investor Deck v2 · Exec Summary · Fact Sheet · Talking Notes |
| Pre-meeting prep | Kent runs AI Prep Prompt against Claude.ai with all docs attached |
| Target outcome | Non-binding term sheet within 2 weeks; broader outreach Monday |
| Round target | $1-2M seed |
| Founder posture | Choosing the raise, not requiring it (12 months personal runway exists) |

---

## Open Items at End of Period

| Item | Owner | Target |
|---|---|---|
| Stripe Treasury Financial Account fully provisioned | Stripe (background) | Within hours of EIN |
| $1,000 shareholder loan funded via Plaid from Sean's personal account | Sean | Same day as Financial Account activation |
| Stripe Issuing corporate card | Sean | Same day as Financial Account activation |
| `STRIPE_TREASURY_SECRET_KEY` wired into Firebase Secret Manager for Accounting worker | Sean + AI | Same day |
| Dorf engagement letter executed | Sean | Within 24 hours of Dorf's response |
| RSPA + FAST + Side Letter for Kent countersigned | Dorf, Sean, Kent | Within 5 business days |
| RSPAs + FASTs for 6 vertical advisors | Dorf | Following Kent's package |
| HOM contributor personal letters (167) | Sean | Post-seed close, ~30-45 days |
| LLC wind-down notices issued | Sean + Zuber | 2026-05-20 (pending counsel review) |
| Robert promissory note papered and signed | Sean + Robert + Zuber | Within 5 business days |
| Patent provisionals × 3 filed at USPTO | Sean + patent counsel | Day 0 SOCIII operational (Task #239) |
| Apollo miner v2 (VC + accelerator queries fixed) | Sean + AI | Mid-week post-Storyhouse (Task #243) |

---

## Bottom Line

SOCIII Inc. went from filing on Atlas to operational in less than 72 hours. EIN issued, banking provisioning, brand canonical, 3,228 contacts ready for outreach, full document suite produced for counsel + cofounder + advisors + investors + creators, cofounder terms agreed and pending paper, lead investor meeting set for the same week, prior-entity wind-down packet drafted and counsel engaged, IP cleanly separated between founder personal and corporate, creator equity structure bounded against runaway dilution.

The platform's dogfood story is no longer aspirational. SOCIII Inc. runs on SOCIII today.

What's not yet done: the knowledge-capture pipeline (CODEX 51.4) that turns this period's learnings into Accounting/Tax/Compliance worker improvements. That is the work of the next sprint.
