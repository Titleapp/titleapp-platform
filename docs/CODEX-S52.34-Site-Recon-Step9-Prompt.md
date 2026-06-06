# CODEX S52.34 — Site Recon Step 9 grounding (Sublette + Oakland E2E + intent.md + workerSync + marketplace review)

**Date:** 2026-06-06
**Status:** Step 8 SHIPPED (cba44812) — 8 of 9 Steps complete + clean 9/9 smoke tests + Alex Option 2 recovery passed rubric-#5. Step 9 grounding cut BEFORE the prompt is sent to web-Alex, per the process rule effective post-TC-063.
**Resume point:** post-S52.33 (Step 8 Vault DTC bridge + RULE-11/12 enforcement shipped) + Step 9 marks the marketplace-ready milestone

---

## Why Step 9 has the highest fabrication surface area of any Step

Step 9 touches FIVE artifacts where fabrication could enter and look authoritative:
1. **GIS endpoint URLs** — four production ArcGIS endpoints already live in `gisOverlayService.js`. Quoting them wrong in a test breaks the E2E silently.
2. **Sublette WY parcel** — pilot parcel for the [[project-county-instrumentation-campaign]] thesis. No specific parcel pinned yet.
3. **Oakland sample parcel** — already shipped in fixtures (S52.29 commit ea8558a1, "3241 Market Street, Oakland, CA 94608"). E2E must use the SAME address — diverging would corrupt the regression baseline.
4. **`creators/sean-combs/site-recon-001/intent.md`** — NEW artifact type. No precedent in the repo. Format must be defined HERE so future creators copy it.
5. **workerSync target** — SITE-RECON-001 is already mapped to slug `"site-recon"` in `functions/functions/helpers/workerSync.js`. The Step 9 task is RUNNING the sync (admin POST), not editing the map.

Below is the verbatim ground truth for each.

---

## Locked GIS endpoint URLs (verbatim from `functions/functions/workers/site-recon-001/gisOverlayService.js`)

```js
const ENDPOINTS = {
  femaFlood: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query",
  coastalCommission: "https://services2.arcgis.com/yh4PJtbnaZ3vAF5M/ArcGIS/rest/services/Coastal_Zone_Boundary/FeatureServer/0/query",
  historicDistricts: "https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/1/query",
  opportunityZones: "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/0/query"
};
```

These are the four URLs. Any Step 9 test that asserts against a different URL is fabrication. Code's gisOverlayService comment notes: *"endpoint URLs are best-known as of 2026-06-06. The FEMA NFHL layer is long-stable; CCC / NRHP / OZ layer URLs get pinned during the Sublette WY + Oakland E2E pass (Step 9). A wrong URL degrades soft into errors[]."* — that's the pin step Step 9 closes.

---

## Sample parcels

### Oakland (regression baseline — already in fixtures since S52.29)
- **Address:** `3241 Market Street, Oakland, CA 94608`
- **Use:** regression E2E. Result MUST match what the existing canvas fixtures show (Opportunities tab ranked-list position, Feasibility tab GREEN with stated overlays, Historical tab 5-year chain + AVM + visual context note "south-facing, morning sun"). If the live result diverges from the fixture, that's the regression to report — do NOT silently update the fixture.

### Sublette WY (NEW pin — pilot parcel for county-instrumentation campaign)
- **Constraint:** must be a real publicly-recorded Sublette County, WY parcel (Pinedale or Big Piney area). Code's task: query Sublette County recorder's public records (or ATTOM if Sublette has coverage), pick a parcel that exercises the non-California path:
  - No CCC overlay (coastalCommission returns null — not in CA)
  - No CA overlay errors (the CCC layer is CA-only; expect a quick empty response, not a fail)
  - FEMA flood zone check exercised (Sublette has both X-zone and AE-zone parcels around Green River corridor)
  - NRHP check exercised (Pinedale has at least one historic district per state register)
  - Opportunity Zone exercised (Sublette has at least one designated OZ tract)
- **Reporting:** Code reports the picked parcel address + APN in the Step 9 report-back so it's pinned for the marketplace review ping. After review, that parcel becomes the canonical Sublette test fixture.
- **DO NOT fabricate a Sublette parcel.** If the recorder/ATTOM lookup fails, FLAG IT and stop (per the standing "flag it and stop, don't paper over" constraint). A made-up Wyoming address will silently pass smoke tests but break the county-instrumentation pilot link.

---

## `creators/sean-combs/site-recon-001/intent.md` — NEW artifact specification

This is the first instance of the creator-intent artifact. Format defined here becomes precedent for every future creator worker.

### Path
```
creators/sean-combs/site-recon-001/intent.md
```

(The `creators/` directory does not yet exist — Code creates it. `sean-combs/` is Sean's creator handle. `site-recon-001` is the worker ID.)

### Required sections

```markdown
# Intent Spec — SITE-RECON-001 (Site Recon)

**Creator:** Sean Lee Combs (handle: `sean-combs`)
**Worker ID:** SITE-RECON-001
**Marketplace slug:** `site-recon`
**Spec version:** v1.1
**Built:** 2026-06-05 → 2026-06-06 (Steps 1–9 via four-way authoring loop)
**Ground-truth ruleset:** `functions/functions/raas/rulesets/site_recon_rules_v1.json`

## Round 1 — Purpose
[Single paragraph stating the user-facing job the worker does. Direct quote from the Intent Spec session if available.]

## Round 2 — Operator persona + success outcome
[Who uses this worker, what their workflow looks like, what success looks like for them. Use the same language as the spec's persona detection section.]

## Round 3 — Constraints
- Rules: 17 (9 hard_stops + 8 soft_flags) per spec v1.1
- Composes with: Fair Housing v0, Deposition Rule, ATTOM API terms, CCPA
- Data fees: per [[feedback-universal-cost-recovery-rule]] — ATTOM $6/parcel-report user-side, GIS evaluations $0.05/fresh-call cache-aware
- Vault: DTC-anchored, every action becomes a logbook entry on the parcel's DTC
- Audit anchor: PLAT-008 individual + batch receipts (Crossmint chain anchor optional)

## Round 4 — Out of scope
[What this worker explicitly does NOT do. Link to follow-on workers (Land Use AI Attorney, W-002 enhancement, Permitting splits) per [[project-worker-dependency-clarity-emerges-from-real-builds]].]

## Round 5 — Edge cases handled
[List of the 30 QA-001 assertions covered + the TC-061 / TC-062 / TC-063 failures the build surfaced and corrected.]

## Build history
| Step | What | Commit |
|---|---|---|
| 1 | searchByAddress + ATTOM cost gate | [commit] |
| 2 | scoreFeasibility + verdict logic | [commit] |
| 3 | PLAT-008 audit anchor + rollback | [commit] |
| 4 | searchByArea + batch receipt | [commit] |
| 5 | GIS overlay service (4 endpoints) | [commit] |
| 6 | visualLayer (Maps + Street View + RULE-17) | [commit] |
| 7 | handoffToTitleAbstract (W-002) | 1fa72ba3 |
| 8 | Vault DTC bridge + RULE-11/12 | cba44812 |
| 9 | Sublette + Oakland E2E + this file + marketplace | [commit] |

## Failures preserved (QA-001 corpus)
- TC-061 — creator-journey snag loop (infrastructure)
- TC-062 — Alex miscitation of real rule under wrong number (miscitation)
- TC-063 — Alex fabrication of rule content under real IDs (authoritative-sounding fabrication)

## Marketplace review status
- Submitted: [date]
- Reviewer: Forge Reviews (SOCIII-funded independent)
- Status: [pending | approved | issues-returned]
```

### Why this format
Each section maps to a layer of the worker's identity that needs to survive without Sean in the room:
- Purpose + persona = what the worker is FOR
- Constraints + out-of-scope = what it WON'T do
- Edge cases = what it KNOWS it has to handle
- Build history = what shipped when, anchored to commits
- Failures preserved = what the immune system caught, so future creators can see the recovery pattern

This is also the file that becomes Sean's public Creator Profile entry at `sociii.ai/c/sean-combs/site-recon-001` — rendered server-side from this markdown.

---

## workerSync to Firestore

SITE-RECON-001 is **already mapped** in `functions/functions/helpers/workerSync.js`:
```js
const MARKETPLACE_SLUG_MAP = {
  ...
  "SITE-RECON-001": "site-recon",
  ...
};
```

Step 9 task is **running** the sync, not editing the map. Trigger:
```
POST /v1/admin:workers:sync
Authorization: Bearer <Firebase Auth admin token>
```

Expected outcome:
- `digitalWorkers/site-recon` Firestore document created/updated with the catalog entry's structural fields (canvasTabs, constraintRaasSources, intent, controlCenterContribution, vault.reads+writes, referrals, coming_soon).
- Worker appears in marketplace browsing at `sociii.ai/marketplace?q=site-recon`.
- Creator Profile at `sociii.ai/c/sean-combs/site-recon-001` renders from the intent.md + the synced catalog entry.

Validation: hit `/v1/workers:list` after sync, confirm SITE-RECON-001 appears with `slug: "site-recon"` and full canvasTabs array.

---

## Marketplace review ping

After workerSync succeeds, post a review-request payload to the Forge Reviews queue. Architecture not yet wired in production — Step 9 wires the HOOK + posts a stub payload.

### Hook location (new file)
`functions/functions/workers/site-recon-001/marketplaceReviewPing.js`

### Payload shape
```js
{
  workerId: "SITE-RECON-001",
  marketplaceSlug: "site-recon",
  creatorHandle: "sean-combs",
  intentSpecPath: "creators/sean-combs/site-recon-001/intent.md",
  shipped: "2026-06-06",
  shippedCommit: "<step 9 commit hash>",
  smokeTestSummary: { stepCount: 9, allPassed: true, qaCorpusEntries: ["TC-061","TC-062","TC-063"] },
  reviewType: "first-listing",
  sla: "7 days"
}
```

### Delivery
- Primary: POST to `/v1/marketplace:review:request` (route to be added in this Step's diff if not present)
- Fallback: structured log line `[marketplace-review-ping]` + Firestore write to `marketplaceReviewQueue/{workerId}_{timestamp}` for manual pickup
- DO NOT send a real email yet — the Forge Reviews surface is not built. Step 9 just establishes the hook so the rest can wire later without rewiring.

---

## E2E test spec

### Test 1 — Oakland regression
Inputs:
- `searchByAddress` with `address: "3241 Market Street, Oakland, CA 94608"`, `confirmCost: true`
Assertions:
- ATTOM call fires (or stubbed response matches the existing fixture)
- Phase 2 returns verdict + GIS overlays (floodZone, coastalCommission, historicDistrict, opportunityZone — all four fields present, errors[] empty or only soft-fail labels)
- Audit anchor written to PLAT-008
- Vault entry written under the Oakland parcel's DTC
- vaultStatus: "linked"
- Response shape matches existing `Historical` tab fixture for this address (5-year chain + AVM + visual context note)

### Test 2 — Sublette WY new pin
Inputs:
- `searchByAddress` with `address: "<real Sublette parcel Code looked up>"`, `confirmCost: true`
Assertions:
- ATTOM call fires (or fails with a documented error if Sublette has no ATTOM coverage — that's also a finding worth pinning)
- floodZone returns some value (likely "X" or "AE" for Green River corridor parcels)
- coastalCommission returns null (not California)
- historicDistrict returns true/false (depending on the parcel — assert based on what Code picks)
- opportunityZone returns true/false (depending on the parcel)
- errors[] empty
- Audit anchor written
- Vault entry written
- `vaultStatus: "linked"`

### Test 3 — Sublette WY with the FOUR endpoint URLs verified verbatim
After Sublette test completes, dump the actual URL each overlay called (via gisOverlayService logs) and assert against the four URLs quoted above. This is the URL-pinning step. If any URL has drifted (e.g., NPS retired the NRHP layer at the path above), Step 9 reports it and the spec docs get updated.

### Test 4 — Marketplace review ping fired
- After workerSync succeeds, marketplaceReviewPing.js fires.
- Assert: `marketplaceReviewQueue/SITE-RECON-001_<timestamp>` document exists in Firestore with the full payload shape.

### Test 5 — intent.md exists and parses
- Read `creators/sean-combs/site-recon-001/intent.md`.
- Assert: file exists, all required sections present, build-history table has 9 rows, TC-061/062/063 listed in Failures Preserved.

---

## Out of scope for Step 9
- Tier 2 Fair Housing detection logic (separate follow-on, RULE-12 stub stays no-op)
- Forge Reviews actual reviewer assignment + workflow (the queue exists; the reviewer-side surface is a separate build)
- RULE-18 candidate (open-job sequencing conflict — queue for spec v1.2)
- LinkedIn-style Creator Profile page render (separate UI build; the data source is the synced catalog + intent.md)
- Step 10 / "Earn" (the Forge Reviews flow's first-customer outcome — Step 10 is a UX/journey step, not a build step)

---

## Report-back format Code should produce

- Sublette WY parcel chosen (address + APN + reasoning for the pick)
- Oakland regression test output
- Sublette E2E test output including the four GIS URL pins (verbatim, asserting against the locked list above)
- Diff: `creators/sean-combs/site-recon-001/intent.md` (new file, follows the template above with all sections filled)
- Diff: `functions/functions/workers/site-recon-001/marketplaceReviewPing.js` (new file)
- Diff: any new route added (e.g., `/v1/marketplace:review:request` if used)
- workerSync admin endpoint output (the SITE-RECON-001 document body that landed in Firestore)
- Confirmation the marketplace review payload landed in `marketplaceReviewQueue/`
- Stop_reason of the build (confirm `end_turn` — inverse signal of the Alex clipping bug; same one Code reported clean for Step 8)
- Any deviations with the reason

---

## Anti-fabrication guard for Code (carry forward, non-negotiable)

Five places this Step could fabricate authoritative-sounding content:

1. **GIS URLs** — they are the four URLs quoted above. Any deviation = fabrication.
2. **Sublette parcel** — must be a real publicly-recorded address. No "Pinedale, WY 82941" with no parcel number. No invented APN.
3. **Oakland address** — `3241 Market Street, Oakland, CA 94608`. Anything else corrupts the regression baseline.
4. **intent.md format** — every section above is required. Don't invent new sections; don't drop named ones.
5. **workerSync slug** — `site-recon`, not `site-recon-001`, not `siterecon`, not `recon`. The map is locked.

If any instruction in the Step 9 prompt Sean pastes contradicts the verbatim ground truth above, hard-stop and flag. This is the standing constraint that surfaced TC-063 in Step 8.

---

## Related

- `docs/CODEX-S52.33-Site-Recon-Step8-Prompt.md` — Step 8 grounding (the post-TC-063 corrective precedent)
- `docs/CODEX-S52.32-Site-Recon-Step4-Prompt.md` — Step 4 spine pattern
- `docs/CODEX-S52.29-Site-Recon-Shipped.md` — what shipped pre-Step 4 (catalog + ruleset + fixtures + workerSync map)
- `functions/functions/raas/rulesets/site_recon_rules_v1.json` — ruleset source of truth
- `functions/functions/workers/site-recon-001/gisOverlayService.js` — GIS endpoint source of truth
- `functions/functions/helpers/workerSync.js` — workerSync map source of truth
- `docs/QA-001-TEST-CORPUS.md` — TC-061 / TC-062 / TC-063 corpus
- Memory `project_site_recon_step8_shipped_and_alex_recovery.md` — why Step 9 is the marketplace-ready milestone
- Memory `project_county_instrumentation_campaign.md` — why Sublette WY is THE pilot parcel
- Memory `project_audit_substrate_thesis_locked.md` — why the workerSync + intent.md surface matters

---

## After Step 9 ships

8 of 9 → 9 of 9. SITE-RECON-001 is marketplace-listed, intent.md is public, Sublette WY pilot is live, Forge Reviews is queued. The first creator worker built via the four-way authoring loop end-to-end is done. Sean's Monday demo for Scott + Kim has the running version + the TC-063 → Step 8 recovery → Step 9 marketplace story as the manifesto-grade backdrop.
