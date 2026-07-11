# Red-Team: CODEX 25 (RE Demo) + CODEX 26 (Education Demo)

**Conducted:** 2026-07-09 · **Method:** Codebase audit + Dr. Maya lessons applied

---

## CODEX 25 (RE Demo) — Blockers

### RT1: `re-brokerage` and `re-property-manager` DO NOT EXIST as wired workers
The CODEX lists them in the "Workers Scott Needs" table. Neither has a WORKER_CHECKLISTS entry, WORKER_INTELLIGENCE entry, or liveData handler. What exists for RE workers is the canvas-based set: `title-abstract-001`, `zoning-001`, `feasibility-001`, `law-landuse-001`, `site-recon-001`, `cre-analyst` — these are deal/transaction analysis tools, not operational dashboards. For PM operations (tenant ledger, maintenance) and brokerage (listing CRM), those canvases are either not built or RAAS-only (rules exist in `property_manager_v1.json` but no front-end).

**Fix required:** Reframe Scott's worker lineup to what's actually wired. Two options:
- A: Accelerate building `re-property-manager` canvas before the RE demo (add to build queue)
- B: Demo shows the 6 RE analysis workers (title, zoning, feasibility, land use, site recon, CRE analyst) + platform workers + re-marketing-001. Property management story told via Marketing + Accounting (rent roll as a revenue line). IR story told only if `investor-relations` canvas is built.

### RT2: `investor-relations` has NO canvas infrastructure
WORKER_CHECKLISTS: missing. WORKER_INTELLIGENCE: missing. liveData handler: missing. It exists in the marketplace and sidebar but opens to the generic fallback canvas. The 8-LP story and capital call narrative are dead until the IR canvas is built.

**Fix required:** Either build IR canvas (WORKER_INTELLIGENCE entry + at least a people/capital-call tab in liveData) before the demo, or remove IR from the RE demo scope and deliver it as a future reveal.

### RT3: `platform-accounting` checklist has a hidden default item
The actual WORKER_CHECKLISTS for accounting is: `"basic-setup"` (default=true), `"bank-statements"`, `"accounting-software"`, `"tax-returns"`, `"expense-rules"`, `"vendor-lists"`. The `"basic-setup"` item auto-completes because `default: true` — it doesn't need to be in localStorage. But the current `DemoSignIn.jsx` is setting the CORRECT 5 non-default keys, so the accounting checklist is fine. Document this so the RE DemoSignIn doesn't accidentally include the default key (redundant but harmless) or miss others.

**No code change needed** — accounting is already correct. Just document the default-key pattern.

### RT4: Marketing defaults to `_demo: true` — SAMPLE chip will appear
`buildMarketingPayload()` returns `_demo: true` when no real campaigns exist in Firestore for the tenant. The canvas renders a SAMPLE watermark chip on all campaign cards. Scott's marketing tab will show SAMPLE data unless real campaign records are seeded in `campaigns/{tenantId}/items`.

**Fix required:** Add `seedREMarketingCampaigns.js` to the seed script list. This is now a blocker, not an enhancement, because the user explicitly said marketing must be a major demo pillar.

### RT5: alertFeed is UID-scoped, NOT tenant-scoped
Path: `alertFeed/{user.uid}/items/{alert_id}`. The seed script must use Scott's demo UID, not his tenant ID. The CODEX said "seed alertFeed events for Scott's demo tenant" — that's the wrong key. Fix the CODEX language and seed script reference.

---

## CODEX 25 (RE Demo) — Major Gaps

### RT6: Marketing is severely underspecified (user flagged)
The RE demo story needs marketing as a first-class pillar. Current CODEX has almost nothing. What it must have:

**Campaigns to seed (3):**
1. `"Meridian at Flamingo — New Listings Launch"` — email to 100-buyer list, 41% open rate, 12 showing requests attributed
2. `"Buyer Drip — Q3 Luxury Buyers"` — 12-email sequence, 68/100 active subscribers, 9 opens last 7 days
3. `"Domain Point LP Newsletter — July Update"` — sent to 8 LP investors, 100% open rate (small list), 2 replies

**Social accounts to seed:**
- Instagram: `@merrittwithcapital` — 1,840 followers, last post 2 days ago (property photo for Unit 704)
- LinkedIn: `Merritt Capital Group` — 612 followers, 2 articles published
- (No TikTok or YouTube for this persona — boutique firm feel)

**Marketing quick actions Scott runs in the demo:**
- "Draft a listing announcement for Unit 1901" → Alex generates, routes to publish approval
- "Who are our hottest buyers right now?" → surfaces Marcus Webb's 3 showing requests

**Brand guidelines uploaded:** Yes — Merritt Capital color palette + logo.

### RT7: No opening scene specified
What does Scott see the MOMENT he signs in? What worker opens first? What does Alex say? This was a gap in the Dr. Maya demo. Need to define the opening beat:
- **Opening worker:** `platform-control-center-pro` (portfolio KPI overview — all 3 buildings in one view)
- **Alex's opening line:** "Good morning, Scott. Domain Point permit inspection is scheduled for July 3. You have a capital call follow-up overdue with two investors. Taylor Oakes' 60-day review is tomorrow."
- This is configured via the alertFeed operating feed + Alex's morning brief logic

### RT8: `landOnFirstDataTab` fires for `re-marketing-001`
`re-marketing-001` is not `platform-*` or `chief-of-staff`, so `landOnFirstDataTab()` WILL auto-fire when Scott opens it. The first tab with data will be auto-selected. Confirm the marketing worker's first tab has real data (campaigns), otherwise it'll push a blank card.

**Fix required:** Seed `campaigns/{RE_TENANT_ID}/items` before demo or `re-marketing-001` will auto-fire to a blank WorkProductCard.

### RT9: Austin Building 3 address is probably wrong for ATTOM
"300 W 6th St, Austin TX 78701" is a commercial corridor — likely no residential unit-level ATTOM coverage. Replace with a known mixed-use residential address. Suggest: **1801 Lavaca St, Austin TX 78701** (near University area, known apartment complex zone) or verify via ATTOM API first.

### RT10: DemoSignIn routing for `?persona=realestate` not addressed
Current `DemoSignIn.jsx` doesn't check `?persona=`. The router has `/demo` going to one component. The CODEX assumes the routing works but doesn't specify where to add the query param check. Options:
- Add `const persona = new URLSearchParams(window.location.search).get('persona')` in DemoSignIn and branch on it
- Or create `/demo/realestate` as a separate route pointing to `REDemoSignIn.jsx`

**Recommend:** Single `DemoSignIn.jsx` with persona branching — avoids three near-identical files.

### RT11: Scott is the only named demo user — Kimi and Christina have no story
The CODEX sets up Scott Harrington as the single demo user. But Scott, Kimi, and Christina are three separate prospects. Kimi is brokerage-focused, Christina's role is unclear. The demo as spec'd shows the full portfolio (brokerage + PM + development) which is Scott's view. This may work since all three watch the same demo, but note: the demo doesn't have a "just brokerage" filter for Kimi.

**Not a blocker** — one demo, multiple audience members is fine. Just document what each audience member should pay attention to.

---

## CODEX 25 (RE Demo) — Minor

### RT12: RE canvas workers don't go through the checklist flow
The 6 RE workers (title-abstract-001, zoning-001, etc.) render from `reCanvasData.js`, not WorkerCanvas WORKER_INTELLIGENCE. They bypass the checklist entirely — no `getChecklistCompletion()` call, no "setup mode vs intelligence mode." They just show their canvas. The CODEX implies they need checklist completion entries in localStorage — they DON'T. Remove them from the checklist spec.

### RT13: Seed scripts don't include assertion for UID correctness
Dr. Maya lesson was that the wrong UID was used. Every seed script must start with:
```js
const DEMO_UID = ""; // VERIFY: must match demo:token endpoint RE_DEMO_UID exactly
const DEMO_TENANT = ""; // VERIFY: must match demo:token endpoint RE_DEMO_TENANT exactly
if (!DEMO_UID || !DEMO_TENANT) throw new Error("Fill in DEMO_UID and DEMO_TENANT before running");
```

### RT14: QA pass criteria are vague
Step 10 says "verify intelligence mode, verify HR shows 15 people." Replace with explicit checklist:
- HR roster: exactly 15 rows, mix of W2/1099/contract visible
- Marketing: 3 campaign cards, no SAMPLE chip
- LP table: 8 investors, $4.25M committed
- alertFeed: 7 items, no items resolved
- All platform-* workers: intelligence mode (KPI tiles visible, no setup checklist)
- re-marketing-001: first tab auto-selected, shows real campaign data, no blank card
- title-abstract-001, zoning-001: render RE canvas for Bldg 1 address without error

---

## CODEX 26 (Education Demo) — Blockers

### RT15: `education-student-eval` slug doesn't exist anywhere in the codebase
No WORKER_CHECKLISTS, no WORKER_INTELLIGENCE, no liveData handler for this slug. Ruthie's eval worker likely has a different slug on her fork. The education demo is entirely dependent on this worker existing and being wired. Until the slug is confirmed and the canvas is wired into the main repo, this demo can't be built.

**Fix required:** Confirm Ruthie's worker slug from her fork. Wire it into WORKER_INTELLIGENCE (or give it custom canvas infrastructure). This is the load-bearing worker for the entire nursing school demo.

### RT16: Student records collection path is unspecified
Where do students live? `teamMembers` is for staff. Students are a different entity. Options:
- A: `tenants/{tenantId}/students/{studentId}` — new collection, clean separation
- B: `teamMembers` with `type: "student"` — reuses HR infrastructure, simpler
- C: Vault logbook entries per student, school is just a reader

**Recommend Option A** (new collection). The seed script and liveData handler need to know this before writing.

### RT17: Student Vault ownership is architecturally unresolved
The CODEX says the Dean's view shows student Vault entries. But personal Vault entries are owned by the student's own UID (tenantId="vault"), not by the school's tenant. If the demo signs in as Dr. Calloway, she can't see individual student Vault entries without a delegation/consent model that doesn't exist yet.

**Fix required:** For demo purposes, define that the school's tenant has its own `students/{studentId}/records` collection that holds academic records. The personal Vault layer (immutable credential) is a future phase. The demo shows the school-side view (attendance, grades, clinical hours) not the student's personal Vault.

---

## CODEX 26 (Education Demo) — Major Gaps

### RT18: Seeding 9 students will show inconsistent KPI count (says 40 enrolled)
Control Center Pro enrollment KPI reads the actual `students` collection count. Seeding 9 shows "9 active students," not 40. Either:
- Seed all 40 as stub records (name, cohort, status only — no full profile) — this takes 10 minutes to write
- Or explicitly show "9 demo students" in the demo and don't reference 40 elsewhere

**Recommend:** Seed 40 stubs + 9 full-detail records. The KPI shows 40; the student list shows 9 with rich profiles and greys out the rest.

### RT19: ATI integration referenced as working — it isn't
CODEX 14 notes ATI via LTI is unbuilt. The education demo shows NCLEX readiness scores and ATI TEAS results as seeded data — that's fine. But the demo must NOT have any "Sync from ATI" button or live API call. If the canvas has an ATI integration CTA, it will fail. Verify the student eval canvas has no live ATI call before the demo goes live.

### RT20: Clinical hours schema doesn't exist in the platform
The CODEX describes `clinical_hours_completed`, `clinical_hours_required` (672 hrs), `nclex_readiness_score` — none of these are Firestore fields defined anywhere. They're fictional fields for the spec. The seed script author will make them up. That's fine as long as: (a) the worker canvas reads the same fields the seed script writes, and (b) the field names are locked in the CODEX so they don't drift. The CODEX must lock the exact schema.

---

## CODEX 26 (Education Demo) — Minor

### RT21: Hargrove Prep is in the CODEX but deferred — clarify the route
`/demo?persona=school` should only open Cascade. The CODEX mentions Hargrove without saying it won't appear. Clarify: `/demo?persona=school` = Cascade only. Hargrove is `/demo?persona=k12` when built.

### RT22: Ruthie's fork vs. the school demo persona
Ruthie's workspace (`ruthie-lgtm/titleapp-platform`) is separate from this demo persona. Explicitly state: the `school-demo@sociii.ai` account is for investor/prospect demos only — Ruthie's real tenant is separate and should never be used in demos.

---

## Shared Issues (Both CODEXes)

### RT23: Demo accounts have no credits — ATTOM calls will fail
If the RE demo runs a live ATTOM lookup (e.g., user opens the title worker on a parcel), the demo account needs credits. Dr. Maya's demo was safe because workers showed fixtures. Scott's demo uses real ATTOM. The backend needs to whitelist demo UIDs from the credit check — OR pre-load the demo accounts with credits. The `demo:token` endpoint already issues fixed UIDs — just add them to a `demoCreditWhitelist` in the API handler.

### RT24: Demo is a public URL with no reset
Anyone who loads `/demo?persona=realestate` and fires an action modifies the demo Firestore state for all future viewers. The seed scripts are idempotent and can be run again — but there's no automated reset. Mitigation: add a `POST /v1/demo:reset?persona=realestate` admin endpoint that runs the seed scripts. Not blocking for launch but needed before broad distribution.

### RT25: No credits guard on the checklist — missing `"basic-setup"` equivalent for RE
Double-check: when Scott's RE DemoSignIn runs, are there any default=true items in WORKER_CHECKLISTS that get auto-counted even if NOT in localStorage? Answer: yes, every worker has a `default: true` first item. These count automatically. The DemoSignIn only needs the non-default items in localStorage. Document this explicitly in the build so whoever writes `REDemoSignIn.jsx` doesn't add unnecessary keys.

---

## Corrected Checklist Keys (verbatim from WORKER_CHECKLISTS)

These are the EXACT keys for `REDemoSignIn.jsx` / `SchoolDemoSignIn.jsx`. Copy-paste — do not guess.

```js
// Platform workers — non-default items only (default items auto-complete)
"ta_checklist_platform-control-center-pro": { "email-connection": now, "communication-preferences": now, "key-metrics": now, "revenue-tracking": now, "acquisition-goals": now, "external-feeds": now },
"ta_checklist_platform-accounting": { "bank-statements": now, "accounting-software": now, "tax-returns": now, "expense-rules": now, "vendor-lists": now },
"ta_checklist_platform-hr": { "roster": now, "handbook": now, "org-chart": now, "payroll": now, "perf-reviews": now, "compliance-docs": now },
"ta_checklist_platform-marketing": { "brand-guidelines": now, "social-accounts": now, "contact-lists": now, "competitor-docs": now, "content-workflow": now },
"ta_checklist_platform-contacts": { "import-contacts": now, "crm-connect": now, "comm-history": now, "followup-auto": now, "client-categories": now },
// RE vertical workers: NO checklist entries in WORKER_CHECKLISTS — skip
// education-student-eval: NOT in WORKER_CHECKLISTS — must be added or use custom canvas
```

---

## Build Order Implications

**RE Demo — revised prerequisite list (before seeding):**
1. Decide: build `investor-relations` canvas now or drop IR from demo scope
2. Decide: build `re-property-manager` frontend canvas or scope PM story through Accounting rent roll
3. Add `seedREMarketingCampaigns.js` to seed script list (blocker for no-SAMPLE marketing)
4. Add credit whitelist for demo UIDs to `index.js`
5. Verify Austin address ATTOM coverage or swap address
6. Wire persona-branching in DemoSignIn.jsx

**Education Demo — revised prerequisite list (before seeding):**
1. Confirm Ruthie's eval worker slug from her fork
2. Define student collection path (`students` subcollection — recommended)
3. Lock clinical hours schema fields
4. Clarify Vault ownership model for demo (school-side records only, no personal Vault delegation)
5. Build `education-student-eval` canvas or equivalent before this demo is possible
