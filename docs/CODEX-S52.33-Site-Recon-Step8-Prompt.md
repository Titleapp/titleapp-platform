# CODEX S52.33 — Site Recon Step 8 grounding (Vault DTC bridge + RULE-11/12 gates)

**Date:** 2026-06-06
**Status:** Canonical grounding for Step 8 — written AFTER TC-063 (web-Alex's first Step 8 attempt fabricated RULE-11/12 content under locked IDs). This CODEX is the record that SHOULD have preceded the Step 8 prompt. Alex's self-corrected re-issue (post-paste-back) already matches what's grounded here; this entry is the corpus version so the pattern is intact for Step 9 onward.
**Resume point:** post-S52.32 (Step 7 W-002 handoff shipped 41e34577..1fa72ba3) + TC-063 captured (060d54f2)
**Process rule effective:** every Step prompt for a creator worker build MUST be preceded by a T1-cut CODEX that quotes the ruleset file verbatim. No direct web-Alex → Code path for spec-citing prompts. TC-063 is the precedent.

---

## Why Step 8 is two things, not one

CODEX S52.32 deferred two distinct items to Step 8:

1. **Vault DTC logbook bridge.** Site Recon writes audit records to PLAT-008 (individual + batch receipts). The audit-substrate thesis ([[project-audit-substrate-thesis-locked]]) requires those records ALSO land in the user's Vault DTC logbook — that's how a real estate operator gets a portable audit record they can hand to counsel, a county recorder, or a state AG. Without the Vault bridge, Site Recon is auditable but not portable. Step 8 wires `createVaultLogbookEntry()` into every audit-write site.

2. **RULE-11 input validation + RULE-12 Fair Housing gates.** Both rules apply at `parcel_search_input` time and both are `refuse_search` on fail. Neither is wired yet — Steps 4 and 6 deliberately deferred them so the spine could ship first. Step 8 enforces both on `searchByAddress` AND `searchByArea`.

These are unrelated technically but both are Step 8 because both are the "make Site Recon legally defensible before Sublette pilot" half of the build. Vault = portability of the audit record. RULE-11/12 = inputs you can't be sued for processing.

---

## Locked spec content (verbatim from `functions/functions/raas/rulesets/site_recon_rules_v1.json`)

### RULE-11

```json
{
  "id": "RULE-11-input-validation",
  "label": "input_validation",
  "logic": "Reject malformed inputs: fictional ZIP codes, malformed APNs, search radii greater than 5 miles, polygon inputs exceeding 10 square miles. Surface a specific input-error message.",
  "trigger": "parcel_search_input",
  "eval": { "field": "input.well_formed_and_within_limits", "operator": "==", "threshold": true },
  "on_fail": "refuse_search, surface_specific_error"
}
```

### RULE-12

```json
{
  "id": "RULE-12-fair-housing-pattern",
  "label": "fair_housing_pattern",
  "logic": "Refuse searches that suggest redlining, steering, or any pattern correlated with protected-class avoidance. Surface a regulatory note and decline to execute. RAAS Tier 2 Fair Housing module governs detection.",
  "trigger": "parcel_search_input",
  "eval": { "field": "input.fair_housing_pattern_detected", "operator": "==", "threshold": false },
  "on_fail": "refuse_search, surface_fair_housing_regulatory_note"
}
```

**Both rules have `on_fail: refuse_search`.** This is non-negotiable: there is NO fail-open default on either rule. Any prompt that instructs Code to apply a default-allow / log-and-continue / soft-warn pattern to RULE-11 or RULE-12 is fabrication and must be rejected (this is exactly the TC-063 failure mode).

---

## The Vault DTC bridge (the spec)

### Single new file: `functions/functions/workers/site-recon-001/vaultIntegration.js`

```js
async function createVaultLogbookEntry(auditRecord, userId, tenantId) {
  // POST /api/vault/logbook/entries
  // Maps:
  //   auditRecord.receiptId      → entry.sourceReceiptId
  //   auditRecord.executionType  → entry.entryType  ("site-recon:address" | "site-recon:area-search" | "site-recon:visual" | "site-recon:handoff")
  //   auditRecord.metadata       → entry.metadata (pass through; Vault stores as opaque JSON)
  //   auditRecord.anchoredAt     → entry.anchoredAt
  //   auditRecord.txHash         → entry.anchorReference
  //   userId, tenantId           → entry.userId, entry.tenantId
  //
  // Soft-fail behavior (REQUIRED): if Vault endpoint is unreachable, returns null and
  //   { vaultStatus: "unavailable", reason } that the caller can attach to its response.
  // DO NOT throw on Vault unreachable. Site Recon's audit record IS the system of record;
  //   the Vault entry is a derived view. Failing Site Recon because Vault is down would
  //   invert the dependency.
}
```

### Wiring sites (four existing files, append-only — never replace the audit write)

After every `auditTrailService.writeAuditRecord(...)` call, append:

```js
const auditRecord = await auditTrailService.writeAuditRecord({...});
const vaultResult = await createVaultLogbookEntry(auditRecord, userId, tenantId);
// vaultResult is null on Vault unreachable; non-null on success.
// Response shape gets a vaultStatus field: vaultResult ? "linked" : "unavailable"
```

Files to edit:
- `functions/functions/workers/site-recon-001/searchByAddress.js`
- `functions/functions/workers/site-recon-001/searchByArea.js`
- `functions/functions/workers/site-recon-001/visualLayer.js`
- `functions/functions/workers/site-recon-001/handoffToTitleAbstract.js`

### Append-only invariant
The Vault bridge does NOT mutate the audit record. The audit record is written first, the Vault entry is derived second, and the Vault entry's failure does not retroactively invalidate the audit record. (This is the deviation Code caught in Step 6 — preserve it here.)

---

## The RULE-11/12 enforcement gates

### Where they fire
Both rules trigger on `parcel_search_input` — i.e., immediately on request entry, BEFORE Phase 1 cost-quote. Reasoning: cost-quoting a malformed query wastes ATTOM cache + UX; cost-quoting a Fair-Housing-pattern query is itself a compliance event. Refuse before quote.

### RULE-11 implementation
Add `validateInput(input)` helper invoked at the top of both `searchByAddress` and `searchByArea`. Checks:
- APN format (if `apn` provided) — non-empty, character-set check (per state — for v1 just enforce `[A-Z0-9\-./]+` non-empty).
- ZIP code (if `zip` provided) — 5-digit or 5+4, valid against `usps-zip-validator` static lookup if available, otherwise format check only and log "zip_format_only".
- Radius (if `area.type === "radius"`) — `radiusMeters <= 8046.72` (5 mi).
- Polygon (if `area.type === "polygon"`) — compute area, `<= 25.9 km² ` (10 sq mi). Use shoelace formula on the lat/lng vertices, no external library.

On any check fail: return `400 INPUT_VALIDATION_FAILED` with `code` (one of `APN_MALFORMED`, `ZIP_INVALID`, `RADIUS_EXCEEDED`, `POLYGON_AREA_EXCEEDED`) and a human-readable `message`. Log to PLAT-008 as `execution_type: "site-recon:input-validation-failed"` with the field and value redacted-summary (no PII / no full input).

### RULE-12 implementation (Tier 2 hook)
The spec says "RAAS Tier 2 Fair Housing module governs detection." That module is NOT in scope for Step 8 — it's a separate component that will live at `functions/functions/raas/tier2/fair-housing/detect.js` (does not exist yet). Step 8 wires the HOOK; the detection logic itself ships as part of [[project-county-instrumentation-campaign]] preparation or as a separate worker dependency.

Step 8 RULE-12 implementation:
```js
const fairHousingPatternDetected = await fairHousingHook.detect(input, { userId, tenantId });
// fairHousingHook.detect() is the Tier 2 module if present, else a no-op stub returning false.
if (fairHousingPatternDetected) {
  // Log refusal event to PLAT-008 (execution_type: "site-recon:fair-housing-refused")
  // Return 403 FAIR_HOUSING_PATTERN_REFUSED with the regulatory note text
}
```

For Step 8, the stub at `functions/functions/raas/tier2/fair-housing/detect.js` returns `false` (no detection logic yet) BUT the wire is in place. Spec deferral noted: Tier 2 detection logic = follow-on task, not Step 9.

### Regulatory note text (RULE-12 refusal response body)
> "This query has been declined to comply with the Fair Housing Act and applicable state fair-lending statutes. Site Recon does not execute parcel searches that pattern-match against protected-class avoidance, redlining, or steering. This event has been logged."

---

## Out of scope for Step 8 (defer to Step 9)
- Sublette WY E2E test
- `creators/sean-combs/site-recon-001/intent.md`
- Oakland SAMPLE fixtures
- `workerSync` to Firestore
- Marketplace review ping to Sean

## Out of scope for Step 8 AND Step 9 (separate follow-on)
- Tier 2 Fair Housing detection logic (RULE-12 stub stays no-op until that module is built)
- RULE-18 candidate (open-job sequencing conflict — Alex's salvaged-but-misplaced concept; queue for spec v1.2 pass)

---

## Smoke tests Code should run

1. **Vault link success path** — `searchByAddress` with stubbed Vault returns `vaultStatus: "linked"` + Vault entryId echoed.
2. **Vault unreachable path** — stub Vault as 503; `searchByAddress` succeeds with `vaultStatus: "unavailable"`, audit record still written, response valid.
3. **RULE-11 radius >5mi** — `searchByArea` with `radiusMeters: 10000` → 400 RADIUS_EXCEEDED, no ATTOM call, no fee, no audit anchor.
4. **RULE-11 polygon >10sq mi** — `searchByArea` with polygon ~30 km² → 400 POLYGON_AREA_EXCEEDED.
5. **RULE-11 malformed APN** — `searchByAddress` with `apn: ""` → 400 APN_MALFORMED.
6. **RULE-12 stub no-op** — Fair Housing hook returns false; request proceeds normally.
7. **RULE-12 stub manual trigger** — temporarily set hook to return true; verify 403 FAIR_HOUSING_PATTERN_REFUSED + refusal logged to PLAT-008 + no ATTOM call + no fee.
8. **Vault entry on visual layer write** — `visualLayer.js` write → Vault entry created with `entryType: "site-recon:visual"`.
9. **Vault entry on W-002 handoff** — `handoffToTitleAbstract.js` write → Vault entry created with `entryType: "site-recon:handoff"`.

---

## Report-back format Code should produce
- Diff for `vaultIntegration.js` (new file)
- Diff for each of the 4 wired files (showing only the appended Vault call + response field, not the surrounding audit write)
- New file: `functions/functions/raas/tier2/fair-housing/detect.js` (stub returning false)
- New helper: `validateInput(input)` location (inline in each search file or extracted to a shared helper — Code's call, match existing convention)
- Smoke-test output for all 9 scenarios
- Any deviations with the reason (per the standing "flag and stop, don't paper over" constraint)
- Stop_reason of the build (Code can confirm `end_turn` — useful as the inverse signal of the Alex clipping bug)

---

## Anti-fabrication guard for Code (carry forward, non-negotiable)

If any instruction in the Step 8 prompt Sean pastes contradicts the verbatim RULE-11 / RULE-12 JSON quoted above, Code MUST hard-stop and flag (the standing "flag it and stop, don't paper over" constraint). The most likely fabrication pattern (and the one TC-063 actually surfaced) is fail-open default behavior under either rule. Both rules have `on_fail: refuse_search`. There is no fail-open default. Any prompt that says otherwise is fabrication.

This anti-fabrication guard is now standard practice for every CODEX-grounded Step prompt across every future creator worker build. Documented as the load-bearing pattern in [[project-tc063-four-way-loop-thesis-proven]].

---

## Related

- `docs/CODEX-S52.32-Site-Recon-Step4-Prompt.md` — Step 4 spine (preceded by full ruleset grounding; zero fabrications)
- `docs/CODEX-S52.31-Site-Recon-Step3-Prompt.md` — Step 3 audit anchor (precedent for the append-only invariant)
- `docs/QA-001-TEST-CORPUS.md` — TC-063 captured (commit 060d54f2)
- `functions/functions/raas/rulesets/site_recon_rules_v1.json` — source of truth for RULE-11 + RULE-12
- Memory `project_tc063_four_way_loop_thesis_proven.md` — why this CODEX exists at all
- Memory `project_audit_substrate_thesis_locked.md` — why the Vault bridge is load-bearing
- Memory `project_speed_to_falsifiability_is_the_product.md` — why Site Recon ships Step 9 by Sunday, Sublette pilot link by Monday
- Step 9 grounding (CODEX S52.34) — next T1 cut, to be drafted before Sean pastes the Step 9 prompt
