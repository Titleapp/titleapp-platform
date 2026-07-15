# CODEX 39 — CRE Analyst: Deal Hunt Mode + Tab Integrity

**Status:** In build  
**Vertical:** real-estate  
**Suite:** CRE Intelligence  
**Workers affected:** cre-analyst-001, site-recon-001  

---

## Problem Statement

The CRE Analyst canvas has two compounding issues that make it feel broken to a serious CRE operator like Scott:

1. **Tab stickiness** — When you look up a new address (Oakland), all analysis tabs except Subject Property continue to show the *previous* address's data (Battery St). The canvas reads as if it only knows one deal.

2. **No proactive deal flow** — The worker is reactive-only (you must know the address first). A CRE professional wants to set criteria and let the worker hunt — the same way they'd set CoStar alerts, but with AI-scored distress analysis attached.

---

## Two Modes (same canvas, toggle at top)

### Mode A: Look Up (existing, fixed)
Enter any address → get instant ATTOM-grounded analysis on that address only. All tabs reflect that address. No bleed from previous lookups.

### Mode B: Deal Hunt (new)
Set deal parameters once → worker scans a market → surfaces a ranked short-list for review. "Set it and forget it." Results persist in Firestore and survive page refresh.

---

## CODEX 39.1 — Tab Integrity Fix

**Root cause:** `buildLiveCanvasSpec` in `liveLookup.js` only returns a `subject` tab and now `deal_screen` (added CODEX 38). The frontend merge logic carries over base canvas analysis tabs (Underwriting, Sensitivity, Capital Stack) which contain hardcoded Battery St fixture data.

**Fix:** When a live lookup returns, strip all base analysis tabs. Replace with address-keyed stubs that clearly show they're waiting for data OR generate them from ATTOM fields we already have.

**Tabs to generate from ATTOM data:**

| Tab | ATTOM source fields | Content |
|-----|-------------------|---------|
| Subject property | all property fields | Already correct |
| Deal screen | assessedValue, sales, apn | Fixed last night |
| Underwriting | lastSalePrice, assessedValue, propType, sqft | Yield estimates labeled illustrative |
| Capital stack | senior loan est. from assessed value | Labeled illustrative, requires diligence |
| Sensitivity | distress score, sale history | Price sensitivity ranges |

**Rule:** Every tab must display the address of the looked-up property in a subtitle. If a tab shows data from a different address, that is a hard bug.

**Implementation:**  
- Extend `buildLiveCanvasSpec` in `liveLookup.js` to generate all 5 tabs from ATTOM data
- Frontend merge: when `liveSpec` is set, use ONLY `liveSpec.tabs` — do not fall back to `baseTabs` for analysis tabs
- Only carry over base tabs whose `id` starts with `"meta-"` or `"help-"` (instructional, not data)

---

## CODEX 39.2 — Deal Hunt Mode

### Canvas UI (Deal Hunt panel)

```
┌─────────────────────────────────────────────────────┐
│  [Look Up]  [Deal Hunt]          ← mode toggle      │
├─────────────────────────────────────────────────────┤
│  DEAL PARAMETERS                                    │
│  Market(s):       [San Francisco, CA] [+ Add]       │
│  Asset class:     [Office ▾] [Industrial ▾] [+ Add] │
│  Distress score:  Min [40] ──────── Max [100]       │
│  Size (sqft):     Min [10,000] ── Max [unlimited]   │
│  Max results:     [20]                              │
│                                                     │
│  [▶ Start Hunt]  Last run: never                    │
└─────────────────────────────────────────────────────┘

HUNT RESULTS (0 properties)
──────────────────────────────
[empty state: set parameters above and click Start Hunt]
```

When results arrive:
```
HUNT RESULTS (8 properties) — scanned 2026-07-14 09:12 PT
──────────────────────────────────────────────────────────
RED  75  325 Battery St, San Francisco, CA         › View
RED  75  1333 Broadway, Oakland, CA                › View
YLW  30  475 Sacramento St, San Francisco, CA      › View
...
```

Clicking "View" loads that address into Mode A (Look Up) with full tab analysis.

### Backend: `/v1/re:hunt`

**Request:**
```json
{
  "markets": ["San Francisco, CA", "Oakland, CA"],
  "assetClasses": ["office", "industrial"],
  "minDistressScore": 40,
  "minSqft": 10000,
  "maxResults": 20
}
```

**Implementation:**
1. For each market, call ATTOM `/property/snapshot` or `/saleshistory/snapshot` with city+state filter
2. Score each property using the existing distress scoring logic (from site-recon)
3. Filter by minDistressScore + minSqft
4. Return ranked list (highest distress first) with APN, address, score, last sale, assessed value
5. Write results to `dealHuntResults/{tenantId}_{timestamp}` in Firestore so they persist

**ATTOM endpoints to use:**
- `/property/snapshot?address2={city,ST}&propertytype={type}` — gets property list by city
- `/saleshistory/snapshot` — recent sale activity for distress signals

**Distress scoring (v1, simple):**
- Last sale > 36 months ago: +15
- Assessed value < 70% of last sale price: +25
- No recorded lender: +10
- No recent sale in 24 months AND no assessed value: +20
- Commercial/office property type: base 10

Score 0–100. ≥50 = RED, 20-49 = YELLOW, <20 = GREEN.

### Firestore schema

```
dealHuntResults/{tenantId}_{runId}
  tenantId: string
  runId: string (timestamp)
  parameters: { markets, assetClasses, minDistressScore, ... }
  results: [ { address, apn, distressScore, band, lastSale, assessedValue, propType, sqft } ]
  createdAt: Timestamp
  status: "complete" | "running" | "error"

dealHuntParameters/{tenantId}
  tenantId: string
  parameters: { ... }  ← persisted between sessions
  updatedAt: Timestamp
```

---

## CODEX 39.3 — Scheduled / On-Demand

**Phase 1 (today):** On-demand only. Scott clicks "Start Hunt", results come back in ~30s.

**Phase 2 (next week):** Scheduled. Daily cron at 6am PT runs the hunt with saved parameters, writes results, sends Alex a briefing. Scott wakes up to new results.

---

## Build Order

1. **[Fix — immediate]** Tab integrity: extend `liveLookup.js` to generate all 5 analysis tabs from ATTOM data. Strip base fixture tabs from merge. (backend + frontend)
2. **[Build — today]** Deal Hunt canvas UI: mode toggle + parameters form + results list. Frontend only, no backend yet (mock the response).
3. **[Build — today]** `/v1/re:hunt` backend endpoint: ATTOM property snapshot + scoring + Firestore write.
4. **[Wire — today]** Connect canvas UI to backend endpoint.
5. **[Phase 2 — next week]** Scheduled daily hunt + Alex briefing.

---

## Scott's Onboarding Email

Simple, one link:

> Subject: Your SOCIII CRE workspace is ready
>
> Scott —
>
> Sign in with Google at sociii.ai — your CRE workers are loaded (CRE Analyst, Site Recon, Property Manager, IR Worker, Title Abstract). No password, just your Google account.
>
> Try the CRE Analyst first — look up any commercial address or set deal parameters and let it hunt for distressed opportunities in your markets.
>
> sociii.ai
>
> — Sean

---

## Open Decisions

- ATTOM `/property/snapshot` returns up to 100 results per city — sufficient for v1
- Distress scoring v1 is rule-based; v2 will use the model to summarize thesis per property
- Deal Hunt results should appear in Alex's morning briefing ("3 new RED-band properties in your hunt")
- Boise athlete student housing: separate Property Manager card, tracked separately from CRE Analyst deal flow (CODEX 40)
