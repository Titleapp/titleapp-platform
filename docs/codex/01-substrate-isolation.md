# CODEX Surface 1 — Substrate & Isolation (R2)

**Status:** 🔴 gap confirmed — **the keystone.** · **Owner:** Sean · **Created:** 2026-06-22
**Bar:** Tier-1 — 50 educators @ U of H · 350 Medtronic distributors. "This shit has to work."

> This is the first thing to turn on. R2 blocks the consumer portal (leakage), the
> Alex-fix-loop (fixes the wrong doc), and the whole "runs a university, not 4 nurses in a
> corner" promise. Everything downstream waits on this.

---

## Objective
When a tenant uses or edits "their" worker, it is **theirs** — isolated. No tenant can read or
write another tenant's worker, and editing one tenant's worker never changes anyone else's.

## What's built vs. the gap (audit 2026-06-22)

**Built & working:**
- Per-tenant worker store: `tenants/{tid}/workers/{id}` (the isolation target — already exists).
- Membership/role gate `enforceRoleGate()` (`middleware/membershipCheck.js:39`) — verifies
  `memberships` where `userId==uid AND tenantId==X AND status==active`. **Not spoofable when called.**
- 87 tenantId composite indexes; `raas.store.js` consistently tenant-scopes + verifies file ownership.

**The gaps (3, ranked):**
1. 🔴 **Runtime serves the GLOBAL doc.** Chat reads `digitalWorkers/{slug}` (`index.js:2499`,
   `apps/business/src/context/WorkerStateContext.jsx:43`); publish writes it globally
   (`index.js:9817`); tenant edits land in the **never-read** `tenants/{tid}/workers/{id}`
   (`index.js:11077`). Two parallel stores; the global one serves. → editing does nothing at
   runtime; publishing a shared slug changes it for everyone.
2. 🟠 **tenantId spoofable** on un-gated routes: `workers:list` (9578), `worker:update` (11073),
   `worker:settings` (9858/9874), `marketplace:publish` (9791) — no `enforceRoleGate`. One header
   = read/write another org's worker tree.
3. 🟠 **Rules don't enforce tenant isolation.** `firestore.rules` lets any authed user read all
   `memberships` (89-104) + `tenants`; org-only runtime gate (`index.js:2508`) **fail-OPENS** on error.

## Turn-on tasks (bite-size, ordered)
- [x] **T1 — Per-tenant worker overlay at runtime.** ✅ **BUILT 2026-06-22** (Sean overrode the
      P5 deferral — the real-time Alex fix-loop depends on it). Sparse overlay at
      `tenants/{tid}/workerOverlays/{slug}` merged over the global base in the worker-chat path
      (`index.js` ~2532); overlaid rules + system prompt + behavior win, **protected**
      identity/security/billing fields always come from base (verified: an overlay cannot change
      `ownerTenantId`/`visibility`/`creditCost`). No overlay → base unchanged (safe fallback).
      New module `services/workerOverlay.js` (getWorkerOverlay/mergeOverlay/sanitizeOverlayWrite +
      PROTECTED_WORKER_FIELDS). Write seam (what Surface 3 calls): `POST /worker:overlay:set`
      (append-only history + audit event), `GET /worker:overlay`, `POST /worker:overlay:clear`
      (rollback) — all membership-gated. **Frontend canvas presentation-overlay = follow-up slice
      (T1b)**; backend behavior overlay is the valuable core and is what the fix-loop needs.
- [x] **T2 — Gate the spoofable routes.** ✅ **DONE 2026-06-22.** Discovery: the spoofable
      surface was **~17 routes**, not the 4 the audit named — the entire `worker1:*` build
      pipeline + `worker:export`/`test:*`/`version:increment`/`connectors:*` all trusted
      `body.tenantId`. Closed with **one central membership gate** at the dispatcher
      (`index.js:8262`, `TENANT_WORKER_ROUTES` allowlist) calling the existing
      `rejectIfRoleInsufficient` — member for all, **admin** for `marketplace:publish` (writes
      the global catalog). Personal contexts short-circuit; null tenantId skips. `/chat:message`
      excluded (already gated on the worker-chat path, `index.js:2543`). Coverage cross-checked:
      every tenant-tree route is now gated.
- [x] **T3 — Cross-tenant test.** ✅ **PASSED LIVE 2026-06-22** against the deployed API.
      `scripts/test/r2CrossTenant.js` seeds two tenants/users (A∈tenantA, B∈tenantB, A∉tenantB),
      mints real ID tokens (email/password via Identity Toolkit), and asserts: member edits own
      overlay → 200; **non-member edits other tenant's overlay → 403**; non-member lists other
      tenant's workers → 403; A's overlay exists only in A's space (B sees null); rollback → 200.
      **6 passed, 0 failed.** Self-cleaning. Re-runnable as a regression check.
- [x] **T4 — Tighten rules.** ✅ **DONE 2026-06-22.** `memberships` → own-or-admin only (was
      world-readable to any authed user — membership enumeration); `tenants` → `isAdmin()`
      (only the admin console reads it via client SDK; business surfaces use the API). Easy
      rollback noted in-rule if a non-admin client read surfaces.
- [x] **T5 — Fail-CLOSED the org-only gate** (`index.js:2519`). ✅ **DONE 2026-06-22.** A
      transient lookup error on a confidential (`visibility:"organization"`) worker now **denies**
      instead of leaking it.
- [ ] **T6 — Kill/justify the silent admin auto-create** (`index.js:605-619`). 🟢 low-priority:
      it only self-grants admin on the caller's *own* `ws_` workspace doc (not cross-tenant), so
      it's defensible today; revisit if workspace docs are ever shared.

## What shipped (2026-06-22) — DEPLOYED ✅
- `functions/functions/index.js` — central tenant-membership gate (~8262) covering 20 routes;
  fail-closed confidential gate (~2519); per-tenant overlay merge in the worker-chat path
  (~2532) + system-prompt overlay precedence; 3 overlay endpoints (set/get/clear).
- `functions/functions/services/workerOverlay.js` — overlay resolver + protected-field guard.
- `firestore.rules` — `memberships` own-or-admin; `tenants` admin-only.
- `functions/functions/.gcloudignore` + moved 153MB pc12 baseline PDF out of the deploy tree
  (it had silently bloated the package to 147MB and broken every upload).
- `functions/functions/scripts/test/r2CrossTenant.js` — the live regression test (6/6 green).
- **Deployed** `functions:api` + `firestore:rules` to `title-app-alpha` and verified live.
  Not yet committed to git (on `main` — branch first).

## RED TEAM
- 🔴 **RT1 — Migrating the read path breaks live workers.** Today everything reads global; flipping
  to tenant-first with no per-tenant doc seeded = empty workers. **Mitigation:** fallback-to-base
  in T1 (tenant doc OR global base); backfill per-tenant docs lazily on first edit; ship behind a flag.
- 🔴 **RT2 — We "fix" reads but writes still hit global.** If publish keeps writing
  `digitalWorkers/{slug}` while reads go tenant-first, edits silently diverge. **Mitigation:** T1
  and the write path ship together; publish writes the tenant overlay, base only on explicit
  "publish to catalog."
- 🟠 **RT3 — Gating routes breaks the demo/seed scripts** that set `x-tenant-id` freely.
  **Mitigation:** run T3 against seed flows; give seeds a service path, not a spoofed header.
- 🟠 **RT4 — Shared base updates still leak.** Even with overlays, a base-worker change propagates to
  every tenant that hasn't overridden that field. That's *correct* (it's a base), but must be
  **intended + logged**. **Mitigation:** base edits are a deliberate, audited action (Surface 4).
- 🟡 **RT5 — Scale assumption.** Audit says hundreds of seats is fine, but the chat path does
  ~5 sequential reads/message uncached. **Mitigation:** memoize base worker doc + system prompt
  (rarely change); re-check at 350 concurrent before U of H go-live.

## Sign-off gate
T1–T3 done + cross-tenant suite green **before** any surface that touches real client data
(consumer portal, Alex-fix-loop, client onboarding) ships.
