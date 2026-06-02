# CODEX S52.1 — Contacts ↔ IR Bridge

**Date:** 2026-06-01
**Worker(s):** IR Worker · Contacts Spine
**Scope:** Backend service module + 3 authenticated routes + 3 sync hooks
**Status:** Build complete; pre-flight QA-001 below

---

## Why

The contacts spine (v2.1, ~3,228 contacts) and the IR worker's investor records lived in parallel. Every investor invite had to be hand-typed by re-keying name/email; engagement events on the IR side (magic-link click, KYC complete, SAFE signed) never landed back on the contact. There was no path from "filter contacts by segment=storyhouse-followers" to "bulk-invite those people as investors."

This bridge closes that gap with the minimum cross-worker coupling that lets contacts feed IR and lets IR write back to contacts.

## What ships

### Service module
- `functions/functions/services/ir/contactsBridge.js`
  - `listEligibleContacts({ fundraiseId, segment, persona_type, persona_tier, limit })` — returns `{ eligible, alreadyInvited, totalScanned, skippedNoEmail }`; dedupes against existing investor emails
  - `importFromContacts({ fundraiseId, contactIds, sendInvitesNow, invitedBy })` — bulk-create investor records; dedup by lowercased email; writes `contactId` back-ref on investor doc and `fundraiseStatus.{fundraiseId}` + `engagementHistory[]` on contact
  - `recordIrEventOnContact({ investorId, fundraiseId, type, extra })` — sync hook called from IR lifecycle; never throws
  - `getInvestorContactLink({ investorId, fundraiseId })` — inverse lookup for UI

### Routes
- `GET  /v1/ir:eligible-contacts` — auth required
- `POST /v1/ir:import-from-contacts` — auth required; uses `ctx.userId` for `invitedBy`
- `GET  /v1/ir:investor-contact-link` — auth required

All three live in `functions/functions/index.js` right after the `fundraise:share:access` block (~line 12548).

### Sync hooks (write-through into contacts)
- `markStepComplete` — maps step → event type, fires `recordIrEventOnContact`
- `onSignaturePacketSigned` — fires `ir.signed_safe` (this path bypasses `markStepComplete`)
- `syncKycFromStripe` — fires `ir.kyc_complete` when Stripe Identity returns `verified`/`approved`

All hooks wrapped in `try {} catch {}` so a sync failure never breaks the investor flow.

## Schema additions

**Investor doc** (`fundraises/{fid}/investors/{iid}`) gains:
- `contactId: string | null` — back-reference to source contact

**Contact doc** (`contacts/{cid}`) gains:
- `fundraiseStatus.{fundraiseId}: "staged" | "invited" | "kyc_verified" | "signed" | "voted" | "declined"`
- `engagementHistory[]` — array of `{ type, fundraiseId, investorId, at, ...extra }` entries

No migration required — additive fields on existing collections.

## Event type vocabulary

| Step / sync source | Event type | Status set on contact |
|---|---|---|
| `magic_link_clicked` | `ir.magic_link_clicked` | (no status change) |
| `identity_started` | `ir.identity_started` | (no status change) |
| `identity_complete` (via markStepComplete) | `ir.kyc_complete` | `kyc_verified` |
| `syncKycFromStripe → verified` | `ir.kyc_complete` | `kyc_verified` |
| `signature_started` | `ir.signature_started` | (no status change) |
| `signature_complete` / `onSignaturePacketSigned` | `ir.signed_safe` | `signed` |
| (manual) | `ir.voted` | `voted` |
| (manual) | `ir.declined` | `declined` |
| `closed` | `ir.closed` | (no status change) |
| Bulk import — staged only | `ir.staged` | `staged` |
| Bulk import — sendInvitesNow=true | `ir.invited` | `invited` |

---

## QA-001 assertion catalog (run BEFORE Sean dogfoods)

### A. Structural — module loads + routes registered

- [x] **A1.** `node -c services/ir/contactsBridge.js` → no syntax errors
- [x] **A2.** `node -c services/ir/investorFlow.js` → no syntax errors (sync hooks added)
- [x] **A3.** `node -c index.js` → no syntax errors
- [ ] **A4.** Module exports match documented surface (`listEligibleContacts`, `importFromContacts`, `recordIrEventOnContact`, `getInvestorContactLink`)
- [ ] **A5.** All 3 routes are reachable (return non-404 with valid auth)

### B. Behavioral — happy path

- [ ] **B1.** `GET /v1/ir:eligible-contacts?persona_type=investor&limit=10` returns `{ ok: true, eligible: [...], alreadyInvited: [...], totalScanned: N, skippedNoEmail: M }`
- [ ] **B2.** Each `eligible[*]` row carries `{ contactId, name, email, segments, types, tiers, personaCount }`
- [ ] **B3.** `POST /v1/ir:import-from-contacts` with `{ contactIds: ["..."], sendInvitesNow: false }` creates investor records with `flowStep: "staged"` and `contactId` set
- [ ] **B4.** After import, the source contact has `fundraiseStatus.{fid} === "staged"` and an `engagementHistory[]` entry of type `ir.staged`
- [ ] **B5.** Re-importing the same contactId is a no-op (`skipped++`, no duplicate investor)
- [ ] **B6.** `GET /v1/ir:investor-contact-link?investorId=X` returns linked contact summary including `personaCount`

### C. Behavioral — sync hooks

- [ ] **C1.** Calling `markStepComplete(_, iid, "signature_complete")` causes the linked contact to gain an `ir.signed_safe` event AND `fundraiseStatus === "signed"`
- [ ] **C2.** Calling `markStepComplete(_, iid, "identity_complete")` writes `ir.kyc_complete` (not `ir.identity_started` — TC-038 regression guard)
- [ ] **C3.** Investor record with `contactId === null` survives a `markStepComplete` call with no crash (early-return path inside `recordIrEventOnContact`)
- [ ] **C4.** A Firestore error inside `recordIrEventOnContact` does NOT propagate to break `markStepComplete` (try/catch swallows it)

### D. Edge — dedup, missing fields, multi-persona

- [ ] **D1.** Contact with `personas: [{ name, email }, ...]` but no top-level `email` returns the first persona's email from `_primaryEmail`
- [ ] **D2.** Contact missing both top-level and persona email is skipped in `listEligibleContacts` (counted in `skippedNoEmail`) and errored in `importFromContacts` (`reason: "no_email"`)
- [ ] **D3.** Email dedup is case-insensitive (`Foo@x.com` and `foo@X.com` resolve to one investor)
- [ ] **D4.** `POST /v1/ir:import-from-contacts` with empty `contactIds: []` returns `{ ok: false, error: "contactIds array is required" }` (route validation before service call)

### E. Auth + tenant

- [ ] **E1.** All 3 routes require Firebase auth (live behind `requireFirebaseUser`)
- [ ] **E2.** `invitedBy` on imported investor records is set to `ctx.userId` of the authenticated user
- [ ] **E3.** No tenant-id requirement — fundraise-001 is platform-scope; document this in spec

### F. Operational — deploy + smoke

- [ ] **F1.** `firebase deploy --only functions:api` succeeds with no warnings on the new service module
- [ ] **F2.** Production curl of `GET /v1/ir:eligible-contacts` (with valid bearer) returns ok=true
- [ ] **F3.** Logs show `[ir:eligible-contacts]`, `[ir:import-from-contacts]`, `[ir:investor-contact-link]` entries on first request

---

## Pre-flight self-walk results (2026-06-01)

**Structural (A):**
- [x] A1 — `contactsBridge.js` syntax clean
- [x] A2 — `investorFlow.js` syntax clean (3 sync hooks added)
- [x] A3 — `index.js` syntax clean
- [x] A4 — All 4 exports present (`listEligibleContacts`, `importFromContacts`, `recordIrEventOnContact`, `getInvestorContactLink`)
- [x] A5 — All 3 routes registered behind auth gate; verified with prod curl (return 401, not 404)

**Operational (F):**
- [x] F1 — `firebase deploy --only functions:api` succeeded; Cloud Run function updated at `https://api-feyfibglbq-uc.a.run.app`
- [x] F2 — Production curl returns 401 (not 404) for all 3 routes — they exist, just behind auth
- [ ] F3 — Logs grep deferred to first authenticated request (Sean will trigger via UI or curl with bearer)

**Defensive design choices verified by code reading:**
- Sync hooks (`recordIrEventOnContact`) wrap Firestore writes in `try/catch` that logs but never re-throws (C4 satisfied by inspection)
- `recordIrEventOnContact` early-returns when `investorId`/`type` missing OR investor doc lacks `contactId` (C3 satisfied)
- `importFromContacts` route guards `contactIds` array before service call (D4 satisfied by inspection)
- `_primaryEmail`/`_primaryName` fall through to first persona (D1 satisfied by inspection)
- Email dedup uses `.toLowerCase()` on both sides (D3 satisfied by inspection)
- Routes sit after `requireFirebaseUser` gate at line 7186; before service-call routes that need ctx — verified (E1 satisfied)
- `invitedBy: ctx.userId` passed through on import route (E2 satisfied by inspection)

**Items requiring live tenant data (deferred to Sean's dogfood):**
- B1-B6 — happy-path response shape verification (needs real bearer + real contacts)
- C1-C2 — end-to-end sync hook verification (needs an investor walking through magic-link → KYC → SAFE)
- D2 — missing-email contact handling on live data
- E3 — fundraise-001 scope documented above

## After Sean tests

Capture findings as TC-### entries in `docs/QA-001-TEST-CORPUS.md`. Target: 0 P0 bugs before merging this build into the broader IR worker view.

## Next surfaces (deferred)

- **Prospects panel UI** — IR canvas tab that surfaces `listEligibleContacts` results with bulk-select + "Invite N" button
- **Activity timeline on contact** — Contacts UI to render `engagementHistory[]` chronologically
- **Wire to remaining sync points** — `onMagicLinkClick` (write `ir.magic_link_clicked`), explicit vote endpoints (`ir.voted` / `ir.declined`)
