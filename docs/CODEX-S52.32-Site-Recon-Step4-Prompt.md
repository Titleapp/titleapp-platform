# CODEX S52.32 — Site Recon Step 4 prompt for Claude Code

**Date:** 2026-06-06
**Status:** Prompt ready to paste — Step 4: multi-parcel area search (the spine)
**Resume point:** post-S52.31 (Step 3 audit anchor shipped, deployed)
**T2's read (correct):** Item #1 (multi-parcel area search + batch receipts) is the spine — it exercises the BATCH path of the Deposition Rule receipt (only INDIVIDUAL is wired so far via Step 3), and RULE-08's list cap + expansion cost gate live there. Items 5-10 all decorate the ranked list, so they sequence naturally after it.

---

## Why Step 4 is the spine, not a decoration

Step 1+2+3 built the parcel-pull path: single-address ATTOM pull → feasibility verdict → individual audit receipt. That's a property lookup tool. It's not what makes Site Recon Site Recon.

The Intent Spec Round 2 success outcome is: *"converts a real estate operator's hunch into a RANKED LIST of underwriteable parcels."* The ranked list — across a radius or polygon — is the product. Without Step 4, Site Recon is a $6/lookup ATTOM proxy. With Step 4, it's an underwriter's first-look tool that exercises every locked rule (RULE-07 APN retirement removal, RULE-08 list cap, RULE-12 Fair Housing screen, the batch path of RULE-03's audit anchor).

This is also the Deposition Rule's batch case live — *"batched anchor with parcel manifest"* per the audit substrate strategy. Single-parcel receipts are the easy case; batched receipts are the case the substrate has to nail because that's where most real-world operator queries land.

---

## Paste-ready prompt

```
Step 4 — Multi-parcel area search (THE SPINE of Site Recon).

Right now searchByAddress.js handles single-address pulls — Steps 1+2+3 nailed cost gate → ATTOM pull → feasibility verdict → individual audit anchor. The Intent Spec says Site Recon's job is a RANKED LIST of underwriteable parcels across a radius or polygon. That's what we're building now.

NEW ENDPOINT: POST /v1/workers/site-recon-001/search-by-area

INPUT SHAPE:
{
  area: {
    type: "radius" | "polygon",
    // for radius:
    center: { lat: number, lng: number },
    radiusMeters: number,
    // for polygon:
    vertices: [{ lat: number, lng: number }, ...]   // min 3, max 50 vertices
  },
  filters: {                                          // optional, ALL optional
    minLotSqft: number,
    maxLotSqft: number,
    landUseCodes: string[],                           // ATTOM land use code filter
    excludeRetiredApn: boolean                        // default true per RULE-07
  },
  limit: number,                                      // default 10, max 50 per RULE-08
  confirmCost: boolean
}

TWO-PHASE COST GATE (mirror searchByAddress):
Phase 1 (confirmCost !== true):
  - Run ATTOM area-search query to get the parcel COUNT and a thin parcel-id list (no full property pulls yet)
  - Apply the limit cap (default 10, max 50)
  - Return cost projection:
    {
      phase: "quote",
      estimatedCost: { attomCostUsd: N×$3, sociiiMarkupUsd: N×$3, totalFeeUsd: N×$6 },
      parcelCount: <pre-cap count from ATTOM>,
      parcelsToReturn: <min(parcelCount, limit)>,
      breakdown: "Will pull <N> parcels at $6/parcel report = $<N×6> total",
      tier: <warn|info — same pattern as Step 1>
    }
  - DO NOT pull full property data yet. The point of Phase 1 is the user knows the projected spend before the meter starts.

Phase 2 (confirmCost === true):
  - Re-run the parcel-id list query (cache may have expired, so re-query)
  - For each parcel in the capped list:
    a. Pull ATTOM property/detail + saleshistory/detail + attomavm/detail (reuse the same client calls as Step 1)
    b. Run scoreFeasibility() on the parcel (reuse Step 2 helper)
    c. If verdict.flags includes "apn_retired" or scoring returned RED with blockerCode === "APN_RETIRED", REMOVE this parcel from the list entirely per RULE-07. Decrement count, don't substitute. (Spec is clear: retired APN parcels MUST NOT appear in ranked lists.)
  - recordDataFee for the ACTUAL final pulled count (not the limit)
  - Write ONE batch audit receipt to PLAT-008 (not N individual receipts) — see RECEIPT SCHEMA below
  - Sort the surviving parcels by descending confidenceScore (RULE-13 confidence ranking)
  - Return ranked list

RANKED LIST RESPONSE:
{
  ok: true,
  phase: "pull",
  area: { ...echoed input area },
  rankedParcels: [
    {
      rank: 1,
      parcel: { address1, address2, attomId, lat, lng },
      attom: { propertyDetail, salesHistory, avm },     // raw ATTOM pass-through
      feasibility: { verdict, namedBlocker, blockerCode, confidenceScore, flags }
    },
    ...
  ],
  parcelCountReturned: N,
  parcelCountRemovedRetired: <removed_by_RULE_07>,
  parcelCountSkippedFlags: <removed_by_other_reasons>,
  batchAuditAnchor: { receiptId, txHash, anchoredAt, batchId },
  billing: { totalFeeUsd: <N×6>, feeEventId }
}

BATCH RECEIPT SCHEMA (passed as writeAuditRecord({...metadata})):
{
  parcelRefBatch: {
    batchId: <uuid>,                                  // unique per batch query
    queryType: "area_radius" | "area_polygon",
    queryArea: <the input area>,
    parcelManifest: [
      { attomId, address1, address2, verdict, blockerCode },
      ...                                              // one entry per ranked parcel
    ],
    retiredApnsRemoved: <count removed by RULE-07>,
    finalCount: N
  },
  feasibilityBatch: {
    verdictCounts: { green: X, yellow: Y, red: Z },
    avgConfidenceScore: <number>
  },
  feeEventId: <fee.eventId>,
  composition: {
    spec: "SITE-RECON-001-v1.1",
    rulesetHash: <reuse the cached hash from Step 3>
  }
}

execution_type for writeAuditRecord: "site-recon:area-search"

RULE COMPLIANCE TO ENFORCE IN THIS STEP:
- RULE-07 retired APN removal: APN retired = REMOVED from ranked list (not just flagged). Strict.
- RULE-08 list cap: limit defaults to 10, max 50. If user requests >50, reject 400 with code LIMIT_EXCEEDED. If user requests >10, the cost gate must show the larger projection and require explicit confirmCost.
- RULE-03 audit anchor: ONE batch receipt per query, not N individual. On anchor failure: 503 AUDIT_ANCHOR_FAILED + [orphan_fee] log + rollback (same as Step 3).
- RULE-13 confidence ranking: sort by descending confidenceScore.
- RULE-01 cost gate: non-negotiable. If confirmCost is true but the projected cost differs >5% from what Phase 1 quoted (e.g., parcel count changed), DON'T silently pull — return 409 COST_MISMATCH with the new projection.

ATTOM AREA-SEARCH ENDPOINT:
Research the right ATTOM endpoint for area queries — likely /propertyapi/v1.0.0/property/snapshot (radius) and /propertyapi/v1.0.0/property/address with geographic filters (polygon), or /property/expandedprofile depending on subscription tier. The repo doesn't currently call any area endpoint. If you find more than one viable endpoint, pick the cheapest per-call and flag the choice in the report-back.

CONSTRAINTS (carry forward, non-negotiable):
- VOCABULARY: receipt / anchor / logbook entry / audit trail. NEVER blockchain / crypto / NFT / token / mint anywhere user-facing.
- No new Anthropic client. No new chain client. No new billing client.
- Don't touch site_recon_rules_v1.json, the catalog entry, scoreFeasibility.js, or workerSync.js.
- ATTOM_API_KEY is NOT currently in Secret Manager (S52.31b unblocked deploy by removing it from the secrets array). If you implement the ATTOM area-search call as live, gate it with the existing `if (!process.env.ATTOM_API_KEY) return jsonError(res, 500, "ATTOM_KEY_MISSING")` check. Smoke tests use stubbed ATTOM responses, not live calls.
- Locked spec is source of truth. If anything in this prompt conflicts with spec v1.1, FLAG IT and stop.

OUT OF SCOPE for Step 4:
- GIS overlay integration (FEMA, CA Coastal) — Step 5
- Visual rendering (Maps/Street View per RULE-17 visual-before-verdict) — Step 6
- W-002 handoff button — Step 7
- Vault DTC logbook entry per parcel — Step 8
- Sublette WY E2E test + creators/sean-combs/site-recon-001/intent.md — Step 9
- workerSync to Firestore + Oakland SAMPLE fixtures — Step 9
- RULE-11 full input validation (APN format, advanced polygon checks) — Step 4b
- RULE-12 Fair Housing pattern screen — Step 4b

SMOKE TESTS:
1. Phase 1 quote with radius query (2km around 37.78, -122.41) → returns parcelCount + projection, no ATTOM pulls fire, no fee recorded
2. Phase 2 confirmed pull with stubbed ATTOM (5 parcels, none retired) → returns 5 ranked parcels with verdicts, ONE batch receipt written, fee recorded for 5×$3=$15 actual / $30 user
3. Phase 2 with 2 retired APNs in the area → returns 3 ranked parcels (the 2 retired REMOVED, not flagged), parcelCountRemovedRetired: 2
4. Phase 2 with batch receipt write failing → 503 AUDIT_ANCHOR_FAILED + orphan_fee log + no parcels in response
5. limit=60 → 400 LIMIT_EXCEEDED
6. confirmCost=true but parcelCount changed >5% from Phase 1 → 409 COST_MISMATCH

REPORT-BACK FORMAT I WANT:
- The diff against searchByAddress.js (if you refactor shared helpers out) AND the new searchByArea.js or whatever you name it
- Which ATTOM area-search endpoint you picked and why
- Smoke-test output for all 6 scenarios above
- Any deviations from this prompt with the reason
- Whether you put the route at /search-by-area, /search:area, or alongside the existing /search-by-address — match existing repo route convention

Ready when you are.
```

---

## What this completes

After Step 4 ships:
- Site Recon graduates from single-address property lookup → ranked-list area-search tool (the actual product)
- BATCH path of the Deposition Rule receipt exercised end-to-end
- 5 spec rules (RULE-01, RULE-03, RULE-07, RULE-08, RULE-13) all enforced in real production code
- 4 of the 9 Steps done (Steps 1-3 + Step 4)

Remaining Steps 5-9:
- **Step 5** — GIS overlays (FEMA flood, CA Coastal Commission, historic district, OZ)
- **Step 6** — Visual rendering (Google Maps marker layer + Street View + satellite imagery, RULE-17 visual-before-verdict)
- **Step 7** — W-002 handoff button
- **Step 8** — Vault DTC logbook entry per pull + RULE-11/12 validation gates (input validation + Fair Housing screen apply to BOTH endpoints)
- **Step 9** — Sublette WY E2E test + creators/sean-combs/site-recon-001/intent.md + Oakland SAMPLE fixtures + workerSync to Firestore + ping Sean for marketplace review

## Related

- Task #434 (Site Recon Step 3 completed) → this is Step 4
- Task #435 (Steps 4-6 — supersedes/refines)
- `docs/CODEX-S52.31-Site-Recon-Step3-Prompt.md` (Step 3, shipped)
- Memory `project_four_way_loop_creative_meeting_framing.md` — the framing for why this loop works
