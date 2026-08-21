# CODEX S52.60 — MSR Servicing & Compliance Worker (Refined v2)

**Status:** Scoped for Phase 1 build. Refines Sean's Draft v1 memo (Mike Lee's idea) with verified legal citations and a mapping to real existing platform architecture.
**Vertical:** Mortgage Servicing Rights (MSR) — 8th SOCIII vertical.
**Model:** Same as DPP/Elise — SOCIII builds and owns the worker; licensed to Mike's (TBD entity name) operating company as a customer, non-exclusive by default so it can be resold to other servicers later.
**Author:** Sean Lee Combs (draft) + Claude Code (refinement, citation verification, architecture mapping) — 2026-08-21.

---

## What changed from Draft v1

This is the same product, the same phasing, the same non-goals. What's new:

1. **Every federal citation in §2 below is independently verified** against CFPB/eCFR/Cornell LII — not re-stated on the memo's authority alone, per the memo's own rule ("no rule in the compliance engine should be marked production-ready without a verified citation").
2. **One correction to the memo's own text**: §1024.39's "by day 36" merges two distinct triggers. See §2.1.
3. **Two citations the memo referenced but didn't number** (Reg Z prompt-crediting, Reg Z periodic statements) are now filled in.
4. **An architecture-mapping section (§3)** ties each functional module to a *real, already-built* platform pattern (the nursing ruleset template, the platform-wide distress protocol, last night's customer-portal pattern) so this isn't designed in a vacuum — most of the mechanism already exists; MSR needs content and one new worker, not new plumbing.
5. **Explicit "buildable now" vs. "real sourcing project, not started" split (§7)**, so nothing in Phase 1 quietly claims more legal coverage than what's actually been verified.

Non-goals (§ from Draft v1) are preserved exactly — no MSR ownership logic, no token/NFT/blockchain functionality in this worker, no investor-facing features. Not repeating that section; it stands as written.

---

## 1. Purpose

Same as Draft v1: a RAAS-governed Digital Worker that automates mortgage servicing compliance and operations, for Mike's licensee first, sellable to other servicers/subservicers independent of that relationship.

## 2. Verified Federal Citations (Phase 1 scope)

Every rule below was checked against the CFPB's own regulation text and Cornell LII, not secondhand. This table *is* the compliance-engine content for Phase 1 — everything past it is state law and is explicitly **not** sourced yet (§7).

| # | Citation | What it actually requires | Source |
|---|---|---|---|
| 1 | **12 CFR 1024.39** — Early intervention | **Two separate triggers, not one** (correcting the memo — see §2.1): live contact attempt by day 36 of delinquency, repeated every 36 days; a separate **written notice by day 45**, repeated every 180 days. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/39/) · [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.39) |
| 2 | **12 CFR 1024.41(c)** — Loss mitigation, evaluate-all-options | A complete loss-mit application must be evaluated for every option the servicer offers, subject to narrow exceptions in (c)(2)(ii)/(iii)/(v). | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/41/) · [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.41) |
| 3 | **12 CFR 1024.35** — Notice of Error | Acknowledge within 5 business days; substantive response generally within 30 business days (some categories differ). | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/35/) |
| 4 | **12 CFR 1024.36** — Request for Information | Same 5-business-day acknowledgment; up to 30 business days to respond, extendable 15 more days with written notice to the borrower *before* the original period ends. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/36/) |
| 5 | **12 CFR 1024.17** — Escrow accounts | Escrow charge capped at 1/12 annual + up to 1/6 cushion; annual escrow statement due within 30 days of computation-year end. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/17/) |
| 6 | **12 CFR 1024.37** — Force-placed insurance | Servicer needs a reasonable basis the borrower lacks required coverage before charging; written notice required **at least 45 days** before the charge, a second notice before actually purchasing coverage. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/37/) |
| 7 | **12 CFR 1026.36(c)(1)(i)** — Prompt payment crediting *(memo referenced this but didn't cite a section — filled in)* | Payments must be credited as of date of receipt, with a narrow exception when a delay causes no fee or negative reporting. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1026/36/) · [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.36) |
| 8 | **12 CFR 1026.41** — Periodic statements *(same — memo said "periodic statements," no number)* | Statement required each billing cycle with prescribed content: balance, rate, next rate-change date, prepayment penalty, servicer contact number, etc. | [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.41) · [eCFR](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-E/section-1026.41) |

### 2.1 The one correction worth flagging explicitly

Draft v1 says: *"Triggers borrower outreach at delinquency thresholds required by Reg X (e.g., by day 36 of delinquency)."* This is imprecise in a way that matters for a compliance engine specifically: §1024.39 has **two independent deadlines** — a live-contact attempt at day 36 (repeating every 36 days), and a *separate* written notice at day 45 (repeating every 180 days). A servicer who only tracks "day 36" and treats it as covering both obligations would be non-compliant on the written-notice track. The rule engine needs both as distinct, independently-tracked triggers. This is exactly the kind of collapsing-two-rules-into-one error the whole point of this product is supposed to catch in a *servicer's* process — so it can't be present in *our own* rule engine.

## 3. Architecture mapping — most of this already exists

This is the part that changes the effort estimate. Verified against the real codebase, not assumed:

**3.1 Rule enforcement shape.** The platform already has a real, working template for exactly this kind of high-stakes, block-capable ruleset: `functions/functions/raas/rulesets/nursing_clinical_v1.json`. It has `hard_stops` (block-capable, with `trigger`/`on_fail` logic), `chat_rules` (regex-triggered inline warnings), `soft_flags` (non-blocking alerts), a `disclaimer`, and a `system_context` block. MSR's ruleset (`msr_servicing_v1.json`) should use the **identical shape** — this is a proven pattern for "AI must never fabricate a number/status the record doesn't support, must never make a judgment call that belongs to a licensed human," which is precisely what §4.1–4.2 of the original memo need. Registration is one line in `raas/raas.engine.js`'s `WORKER_RULESET_MAP`.

**3.2 The distress protocol Draft v1 asks for already exists platform-wide — and it's stronger than "already covers named-persona workers."** §4.2 of the memo says a borrower in financial distress is "conceptually similar to a student in academic distress" and asks for gated disclosure paths. This is **not new work** — verified directly in `functions/functions/index.js` (not just the ruleset file's own description): the distress check runs unconditionally on **every** `/chat:message` call, before any worker-specific logic, regardless of worker slug, persona, or vertical. No per-worker registration, no "give it a persona name" step required — it already covers MSR with zero additional wiring. The only real to-do is making sure the MSR tenant's `safetyContact` is configured before production activation (the ruleset's own pre-existing requirement).

**3.3 Borrower portal.** This is a direct application of the customer-portal pattern built and shipped last night (tenant/student/consumer personas in `apps/business/src/pages/ClientPortal.jsx`): a skin, a persona, an entitlement-safe `GET` endpoint following the exact `tenant:customer:lease` / `student:customer:profile` shape (one query scoped by tenant, in-memory identity match, identical response for wrong-party vs. nonexistent). Payment history/escrow statement/document upload/hardship request/complaint tracking are all the same shape of "read your own real record" the last two portals already do. No new architecture — new data model and new UI content.

**3.4 Immutable audit trail.** Draft v1's §4.6 wants "every rule check, borrower communication, fee assessment, and human override" logged immutably. Rather than overload the *existing* Audit Trail worker (CODEX S52.23 — that's an opt-in, blockchain-anchored, identity-verification-gated feature designed for a different purpose and cost profile), MSR gets its **own dedicated append-only `msrComplianceEvents/{eventId}` collection** — consistent with the platform's general append-only invariant (CLAUDE.md), scoped and queryable per loan, no anchoring/minting cost per event. If a licensee *also* wants the blockchain-anchored Audit Trail product for their MSR compliance events specifically, that's a separate, explicit opt-in decision layered on top later — not assumed here.

## 4. Core Functional Modules (Phase 1 build target)

Retained from Draft v1, scoped to what Phase 1 actually builds:

- **4.1 Compliance engine** — the 8 verified federal rules above, encoded as `hard_stops`/`soft_flags` in `msr_servicing_v1.json`, each carrying its real citation. State-law layer: **not started**, see §7.
- **4.2 Early intervention & loss mitigation workflow** — delinquency-threshold triggers for rules #1–2 above; NOE/RFI intake and deadline tracking for rules #3–4.
- **4.3 Borrower communication & disclosure** — jurisdiction-aware content is Phase 3+ (needs the state layer); Phase 1 ships federal-only content and the distress-protocol integration (already free, §3.2).
- **4.4 Escrow/advance/fee ledger** — rules #5–7 as validation gates on fee assessment and escrow charge calculation. Float yield sweep: explicitly deferred, not Phase 1.
- **4.5 Multistate licensing tracker** — schema built in Phase 1 (so the data model exists), populated with real license data only once Mike's actual state footprint is known (§8 open question).
- **4.6 Audit trail** — `msrComplianceEvents` collection, §3.4.
- **4.7 Complaint & error resolution** — NOE/RFI structured intake per rules #3–4, response-deadline tracking.

## 5. Customer-Facing Portal (borrower)

Same scope as Draft v1 §5, built on the pattern in §3.3: payment history/escrow statement, document upload, hardship/distress request (routes to a human — worker never unilaterally approves/denies a modification, enforced as a hard_stop in §4's ruleset, not just a portal-side promise), complaint/dispute submission with status tracking. White-label per licensee.

## 6. Data Inputs Required

Same as Draft v1 §6 — real loan-level servicing data, real state licensing status, and the citation-backed rule database. All three are **licensee-supplied or legal-sourcing deliverables**, not something Phase 1 can synthesize. Phase 1 uses clearly-fictional demo data (same pattern as last night's Nordholm/Merritt Capital demo companies) to prove the mechanism, not real loan data.

## 7. What's buildable now vs. a real sourcing project — read this before assuming Phase 1 "covers compliance"

**Buildable now, real, verified (this Phase 1 pass):**
- The 8 federal citations in §2, each independently checked against CFPB/Cornell LII.
- The ruleset enforcement mechanism (§3.1), the distress protocol integration (§3.2 — already exists, zero new work), the portal (§3.3), the audit-events collection (§3.4).
- Full data-model schemas for loans, licensing status, and compliance events — structure only.

**Explicitly NOT built, NOT sourced, NOT claimed as covered:**
- **All state-level servicing law.** Draft v1 itself calls this "likely the single hardest and most valuable piece to build correctly" and demands real legal sourcing before any rule is marked active. Zero state rules are in Phase 1. The schema has a `jurisdiction` field ready to receive them; the field is empty.
- **CFPB supervisory posture / enforcement-priority claims** in Draft v1's "why now" section — those are characterizations of agency behavior, not citations, and weren't in scope for citation verification (they're framing, not rule content, so they don't need a CFR pointer — but don't repeat them as if they were as verifiable as §2's table).
- **Ongoing rule maintenance** — Draft v1's own open question ("who verifies and maintains the state-by-state rule database on an ongoing basis?") is unanswered and is a real, recurring cost, not a one-time build.

Any rule not in §2's table must not be marked `"status": "active"` in the ruleset — it stays absent rather than guessed at.

## 8. Open Questions (Sean's call — not resolved here, not blocking the Phase 1 scaffolding build)

Carried over from Draft v1, unchanged, still open:
- Direct-servicer vs. subservicer-interface model for Mike's entity — materially different builds downstream of Phase 1.
- Mike's entity's actual loan servicing system(s), for integration.
- Who owns ongoing state-rule sourcing and maintenance.
- Licensing/commercial terms (exclusivity period, pricing) — doesn't block technical scoping.
- **New, from this refinement:** Mike's operating entity has no name yet in either draft. Phase 1's demo data uses a placeholder ("Meridian Loan Servicing") purely so the mechanism has something to point at — rename trivially once the real entity name exists; nothing structural depends on the placeholder name.
- **New:** Sean mentioned wanting this worker to also use "our title worker" — likely relevant for foreclosure/REO-adjacent title work downstream of loss mitigation, but that's not in Draft v1's module list and isn't scoped here. Flagging so it doesn't get silently assumed into Phase 1 or silently dropped — worth a short conversation on what the actual title-worker interop point is (REO title curative work? Foreclosure trustee sale title? Something else?).

## 9. Build Phasing

Unchanged from Draft v1:
1. Phase 1 — core compliance engine + audit trail, federal rules only, single-state pilot for Mike's licensee. **(This CODEX scopes Phase 1.)**
2. Phase 2 — borrower portal + communication engine.
3. Phase 3 — multistate rule expansion, prioritized by Mike's actual portfolio states.
4. Phase 4 — escrow/float and advance-ledger automation.

---
*Verified citations in §2 sourced from consumerfinance.gov and law.cornell.edu, 2026-08-21. No rule beyond §2's table is production-ready or claimed as such. State-law layer is schema-only pending a real legal-sourcing engagement per Draft v1's own requirement.*
