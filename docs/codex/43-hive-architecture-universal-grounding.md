# CODEX 43 — Hive Architecture: Universal Worker Grounding & Signal-Only Canvas

**Status:** CANONICAL — amends and supersedes CODEX 21 §4 (Sibling Communication) and CODEX 12 (Chat Grounding).
**Date:** 2026-07-24
**Author:** Sean Combs + Claude

---

## 1. The Problem This Solves

CODEX 21 specified the "bees in a hive" architecture — Alex is the queen bee with full catalog visibility, workers are specialized bees that communicate through bundle shapes and sibling awareness. The implementation fell short in three ways:

1. **Own-data grounding exists for only 8 of ~300 workers.** When a RE worker runs, it has no awareness of its own canvas records. When it hallucinates, there's nothing to catch it.

2. **Vertical sibling injection was never built.** CODEX 21 §4.2 specified the pattern; it remained an open item. Workers cannot see their siblings or know what bundle shapes they produce or accept.

3. **Canvas cards make the AI do arithmetic.** The `|||CANVAS_RENDER|||` system requires the AI to emit structured JSON inline in chat text. This creates hallucination surface on every data-heavy card. The accounting worker hallucinated a $150K bank balance this way.

---

## 2. The Hive — Canonical Architecture

```
                    ┌─────────────────────────────────┐
                    │  ALEX (Queen Bee — COS)          │
                    │  Full catalog visibility.         │
                    │  Routes between ALL workers.      │
                    │  Sees all bundle shapes.          │
                    │  The only entity that sees        │
                    │  across verticals.                │
                    └──────────────┬──────────────────┘
                                   │ injects catalog + sibling map
                    ┌──────────────▼──────────────────┐
                    │  SPINE WORKERS (Foundation)      │
                    │  Accounting · HR · Marketing ·   │
                    │  Contacts                        │
                    │  Each sees all 4 siblings via    │
                    │  spineState.js snapshot.         │
                    └──────────────┬──────────────────┘
                                   │ workspace context block
               ┌───────────────────▼──────────────────────┐
               │  VERTICAL WORKERS                         │
               │  real-estate | aviation | education | …   │
               │  Each sees:                               │
               │    1. Workspace financial snapshot (all)  │
               │    2. Spine sibling KPIs (all)            │
               │    3. Own-data grounding block (if built) │
               │    4. Vertical sibling map (CODEX 21 §4.2)│
               └──────────────────────────────────────────┘
```

**The hive rule:** Every worker, on every chat turn, receives context in this order (prepended to system prompt):

```
[Workspace context]       ← cash, loans, cap table — always injected
[Spine sibling KPIs]      ← accounting/HR/marketing/contacts state
[Own-data grounding]      ← worker's own canvas records (if builder exists)
[Vertical sibling map]    ← same-vertical, same-suite siblings + bundle shapes
[WHO YOU SERVE]           ← workspace identity anchor
[Worker system prompt]    ← the worker's own RAAS rules + persona
```

This order is non-negotiable. More authoritative data (real records) comes before the worker's instructions, so the worker is anchored to reality before it reasons.

---

## 3. Rule: Canvas Cards Are Signal-Only for Data-Heavy Cards

### 3.1 The Problem

The `|||CANVAS_RENDER|||{json}|||END_CANVAS|||` pattern requires the AI to emit valid structured JSON inline in a chat response. This is a hallucination trap:

- The AI generates text and data in the same token stream
- It doesn't "know" when it's inventing numbers vs. recalling them
- There is no enforcement layer between AI arithmetic and the rendered card

### 3.2 The Two Card Patterns (both valid — use the right one)

**Pattern A — Signal + AI payload (for presentational cards)**
Use when: the card is summarizing information the AI has in context and the data doesn't need to be exactly right (e.g., a suggested action card, a list of next steps, a marketing creative brief).

```
|||CANVAS_RENDER|||{"type":"card:suggested-actions","payload":{"actions":[...]}}|||END_CANVAS|||
```

Risk is low because errors are stylistic, not financial.

**Pattern B — Signal-only with server fetch (for data-heavy cards)**
Use when: the card shows financial figures, computed values, legal records, medical data, or any number the user might act on.

```
|||CANVAS_RENDER|||{"type":"card:accounting-balance-sheet"}|||END_CANVAS|||
```

The React component sees an empty or absent payload and calls the backend API route to fetch pre-computed data. The AI does zero arithmetic. The rules engine owns the numbers.

### 3.3 Cards That MUST Use Pattern B

| Signal | Backend Route | Notes |
|---|---|---|
| `card:accounting-balance-sheet` | `GET /v1/accounting:balance-sheet` | Computed from transactions + loans |
| `card:accounting-pl` | `GET /v1/accounting:pl` | Computed from transactions |
| `card:accounting-cashflow` | `GET /v1/accounting:cashflow` | Computed from transactions |
| `card:ir-409a` | `GET /v1/ir:valuation:409a` | Three-approach blend, server-side |
| `card:ir-captable` | `GET /v1/ir:captable` | From governance/capTable |
| `card:re-*` (maps, ATTOM) | ATTOM + Google Maps | Already pattern B |
| `card:aviation-*` (weather, NOTAM) | FAA/weather APIs | Already pattern B |

### 3.4 Implementation Checklist for Pattern B

**CRITICAL: the component must ALWAYS fetch from the backend, never seed from `context.payload`.**
If the AI emits a payload despite instructions not to (which is exactly the failure mode Pattern B exists to prevent — an AI that doesn't reliably follow instructions is the whole premise here), a component seeded from `context?.payload` will happily render hallucinated numbers and never call the backend. The fetch must be unconditional.

Frontend (canvas component) — correct pattern:
```jsx
import { getAuth } from "firebase/auth";
const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchBalanceSheet() {
  const token = await getAuth().currentUser?.getIdToken();
  // x-tenant-id MUST be explicit — never inferred from session.
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  if (!token || !tenantId) return null;
  const res = await fetch(`${API_BASE}/api?path=/v1/accounting:balance-sheet`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  return res.ok ? (await res.json()).balanceSheet : null;
}

export default function BalanceSheetCard({ resolved, context, onDismiss }) {
  // Never seed from context.payload — always fetch. AI payload is intentionally ignored.
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchBalanceSheet().then(d => { if (!cancelled) { setData(d); setLoading(false); }});
    return () => { cancelled = true; };
  }, []);
  // render from data only
}
```

Backend: `GET /v1/accounting:balance-sheet` and `GET /v1/accounting:pl` added 2026-07-24. Both require `x-tenant-id` header. Return 400 if header is absent. Never read `balanceSnapshots`.

AI instruction (in grounding block): "To show the balance sheet, emit: |||CANVAS_RENDER|||{\"type\":\"card:accounting-balance-sheet\"}|||END_CANVAS||| — do NOT include a payload, the card fetches live data."

---

## 4. Universal Own-Data Grounding — Implementation Priority

Every active worker should have a grounding block in `workerOwnData.js`. Priority order:

### Tier 1 — Built (deploy confirmed)
- `platform-accounting` → `accountingBlock`
- `platform-hr` → `staffCredentialsBlock`
- `platform-marketing` → `marketingBlock`
- `platform-contacts` → `contactsBlock`
- `fundraise` / `investor-relations` → `irBlock`
- `title-abstract-001` → `titleAbstractBlock`
- `edu-001-cvt-exam-prep` → `eduCohortBlock` (CVT/veterinary tech exam prep — NOT a nursing/UH worker)
- `vet-003-drug-dosing` → `vetDosingBlock`
- DPP suite (5 workers) → `dppComplianceBlock`, `dppPassportBlock`, etc.
- Nursing suite (6 workers) → `nursingCohortBlock`:
  - `nursing-education-001` (Clearwater Nursing Education — primary UH worker)
  - `nursing-records-001`, `nursing-courses-001`, `nursing-tutor-001`, `nursing-comms-001`, `nursing-accreditation-001` (Makai School of Nursing)

### Tier 2 — Build next (RE vertical — Scott Eschelman demo dependency)
- `cre-analyst` → reads from `parcels`, `dealNotes`, CoStar/Trepp connected accounts
- `site-recon-001` → reads from `siteRecons`, `attomData`
- `title-abstract-001` → ✓ already built
- `law-landuse-001` → reads from `legalOpinions`, `zoningRecords`
- `zoning-001` → reads from `zoningRecords`, `attomData`
- `feasibility-001` → reads from `feasibilityReports`, `dealNotes`
- `re-marketing-001` → reads from `listings`, `showings`

### Tier 3 — Build before aviation B2B push
- `av-copilot-001` → reads from `pilotCurrency`, `flightLogs`, `dtcs`
- `av-mx-001` → reads from `maintenanceLogs`, `airworthinessDirectives`, `dtcs`
- `av-dispatch-001` → reads from `flights`, `weather`, `notams`

### Tier 4 — Build before wider marketplace launch
- All auto dealer workers
- All government/GovTech workers
- All escrow/legal workers

**The workspace context block** (injected into every worker regardless of BUILDERS entry) already gives all workers the company-wide financial snapshot. Tier 2-4 workers aren't completely blind — they see finances + spine KPIs. They just don't see their own domain records.

---

## 5. Vertical Sibling Injection — The Missing Piece from CODEX 21

### 5.1 What to build — BUILT 2026-07-24

In the chat handler (`index.js`), vertical sibling injection runs **BEFORE** own-data grounding so the hive ordering is preserved:

```
[workspace context → spine KPIs → vertical siblings → own records → WHO YOU SERVE → system prompt]
```

Code wired at line ~3726 (immediately after spine sibling injection closes, before the own-data grounding block at ~3748):

```javascript
// CODEX 43 §5 — vertical sibling injection
if (workerPrompt && dw && dw.vertical && dw.vertical !== "platform") {
  try {
    const { buildVerticalSiblingBlock } = require("./services/canvas/verticalSiblings");
    const vertBlock = await buildVerticalSiblingBlock({
      db, tenantId: reqTenantId || null, vertical: dw.vertical, suite: dw.suite || null, currentSlug: workerSlug,
    });
    if (vertBlock) workerPrompt = vertBlock + workerPrompt;
  } catch (vertSibErr) {
    console.warn("worker chat: vertical sibling inject failed:", vertSibErr.message);
  }
}
```

The code ordering guarantee: the own-data grounding block runs at ~3748, after this injection, confirmed by inspection of the chat pipeline in `index.js`.

### 5.2 What `buildVerticalSiblingBlock` emits

```
SIBLING WORKERS IN THIS VERTICAL (real-estate / Investment suite):

- CRE Analyst (cre-analyst)
  accepts: address + deal terms, parcel-bundle/v1
  emits:   parcel-bundle/v1
  say: "Want me to pass this to CRE Analyst? They take the address and build the deal screen."

- Site Recon (site-recon-001)
  accepts: parcel-bundle/v1
  emits:   site-recon-bundle/v1 (photos, conditions, physical comps)

- Title Abstract (title-abstract-001)
  accepts: parcel-bundle/v1
  emits:   title-abstract-bundle/v1 (chain of title, liens, easements)

[etc.]

SIBLING RULE:
When your output matches another worker's accepted input, propose the handoff by name:
"Want me to pass this to [Worker Name]? They can [what they do with it]."
Never say "go to another tab." Never say a handoff already happened. 
Phase 1 = suggest only. The user navigates; Alex routes.
```

Built dynamically from Firestore via `services/canvas/verticalSiblings.js`. 

**Suite isolation — canonical rule (resolved from ambiguity):** Query filters to `vertical == dw.vertical` and `status in ["active","live"]`. Suite is used for the display label only — all workers in the same vertical see each other regardless of suite, because Alex routes across suites and workers should be able to propose cross-suite handoffs. A worker with `suite = null` is a general worker in the vertical and is visible to all vertical siblings.

**Worked example:** `title-abstract-001` (suite: "RE Investment") can propose a handoff to `re-marketing-001` (suite: "RE Sales") because both are in the `real-estate` vertical. The user is the one who decides which suite is active; Alex helps them route.

**Re `title-abstract-bundle/v1` consumers:** The bundle-shape table shows `re-marketing-001` consuming `title-abstract-bundle/v1`. This is intentional — a listing agent needs the chain of title cleared before marketing a property. `re-marketing-001` also accepts `site-recon-bundle/v1` (photos, physical comps) for listing materials. Both entries are correct.

### 5.3 Bundle shapes to include in injection

| Shape | Produced by | Consumed by |
|---|---|---|
| `parcel-bundle/v1` | cre-analyst, site-recon-001 | title-abstract-001, law-landuse-001, zoning-001, feasibility-001 |
| `site-recon-bundle/v1` | site-recon-001 | feasibility-001, cre-analyst |
| `title-abstract-bundle/v1` | title-abstract-001 | law-landuse-001, re-marketing-001 |
| `legal-opinion-bundle/v1` | law-landuse-001 | cre-analyst, feasibility-001 |
| `zoning-bundle/v1` | zoning-001 | law-landuse-001, feasibility-001, cre-analyst |
| `feasibility-roadmap/v1` | feasibility-001 | cre-analyst |

Aviation equivalent bundles must be defined before Tier 3 grounding blocks are built.

---

## 6. What Changed (2026-07-24)

- **Accounting hallucination fixed:** `workerOwnData.js` now computes balance sheet server-side. `BalanceSheetCard.jsx` and `PLSummaryCard.jsx` converted to Pattern B — both always fetch from backend, never render AI-supplied payload.
- **`GET /v1/accounting:balance-sheet` and `GET /v1/accounting:pl` routes added** — both require explicit `x-tenant-id` header, return 400 without it. Both compute from `transactions` + `loans` only; never read `balanceSnapshots`.
- **`balanceSnapshots` collection removed from all reads** — `accountingBlock`, `irBlock`, `/ir:valuation:409a` route. All three now read from `transactions` + `loans` only. (Repo-wide search confirmed: 0 remaining reads of `balanceSnapshots`.)
- **`spineState.js` revenue formula fixed** — now uses `classification === "revenue"` not `direction === "credit"`. Loan inflows no longer counted as revenue in sibling KPI snapshot.
- **`workspaceContextBlock` added** — all workers receive company-wide financial snapshot (cash, loans) regardless of BUILDERS entry. Cap table removed from this block (it is SOCIII-internal and must not leak to customer tenant workers). Cap table remains in `irBlock` only.
- **`workspaceContextBlock` truncation note added** — if `txs.length >= 2000`, the snapshot notes "totals approximate" so no worker reasons from a plausible-but-incomplete number without warning.
- **Vertical sibling injection built and wired** — `services/canvas/verticalSiblings.js` + injected at line ~3726 in `index.js`, before own-data grounding (correct hive order confirmed).
- **`nursing-education-001` added to BUILDERS** — Clearwater Nursing Education now receives `nursingCohortBlock` grounding alongside the 5 Makai workers. All 6 education workers see the same cohort data.
- **Kent Barker corrected to Kent Redwine** — in `irBlock` fallback and `/ir:valuation:409a` route defaults.
- **CPA package generated** — 7 files in `~/Downloads/SOCIII-CPA-Package-2026-07-24/`.

## 7. Open Items (prioritized)

- [x] **Canvas signal-only (Pattern B)** — `card:accounting-balance-sheet` and `card:accounting-pl` converted. Both backend routes added. ✓ 2026-07-24
- [x] **Vertical sibling injection** — `buildVerticalSiblingBlock` built and wired. ✓ 2026-07-24
- [ ] **`card:accounting-cashflow` Pattern B** — `CashFlowStatementCard` still uses conversation pattern. Add `GET /v1/accounting:cashflow` route + convert component. Estimate: 1 hour.
- [ ] **`card:ir-409a` Pattern B** — IR card already has a server-computed payload (from `irBlock`). Convert to always-fetch. Estimate: 1 hour.
- [ ] **Tier 2 grounding blocks** — RE worker family (6 workers): `cre-analyst`, `site-recon-001`, `law-landuse-001`, `zoning-001`, `feasibility-001`, `re-marketing-001`. Estimate: 4 hours. Dependency for Scott Eschelman demo.
- [ ] **Tier 3 grounding blocks** — Aviation worker family (3 workers): `av-copilot-001`, `av-mx-001`, `av-dispatch-001`. Prerequisite: define aviation bundle shapes (30 min). Estimate: 3 hours + 30 min prereq.
- [ ] **Interim hedge instructions for un-grounded workers** — add a universal grounding footer to workers without a BUILDERS entry: "You do not have direct access to this workspace's [domain] records — say so rather than guessing." Reduces hallucination risk during Tier 2-4 rollout. Estimate: 1 hour.
- [ ] **Hardcoded fallback audit** — sweep all Tier 1 workers' fallback/default values (not just names — dollar figures, dates, entity names) for undetected placeholders, following the Kent Barker incident. Estimate: 1 hour.
- [ ] **Server-side aggregation for workspace context block** — replace `limit(2000)` + in-memory sum with Firestore aggregation queries so totals are exact regardless of transaction count. Until then, `workspaceContextBlock` notes "totals approximate" when truncated. Estimate: 2 hours.
- [ ] **Per-tenant cap table for customer IR workers** — `governance/capTable` is platform-scoped. Customer tenants that activate an IR worker need their own cap table path (e.g., `tenants/{tenantId}/capTable`). Current guard (checks `ownerTenantId`) prevents the RT-3 leak but doesn't give customers a real cap table. Estimate: 1 hour schema + seeding per customer.

---

## 8. Red Team Findings — Round 1 (2026-07-24)

**RT-1 [BLOCKING — FIXED]: Pattern B reference code seeded from AI payload**
The original §3.4 snippet used `useState(context?.payload || null)` + `if (!data) fetch(...)`. This meant the AI could still win by including a payload. Fixed: both `BalanceSheetCard` and `PLSummaryCard` now call fetch unconditionally in `useEffect`, `useState(null)` always. AI payload is never read.

**RT-2 [BLOCKING — DOCUMENTED]: `workspaceContextBlock` limit:2000 silently truncates totals**
For tenants with >2000 transactions, totals are computed from a partial dataset. This is not a backend aggregation — the limit is applied before summing. Fix (2026-07-24): added explicit truncation note in the injected text when `txs.length >= 2000`. Full fix (deferred): server-side aggregation via Firestore aggregation queries. For SOCIII at current scale (~760 txns), this is not yet live.

**RT-3 [FIXED]: `workspaceContextBlock` capTable read leaked SOCIII ownership to all tenants**
`governance/capTable` is a platform-level document. Injecting it into customer tenant workers (Dr. Chen's clinic, etc.) would show "Sean Combs 71%..." — completely wrong for a customer business. Fix: cap table removed from `workspaceContextBlock`. It remains in `irBlock` (only injected for SOCIII's own IR/fundraise workers).

**RT-4 [FIXED]: Vertical sibling injection order not verified**
§2 ordering: `[workspace → spine KPIs → vertical siblings → own records → WHO YOU SERVE → system prompt]`. The code injection at line ~3726 runs before the own-data grounding block at ~3748. Verified by code inspection. §5.1 now documents the line numbers explicitly.

**RT-5 [FIXED (round 1) + REVISED (round 2)]: Suite-isolation ambiguity resolved; 8-slot priority ordering added**
Round 1: suite is display-only; all workers in the same `vertical` see each other. Round 2 finding: without suite-scoping, a vertical with many suites could exceed 8 workers and the selection rule was unstated. Fix: `verticalSiblings.js` now sorts workers before slicing — workers with known bundle shapes in BUNDLE_SHAPES go first, then alphabetical. This is deterministic and principled: the most architecturally significant handoff targets always appear, regardless of Firestore return order or how many workers are later added to the vertical.

**RT-6 [FIXED]: `title-abstract-bundle/v1` consumer list questioned**
`re-marketing-001` consuming `title-abstract-bundle/v1` is intentional — a listing agent needs title cleared before marketing. Documented in §5.2.

**RT-7 [OPEN]: Aviation bundle shapes not a separate checklist item**
Added to §7 open items: "Prerequisite: define aviation bundle shapes (30 min)" before Tier 3 builds.

**RT-8 [OPEN]: Hardcoded fallback audit**
Kent Barker/Redwine incident suggests other Tier 1 workers may have stale fallback values. Added to §7 open items.

**RT-9 [OPEN]: No interim stopgap for un-grounded Tier 2-4 workers**
Workers without BUILDERS entries still hallucinate domain records today. Added to §7 open items: "Interim hedge instructions."

---

## Red Team Findings — Round 2 (2026-07-24)

**RT2-1 [FIXED]: `irBlock` cap table not tenant-scoped — same leak as RT-3, through a different door**
RT-3 removed the cap table from `workspaceContextBlock`. But `irBlock` still read from `governance/capTable` globally, injecting SOCIII's ownership into any customer tenant that might activate a fundraise/IR worker. Fix: `irBlock` now checks `ct.ownerTenantId` on the cap table document. If it's set and doesn't match the caller's `tenantId`, shareholders and totalShares are zeroed and the shareholder summary shows "No cap table on file for this workspace." The fallback (Sean Combs / Kent Redwine) only fires when the doc has no `ownerTenantId` (legacy platform doc) and the caller is implicitly the platform. Full tenant-scoped cap table per-workspace is a Tier 2 infra item.

**RT2-2 [FIXED]: Vertical sibling 8-slot selection was arbitrary**
See RT-5 round-2 above. Fixed in `verticalSiblings.js`.

**RT2-3 [ADDED TO OPEN ITEMS]: RT-2 real fix (server-side aggregation) had no tracked line item**
Added to §7 open items: "Server-side aggregation for workspace context block (Firestore aggregation queries — removes the limit:2000 cap and makes totals exact regardless of transaction count)."

**RT2-4 [NOTE]: `[domain]` placeholder in interim hedge instructions**
The hedge instruction template uses `[domain]` as a placeholder. This must be rendered per-worker when added to un-grounded system prompts (e.g., "parcel records" for RE workers, "flight records" for aviation workers). Not shipped as a literal bracket string. Noted for the engineer implementing §7 "Interim hedge instructions."

**RT2-5 [CONFIRMED]: `nursing-education-001` is Clearwater, not a separate research pilot worker**
The `nursing-education-001` worker is Clearwater Nursing Education (Ruthie's fork). Confirmed it is not the same as any AACN research pilot workers — those would have distinct slugs if they exist. Tier 1 grounding coverage claim stands for the UH/Clearwater program; any future research-consent-specific workers would need their own BUILDERS entry.

---

## 9. Invariants (non-negotiable)

**R1: Signal-only breaks when the user is offline or API is down**
Mitigation: Canvas component shows loading state, falls back to "Could not load — reload to try again." Better than showing hallucinated numbers.

**R2: AI emits wrong signal type**
Mitigation: The grounding block explicitly tells the AI which signal to use for which report. Both routes exist — wrong signal = wrong report type, not wrong numbers.

**R3: workspaceContextBlock Firestore reads on every chat turn**
Mitigation: 2 reads (transactions, loans) with limit:2000. For low-traffic workspace, < 50ms. Acceptable cost for correctness. Cache at session level when needed.

**R4: Vertical sibling injection context size**
Mitigation: Capped at 8 siblings. 2s timeout. ~150-200 tokens per turn on first render. Acceptable.

**R5: Workers without BUILDERS entries still hallucinate their own domain data**
Mitigation: workspaceContextBlock gives financial awareness. Domain records require a BUILDERS entry. The tier priority list (§4) drives the rollout. Interim: hedge instructions (§7 open items).
