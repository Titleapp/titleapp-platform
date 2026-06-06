# CODEX S52.31 — Site Recon Step 3 prompt for Claude Code

**Date:** 2026-06-06
**Status:** Prompt ready to paste — Step 3 PLAT-008 audit anchor + rollback
**Resume point:** T2 standing state after Steps 1+2 ship

This is the paste-ready Step 3 prompt for Claude Code in terminal. Sean pastes after the TC-061 fix is verified working in the live sandbox.

---

## Pre-flight (resolved 2026-06-06 morning)

Two pre-flight flags T2 raised the night before, both resolved:

1. **Ruleset file exists.** `functions/functions/raas/rulesets/site_recon_rules_v1.json` was shipped in commit `ea8558a1` (S52.29c). 9121 bytes. SHA-256: `6b3bf4688ee080e62c08970abe7c60ef2973036f946ed590515e96b5f01d8699`. The receipt's `composition.rulesetHash` field gets a real value, not a placeholder.

2. **Naming convention.** Repo uses underscores (`site_recon_rules_v1.json`), not kebab (`site-recon-rules-v1.json`). Spec v1.1 has the kebab name; that's spec drift to fix on the v1.2 reconciliation pass (task #436). Code uses underscores to match the actual file.

## Existing audit pipeline Code should reuse (DO NOT re-implement)

- **`functions/functions/services/auditTrailService.js`** — `writeAuditRecord(executionData)` returns `{ txHash, gasCost, fee }` and writes to the `auditRecords` Firestore collection (append-only). Already wired to the PLAT-008 surface (S52.23). Phase 1 simulates Polygon mint with deterministic SHA-256 hash; Phase 2 swap-in is per-method, not per-call-site.
- **`functions/functions/services/anchor/hashAnchor.js`** — `sha256(canonical)` helper for content hashing.
- **`functions/functions/services/auditTrailService.js`** — `recordAuditFee(usageEventRef, auditResult)` applies the audit fee to a usage event doc.

Code does NOT need to instantiate a chain client, NOT create a new Crossmint integration, NOT touch the auditRecords schema. The pipeline exists. Site Recon plugs into it.

---

## Paste-ready prompt

```
Step 3 — PLAT-008 audit anchor + rollback for SITE-RECON-001 (spec RULE-03, NON-NEGOTIABLE).

Every successful Site Recon pull writes a receipt to the PLAT-008 audit trail. If the anchor write fails, the response rolls back (503 AUDIT_ANCHOR_FAILED). The billing fee stays recorded (orphan fee, reconciled separately).

EXISTING PIPELINE TO REUSE (DO NOT BUILD A CHAIN CLIENT):
- functions/functions/services/auditTrailService.js exports writeAuditRecord({ event_id, worker_id, user_id, org_id, execution_type, timestamp, metadata }) → returns { txHash, gasCost, fee }. Writes to auditRecords collection (append-only). Phase 1 simulates Polygon mint; Phase 2 swap is per-method not per-call-site.
- functions/functions/services/anchor/hashAnchor.js exports sha256() helper.
- DO NOT call Crossmint directly. DO NOT instantiate a web3/ethers/polygon library. DO NOT touch auditRecords schema. Use writeAuditRecord().

RECEIPT METADATA FOR SITE RECON (passed as executionData.metadata):
{
  parcelRef: {
    address1: parsed.address1,
    address2: parsed.address2,
    attomId: propertyDetail?.identifier?.attomId ?? null
  },
  feasibility: {
    verdict, namedBlocker, blockerCode, confidenceScore, flags
  },
  feeEventId: fee.eventId ?? null,
  composition: {
    spec: "SITE-RECON-001-v1.1",
    rulesetHash: <sha256 of site_recon_rules_v1.json contents>
  }
}

LOGIC IN searchByAddress.js:
1. Compute rulesetHash ONCE at module load (top of file): read functions/functions/raas/rulesets/site_recon_rules_v1.json synchronously, sha256() its contents, cache in module scope. Don't re-read per request.
2. Order of operations in the handler: (a) ATTOM pull succeeds, (b) recordDataFee fires, (c) scoreFeasibility runs, (d) writeAuditRecord fires, (e) res.json with auditAnchor populated.
3. On writeAuditRecord SUCCESS: include in response body — auditAnchor: { receiptId: <auditRecords doc id>, txHash: <returned txHash>, anchoredAt: <ISO timestamp> }
4. On writeAuditRecord FAILURE: catch the error, return 503 with body:
   {
     ok: false,
     code: "AUDIT_ANCHOR_FAILED",
     phase: "anchor",
     parcel: { address1, address2, attomId },
     feasibility: { verdict, namedBlocker, blockerCode, confidenceScore, flags },
     feeEventId: <id>,
     message: "Pull succeeded but audit anchor failed. Result not persisted. Fee charged — contact support for reconciliation."
   }
5. Log the orphan fee with console.error("[orphan_fee]", { feeEventId, parcelRef, error: err.message }) so it's grep-able. Per spec RULE-03 on_fail: rollback_pull — do NOT swallow the error silently, do NOT proceed with the response.

execution_type FIELD VALUE: use "site-recon:property-pull" — this is the action ID that PLAT-008 dashboards will filter on.

SMOKE TESTS:
- Synthetic ATTOM bundle + stub writeAuditRecord that returns { txHash: '0xabc...', gasCost: 0.001, fee: 0.005 } → 200 response with auditAnchor populated.
- Same bundle + stub writeAuditRecord that throws Error("anchor write failed") → 503 with code AUDIT_ANCHOR_FAILED and a console.error orphan_fee log line.
- Verify the metadata field on the auditRecords doc contains the parcelRef + feasibility + composition.rulesetHash that match the request.

CONSTRAINTS (carry forward, non-negotiable):
- VOCABULARY: receipt / anchor / logbook entry / audit trail. NEVER blockchain / crypto / NFT / token / mint anywhere in code, comments, logs, error messages, or response strings. (The Phase 1 stub uses "polygon" in the chain field internally — that's an internal config string, NOT a user-facing surface; leave it alone.)
- No new Anthropic client. No new chain client. No new billing client.
- Don't touch site_recon_rules_v1.json (you only READ it for the hash), catalog entry, sample fixtures, or workerSync.js.
- The locked SITE-RECON-001 Intent Spec is the source of truth. If anything in this prompt conflicts with the spec, FLAG IT and stop, don't paper over.

REPORT-BACK FORMAT I WANT:
- The diff against searchByAddress.js (just the changes, not the whole file).
- Where rulesetHash is computed (line number).
- Smoke-test output (both success + rollback paths).
- Any deviations from this prompt with the reason.

Ready when you are.
```

---

## What this completes

After Step 3 ships:
- Site Recon's `searchByAddress` is feature-complete for the parcel-pull path: cost gate (Step 1) → ATTOM pull (Step 1) → feasibility scoring (Step 2) → audit anchor (Step 3) → response with verdict + receipt.
- Three of the nine Steps from Alex's original 9-step build plan are done.
- Remaining Steps 4-9 are: GIS overlays (FEMA + CA Coastal), visual rendering (RULE-17 visual_before_verdict), W-002 handoff button, Sublette WY E2E test, marketplace review ping.

## Related

- Task #434 (this prompt, in_progress)
- Memory `project_site_recon_001_build_state.md`
- Memory `project_four_way_authoring_loop_with_code.md`
- `docs/CODEX-S52.29-Site-Recon-Shipped.md`
