# CODEX 68 — Studio Locker Architecture: Living Knowledge Substrate

**Status:** Draft v4 final — red-team rounds 1–4 applied  
**Priority:** P0 — prerequisite for all education, aviation, and compliance workers  
**Builds on:** CODEX 67 (Studio Locker as first-class nav space), CODEX 61 (Vault substrate), RAAS architecture (docs/PRODUCT.md)  
**Patch notes:** CODEX-68-patch-notes.md (round 1), CODEX-68-patch-notes-round-2.md (round 2), CODEX-68-patch-notes-round-3.md (round 3), CODEX-68-patch-notes-round-4.md (round 4)

---

## 1. The Problem

Studio Locker was introduced in CODEX 67 as a navigation space — a place for workers to store files. That framing is too narrow. The real problem it solves is this:

**RAAS without current knowledge is a liability.**

The rules engine tells the AI *how* to behave — constraints, validation, business logic, output format. But rules operate against facts. If the facts are stale — a regulation changed, a fee schedule was updated, a clinical standard was revised — the rules engine enforces correct procedure against wrong information. In regulated industries, that is not a neutral failure. It produces confident, well-structured, wrong answers with no caveat.

The Studio Locker is the mechanism that keeps RAAS current. Without it, RAAS is a constraint engine operating in an information vacuum. With it, RAAS becomes a constraint engine with:
- Domain-specific knowledge injected at the worker level
- Freshness guarantees on every document the AI acts on
- Standing research directives that govern when and how knowledge is refreshed
- A trust model: the AI knows what it knows, when it learned it, and when to stop trusting it

**This is the moat.** Not the UI, not the model provider, not the cloud vendor. The combination of append-only records (the patent), a rules engine (RAAS), and a living knowledge substrate (Studio Locker) is what makes a Digital Worker behave like a compliant professional rather than a confident guesser.

The creator sandbox currently ships workers without lockers. Every published worker without a locker is running RAAS in a vacuum. That is a product defect, not a missing feature.

---

## 2. The Four Document Types

Studio Locker documents are not a flat list of uploads. Every document belongs to one of four tiers, each with different trust semantics. The fourth tier — **unclassified** — is not an afterthought; it is the default state for any document whose provenance, accuracy, and currency has not yet been reviewed by a human against these semantics.

### Tier 0: Unclassified (migration default and provisional uploads)

**What they are:** Documents that have not been reviewed and tiered. This is the default state for all legacy locker documents migrated from before this schema, and for any document uploaded without an explicit tier assignment.

**Why this matters:** Defaulting unreviewed content to the most-trusted tier (Foundation) would invert the doc's own thesis. Unknown-provenance content should never be cited without caveat. Unclassified is the safe holding state until a human reviews it.

**Trust behavior:** Always caveat, regardless of age or content.
> `[UNCLASSIFIED]` — "This document has not been reviewed or classified. Treat as provisional. Do not act on it for consequential decisions without human verification."

**Lifecycle:** Unclassified documents are assigned a forced TTL at migration/upload time: `expiresAt = uploadDate + 30 days + random(0, 60 days)`. The per-document random offset is computed once at row-write time and stored in `expiresAt` — it is stable, not re-derived at query time. This spreads any batch migration across a 30–90 day window so that all documents in a cohort do not expire simultaneously on the same date.

**Post-expiry behavior for unclassified:** An unclassified document that passes its `expiresAt` does NOT enter the hard-block machinery. Hard-block is reserved for Living documents where a human explicitly set a TTL and it lapsed — that is a freshness failure. An unclassified document expiring is a classification failure: a human never reviewed it. Different failure mode, different consequence. Post-expiry unclassified documents stay in indefinite "always caveat" limbo — same `[UNCLASSIFIED]` behavior as before expiry, with an additional context injection note: "This document is overdue for review."

**Post-expiry nudge schedule (reminder-only — no block, no behavior change):**

| Days past expiresAt | Action |
|---|---|
| Day 0 | Badge changes yellow → orange; no notification sent |
| +30 days | First reminder to owner: "You have [N] unclassified documents overdue for review in [worker name]'s Studio Locker." |
| +60 days | Second reminder sent to the worker-level escalation contact (if configured in this worker's locker meta document); also notifies owner |
| +90 days through +150 days | Monthly reminder sent to owner; flagged in platform admin dashboard as stale unreviewed content |
| +180 days | Final notification: "This document will be auto-archived in 30 days unless you review, re-tier, or explicitly extend it." Tone changes from reminder to action-required. |
| +210 days | If no action taken, document `status` set to `archived`. Excluded from active context injection. Retained in Firestore. Owner notified of archival. Visible in locker's archived view. |

This schedule is reminder-only through +150 days. No document behavior changes. No hard-block. The AI continues to caveat `[UNCLASSIFIED — REVIEW OVERDUE]` as before. The +180-day step is "action required" — auto-archive is the consequence if ignored. "Auto-archived" is not deleted — excluded from active knowledge injection but retained for audit. The owner can un-archive at any time.

**Nav badge behavior:**
- Yellow badge: unclassified documents that are within their initial review window (uploaded but not yet tiered, not yet overdue)
- Orange badge: unclassified documents that have passed their `expiresAt` — review is overdue
- Both counts surface on the Studio Locker nav icon alongside the expired-doc red badge

The owner reviews and re-tiers each document — promoting it to Foundation, Living, or Directive — or deletes it. There is no auto-promotion.

---

### Tier 1: Foundation Documents

**What they are:** Core reference documents that define the worker's domain. Stable. Replaced only when a new version is officially issued. **No TTL.** The AI trusts these without caveat — but only after a human has explicitly classified them as Foundation, confirming provenance and fitness.

**Examples:**
- Aircraft POH / AFM (specific N-number)
- FAA Airman Certification Standards (ACS) for a certificate/rating
- Course SLO guide and clinical evaluation rubric
- Tanner Clinical Judgment Rubric
- DPP product specification
- Patent claims document

**Trust behavior:** Direct citation.
> `[CURRENT — FOUNDATION]` — "Per [document name] ([version if known], verified [date])..."

(See §3 for the composed tag format when `sourceForm` is distilled or structured-summary.)

**Versioning:** Foundation documents are never deleted on replacement — they are soft-deleted. When a new version is uploaded, the prior version receives `supersededAt: Timestamp` and `supersededBy: newDocId`. Superseded versions are excluded from active context injection but retained in Firestore indefinitely. Any Vault-anchored assessment or record that was created while a given locker version was active can reconstruct exactly what knowledge was in effect at that moment.

**Firestore fields:**
```
docType: "foundation"
version: string | null              // "Rev 4, 2026" or null
sourceAuthority: string | null      // "FAA", "UHMC Nursing Program", etc.
sourceForm: "verbatim" | "distilled" | "structured-summary"
supersededAt: Timestamp | null      // set when replaced
supersededBy: string | null         // docId of replacement
```

---

### Tier 2: Living Documents

**What they are:** Regulatory, statutory, or standards documents that change on a predictable schedule. They have a TTL. The AI knows when they expire and changes its behavior accordingly.

**Examples:**
- FAR Part 61 / 91 / 141 (regulatory amendments)
- AIM (Aeronautical Information Manual — updated twice yearly)
- State nursing board rules
- County recording fee schedules
- EU Battery Regulation implementing acts
- Illinois auto dealer licensing statutes
- California DRE regulations

**TTL model:**

| TTL remaining | AI behavior |
|---|---|
| > 20% of TTL | Use normally. Cite with date: "Per [doc] (verified [date])..." |
| < 20% of TTL ("expiring soon") | Caveat: "Note: this regulation was last verified [date]. Renewal due [date]. Verify before acting." |
| Expired | Refuse to act on this content without flagging it. Describe what was known as of last-verified date. Recommend refresh before proceeding. Do not proceed with any irreversible action. |
| Expired + **high-stakes action** | Hard block. "I cannot proceed — the regulation governing this action has expired. A workspace admin must refresh it before I can continue." (See §6 for high-stakes definition.) |

**Firestore fields:**
```
docType: "living"
ttlDays: number                     // 30 / 60 / 90 / 180 / 365
lastVerifiedAt: Timestamp
expiresAt: Timestamp                // computed: lastVerifiedAt + ttlDays
status: "current" | "expiring_soon" | "expired" | "needs_review" | null
needsReviewReason: "self_reported" | "spot_check_confirmed" | null
// null unless status is "needs_review". Drives escalation ladder behavior — see §2 Tier 3.
sourceUrl: string | null            // canonical source for re-pull
sourceForm: "verbatim" | "distilled" | "structured-summary"
refreshedBy: string                 // uid or "auto"
supersededAt: Timestamp | null
supersededBy: string | null
escalationContactOverrideEmail: string | null
// Optional per-document override. When set, escalation for this document routes to
// this address instead of the worker-level escalationContactEmail in meta.
// When null (default), falls back to the worker-level meta escalationContactEmail.
// v4 ships worker-level default only — this field is a P2 enhancement.
// Initial implementation should not surface per-document override UI.
```

Note: The default escalation contact is configured at the worker level in this worker's locker meta document (see §4 meta schema), not per document. A single consent confirmation at worker level covers all documents and directives in that worker's locker. The `escalationContactOverrideEmail` field above is available for exceptional per-document routing once the P2 enhancement is implemented.

---

### Tier 3: Research Directives

**What they are:** Standing instructions stored in the locker that govern how the worker maintains its own knowledge currency. Not documents — scheduled tasks that produce or update Living documents. The worker governs its own knowledge refresh cycle.

**Examples:**
- "Every 30 days, check the FAA NPRM feed for amendments to FAR Part 61 or ACS revisions. If found, flag affected quiz questions as under review and alert the CFI."
- "Every 90 days, verify current state nursing board rules. If any SLO-relevant standards have changed, alert instructor and mark affected rubric sections as pending review."
- "Quarterly, re-pull California county recording fee schedules. Replace the existing Living document and reset its TTL."

**A research directive is not a cron job.** It is an instruction the AI can execute in a conversation — "run the Part 61 check now" — or that can be triggered on a schedule. The result of running a directive is one of four states: `no_change`, `change_found`, `needs_review`, or `error`.

**Result state behavior:**

| Result | Meaning | Behavior |
|---|---|---|
| `no_change` | Check performed; source unchanged | `lastRunAt` updated; document TTL continues normally |
| `change_found` | Source has changed | Affected Living docs flagged for human review; owner alerted |
| `needs_review` | AI's confidence in its own check is below threshold (source format changed, ambiguous diff, parse error) | Owner alerted; document retains last-known status but gets a warning flag |
| `error` | Check could not be completed | Owner alerted immediately. If unacknowledged >7 days, document downgrades to `[EXPIRING SOON]`. If unacknowledged >14 days, downgrades to `[EXPIRED]`. |

**Spot-check mechanism:** The platform independently samples a random 10% of `no_change` directive results each month and runs a secondary verification pass. When a discrepancy is found, the platform immediately sets `status: "needs_review"` and `needsReviewReason: "spot_check_confirmed"` on the specific document — the document's context injection tag changes to `[NEEDS REVIEW — CONFIRMED]` without waiting for human action. The owner is alerted immediately with URGENT priority. See the needs-review escalation table below for the differentiated escalation ladder. The spot-check mechanism itself is an internal integrity check — not visible to the AI, not user-configurable.

**Needs-review escalation by reason:**

| needsReviewReason | Context tag | Owner alert | Escalation to worker-level contact (meta doc) | Hard-block for high-stakes |
|---|---|---|---|---|
| `self_reported` | `[NEEDS REVIEW]` | Standard alert | 72 hours after unacknowledged alert | No — standard ladder applies (7-day → expiring_soon, 14-day → expired) |
| `spot_check_confirmed` | `[NEEDS REVIEW — CONFIRMED]` | URGENT alert | 24 hours after unacknowledged alert | Yes — document treated as expired immediately for any high-stakes action |

**Directive cadence validation:** The validation only activates when `scheduleMaxDays` is a non-null number. Validation rule: "If `scheduleMaxDays` is non-null AND at least one document in `affectedDocIds` has a non-null `ttlDays` (i.e., is a Living document), then `scheduleMaxDays` must be ≤ the minimum `ttlDays` across those Living-tier documents only. Foundation documents (`ttlDays: null`) are excluded from the comparison. A directive that governs only Foundation documents is exempt from cadence validation entirely — same as a manual directive."

If a creator tries to create a directive with a looser automated schedule than its Living document targets' TTLs, the system blocks creation: "Directive schedule (365 days) is longer than the TTL of the Living documents it governs (90 days). Set a shorter schedule or extend the document TTL."

**Manual directive exemption:** `schedule: "manual"` sets `scheduleMaxDays: null` and is fully exempt from the cadence validation check. Manual directives are never blocked at creation time for schedule reasons. This exemption is unconditional — there is no edge case where a manual directive fails the schedule check.

**Escalation fallback:** If `alertRecipients` are unresponsive for 72 hours after an expiry or error alert (24 hours for `spot_check_confirmed`), the platform escalates to the worker-level escalation contact configured in this worker's locker meta document. For solo operators, this is a personal email outside the workspace. See §4 for the worker-level consent requirement. If no escalation contact is configured in the meta document and the TTL expires, the hard-block message includes a fallback: "Contact support@sociii.ai to request an emergency refresh."

**Escalation override:** A directive may specify `escalationContactOverrideEmail` to route escalation for that directive to a specific address instead of the worker-level default. When null (the default), the worker-level contact in meta is used. See §4.

**Firestore fields:**
```
docType: "directive"
schedule: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "manual"
scheduleMaxDays: number | null
// computed from schedule string: "monthly"=30, "quarterly"=90, etc.
// null when schedule is "manual". Null exempts directive from cadence validation.
// For automated schedules, validation compares against Living-tier affectedDocIds only;
// Foundation docs (ttlDays: null) are excluded from the comparison.
target: string                      // what to monitor — plain English + optional URL
action: string                      // what to do when a change is found
alertRecipients: string[]           // uids or roles to notify
lastRunAt: Timestamp | null
nextRunAt: Timestamp | null
lastResult: "no_change" | "change_found" | "needs_review" | "error" | null
lastResultConfidence: "high" | "medium" | "low" | null
lastResultDetail: string | null     // max 500 chars
affectedDocIds: string[]            // locker doc IDs this directive governs
escalationContactOverrideEmail: string | null
// Optional per-directive override. When set, escalation for this directive routes to
// this address instead of the worker-level escalationContactEmail in meta.
// When null (default), falls back to the worker-level meta escalationContactEmail.
// v4 ships worker-level default only — this field is a P2 enhancement.
// Initial implementation should not surface per-directive override UI.
```

Note: The default escalation contact is at the worker-level meta, not per directive. See §4. The `escalationContactOverrideEmail` field above is available for exceptional per-directive routing once the P2 enhancement is implemented.

---

## 3. The Trust Model

The AI's system prompt for any RAAS worker with a Studio Locker includes this instruction block (injected by `getLockerContext()`):

**Tag composition model:** Trust tags are built from two independent dimensions that compose:

- **Tier dimension** (always present): `FOUNDATION` | `LIVING — CURRENT` | `LIVING — EXPIRING SOON` | `LIVING — EXPIRED` | `UNCLASSIFIED` | `UNCLASSIFIED — REVIEW OVERDUE`
- **Form modifier** (only present when `sourceForm` is NOT verbatim, AND the document is not expired or flagged as needs-review): `DISTILLED` | `STRUCTURED-SUMMARY`

Combined tag format: `[TIER | FORM-MODIFIER]` — form modifier only appears when `sourceForm` is `distilled` or `structured-summary`. Verbatim documents get no modifier.

**Tag composition table:**

| Tier | sourceForm | Context injection tag |
|---|---|---|
| Foundation | verbatim | `[CURRENT — FOUNDATION]` |
| Foundation | distilled | `[CURRENT — FOUNDATION \| DISTILLED]` |
| Foundation | structured-summary | `[CURRENT — FOUNDATION \| STRUCTURED-SUMMARY]` |
| Living (current) | verbatim | `[LIVING — CURRENT: verified DATE]` |
| Living (current) | distilled | `[LIVING — CURRENT \| DISTILLED: verified DATE]` |
| Living (current) | structured-summary | `[LIVING — CURRENT \| STRUCTURED-SUMMARY: verified DATE]` |
| Living (expiring soon) | verbatim | `[LIVING — EXPIRING SOON: verified DATE, expires DATE]` |
| Living (expiring soon) | distilled | `[LIVING — EXPIRING SOON \| DISTILLED: verified DATE, expires DATE]` |
| Living (expired) | any | `[LIVING — EXPIRED: last verified DATE]` — Form modifier dropped — trust revoked at tier level |
| Unclassified | any | `[UNCLASSIFIED]` — Form modifier dropped — trust revoked at tier level |
| Unclassified (overdue) | any | `[UNCLASSIFIED — REVIEW OVERDUE]` — Form modifier dropped — trust revoked at tier level |
| Needs review (self-reported) | any | `[NEEDS REVIEW]` — Form modifier dropped — trust revoked at tier level |
| Needs review (spot-check-confirmed) | any | `[NEEDS REVIEW — CONFIRMED]` — Form modifier dropped — trust revoked at tier level |

The `sourceForm` modifier is only relevant when the AI is permitted to cite the document. For EXPIRED and NEEDS REVIEW documents, citation is already restricted; the modifier adds no additional constraint and is omitted from the injected tag.

**Worked example — IFR currency requirements (Foundation + structured-summary):**
- Tag in context injection: `[CURRENT — FOUNDATION | STRUCTURED-SUMMARY]`
- First-citation text: "Based on a structured summary of IFR currency requirements (66 HIT) — this is a synthesized reference derived from FAR §61.57 and the IFR ACS, not verbatim regulatory text. Verify against the source for specific tolerances before endorsing."
- Subsequent citations same session: "per IFR currency requirements (structured summary)"

```
KNOWLEDGE SUBSTRATE:
The following documents are your current knowledge base for this domain.
Each document has a trust tag built from two dimensions: tier + form modifier.

Tier dimension (always present):
  - [CURRENT — FOUNDATION] — verified, stable. Cite directly.
  - [LIVING — CURRENT: verified DATE] — verified within TTL. Cite with date.
  - [LIVING — EXPIRING SOON: verified DATE, expires DATE] — use with caveat.
  - [LIVING — EXPIRED: last verified DATE] — do not act on this content. State what
    you knew as of last-verified date. Recommend refresh. Do not proceed with
    irreversible actions.
  - [UNCLASSIFIED] — content not reviewed or tiered. Always treat as provisional.
    Do not use as the basis for any consequential decision.
  - [UNCLASSIFIED — REVIEW OVERDUE] — same behavior as [UNCLASSIFIED], with
    additional note that review is overdue.
  - [NEEDS REVIEW] — document was self-reported as uncertain by a directive run.
    Treat as provisional until owner resolves. Do not use for high-stakes actions.
  - [NEEDS REVIEW — CONFIRMED] — document was independently flagged by a spot-check
    discrepancy. Treat as expired for any high-stakes action.
  - [DIRECTIVE] — standing research instruction, not content.

Form modifier (appended only when sourceForm is distilled or structured-summary,
AND the document is not expired, unclassified, or needs-review):
  - | DISTILLED — AI-generated extract of a larger source. Hedge on first citation:
    "Based on a distilled extract of [source] (verified [date]) — verify against the
    source before acting on specifics." On subsequent citations in the same session:
    "per [document name] (distilled)."
  - | STRUCTURED-SUMMARY — synthesized reference derived from one or more sources,
    not verbatim regulatory text. Hedge on first citation: "Based on a structured
    summary of [source] — this is a synthesized reference, not verbatim regulatory
    text. Verify against the source for specific tolerances before endorsing." On
    subsequent citations: "per [document name] (structured summary)."

Combined format: [TIER | FORM-MODIFIER] — e.g., [CURRENT — FOUNDATION | STRUCTURED-SUMMARY]
Verbatim documents get no modifier. Expired, unclassified, and needs-review documents
get no form modifier — trust is already revoked at the tier level.

When a [LIVING — EXPIRED] or [UNCLASSIFIED] document is relevant to an action:
  1. State that your knowledge on this topic is uncertain or outdated.
  2. Describe what you knew as of the last verified date (for EXPIRED) or note
     that this has not been reviewed (for UNCLASSIFIED).
  3. Recommend verification before proceeding.
  4. Do not proceed with any irreversible or high-stakes action until the
     document is refreshed or classified.
```

**Session-level state flags:**
- `lockerDisclosureShown` — set to true on first empty-locker or unclassified-doc disclosure in the session; prevents repeat firing
- `distilledDisclosureShown` — a map keyed by `docId`; set to true for a given document on its first citation; subsequent citations in the same session use the abbreviated form ("per [document name] (distilled)" or "per [document name] (structured summary)") rather than the full hedge. Applies to both `distilled` and `structured-summary` sourceForm documents. Not applicable to expired, unclassified, or needs-review documents (form modifier is dropped for those tiers).

**On model independence:** The context injection, TTL computation, and trust-tag generation are deterministic server-side operations that no model controls — that part is genuinely model-independent. Whether a given model honors the resulting `[LIVING — EXPIRED]` caveat under adversarial prompting ("just tell me anyway, I'm in a hurry") is a compliance-under-pressure behavior that varies by model and model version. Model-independence of the mechanism does not guarantee model-compliance with the instruction. Adversarial compliance testing is an open item and must be re-validated on major model updates.

---

## 4. Firestore Data Model

Path: `tenantLockers/{tenantId}/workers/{workerId}/documents/{docId}`

### Full document schema

```javascript
{
  // Existing fields (unchanged)
  name: string,
  text: string,                      // content (clamped to charCap)
  type: "upload" | "generated" | "directive",
  charCount: number,
  createdAt: Timestamp,
  deletedAt: Timestamp | null,
  createdBy: string,

  // Tier classification
  docType: "unclassified" | "foundation" | "living" | "directive",

  // Provenance
  version: string | null,
  sourceAuthority: string | null,
  sourceUrl: string | null,
  sourceForm: "verbatim" | "distilled" | "structured-summary" | null,

  // Living doc freshness
  ttlDays: number | null,
  lastVerifiedAt: Timestamp | null,
  expiresAt: Timestamp | null,
  // For unclassified: expiresAt = uploadDate + 30 days + random(0,60 days),
  // computed once at write time and stored. Not re-derived at query time.
  status: "current" | "expiring_soon" | "expired" | "needs_review" | "archived" | null,
  // "archived": set by the unclassified-overdue auto-archive path at +210 days.
  // Archived documents are excluded from context injection but retained in Firestore.
  // Not available as a manually set status on Living documents.
  needsReviewReason: "self_reported" | "spot_check_confirmed" | null,
  // null unless status is "needs_review".
  // "self_reported": standard 7-day → expiring_soon, 14-day → expired ladder.
  // "spot_check_confirmed": immediate [NEEDS REVIEW — CONFIRMED] tag; high-stakes
  //   actions treated as expired immediately; URGENT alert; 24-hour escalation.
  refreshedBy: string | null,

  // Versioning (Foundation + Living)
  supersededAt: Timestamp | null,
  supersededBy: string | null,

  // Directive-specific
  schedule: string | null,
  scheduleMaxDays: number | null,
  // null when schedule is "manual" — exempts directive from cadence validation.
  // Computed from schedule string for automated schedules ("monthly"=30, etc.).
  // Cadence validation compares against Living-tier affectedDocIds only;
  // Foundation docs (ttlDays: null) are excluded from the comparison.
  target: string | null,
  action: string | null,
  alertRecipients: string[] | null,
  lastRunAt: Timestamp | null,
  nextRunAt: Timestamp | null,
  lastResult: "no_change" | "change_found" | "needs_review" | "error" | null,
  lastResultConfidence: "high" | "medium" | "low" | null,
  lastResultDetail: string | null,
  affectedDocIds: string[] | null,

  // Per-document escalation override (P2 — not surfaced in v4 initial UI)
  escalationContactOverrideEmail: string | null,
  // Optional. When set, escalation for this document/directive routes to this address
  // instead of the worker-level escalationContactEmail in meta.
  // When null (default for all documents), falls back to worker-level meta.
  // v4 ships worker-level default only. Do not surface per-document override UI in
  // initial implementation.
}
```

### Worker-level locker metadata

Doc at `tenantLockers/{tenantId}/workers/{workerId}/meta`:

```javascript
{
  workerSlug: string,
  lockerVersion: number,
  totalCharCount: number,
  docCount: number,
  unclassifiedDocCount: number,         // drives yellow "pending review" badge
  unclassifiedOverdueDocCount: number,  // drives orange "review overdue" badge
  foundationDocCount: number,
  livingDocCount: number,
  directiveCount: number,
  expiredDocCount: number,              // drives "locker health" red badge
  lastUpdatedAt: Timestamp,
  charCapPerDoc: number,                // default 12000
  charCapTotal: number,                 // installedWorkers.length × charCapPerDoc

  // Escalation contact — covers all documents and directives in this worker's locker
  escalationContactEmail: string | null,
  // Requires explicit opt-in consent confirmation when address is outside the workspace.
  // Consent wording: "I authorize expiry and error alerts for all documents in this
  // worker's locker to be sent to [email]. This address is outside my workspace.
  // Alert content: document name and expiry date only — no document content."
  // A single consent confirmation at worker level covers all documents and directives.
  // Individual documents or directives may override this with escalationContactOverrideEmail
  // (P2 enhancement — not surfaced in v4 initial UI).
}
```

Nav badge behavior:
- Red dot: expired Living documents
- Yellow dot: unclassified documents within their initial review window
- Orange dot: unclassified documents past their `expiresAt` (review overdue)
- All three conditions surface on the Studio Locker nav icon alongside the folder list. Clicking through shows which specific documents are in each state with action buttons.

---

## 5. Chat Disclosure Behavior

**Empty locker:** If a worker's locker has no active documents (all deleted or all expired), the worker discloses this once per session, on the first message where domain knowledge would be relevant. It does not fire on casual questions ("what time is it?", "translate this for me") — only on questions that would normally draw on the locker.

Trigger implementation: session-level flag `lockerDisclosureShown` in chat engine state. Set to true on first trigger; does not fire again in the same session.

Disclosure text: "My knowledge base for this domain is empty. I'm operating from general training data only. Answers in this area are not verified against current regulations, standards, or documents specific to this workspace."

**Unclassified documents:** Same trigger pattern — once per session on first domain-relevant message — but softer: "Some documents in my knowledge base have not been reviewed or classified. I'll note where I'm drawing on unclassified content."

**Distilled and structured-summary documents:** Full form-modifier caveat fires once per document per session, on first citation. Subsequent citations of the same document in the same session use abbreviated attribution: "per [document name] (distilled)" or "per [document name] (structured summary)." Tracked via `distilledDisclosureShown` map keyed by docId in session-level state. Both `distilled` and `structured-summary` sourceForm documents follow this pattern. This disclosure applies only to documents whose tier permits citation (Foundation, Living current/expiring-soon) — expired, unclassified, and needs-review documents carry no form modifier and the session-flag is not set for them.

---

## 6. High-Stakes Action Definition

A **high-stakes action** is any action that meets one or more of the following conditions. Expired or unclassified documents trigger a hard block when the requested action is high-stakes. Non-high-stakes actions get the caveat-and-continue flow.

**Condition 1 — Irreversible:** Creates, signs, sends, files, or records something that cannot be undone without third-party involvement.
- Recording a deed, filing a logbook endorsement, submitting a student grade, sending a regulatory filing, anchoring a DTC

**Condition 2 — Legal or financial commitment:** Commits the user or their organization to a legal position or financial obligation.
- Executing a contract, issuing an invoice, making a compliance attestation

**Condition 3a — Clinical or safety determination (hard-block eligible):** Recommends, modifies, or endorses a clinical care decision or flight-safety determination with direct patient-safety or airworthiness implications.
- Clearing a student for solo flight, endorsing instrument competency, recommending a medication change, approving a student for clinical rotation

**Condition 3b — Educational evaluation applying clinical frameworks (caveat-and-continue, not hard-block):** Routine educational evaluation or coaching that applies clinical judgment frameworks, without direct patient-safety exposure.
- SLO rubric scoring, Tanner stage assessment, reflection prompting, debriefing questions
- Caveats apply if knowledge is expired; hard-block does not fire

**Condition 4 — External disclosure:** Transmits information to a party outside the workspace.
- Sending an email, generating a report to a regulator, posting to an external API, filing a form

**Per-vertical registry (P1):** The formal mapping of specific routes and AI actions to high-stakes status, per vertical (aviation, nursing, real estate, title, DPP), is a P1 deliverable. The four-condition framework above is the governing definition; the registry names which actions trigger it in each domain.

**Nursing-specific note:** The P1 per-vertical registry for nursing must explicitly draw the line between Condition 3a and 3b for every route. Default rule: student coaching and SLO evaluation is 3b; anything that produces a record submitted to a licensing body or employer is 3a.

**Aviation default rule:** For aviation workers, the P1 per-vertical registry must draw this line explicitly. Default: routine CFI ground instruction, stage-check coaching, quiz generation, study Q&A, and pre-solo ground preparation are 3b (caveat-and-continue). Solo endorsements, checkride sign-offs, instrument competency endorsements, any logbook endorsement submitted to the FAA, and decisions that authorize unsupervised flight are 3a (hard-block eligible). If the action generates or modifies a logbook entry or any FAA-submitted record, treat as 3a.

---

## 7. Per-Worker Locker Population Guide

### Aviation — PPL (Part 61)

| Document | Tier | TTL | sourceForm | Source |
|---|---|---|---|---|
| ACS Private Pilot (full task table) | Foundation | — | verbatim | FAA |
| FAR Part 61 (cert requirements, endorsements) | Living | 90 days | distilled | FAA eCFR |
| FAR Part 91 (operating rules) | Living | 90 days | distilled | FAA eCFR |
| AIM (key chapters) | Living | 180 days | distilled | FAA (2×/yr) |
| FAA Knowledge Test question bank | Living | 365 days | structured-summary | FAA via ASA/Gleim |
| FITS C172 training supplement | Foundation | — | verbatim | FAA FITS program |
| Student POH (N-number specific) | Foundation | — | verbatim | Student upload |
| Part 61 amendment monitor | Directive | Monthly | — | NPRM feed |
| ACS revision monitor | Directive | Quarterly | — | FAA website |

Note: The ACS revision monitor directive governs Foundation documents (ACS Private Pilot). Because Foundation documents have no TTL, cadence validation does not apply to this directive — it is exempt, same as a manual directive.

### Aviation — IFR (Instrument Rating)

| Document | Tier | TTL | sourceForm | Source |
|---|---|---|---|---|
| ACS Instrument Rating (full task table) | Foundation | — | verbatim | FAA |
| FAR Part 61 instrument requirements | Living | 90 days | distilled | FAA eCFR |
| FAR Part 91 IFR operations | Living | 90 days | distilled | FAA eCFR |
| IFR currency requirements (66 HIT) | Foundation | — | structured-summary | from ACS |
| IFR enroute / approach procedure reference | Living | 90 days | distilled | FAA AeroNav |

Note: "IFR currency requirements (66 HIT)" is a Foundation document with `sourceForm: structured-summary`. Its context injection tag is `[CURRENT — FOUNDATION | STRUCTURED-SUMMARY]`. See §3 worked example for first-citation and subsequent-citation behavior.

### Aviation — Part 141 Flight School

All Part 61 documents above, plus:

| Document | Tier | TTL | sourceForm | Source |
|---|---|---|---|---|
| FAR Part 141 (school certification) | Living | 180 days | distilled | FAA eCFR |
| FAA-approved course curriculum | Foundation | — | verbatim | School ops specs |
| Stage check standards | Foundation | — | verbatim | School curriculum |

### Nursing — NURS 210 (Novice)

| Document | Tier | TTL | sourceForm | Source |
|---|---|---|---|---|
| NURS 210 SLO Reflection Guide | Foundation | — | verbatim | Dr. Clearwater / UHMC |
| Tanner Clinical Judgment Rubric 2026 | Foundation | — | verbatim | Tanner & Kyriakidis 2026 |
| Situated Coaching & Debriefing Questions | Foundation | — | verbatim | Holm, Kyriakidis, Parris 2026 |
| NCSBN NCLEX standards | Living | 365 days | distilled | NCSBN |
| Hawaii state nursing board rules | Living | 180 days | distilled | HI DCCA |
| NCSBN standard update monitor | Directive | Annually | — | NCSBN website |

### Real Estate — California

| Document | Tier | TTL | sourceForm | Source |
|---|---|---|---|---|
| CA DRE licensing requirements | Living | 90 days | distilled | CA DRE |
| CA recording fee schedule (by county) | Living | 90 days | structured-summary | County recorder |
| CA transfer tax schedule | Living | 90 days | structured-summary | County assessor |
| CA disclosure requirements | Living | 180 days | distilled | CA Civil Code |
| Parcel bundle spec | Foundation | — | verbatim | CODEX 36 / platform spec |
| DRE regulation monitor | Directive | Monthly | — | CA DRE news feed |

---

## 8. Creator Sandbox Requirement

**A worker cannot be published with an empty locker.** The publish gate is enforced at two layers:

**Layer 1 — Automated existence check:** The "Submit for review" button is disabled until the locker contains at least:
- 1 Foundation or Living document (classified, not unclassified)
- 1 Living document or 1 Research Directive

Workers with only unclassified documents do not satisfy this requirement — unclassified is the holding state, not the final state.

**Layer 2 — Human adequacy review:** When a creator submits, the review queue shows the locker contents alongside the worker spec. The reviewer uses the §7 population guide for the worker's declared vertical as the checklist. Specific minimum document sets per vertical:
- PPL aviation worker: ACS (Foundation), FAR Part 61 (Living), FAR Part 91 (Living), at least one Directive
- NURS 210 worker: SLO Reflection Guide (Foundation), Tanner Rubric (Foundation), Hawaii nursing board rules (Living)
- Other verticals: reviewer applies the relevant §7 table

Workers that do not satisfy the minimum document set for their vertical are returned to the creator with the specific missing items listed. The automated gate prevents zero-content workers; human review prevents thin-content workers. These are two separate quality layers.

**Legacy workers (already published with empty lockers):** Not retroactively blocked. But the nav shows a "locker empty" warning badge on their studio locker icon, and the AI discloses on first domain-relevant message per session.

---

## 9. What This Is Not

**Not a RAG pipeline.** Retrieval-augmented generation retrieves the most semantically similar chunks at query time. The Studio Locker injects the full context of relevant documents at session start. For domain-specific workers the full context IS the relevant context — cherry-picking chunks misses the structural relationships between SLO criteria, rubric stages, and coaching questions. The char cap (12,000 per document, workspace total = `installedWorkers × 12,000` at default tier) is the constraint that keeps context manageable without retrieval. For high-document-count domains (full FAR/AIM), a distilled Living document is the right curation choice — with `sourceForm: "distilled"` so the AI hedges accordingly.

**Not a vector database.** No embedding, no similarity search, no cosine distance. Documents are stored as text and injected directly.

**Not the Vault.** The Vault is the user's personal, portable, permanent record — logbook entries, course completions, health records, credentials. The Studio Locker is the worker's knowledge base — what it knows about the domain, not what the user has done in it. A pilot's logbook lives in the Vault. The ACS and FARs live in the CoPilot's Studio Locker. They are distinct and neither replaces the other.

---

## 10. Implementation Phases

### Phase 1 — Schema extension (no behavior change)
- Add all new fields to locker document schema (docType, sourceForm, TTL fields, versioning fields, directive fields, needsReviewReason, escalationContactOverrideEmail)
- **Backfill existing locker docs as `docType: "unclassified"` with a staggered forced TTL** — `expiresAt = migrationDate + 30 days + random(0, 60 days)` computed at row-write time. Not `foundation`. Owner is prompted to review and classify.
- Add worker-level `meta` document with `unclassifiedDocCount`, `unclassifiedOverdueDocCount`, `expiredDocCount`, and `escalationContactEmail`
- No behavior change in the AI — purely additive data model

### Phase 2 — Freshness gate in `getLockerContext()`
- `getLockerContext()` reads `docType`, `expiresAt`, `sourceForm`, `needsReviewReason`, `status` for each document
- Generates composed trust tag using tier + form-modifier dimensions (§3 tag composition table); form modifier is dropped for expired, unclassified, and needs-review documents; unclassified-overdue documents get `[UNCLASSIFIED — REVIEW OVERDUE]` tag; spot-check-confirmed gets `[NEEDS REVIEW — CONFIRMED]`; archived documents are excluded from injection entirely
- AI system prompt updated with the full trust model instruction block (§3)
- `lockerDisclosureShown` and `distilledDisclosureShown` session flags added to chat engine

### Phase 3 — Nav health badges
- `expiredDocCount` (red badge), `unclassifiedDocCount` (yellow badge), and `unclassifiedOverdueDocCount` (orange badge) from meta doc
- All three surface on Studio Locker nav icon (CODEX 67 nav implementation)
- Clicking through shows which specific documents are in each state with action buttons

### Phase 4 — Research directives (manual first, scheduled later)
- Directive documents executable manually: "run the Part 61 check now"
- Directive cadence validation at creation time: `scheduleMaxDays ≤ minimum ttlDays of Living-tier affectedDocIds`; Foundation docs excluded from comparison; manual directives exempt
- `lastResult`, `lastResultConfidence`, `lastResultDetail` fields written on each run
- `needs_review` and `error` escalation ladder implemented with differentiated behavior by `needsReviewReason`
- `spot_check_confirmed` path: immediate `[NEEDS REVIEW — CONFIRMED]` tag; URGENT owner alert; 24-hour escalation; high-stakes hard-block applies immediately
- Spot-check mechanism: 10% monthly sample; discrepancy immediately sets `status: "needs_review"`, `needsReviewReason: "spot_check_confirmed"` on specific document and triggers owner alert
- Unclassified-overdue nudge schedule: reminders at +30 days (owner), +60 days (worker-level contact + owner), monthly through +150 days, action-required notification at +180 days, auto-archive at +210 days if no action taken
- Phase 4b: Cloud Scheduler integration for automatic execution on schedule

### Phase 5 — Publish gate
- Layer 1 (automated) gating on submit button
- Locker contents surfaced in review queue for Layer 2 (human) review with §7 vertical-specific checklist
- Legacy worker "locker empty" warning badge

---

## 11. Open Items

| Item | Priority | Notes |
|---|---|---|
| Per-vertical high-stakes action registry | P1 | Framework defined in §6; registry maps specific routes + AI actions per vertical; nursing must explicitly define 3a vs 3b boundary for every route; aviation default rule defined in §6 — registry makes it exhaustive |
| Adversarial compliance testing (model-by-model) | P1 | Does each model honor [LIVING — EXPIRED] caveat under user pressure? Does it honor [NEEDS REVIEW — CONFIRMED] hard-block? Re-test on major model updates |
| C172 POH ingestion: student-upload vs FITS supplement | P1 | Recommend student uploads their N-number-specific POH; FITS as base layer |
| Char cap per tier: confirm `perFolderCapForTier` values | P1 | 12,000 = default; premium tier TBD |
| Spot-check mechanism implementation | P2 | 10% sample of `no_change` results; secondary verification; discrepancy immediately sets `needs_review` + `needsReviewReason: "spot_check_confirmed"` on specific doc; URGENT owner alert; 24-hour escalation path |
| Locker health badge design: red/yellow/orange dot vs count | P2 | CODEX 67 nav design phase; three badge states now |
| Cost model for scheduled directive execution at scale | P2 | Includes: (a) per-directive inference + web fetch cost, (b) 10% monthly spot-check audit overhead per directive, (c) tier-based directive quotas. Directives are a billable feature above free tier. |
| Unclassified-doc review UX in Studio Locker | P2 | Inline re-tier action; "Foundation / Living / Directive / Delete" prompt per doc |
| Per-document escalationContactOverrideEmail UI | P2 | Field defined in §4 schema; initial v4 implementation ships worker-level default only. Per-document UI deferred. Routing example: Part 141 school routes FAR/AIM expiry to CFI, school cert paperwork to Chief Flight Instructor — both in same worker's locker. |
| Directive trust model after confirmed miss | P2 | When a spot-check confirms a bad `no_change` result from a specific directive, should subsequent runs from that directive be auto-routed to `needs_review` regardless of their own reported confidence, until a human re-verifies the directive's logic? Currently each run is treated as an independent event. Consider: `consecutiveMisses: number` counter on the directive; once > 0, all subsequent results route to `needs_review` automatically until a human clears the counter. |
| Retroactive Foundation versioning for existing docs | P3 | Add `supersededAt`/`supersededBy`; non-breaking migration |

---

## 12. Summary

| Concept | One-line definition |
|---|---|
| Unclassified document | Default state for any unreviewed upload. Always caveated. Review window 30–90 days (staggered per-doc). Overdue review = orange badge + nudge schedule (reminders at +30/+60/monthly through +150 days; action-required at +180 days; auto-archive at +210 days if no action). Not hard-blocked. |
| Foundation document | Stable domain reference, human-reviewed and classified. AI cites directly. Soft-deleted on replacement. No TTL — Foundation docs are excluded from directive cadence validation comparisons. |
| Living document | Regulatory content with TTL. AI caveats when stale; hard-blocks high-stakes actions when expired. |
| Research directive | Standing instruction for how the worker maintains its own currency. Manual directives are exempt from cadence validation. Cadence validation compares only against Living-tier governed documents. |
| High-stakes action | Irreversible, legal commitment, clinical/safety (3a), or external disclosure. Triggers hard-block on expired knowledge. Educational evaluation (3b) is caveat-and-continue. Aviation: solo endorsements, logbook entries, FAA-submitted records = 3a; coaching, quiz gen, ground instruction = 3b. |
| Freshness gate | RAAS behavior: expired knowledge is tagged; AI changes confidence level and blocks consequential actions. |
| sourceForm | Distinguishes verbatim source text from AI-distilled summaries and structured summaries. Distilled and structured-summary content hedges on first citation per session; abbreviated on repeat. Form modifier is dropped for expired, unclassified, and needs-review documents — trust already revoked at tier level. |
| Trust tag | Two composing dimensions: tier (always present) + form modifier (only when sourceForm is distilled or structured-summary AND document is not expired/unclassified/needs-review). Format: `[TIER \| FORM-MODIFIER]`. |
| needsReviewReason | Distinguishes self-reported uncertainty from spot-check-confirmed integrity failures. `spot_check_confirmed` → immediate hard-block for high-stakes, URGENT alert, 24-hour escalation. |
| escalationContactEmail | Configured once at worker-level meta; covers all documents and directives in the locker. Single consent confirmation. Per-document `escalationContactOverrideEmail` available for exceptional routing (P2 — not surfaced in v4 initial UI). |
| Locker health badge | Red = expired docs; yellow = unclassified (within window); orange = unclassified overdue. Worker owner's signal to act before a consequential session. |
| Publish gate | Layer 1 (automated existence check) + Layer 2 (human adequacy review using §7 vertical checklist). Two separate quality layers. |

**The invariant:** You cannot have RAAS without a Studio Locker. And you cannot keep RAAS relevant without a Living Locker. The locker is not a storage feature — it is the knowledge governance layer that makes Digital Workers trustworthy in regulated industries.
