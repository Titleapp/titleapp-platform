# CODEX 21 — Amendment A: Spec Error Corrections

**Amends:** CODEX 21 — Worker Taxonomy, Vertical Bundles, and Sibling Communication
**Status:** DRAFT — pending red team
**Date:** 2026-07-07
**Trigger:** External red team identified 9 internal errors post-lock. Per CODEX 21's own rule ("do not modify without a new CODEX entry"), these corrections ship as Amendment A, not in-place edits.

Each item below states the original text, the error, and the corrected version. Sections that are not mentioned are unchanged.

---

## Fix 1 — Duplicate header (§2.1)

**Error:** `### 2.1 Vertical` appears twice consecutively (lines 52–53 in the original).

**Fix:** Delete the first occurrence. Only one `### 2.1 Vertical` header.

---

## Fix 2 — Auto-dealer: retirement decision + naming (§2.1 table)

**Decision (2026-07-07):** Auto-dealer is explicitly **retired** as a vertical. It was never real — no workers existed, no `auto-in-a-box` bundle was ever defined, no customers. CODEX-22 §1's "Five Verticals" table omits it intentionally. This Fix 2 supersedes the original naming correction: there is no canonical `auto-dealer` row to normalize because the row is being deleted, not fixed.

**Migration (same treatment as nursing):**
- Any `digitalWorkers` doc with `vertical: "auto_dealer"` or `vertical: "auto-dealer"` → update to `vertical: "unassigned"` with `needsReview: true` flag
- Script: query `digitalWorkers` where `vertical in ["auto_dealer", "auto-dealer"]`; batch update; log count
- `getVerticalConfig` map: both `auto_dealer` and `auto-dealer` keys remain as aliases that return `{ suites: [], prefix: 'ad-', firestoreVertical: 'unassigned' }` — this ensures existing API callers don't break while the vertical is being retired. Remove both aliases in a subsequent PR after confirming no active traffic.
- No `auto-in-a-box` bundle ever existed; no subscriber migration needed.

**Verification required before marking done:** Confirm in `index.js` that both `auto_dealer` and `auto-dealer` keys exist in `getVerticalConfig`. The red team flagged the "already handled" claim in the original draft as asserted, not verified. Do not mark this Fix as complete until the map is read and both entries confirmed present.

---

## Fix 3 — Suite count contradicts R1's own cap (§2.2 + §6/R1)

**Error:** §2.2 lists 12 RE suites (Investment, Finance, Legal, Insurance, Construction, Design, Entitlement, Marketing, Brokerage, Operations, Property Management, Permitting). R1's mitigation says "cap to ~10 per vertical." The doc violates its own stated mitigation in the same document.

**Resolution:** The cap is a GUIDANCE ceiling, not a hard constraint — the right behavior is to hold the line at 10 active suites (no new suites without consolidating an existing one) and treat the 2 overflow entries as reserved/future rather than active catalog entries today.

**Corrected §2.2 preamble:**
> Real Estate suites — 10 active, 2 reserved. New suites require consolidating an existing entry first (guidance ceiling = 10 active per vertical).

**Active (10):** Investment, Finance, Legal, Insurance, Construction, Design, Entitlement, Marketing, Operations, Property Management

**Reserved (not yet active in catalog):** Brokerage, Permitting — these will be promoted when workers exist that genuinely require a distinct suite. Until then, workers that might sit in Brokerage map to Marketing or Legal; workers in Permitting map to Legal or Entitlement.

---

## Fix 4 — Accepts/emits mismatch between §4.2 and §5 (BLOCKING)

**Error:** §4.2's sibling injection template lists one accepted input shape per worker. §5's bundle-shape table shows every worker is a multi-shape consumer. The sibling injection, as written, will propose roughly 20% of the valid handoffs. This directly breaks the feature's stated purpose.

**Also resolves:** The red team noted that §5 lists `site-recon-001` as a producer of `parcel-bundle/v1`, but §4.2 says it only emits `site-recon-bundle/v1`. Resolution: `site-recon-001` produces BOTH — it enriches the incoming parcel data and re-emits an enriched `parcel-bundle/v1` (so downstream workers like Title Abstract can use it as a valid parcel input), AND it produces `site-recon-bundle/v1` which includes the additional physical site data (photos, conditions, comps). Two outputs, one worker.

**Corrected §4.2 sibling injection template:**

```
SIBLING WORKERS IN THIS VERTICAL (RE):
Workers are listed with ALL inputs they can consume and ALL outputs they produce.
When your output matches another worker's accepted input, propose the handoff.

- CRE Analyst (cre-analyst)
  accepts: address + deal terms, site-recon-bundle/v1, legal-opinion-bundle/v1,
           zoning-bundle/v1, feasibility-roadmap/v1
  emits:   parcel-bundle/v1

- Site Recon (site-recon-001)
  accepts: parcel-bundle/v1
  emits:   parcel-bundle/v1 (enriched with physical site data),
           site-recon-bundle/v1 (photos, conditions, comps)

- Title Abstract (title-abstract-001)
  accepts: parcel-bundle/v1
  emits:   title-abstract-bundle/v1

- Land Use Attorney (law-landuse-001)
  accepts: parcel-bundle/v1, title-abstract-bundle/v1
  emits:   legal-opinion-bundle/v1

- Zoning + Entitlement (zoning-001)
  accepts: parcel-bundle/v1
  emits:   zoning-bundle/v1

- Market & Feasibility (feasibility-001)
  accepts: parcel-bundle/v1, site-recon-bundle/v1,
           legal-opinion-bundle/v1, zoning-bundle/v1
  emits:   feasibility-roadmap/v1

- RE Brokerage Marketing (re-marketing-001)
  accepts: address (direct), title-abstract-bundle/v1
  emits:   listing-readiness/v1 (terminal — user-facing)

SIBLING RULE: When your output matches another worker's accepted input, say:
"Want me to pass this to [Worker Name] to [next action]? I can describe
what to bring — you or Alex can open it from there."
Never say "go to the other tab." Never imply a handoff has already happened.
Phase 1 is suggestion-only — name the next worker, describe what it needs,
stop there. No auto-execution. The user navigates; Alex routes.
```

**Also resolves the "awareness vs. action" gap (see Fix 7):** The phrase "Phase 1 is suggestion-only" is now in the injection template itself, so the model knows its role.

---

## Fix 5 — R4 mitigation is a warning, not a gate (§6/R4)

**Error:** R4's mitigation says "add a validation step that checks `vertical` against the known vertical list and **warns** if it's missing or non-canonical." Given that §1 opens with three real-world examples of this drift already having happened in production, a warning is too soft for a CANONICAL spec.

**Corrected R4 mitigation:**
> The worker-publish path (`/v1/worker:publish`, sandbox publish) performs a validation check against the canonical vertical list. If `vertical` is missing, not in the canonical list, or uses the wrong delimiter convention (underscore vs. hyphen), **the publish is blocked with an explicit error** — not warned. The author must correct the field before the worker becomes visible in the catalog.
>
> **Whitelisted values (canonical + staging):** `real-estate`, `aviation`, `education`, `healthcare`, `finance`, `platform`, and **`unassigned`**. The value `unassigned` is explicitly valid — it is the correct home for open-world creator workers that don't yet belong to a defined vertical (see CODEX-22 §2). Blocking on `unassigned` would defeat the entire purpose of the staging zone.
>
> The canonical list is the `getVerticalConfig` map in `index.js` — that map is the single source of truth. Adding a new named vertical requires updating that map in a deliberate code change, not a Firestore field tweak.

---

## Fix 6 — R6 Foundation check is a weak proxy (§6/R6)

**Error:** R6's mitigation says "if `platform-control-center-pro` is not subscribed, auto-subscribe Foundation first." Full Foundation = Spine (5 workers) + Vault + Drive. A partial provisioning failure (Alex subscribed, Vault write path never initialized) passes this check while leaving the user with the exact broken experience R6 is trying to prevent.

**Corrected R6 mitigation:**
> Foundation provisioning writes a single atomic flag: `foundationProvisioned: true` on `users/{uid}/workspaces/{tenantId}` — set only after ALL of the following succeed in a batch write: (1) all 5 Spine worker subscriptions created, (2) Vault initialized (first `dtcs` or `logbookEntries` write path verified), (3) Drive connector record created (even if unconnected). The bundle:subscribe endpoint gates on `foundationProvisioned === true`, not on the presence of any single subscription record. If Foundation provisioning fails partway through, it retries — it does not mark itself as done.

---

## Fix 7 — Sibling spec defines awareness but not action (§4)

**Error:** §4 tells the worker to say "Want me to pass this to X?" but specifies no corresponding tool. When the user says "yes" — nothing fires. The spec builds the suggestion half and leaves the execution half undefined.

**Resolution — Phase 1 is explicitly suggestion-only (by design):**
> This is intentional and consistent with the broader SOCIII principle: workers propose, users confirm, platform executes. Phase 1 sibling communication = the worker names the handoff and stops. The user then manually navigates to the sibling worker, or asks Alex to navigate for them (Alex already has full catalog awareness via `_workerCatalogCtx`). A `propose_handoff` tool enabling automated navigation will be specified in a future CODEX when the execution surface is designed. Until then: the sibling injection template includes "Phase 1 is suggestion-only" so the model does not attempt to act unilaterally.

Add to §4.3 Implementation Location:
> **Do not** wire an execution path for sibling handoffs in Phase 1. Suggestion-only. If a `propose_handoff` tool is added in a future phase, it must go through the same user-approval gate as all other consequential actions.

---

## Fix 8 — Sibling query must filter by tenant entitlement (§4.3)

**Error:** §4.3 says the sibling list is built from `digitalWorkers where vertical == dw.vertical and slug != workerSlug`. This is a global catalog query. If a marketplace/creator worker is tagged with `vertical: "real-estate"`, it appears in the sibling injection for every RE tenant — even tenants that haven't subscribed to it. The model would propose handoffs to workers the tenant doesn't own.

**Corrected §4.3 query:**
```
// Step 1: Get tenant's subscribed worker slugs
const tenantSubs = await db.collection("subscriptions")
  .where("ownerId", "==", tenantId)
  .where("trialStatus", "in", ACTIVE_STATUSES)
  .get();
const subscribedSlugs = new Set(tenantSubs.docs.map(d => d.data().workerId));

// Step 2: Get vertical + suite siblings from global catalog
// Filter by both vertical AND suite — a business professor's worker
// (education/Professional Development) should not see nursing-ce-001
// (education/Licensing & CE) as a sibling. Suite isolation within a
// vertical is what makes cross-vertical suites safe. (CODEX-22 R5)
const siblings = await db.collection("digitalWorkers")
  .where("vertical", "==", dw.vertical)
  .where("suite", "==", dw.suite)
  .where("status", "==", "active")
  .get();

// Step 3: Filter to only workers the tenant actually owns
const entitledSiblings = siblings.docs
  .filter(d => d.id !== workerSlug && subscribedSlugs.has(d.id));
```
This is a no-op under the current all-or-nothing bundle model (if you have RE in a Box, you have all of them), but it's correct-by-construction and doesn't become a silent gap if partial-bundle or marketplace workers are introduced later.

---

## Fix 9 — No backfill for existing bundle subscribers when a worker is added (§3.2)

**Error:** §3.2 says "when a new worker is added to a vertical, add it to the bundle immediately" — but this only affects NEW subscriptions. Existing tenants who subscribed to `re-in-a-box` before `re-marketing-001` existed don't get it. `re-marketing-001` itself is a live example of this gap.

**Added to §3.2:**
> **Backfill requirement:** Whenever a new worker is added to a bundle definition, a migration script must run that grants the new worker to all existing tenants subscribed to that bundle. Script template: query `subscriptions` where `bundleId == "<bundle-id>" and trialStatus in ACTIVE_STATUSES`, then for each tenant, call the same subscribe logic (skip-if-already-subscribed, skip-if-paid). Log the diff. This must run before or concurrent with the code deploy that adds the worker to the BUNDLES constant — never after a gap.

---

## Sign-off gate (Amendment A)

- [ ] §4.2 sibling injection template updated in implementation — accepts/emits lists are complete, not single-shape
- [ ] Sibling injection SIBLING RULE text does not use "Alex will route it" or any phrase implying automated execution — suggestion-only language confirmed
- [ ] Auto-dealer retirement migration script run — all `auto_dealer`/`auto-dealer` vertical docs moved to `unassigned`; `getVerticalConfig` aliases verified present in `index.js` (not asserted, actually read)
- [ ] Publish path blocks (not warns) on invalid/missing `vertical` field
- [ ] `unassigned` is explicitly whitelisted in publish-path validation — creator workers can publish to `unassigned` without being blocked
- [ ] `foundationProvisioned` flag written atomically after Spine + Vault + Drive all succeed
- [ ] Sibling query filters by BOTH `vertical` AND `suite` — cross-suite isolation confirmed
- [ ] Sibling query additionally filters by tenant entitlement (subscribed slugs)
- [ ] Phase 1 suggestion-only statement is in the sibling injection template
- [ ] Backfill script exists and ran for `re-marketing-001` (already done 2026-07-07); process documented for future additions
- [ ] RE suite count: 10 active, 2 reserved — no new active suites without consolidating an existing one
