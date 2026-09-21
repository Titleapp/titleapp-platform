# CODEX 98 — Append-Only, Anchored Audit Trail for Permissions, Signups, and Access

**Status:** Design decided for the consent model; audit-trail build started (membership events) 2026-09-21. Split out of CODEX 97, which is about worker-team/comms architecture — this is a foundational Vault/identity-integrity topic that surfaced during the same session's security audit but belongs on its own.

**Sean, 2026-09-21:** "I guess the other thing is this all is pushing to the blockchain based audit trail. Especially sign ups, access, permissions. That would seem to require immutable audit with append logbook entries vs something just handled in Firestore."

---

## The gap, confirmed rather than assumed

A targeted check found: **`memberships.status` (who has access) is mutated in place today**, with only an `updatedAt` timestamp — no record of what it changed from, when, or who triggered it. There is no endpoint anywhere that changes a member's `role` after creation either — role grants happen today via direct Firestore writes or admin scripts, entirely outside any application-level audit trail. This matters more than an ordinary bug because it's the layer everything else — including the consent model below, and every tenant-scoping fix made earlier this session — depends on being trustworthy. If a permission grant can be silently rewritten with no trace, so can a fake consent approval.

## The right fix reuses infrastructure that already exists

DTCs already get exactly this treatment: a SHA-256 `contentHash` computed at creation (`services/anchor/hashAnchor.js`, CODEX 50.14 Layer A), batched daily into a Merkle tree and anchored to Bitcoin via OpenTimestamps (`services/anchor/dailyBatchAnchor.js`, CODEX 50.14 Layer B — `dtcAnchorBatches/{YYYY-MM-DD}`, gathering DTCs with `batchId == null`). This is not "every write is its own blockchain transaction" — it's hash-and-batch, already running, already cheap. The fix is to widen what feeds an *anchor pipeline*, not invent a new one.

**Design decision: a separate, parallel batch job, not a modification to `dailyBatchAnchor.js` itself.** The existing DTC anchoring pipeline is live production infrastructure for real, already-anchored records — extending it in place risks a mistake touching DTC anchoring itself. A sibling job (same Merkle/OTS primitives, its own batch collection) gets the same tamper-evidence without touching what already works.

## What needs to become append-only + anchored

1. **Membership/role/status changes** — `membershipEvents`: `{ membershipId, uid, tenantId, changeType, fromValue, toValue, changedBy, changedAt, contentHash }`, same shape as `logbookEntries` relative to `dtcs`. The `memberships` doc stays the fast-lookup current state; the event log becomes the actual source of truth.
2. **Sign-up/account-creation events** — already timestamped, not yet hash-anchored. Same treatment, same reason.
3. **Actual access events** (who *viewed* a sensitive record, distinct from who's *permitted* to) — does not appear to exist at the application level at all today. Matters most for FERPA-type contexts, where "who accessed this record" is often its own explicit requirement, separate from authorization. Largest lift of the three — needs instrumentation across every sensitive read route, not just the mutation sites.

## Build status

- [x] **`membershipEvents` collection + writes at the two existing `memberships.status` mutation sites, plus their `created` branches** (`index.js` — the investor terms-acceptance flow and the tenant-join flow; `services/anchor/membershipEvents.js`) — shipped 2026-09-21, additive only, does not change existing behavior or remove the summary-doc update. `contentHash` computed via the same `sha256`/canonicalization pattern as `hashAnchor.js`, `batchId: null` so it's ready for a future batch-anchor job.
- [ ] **Three more `memberships.add()` sites still need the same `created`-event treatment** — `index.js:739`, `1145`, `11924` (found during this pass, not yet wired). Deliberately not touched blind in the same pass as the two above — same fix, just needs its own careful look at each call site's available context before extending.
- [ ] A sibling daily batch-anchor job for `membershipEvents` (own batch collection, e.g. `membershipEventAnchorBatches/{date}`), reusing `buildMerkle`/OTS submission from `dailyBatchAnchor.js` without modifying that file.
- [ ] A real "change a member's role" endpoint that itself writes a `membershipEvents` entry — closes the "role grants happen via ad hoc scripts with no audit trail" gap directly, not just the status field.
- [ ] Sign-up event hash-anchoring.
- [ ] Access-event logging (who viewed what, when) — needs a decision on which routes are in scope (start with FERPA/regulated-data routes: `nurse-edu:students`, `edu:evaluations`, cap tables, DTC reads) before instrumenting broadly.

## Relationship to CODEX 97's cross-tenant consent model

Moved here from CODEX 97 in full, since it's the same underlying capability (a trustworthy identity/access layer), not a worker-comms topic:

**The rule:** a person's own data may unify across tenants/institutions *only* when the person has explicitly authorized that specific relationship — never silently, never by default, never inferred from an old, differently-scoped authorization.

1. **Deny by default, always.** No response to an access request means denied, not approved — fail-safe, not fail-open. This is the actual fix already shipped for `pilotCurrency.js` (Dispatch checking a crew member, and self-view) and `clinicalEvaluation.js`'s third-party view: scope to the current/requesting tenant only until a real consent mechanism exists.
2. **Consent is scoped narrowly: (person, data type, granting tenant/relationship, purpose) — never a blanket toggle.** This is what makes a student-later-becomes-employee scenario self-enforcing: "share my nursing records with Clearwater Nursing's instructors, for coursework evaluation" does not match a later request from an unrelated employer — no matching key, no access, forced to ask fresh.
3. **The nightmare scenario this has to survive:** a compromised or malicious institution masking an access request as routine, hoping the person waves it through without noticing. The mitigating design: **deny the requesting party, notify the actual person through a channel the requester cannot control or intercept, and require their explicit approval before anything is granted.** The notification must go through the person's own authenticated SOCIII session (already logged in, ideally MFA-backed) as the primary channel — email/SMS is a fallback notice only, never the approval mechanism itself, or a phished/intercepted link defeats the whole safeguard.
4. **The approval prompt must be transparent by design:** who is asking, what specifically they want, and why (if given).
5. **On approval, the person chooses "ask me every time" or "don't ask again for this exact relationship + purpose."** Either way, every actual access is logged permanently — silence applies to the notification, never to the record. (This is exactly the append-only access-event log described above — the consent model's audit trail *is* this doc's access-event log, same primitive.)
6. **Anomaly detection as a backstop.** If the same requesting tenant generates an unusual volume of these requests in a short window, that pattern itself should alert SOCIII.
7. **Scope, precisely:** applies only when the requesting tenant does *not* already have an established relationship with the person. Does not apply to an instructor/dispatcher already legitimately enrolled-with that person on their current tenant — that's the ordinary membership+role check (already fixed on `nurse-edu:students`), not a new-relationship consent event.

**Not yet built** — real, standalone feature (consent-record data model, notification/approval flow through an authenticated channel, anomaly detection). What's live today is the safe interim default (deny/scope-to-current-tenant) on the flagged functions, not the consent flow itself.
