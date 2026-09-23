# CODEX 101 — Commitment Ledger

**Status:** Built and deployed 2026-09-22/23. Piece 2 of Sean's "Alex Staff Meeting, IT Worker & Autonomy Levels" concept (piece 3, Dev, shipped first — see `docs/codex/100-dev-worker-scope.md`; piece 1, the meeting chair, and piece 4, earned permission levels, are not built — see below).

**Sean's own framing, why this matters now:** "if the back of house can truly operate a business that's really great — especially since it's free, and we'll make data and get workers sold that way." The ledger is the thing that makes that claim checkable rather than a sales pitch — a real, queryable delivery track record per worker, not a vibe.

---

## The core rule

**Status must be backed by evidence, not self-report.** This is Sean's own spec, taken literally as a structural rule rather than a convention: a worker (or anything acting on its behalf) can open a commitment, mark it `in_progress`, report a blocker, or request verification with proposed evidence — but nothing can mark a commitment `done` directly. Completion is a separate code path (`verifyAndComplete`) that requires an accountable verifier: today, that's Sean specifically (the HTTP route is Sean-uid-only); the function signature also accepts an internal `system:`-prefixed verifier id for a future deterministic check (e.g. Dev or a task canary confirming real evidence), but no HTTP route exposes that path — only in-process backend code could ever call it that way, and nothing does yet.

Verified in testing: a direct attempt to self-report `done` throws, by design, not by convention.

## Data model

Event-sourced, matching this codebase's existing append-only pattern (`membershipEvents` from CODEX 98, `dtcs`/`logbookEntries`):

- `commitments/{id}` — fast-lookup current state: `tenantId`, `workerSlug`, `title`, `description`, `dueAtMs`/`dueAt`, `status`, `currentBlocker`, `evidence` (once done), `proposedEvidence` (while pending verification), `completedOnTime`, `createdBy`, timestamps.
- `commitmentEvents` — permanent, unedited history. Every transition appends one event: `created`, `status_changed`, `verification_requested`, `verified`, `expired`. This is where the actual track record lives, not the summary doc.

Statuses: `open → in_progress ⇄ blocked → pending_verification → done`, or `→ expired` from any non-terminal state if `dueAtMs` passes first. `done` and `expired` are terminal.

Evidence types (fixed enum, not free text — same discipline as CODEX 98's `purpose` field): `firestore_doc`, `canary_pass`, `deploy_confirmation`, `external_url`, `manual_note`.

## What's built

- `functions/functions/services/worker-team/commitmentLedger.js` — `createCommitment`, `updateProgress` (self-reportable: `in_progress`/`blocked` only), `requestVerification`, `verifyAndComplete` (the only path to `done`), `expireOverdueCommitments`, `getWorkerTrackRecord`.
- HTTP routes, all Sean-uid-only for now (his own internal ops tool, ahead of any meeting UI or per-worker autonomy that would call these programmatically): `POST /v1/commitments:create`, `:updateProgress`, `:requestVerification`, `:verify`, `GET /v1/commitments:trackRecord`.
- Scheduled sweep `exports.commitmentExpirySweep`, every 6h — anything overdue and not `done` becomes `expired`, visibly, rather than silently sitting in a stale state forever.
- Firestore composite indexes added (`firestore.indexes.json`) for the track-record query (`tenantId + workerSlug + createdAt`) and the expiry sweep (`status in [...] + dueAtMs <`).

**Verified live**, end to end, against production Firestore: create → self-report progress → blocker → **rejected** self-report of `done` → request verification → verify-and-complete (human path) → track record → overdue commitment correctly swept to `expired`. Test docs cleaned up after.

## `getWorkerTrackRecord` — the input piece 4 will need

Deterministic counts only, no LLM judgment: `done_on_time`, `done_late`, `expired`, `open`, `in_progress`, `blocked`, `pending_verification`, plus a `reliabilityRate` (on-time-or-late completions ÷ all closed commitments). This is the raw material for the future earned-permission-levels build (piece 4) — a worker's actual autonomy tier should read from here, not from a self-assessment.

Not yet tracked: a self-report-vs-verified mismatch rate (how often a worker's "I think I'm done" claim needed correction before verification actually passed) — `verifyAndComplete` doesn't currently have a rejection path, only an acceptance path. A natural v2 addition once there's real usage to design a rejection flow against, rather than guessing at one now.

## Ground-truth check before building this

The original pasted CODEX assumed "permission levels already exist in account settings." **Checked directly, not assumed: they don't.** `contracts/capabilities.json` governs which *human* roles (`owner_admin`, `admin_ops`, etc.) can call which API capabilities — a different axis entirely from a *worker's* task-level autonomy tier (Report → Recommend → Act-with-approval → Act-within-limits). A repo-wide grep for any existing autonomy-tier concept (`autonomyLevel`, `act-with-approval`, etc.) turned up nothing but false-positive substring matches inside minified frontend bundles. Piece 4 is a genuinely new build, not a wire-up of something dormant — worth knowing before scoping it, so it isn't underestimated the way this doc's own header describes CODEX 100 almost being.

## Explicit non-goals for this pass

- No automated evidence *validation* (e.g., actually fetching an `external_url` to confirm it returns 200, or checking a `firestore_doc` ref actually exists and says what it claims). `verifyAndComplete` records who vouched for the evidence and when — it does not itself inspect the evidence's truth. A human verifier is expected to have actually looked; an automated verifier doing real inspection is future scope once there's a concrete, justified check to write (parallels Dev's own "deterministic code, not a judge" discipline from CODEX 100).
- No caller-identity enforcement on `createdBy`/`actor` beyond what the HTTP layer already checks (Sean-only route access) — these are free-text fields today. Worth tightening once more than one trusted internal surface calls this.
- No wiring to the meeting UI or to per-worker autonomy tiers — both explicitly out of scope for this piece, per the same "interface exists, meeting-agnostic" principle CODEX 100 used for `devFindings`.

## Open, not built

- Piece 1 (Alex as meeting chair / shared multi-worker session) — still the hardest real gap: worker chat sessions are hard-isolated per (uid, tenantId, workerSlug), enforced server-side, with no shared multi-worker conversation surface today. Needs its own scoping/estimation pass before a demo date is committed to, per the standing note in `project_worker_team_staff_meeting_dev` memory.
- Piece 4 (earned permission levels) — real build, not a wire-up (see Ground-truth check above). Depends on this ledger having actual usage/history to earn a tier from.
- A rejection path for `verifyAndComplete` (evidence submitted but not accepted) — noted above.
- Caller-identity enforcement tightening once this has more than one trusted internal caller.
