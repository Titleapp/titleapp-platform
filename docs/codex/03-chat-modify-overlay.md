# CODEX Surface 3 — Chat-Modify / Alex-dispatches-Code (the Salesforce moment)

**Status:** 🟡 pieces exist, round-trip not assembled · **depends on Surface 1** · 2026-06-22
**Why it matters (Sean, CRITICAL):** a U-of-H professor chats with Alex — "the eval worker keeps
doing X wrong" — Alex dispatches a Code change, previews it, brings it back: "fixed — approve?";
professor approves → deployed. **Fast iteration IS the bulletproofing, AND it's what makes clients
love it.** It's the answer to "you can't use SOCIII unless you live in Terminal."

---

## Objective
A client modifies **their** worker by **talking to Alex** — no terminal. Alex dispatches a
Code change (hosted, cloud-sandboxed per tenant), previews it, round-trips it home for explicit
approval, and on approval it deploys — and becomes an **append-only record**.

## What's built vs. the gap (audit 2026-06-22)
**Built:** the `/v1` API, the RAAS engine, worker config docs, and — critically — the per-tenant
worker tree `tenants/{tid}/workers/{id}` that an overlay edit would write to (Surface 1 T1).
The capability *primitives* exist.

**The gap:** the round-trip itself (chat → dispatch → preview → approve-home → deploy) is **not
assembled**. And it is **unsafe until Surface 1 lands** — today a "fix my worker" edit writes the
never-read tenant doc while runtime serves global, so the fix would appear to do nothing, OR a
publish would change the worker for everyone (R2). **Surface 1 is a hard dependency.**

## Scope for the 100 days (Sean)
**Per-client isolation by separation** — the change targets *that tenant's* overlay doc only. No
shared-base-with-sandboxed-overlay-at-scale yet (that's Tier-2, deferred, §4 of 100-DAY). Build
the *capability* now against one tenant's worker; harden for thousands later.

## Turn-on tasks
- [ ] **T0 — (dependency)** Surface 1 T1+T2 done: runtime reads tenant-first, writes gated.
- [ ] **T1 — Dispatch primitive.** Alex can emit a structured "proposed change" to a worker's
      config/rules targeting `tenants/{tid}/workers/{slug}` (NOT global).
- [ ] **T2 — Preview.** Render the diff/result in the canvas before anything is live.
- [ ] **T3 — Approve-home.** The change round-trips to the client's workspace as a pending item;
      nothing deploys without explicit approval (the consent gate — CLAUDE.md invariant).
- [ ] **T4 — Deploy + record.** On approval: write the tenant overlay + append an audit event
      (actor, tenant, before/after, verdict) — ties to Surface 4.
- [ ] **T5 — Rollback.** Every change is reversible (append-only → revert = new event).

## RED TEAM
- 🔴 **RT1 — Ships before Surface 1 → R2 disaster.** A client "fixes" their worker and changes
  everyone's, or it silently no-ops. **Mitigation:** T0 gate is hard; do not build T1+ until
  Surface 1's cross-tenant suite is green.
- 🔴 **RT2 — Chat-dispatched Code is an arbitrary-code-execution / prompt-injection surface.** A
  malicious or confused prompt edits rules to weaken safety. **Mitigation:** changes are
  **config/rules-data only**, not arbitrary code, in v1; every change passes the rules engine +
  the human approval gate; sandboxed per tenant; fully logged + reversible.
- 🟠 **RT3 — "Approve" theater.** If the diff is unreadable, approval is rubber-stamping.
  **Mitigation:** T2 preview must show plain-English "what changes for your customers," not a raw
  JSON diff (Trump Rule).
- 🟠 **RT4 — Scope creep into the hosted-agent-at-scale dream.** **Mitigation:** v1 is one tenant,
  config-only, manual-ish. The at-scale version is a vision CODEX + patent, not this build.
- 🟡 **RT5 — Deploy reliability.** A bad change bricks a client's worker mid-class. **Mitigation:**
  T5 rollback + preview-before-live; never auto-deploy.

## Sign-off gate
Surface 1 green first. Then: config-only changes, rules-engine-checked, preview + explicit
approval + append-only record + one-click rollback — demonstrated end-to-end on one tenant.
