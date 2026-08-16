# CODEX S52.52 — RAAS Admin Module: Content Management, Audit Trail, Expiration (Scope Only — Not Yet Built)

**Status:** SCOPED (2026-08-16), not built. Written up at Sean's request after he asked how Studio Locker documents actually get updated, mid-DPP-demo with Elise.
**Author:** Sean Lee Combs + Claude Code
**Predecessor:** CODEX-S52.48 (established `constraintRaasModules` as the canonical admin-rules system), S52.49 (rolled RAAS content out to 4 more workers, all still script/API-authored), S52.50 (DPP report pipeline — surfaced the same "no admin path" gap for a different vertical).

---

## Why this exists

Studio Locker's "Worker Libraries" panel is labeled **READ-ONLY** in the product today, and that label is accurate in a way that's actually a problem: there is no admin path anywhere in either app to create or edit a `constraintRaasModules` document. The backend has a complete CRUD API (`/v1/admin:raas:module:create/update/transition/counsel/section:add/update/remove/list/get/compose`, all in `functions/functions/services/raas/constraintModules.js` + routes in `index.js` ~16663-16800), but zero frontend surface calls any of it. Today the only way to add rules content is what happened for Max's GAAP module: a one-off Node script, run by hand, by an engineer.

That doesn't scale. S52.49 rolled the query-tool pattern out to Contacts/Marketing/IR but left their RAAS content as thin placeholder docs (625/715/853 chars) because there's no way for a non-engineer — Sean, or a domain expert like Elise for DPP — to actually author real content. This spec fixes the access path, not the content itself.

## What already exists to build on

- **Full CRUD service layer** (`constraintModules.js`): `createModule`, `updateModule`, `addSection`, `updateSection`, `removeSection`, `transition`, `markCounselReviewed`, `composePromptText` (live preview), `listModules`, `getModule`. Nothing here needs rebuilding — the admin UI is a client for what's already there.
- **A real state machine**: `draft → review → live → deprecated`, one-way except draft↔review during authoring, deprecated→draft as a rollback path. A live module cannot be edited directly — it must drop back to draft first. This is a decent safeguard already; the gap is that nothing exposes it.
- **A counsel-review gate**: `counsel_review: {required, reviewer, reviewedAt, approval_notes}` — a module cannot go live without it. This is chain-of-command at the whole-module level already.
- **A half-wired staleness hook**: every module has `notice_window_days` (defaults to 7) and `last_propagated_at` — fields clearly intended for an expiration/review-reminder mechanism that was never finished. Nothing reads or enforces these today.
- **Per-section `source_refs`** — a place to cite where a rule came from (a regulation, a URL, an internal SOP), already in the schema, currently just an unstructured array.

## What's missing — real gaps

- **No UI at all.** Not "needs polish" — genuinely zero frontend code calls the admin routes.
- **No audit history.** Mutations only carry `updatedBy`/`updatedAt` on the module doc itself — last-write-wins, no record of what changed or from what. This is inconsistent with the platform's own core invariant (CLAUDE.md: "Records are never overwritten; state is computed from event history") — every other canonical collection in this system is append-only, and this one currently isn't.
- **No per-section expiration.** `notice_window_days` is module-level and unenforced. A section sourced from an external regulation that changes and a section sourced from timeless internal SOP shouldn't share one staleness clock — and right now neither has one that does anything.
- **No distinct approval step for web-link sources.** `markCounselReviewed` is the same action whether the reviewer wrote the rule themselves or is approving a rule derived from a URL they may not have actually opened. Approving a web-link-sourced rule should require confirming the *fetched content*, not just clicking approve on the reviewer's own recollection of what the page said.

## Proposed shape (for review, not yet built)

### 1. Admin UI — `apps/admin`, new page (e.g. `RaasModuleAdmin.jsx`)
- List view: all modules, status, domain, section_count, last_propagated_at, notice_window_days, a "needs review" flag (see #3).
- Create module form: moduleId, name, description, domain, jurisdiction_scope, disposition_default.
- Edit view (draft state only, enforced by the existing state machine — no new logic needed): add/edit/remove sections — title, body_markdown, priority, section_type, disposition_override, source_refs (plain citation text or a URL).
- Live preview of the composed prompt text before publishing, using the already-existing `/v1/admin:raas:module:compose` route — so an admin sees exactly what a worker will receive, not just the raw sections.
- Counsel-review action: reviewer name + approval notes, gated the same way `markCounselReviewed` already requires.
- Transition buttons respecting `ALLOWED_TRANSITIONS` as-is.

### 2. Audit history — new `constraintRaasModules/{id}/history/{entryId}` subcollection
- Append-only, one entry per mutation: action type, actor uid, full before/after doc snapshot (simpler and safer than a computed diff, consistent with the append-only pattern used elsewhere in this codebase), timestamp.
- Every existing service function (`createModule`, `updateModule`, `addSection`, `updateSection`, `removeSection`, `transition`, `markCounselReviewed`) gets a matching history-write, in the same transaction where the existing code already uses one.
- This is additive to the existing functions, not a rewrite — same call sites, one more write each.

### 3. Expiration / staleness
- Add optional `review_by` (date) per-section, independent of the module-level `notice_window_days`.
- New scheduled function `raasContentStalenessCheck` (daily cron, same pattern as `regulatoryIngestDaily`/`checkTrialExpiry` already in this codebase): scans live modules for sections past `review_by`, sets a `needsReview: true` flag surfaced in the admin list view.
- For web-link-sourced sections: store a content snapshot/hash at approval time (`source_refs[].snapshotHash`, `snapshotAt`). If the live source page changes later, that's now a detectable, not silent, drift — the existing approval no longer implicitly covers content it never actually reviewed.
- This is the plumbing Sean's regulatory-webhook idea plugs into: once EU regulatory adapters are added to the existing (currently zero-consumer) `regulatoryIngestDaily` pipeline, a real regulation change can drive `needsReview` directly instead of a dumb calendar timer alone. Building those adapters is separate, content-side work (tracked with the DPP whitepaper effort) — this spec only builds the hook they plug into.

### 4. Stricter approval for web-link sources
- If a section's only `source_refs` entry is a URL (no accompanying human-written rule text beyond what was fetched), the admin UI requires the reviewer to view the fetched snapshot inline before the counsel-review action is enabled — not a blind approval-notes text box.

## Open decisions needing Sean's sign-off

- **Who gets access?** Admin-only (engineers/Sean) today, but RAAS content is meant to be counsel/founder-reviewed — as domain experts like Elise start contributing real content for their verticals, does "admin" need a role tier broader than engineering but narrower than full admin?
- **History storage cost** — full-snapshot-per-mutation is simple and safe but not free at scale. Fine to start with; revisit if module-edit volume grows.
- **Minimum approval-note length for web-link sources** — require at least one substantive line of human judgment, not just a rubber stamp? Proposing yes, flagging for confirmation.
- **Sequencing** — this can be built independently of S52.50 (DPP pipeline) and S52.51 (regulatory whitepaper content), but S52.51's actual authored content has nowhere real to live until this ships. Recommend this before S52.51's content gets written, so real Studio Locker docs replace the thin placeholders directly rather than going through another script.
