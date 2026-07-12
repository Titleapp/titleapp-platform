# CODEX 35 — Volta Advisory Demo: Production Readiness + Build Order

**Status:** SPEC — for red team before build
**Suite:** EU DPP · cross-cutting synthesis
**Trigger:** Post-red-team synthesis of CODEX 29–34 outstanding items + open decisions
**Date:** 2026-07-11

---

## 1. What Red-Teaming Settled (Closed — No Further Action)

These were raised, resolved, and committed to the codexes and/or canvas code in this session. Not open items — listed here so the demo runner and Elise know these concerns have been addressed.

| Finding | Resolution | Where |
|---|---|---|
| Charge-bar green label must say "ready for advisor review," never "ready to submit" | Explicit label constraint added | CODEX 29 §5a, canvas legend |
| 48-hour report hold must be enforced by RAAS, not just UI | Added as RAAS Rule 6 | CODEX 29 §6 |
| CODEX 32/33 contradiction: does amendment submission require human approval? | CODEX 32 Rule 4 rewritten — advisor must explicitly approve; RAAS does not submit autonomously | CODEX 32, CODEX 33 |
| Supplier fan-out: live reference vs. snapshot at submission time | Resolved as **snapshot** — supplier data is copied into each passport at application time; required for immutability | CODEX 31 §4 |
| Mock QR codes could be printed on real product labels | TEST MODE banner + download disabled added to Worker 2 (Export + Submit tab) and CODEX 30 Build Step 4 | CODEX 30, DPPWorkerCanvas |
| Cluster 3 gate blocks all of Worker 2, including Passport Preview | Clarified: preview uses separate read path, always available; only export and submit are gated | CODEX 30 Rule 1 |
| EU AI Act cite for worker-separation claim | Cited: Article 22 (human oversight obligations) | CODEX 30 §1 |
| 80% SoH repurposing threshold unhedged | Cited Article 14 + hedged: "Battery Pass Consortium interpretation; ESPR monitoring required" | CODEX 33 Rule 2 |
| EU data residency missing from CODEX 31, 32, 33 | Added to all three prerequisites sections | CODEX 31–33 §6 |
| "TRAITLY" vs "Volta Advisory" naming inconsistency | Fixed in CODEX 31 access model table | CODEX 31 §4 |
| BMS pitch vs. bespoke reality | Scalability flag added to CODEX 33 §6 and §8 | CODEX 33 |
| Second-life marketplace unscoped | Tab 5 shows open decision note; build hold until Sean decides | CODEX 33 §3, canvas |
| Reseller pricing/economics not settled | Caveat added to CODEX 33 §8 | CODEX 33 |
| Workers 2–5 showed no tabs (Trump Rule violation) | Full real canvases built and deployed | DPPWorkerCanvas.jsx |

---

## 2. Open Decisions (Require a Person to Decide — Not Engineering Calls)

These are blocked on human judgment, not engineering. The demo can run today without these resolved, but they must be closed before any of the affected capabilities are pitched to a real prospect.

### Decision A — Second-Life Marketplace Model (blocks LMTabSecondLife full build)
**CODEX 33 §3 Tab 5 currently shows:** a list of "second-life market connections" (recyclers, integrators, EU-registered refurbishers) with a build hold.

Two distinct models:
1. **Informational only**: display a curated list of registered EU refurbishers. No commercial relationship. SOCIII gets nothing.
2. **Referral / marketplace**: SOCIII receives a fee when a Volta Advisory client connects with a recycler through the platform. Separate monetization pattern with its own revenue accounting, terms, and legal structure.

**Owner:** Sean
**Urgency:** Not demo-blocking for current Battlink demo. Blocks expansion of Worker 5 and any sales pitch that references second-life revenue.

### Decision B — Reseller Economics (blocks Elise using the Platform-tier sales script)
**CODEX 33 §8** currently contains a sales pitch for the Platform subscription tier but carries a caveat: "specific pricing and the revenue split between SOCIII and Volta Advisory / Elise are not yet agreed."

**What needs to be agreed:**
- SOCIII platform fee per client (or per SKU, or per submission)
- Elise's advisory fee / reseller margin on top
- Who invoices the client (Elise invoices, then pays SOCIII? Or SOCIII invoices with Elise on a rev-share?)
- Whether the pricing in CODEX 33 (€1,490/month as an example) is within range of what Battlink would pay

**Owner:** Sean + Elise
**Urgency:** Blocks giving Elise a sales script she can use with HOPPECKE and FIAMM. High priority — registry opens 19 Jul.

---

## 3. Build Backlog (Prioritized by Demo Impact)

### Priority 1 — Elara Multilingual Prompt (1 hour — trivial lift)
**CODEX 34 §2** calls this out explicitly as already-free capability. One additional line in the system prompt:

> "Respond in the language the user writes in. Default to English if the language is unclear. This applies across Dutch, German, Mandarin, and English."

This gives Elise the ability to demo in Dutch with a Battlink contact, German with HOPPECKE, or hand the Supplier Portal to a Mandarin-speaking CATL contact — all without any engineering beyond a one-line prompt edit.

**Blocker:** None.
**Owner:** Engineering. One PR, five minutes.

### Priority 2 — Registry Allowlisting Application (8 days — time-sensitive)
**CODEX 32 §6**: EU DPP Central Registry opens 19 July 2026. Third-party submitters (SOCIII / Volta Advisory) must apply for government allowlisting on day one. The API schema and application process will be published by the EU Commission pre-launch.

**Action:** On 19 Jul 2026, go to the EU DPP Central Registry portal and submit the Volta Advisory (and/or SOCIII) allowlisting application. This is not a build task — it is a business/legal task with a hard deadline. Missing this means Elise cannot submit actual passports even when they're ready.

**Owner:** Elise (with SOCIII account credentials).
**Urgency:** CRITICAL — 8-day window.

### Priority 3 — Localization (CODEX 34 — Client NL/DE scope first)
**Sequence for demo readiness:**

1. Add `locale` field to user session schema (not Firebase claims — separate from role)
2. Add locale switcher to Worker 1 (Compliance Auditor) and Worker 2 (Passport Builder) canvas headers
3. Externalize all static UI strings in Workers 1+2 to locale keys (`i18n/en.js`, `i18n/nl.js`, `i18n/de.js`)
4. Machine-translate the `nl` and `de` tables as a first draft
5. **Native-speaker review pass — mandatory before demo use.** Focus on: charge-bar labels, compliance-status text, anything that implies a readiness level or a legal obligation.
6. Supplier scope (Worker 3 Mandarin) is lower priority than client scope — Battlink demo is Dutch/English.

**Build estimate:** Steps 1–4 are 1–2 days. Step 5 (native review) takes as long as it takes — schedule this immediately since it's the constraint.

**Blocker for demo:** If Battlink demo is in English, localization is not a blocker. If Elise wants to run the demo in Dutch, this must be done first.

### Priority 4 — Supplier Portal Authentication (CODEX 31 — Phase 2)
**Current state:** Worker 3's Supplier Portal tab displays the supplier list and invite UI, but a supplier cannot actually log in — the Firebase custom claims for the `supplier` tier are not built.

**What's needed:**
- Add `role: "supplier"` Firebase custom claim
- Build supplier invite flow: advisor sends link → supplier creates limited account → supplier-mode canvas renders
- Firestore security rules: supplier can only write their own node; cannot read across clients

**Urgency:** Not a Battlink demo blocker (Battlink is the client, not the supplier). Becomes a blocker when Elise wants CATL or Samsung SDI to actually submit data.

### Priority 5 — Live Registry API (CODEX 32 — activates 19 Jul 2026)
**Current state:** `POST /v1/dpp:submit` returns a mock response. The canvas shows TEST MODE banners everywhere.

**What's needed post-19 Jul:**
- Obtain registry API schema from EU Commission
- Implement live `POST /v1/dpp:submit` → actual EU registry API call
- Replace stub response with real passport ID + QR
- Remove TEST MODE flag, enable QR download

**Prerequisite:** Allowlisting approved (Priority 2). Cannot implement until API schema is published.

---

## 4. Demo Readiness State — Today

| Capability | State | Demo-safe? |
|---|---|---|
| Worker 1 (Compliance Auditor) — 5-tab canvas | ✅ Built + deployed | Yes |
| Worker 2 (Passport Builder) — 4-tab canvas | ✅ Built + deployed | Yes |
| Worker 3 (Supply Chain Tracer) — 4-tab canvas | ✅ Built + deployed | Yes |
| Worker 4 (Registry Manager) — 4-tab canvas | ✅ Built + deployed | Yes |
| Worker 5 (Lifecycle Monitor) — 4-tab canvas | ✅ Built + deployed | Yes |
| Battlink BV data seeded | ✅ Done | Yes |
| Elara chat — English | ✅ Working | Yes |
| Elara chat — Dutch, German, Mandarin | 🔴 Not configured | No (one-line fix) |
| Mock QR safeguard (TEST MODE banner) | ✅ Built + deployed | Yes |
| Charge-bar labels ("ready for advisor review") | ✅ Correct | Yes |
| EU Registry submission | 🟡 Mock stub (registry not yet live) | Yes — with disclaimer |
| Supplier portal logins | 🔴 Not built | No (not needed for Battlink demo) |
| Localization (NL/DE/ZH) | 🔴 Not built | Only if demo is in English |
| Second-life Tab 5 full build | 🟡 Placeholder + open decision | Yes — placeholder is intentional |
| Reseller pricing agreed | 🔴 Not agreed | Yes for demo, No for real sales |

**Net assessment:** The demo is showable today in English. Three things must happen before Elise takes this to a real client meeting: (a) Elara multilingual prompt, (b) agree reseller economics, (c) native-reviewed localization if the meeting is in Dutch or German.

---

## 5. What the Demo Runner Must Know (Not In the UI)

Brief Elise explicitly on the following before any client demo:

1. **Generated reports are in English only.** The Advisory Reports tab (Worker 1) auto-generates in English. Elise must translate or summarize verbally for Dutch/German client contacts. This is a known gap, not a bug.

2. **The JSON-LD passport export does not change by language.** The Annex XIII format is fixed by regulation — attribute names and units are standardized. A Dutch client does not get a Dutch-language JSON-LD file. The compliance data inside is the same regardless of UI language.

3. **Registry submissions are mocked until 19 Jul 2026.** If a client clicks "Submit to EU Registry," the worker shows TEST MODE and no submission happens. This is intentional. Frame this proactively: "We're ready to submit — we're waiting for the registry to open in 8 days."

4. **Cluster 3 (carbon footprint) is the blocker for all 6 Battlink SKUs.** No passport can be exported until the LCA certificate is obtained. BTL-LMT24 is closest at 80%. This is the real-world constraint, not a demo limitation — and it's the right opening for the first advisory conversation.

5. **BMS connections for EV modules are not yet commissioned.** The Lifecycle Monitor shows live data for Industrial and LMT modules. EV48 and EV72 show "BMS not connected" — this is accurate, not missing data.

---

## 6. Sign-Off Gate for Next Build

Before building Priority 3 (localization) and Priority 4 (Supplier Portal auth):

- [ ] Decision A resolved: second-life marketplace model confirmed (informational vs. referral)
- [ ] Decision B resolved: SOCIII–Elise reseller economics agreed and written down
- [ ] Elara multilingual prompt added (Priority 1 — merge before anything else)
- [ ] Registry allowlisting submitted on 19 Jul 2026 (Priority 2 — calendar reminder set)
- [ ] Demo runner briefed on the five points in §5
- [ ] CODEX 35 red-teamed and signed off

---

*This codex is a synthesis document — it does not introduce new technical decisions. All referenced decisions were either settled in CODEX 29–34 or explicitly flagged as open. The build items here are the direct outputs of the red team sessions.*
