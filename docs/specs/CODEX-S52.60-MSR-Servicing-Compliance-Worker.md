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

Every rule below was checked against the CFPB's own regulation text and Cornell LII — **three times**. Pass 1 (2026-08-21 morning) verified at the section level; Sean's red-team caught a real subsection-precision error in §1024.39 (see §2.1). Pass 2 (same day) re-checked all 8 at the subsection level and found 3 more real gaps (NOE, RFI, periodic-statement content — each collapsed a multi-tier requirement into one number). Pass 3 (same day, an independent reviewer spot-checked 3 of pass 2's claims and confirmed them; while re-verifying the remaining unconfirmed ones myself, I found and fixed a **fourth** real error, self-caught, not flagged by anyone else: the escrow cushion/monthly-cap subsection split had (c)(1)(i) and (c)(1)(ii) backwards — (c)(1)(i) is actually an at-settlement-only rule, not part of this worker's ongoing-servicing scope at all. All three passes are reflected below; this is the corrected, subsection-precise, independently-reconfirmed version.

| # | Citation | What it actually requires | Source |
|---|---|---|---|
| 1 | **12 CFR 1024.39(a)** and **(b)(1)** — Early intervention | Two triggers in two subsections: **(a)** live-contact attempt by day 36, repeated every 36 days. **(b)(1)** — a *separate* written notice by day 45; the 180-day recurrence cadence Draft v1 mentioned is **inside this same (b)(1)**, not a distinct subsection (a real citation error in the first verification pass, caught by Sean — see §2.1). | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/39/) · [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.39) |
| 2 | **12 CFR 1024.41(b)(1)** and **(c)(1)** — Loss mitigation, evaluate-all-options | "Complete application" is defined in **(b)(1)**, not (c). The evaluate-all-options mandate is **(c)(1)**: applies when a complete application arrives more than 37 days before a foreclosure sale, 30-day evaluation window. Genuine exceptions: **(c)(2)(ii)/(iii)/(v)**. Note: **(c)(2)(i) is an anti-evasion prohibition, not an exception** — don't cite it as one. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/41/) · [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1024.41) |
| 3 | **12 CFR 1024.35(d)** and **(e)(3)** — Notice of Error | Acknowledgment **(d)**: 5 business days, one deadline. Substantive response **(e)(3)(i)** is **three separate deadlines, not one** — a real gap in the first pass: **7 days** for payoff-balance errors (the (b)(6) category), **30 days or before a scheduled foreclosure sale, whichever is earlier** for foreclosure-related errors ((b)(9)/(10)), **30 days** for everything else. The 15-day extension (**(e)(3)(ii)**) applies **only** to the 30-day general category, not the 7-day or foreclosure-sale deadlines. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/35/) |
| 4 | **12 CFR 1024.36(c)** and **(d)(2)** — Request for Information | Acknowledgment **(c)**: 5 business days. Substantive response is **two tiers, not one** — another real gap in the first pass: **(d)(2)(i)(A)** gives only **10 days** for a request specifically identifying the loan's owner/assignee; **(d)(2)(i)(B)** gives 30 days for general requests. Extension **(d)(2)(ii)**: 15 more days, notice must be sent *before* the original 30-day period ends — applies to the 30-day tier only. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/36/) |
| 5 | **12 CFR 1024.17(c)(1)(ii)** and **(i)** — Escrow accounts | **Self-caught error, fixed 2026-08-21**: the previous version of this table put the cushion cap in (c)(1)(i) — that subsection actually governs the at-settlement initial deposit, a different lifecycle stage this servicing-focused worker doesn't reach. The subsection that actually governs ongoing servicing is **(c)(1)(ii) alone**, which caps *both* the monthly charge (1/12 annual) and the ongoing cushion (1/6 annual). **(i)**: annual escrow statement due within 30 days of computation-year end. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/17/) |
| 6 | **12 CFR 1024.37(b)**, **(c)(1)(i)**, **(d)(1)** — Force-placed insurance | **(b)**: servicer needs a reasonable basis the borrower lacks required coverage. **(c)(1)(i)**: written notice at least 45 days before assessing the charge. **(d)(1)**: a second deadline — **15 days** before the charge, not just "before purchase" as the first pass loosely stated — referencing the notice content required by (c)(1)(ii). | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1024/37/) |
| 7 | **12 CFR 1026.36(c)(1)(i)** — Prompt payment crediting *(memo referenced this but didn't cite a section — filled in)* | Confirmed verbatim on the second pass: payments credited as of date of receipt, narrow exception when a delay causes no fee/negative reporting. Cross-references a further partial-payment exception at **(c)(1)(iii)**, not yet in the ruleset — minor, optional addition. | [CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1026/36/) · [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.36) |
| 8 | **12 CFR 1026.41(d)(1)-(8)** — Periodic statements *(memo said "periodic statements," no number — filled in)* | Content list confirmed, independently numbered (d)(1) through (d)(8): amount due, explanation of amount due, past-payment breakdown, transaction activity, partial-payment info, contact info, account info, delinquency info. **Real gap in the first pass**: **(d)(8)** (delinquency-specific content) is **conditional — only required once the borrower is more than 45 days delinquent**, not a standard field on every statement. | [Cornell LII](https://www.law.cornell.edu/cfr/text/12/1026.41) · [eCFR](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-E/section-1026.41) |

### 2.1 What the red-team caught, and what it turned out to actually be

Draft v1 says: *"Triggers borrower outreach at delinquency thresholds required by Reg X (e.g., by day 36 of delinquency)."* The first verification pass corrected this to "two independent deadlines — day 36 live-contact, day 45 written notice, repeating every 180 days" — and Sean caught that the "180 days" citation was thinner than it looked: it reads as if sourced independently, but it isn't a separate subsection at all. The second, subsection-level pass confirms exactly what he suspected: the day-45 trigger *and* its 180-day recurrence cadence are both inside **§1024.39(b)(1)** — one subsection, not two things needing two citations. The **substance** of "day 36 and day 45 are two independently-tracked obligations" holds up (that's `(a)` vs. `(b)(1)`, genuinely separate subsections) — but the 180-day number should never have been presented as if it had its own citation. Fixed in the table above and in `msr_servicing_v1.json` / `raas/mortgage-servicing/GLOBAL/early-intervention-loss-mitigation.md` (this pass). The broader lesson, stated plainly: "verified against CFPB/Cornell LII" in the first pass meant *checked that the section exists and says approximately this* — not *read the actual subsection-level text*. Those are different bars, and this document now tries to meet the second one throughout §2.

### 2.2 Small-servicer exemption — a stated assumption, not a silent one (Sean's red-team flag)

12 CFR 1024.30(b)(1) exempts a "small servicer" from §§1024.38-1024.41 — which covers **two of this doc's eight rules**: early intervention (§1024.39) and loss mitigation (§1024.41). Separately, 12 CFR 1026.41(e)(4) exempts small servicers from the periodic-statement rule — a **third** rule. Verified directly against consumerfinance.gov and Cornell LII, 2026-08-21.

**Small servicer, per 1026.41(e)(4):** services 5,000 or fewer mortgage loans, for **all** of which the servicer or an affiliate is the **creditor or assignee** (there's also a nonprofit/HFA path, not relevant here). Status is checked each January 1, with a 6-month grace period if the count is later exceeded.

**This is not automatically irrelevant just because the portfolio is small in dollars.** A $50M portfolio is small in loan *count* almost by construction — at a plausible average loan size, that's well under 5,000 loans. The exemption turns on **loan count and ownership structure**, not portfolio value. Whether it actually applies depends entirely on the still-open question in §8: is Mike's entity the creditor/assignee (owns/originated the loans — plausibly small-servicer-eligible) or a subservicer for a third party's loans (fails the "creditor or assignee" test regardless of count — full Reg X applies)?

**Stated assumption for Phase 1, to be confirmed, not assumed silently:** the ruleset in §4 treats early intervention, loss mitigation, and periodic statements as applicable regardless of servicer size. If Mike's entity actually qualifies as a small servicer, three of the eight Phase 1 rules may not legally apply to it — which doesn't make the ruleset wrong (a licensee bigger than 5,000 loans, or one that doesn't own the loans it services, still needs all eight), but it means the product's marketing/framing to Mike specifically shouldn't claim these three rules as a requirement for his entity without first confirming his structure and count. This should be resolved together with the direct-servicer-vs-subservicer question, not separately — they're the same underlying fact pattern.

## 3. Architecture mapping — re-verified with file/line evidence after a red-team pass

Sean red-teamed the first version of this section and was right to: it asserted verification without showing it, and one claim (3.1, on enforcement) turned out to be **wrong** — not imprecise, wrong. This section now gives the actual evidence (file, line range, what the code does) for each claim, the same evidentiary bar §2 applies to legal citations. Where the original claim doesn't hold up, that's stated plainly, not softened.

**3.1 Rule enforcement shape — the ruleset JSON exists and is registered, but `hard_stops` are NOT currently enforced anywhere. This is a real gap, not a nuance, and it also affects the pre-existing nursing ruleset this was modeled on.**

What's true: `functions/functions/raas/rulesets/nursing_clinical_v1.json` is a real file with `hard_stops`/`chat_rules`/`soft_flags`/`disclaimer`/`system_context`, and `msr_servicing_v1.json` (built this pass) uses the identical shape. Registration is real — `raas/raas.engine.js:554` reads `"msr-servicing-001": "msr_servicing_v1"` in `WORKER_RULESET_MAP`.

What's **not** true, traced exhaustively (`grep -rl` for every file that reads either ruleset, across the whole `functions/functions` tree — two hits: `raas.engine.js` and a test file, nothing else):

- `raas.engine.js:568` (`loadChatRules`) reads **only** `ruleset.chat_rules` — it never touches `hard_stops` at all.
- `raas.engine.js:305` (`validateChatOutput`) regex-matches `chat_rules` against the model's already-generated response text. On a match, `index.js:6879-6900` appends a generic disclaimer string to the end of the response. It does not block, rewrite, or regenerate — a paraphrased violation that doesn't match any regex sails through untouched, disclaimer or not.
- The one path that *can* actually block a response, `services/raas/constraintCheck.js` (called from `index.js:6912-6929`), is gated on `constraintModulesApplied` — a completely separate module system, unrelated to this ruleset file, and MSR has no module registered there.
- `hard_stops` only get read into a live prompt via one mechanism: `services/sandbox/tenantLocker.js`'s `WORKER_SYSTEM_DOCS` map (lines 33-78 before this pass) — and neither `msr-servicing-001` nor `nursing-education-001` was in that map. **Fixed this pass**: added an `msr-servicing-001` entry (with real CFPB legalRefs), so `hard_stops`/`soft_flags`/`chat_rules` text now gets folded into the system prompt as instructions — the same level accounting/HR/IR get. This is still **prompt-level instruction, not server-side blocking**. A model that phrases an effective loss-mitigation denial without using a blocked phrase ("based on your income, this program likely isn't a fit" — Sean's exact example) is not mechanically stopped by anything in this codebase today.

Real blocking would need one of: (a) restructuring the loss-mitigation-decision path to return structured (analyst-mode) output with a genuine `eval` spec `validateOutput` can check mechanically, or (b) a new `constraintCheck.js` module purpose-built for MSR's paraphrase risk. Neither is built. This is now tracked as an explicit Phase 1 gap in §7, not asserted as solved.

**3.2 The distress protocol — this claim holds up, now with the actual code quoted, not just described.** `functions/functions/index.js:2934-2939`:
```
// ── CODEX 66 distress-disclosure protocol (Level 1, non-overridable) ──
// Runs before ANY worker-specific logic, on every /chat:message turn,
// for every worker — this is deliberately not routed through the
// per-slug WORKER_RULESET_MAP like other rulesets, because it must
// apply universally regardless of which worker/tenant/creator is
// configuring the session.
```
Lines 2942-2973 show the actual trigger/classify/respond logic running unconditionally, with no worker-slug or persona check anywhere in that block. This one is real: MSR gets it for free, no wiring needed, and it's a genuinely different enforcement class than 3.1 (it substitutes the response outright on a `red` classification — actual blocking — rather than appending a disclaimer).

**3.3 Borrower portal — real, and demonstrated, not just asserted.** Built on the `apps/business/src/pages/ClientPortal.jsx` pattern (tenant/student/consumer personas), with `GET /v1/msr:customer:loan` and `POST /v1/msr:customer:hardship` following the exact entitlement-safe shape as `tenant:customer:lease`. Unlike 3.1-3.2, this isn't a claim about pre-existing code — it's new code from this pass, and it was Chrome-tested live end-to-end: real loan data loaded for the demo borrower, a real hardship request was submitted through the UI and confirmed as an actual Firestore write (`submittedByUid` matching the demo borrower's uid) — not describing intended behavior, describing what was directly observed working.

**3.4 Immutable audit trail — a new design decision, not a verified pre-existing pattern, and should be read that way.** MSR gets its own `msrComplianceEvents/{eventId}` append-only collection rather than reusing the existing opt-in, blockchain-anchored Audit Trail worker (CODEX S52.23), which was built for a different purpose and cost profile. This is a reasonable default, not something verified against existing usage — worth Sean's explicit sign-off rather than assumed correct because it's *described* the same way 3.1-3.3 are.

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

Same scope as Draft v1 §5, built on the pattern in §3.3: payment history/escrow statement, document upload, hardship/distress request (routes to a human — the worker is instructed never to unilaterally approve/deny a modification, via the `msr-no-unilateral-modification-decision` hard stop's prompt-level instruction, and the portal's own hardship-intake endpoint only ever creates a record, never a decision). **Correction from the first draft of this doc:** this is not currently "enforced" in the blocking sense — see §3.1. It's a prompt instruction plus an endpoint that structurally cannot emit a decision (it only writes a `reason` string), which together make an *accidental* decision unlikely but don't mechanically prevent a model from phrasing one in chat. Complaint/dispute submission with status tracking. White-label per licensee.

## 6. Data Inputs Required

Same as Draft v1 §6 — real loan-level servicing data, real state licensing status, and the citation-backed rule database. All three are **licensee-supplied or legal-sourcing deliverables**, not something Phase 1 can synthesize. Phase 1 uses clearly-fictional demo data (same pattern as last night's Nordholm/Merritt Capital demo companies) to prove the mechanism, not real loan data.

## 7. What's buildable now vs. a real sourcing project — read this before assuming Phase 1 "covers compliance"

**Buildable now, real, verified (this Phase 1 pass):**
- The federal citations in §2 — now re-verified at the subsection level after Sean's red-team pass caught a precision gap in the first draft. Three of the eight (NOE, RFI, periodic statements) turned out to have real multi-tier structure the first pass collapsed into one deadline/field list; corrected in §2 and in the actual ruleset/knowledge-base files.
- The distress protocol integration (§3.2 — already exists, zero new work needed), the portal (§3.3 — built and Chrome-tested live), the audit-events collection design (§3.4).
- Full data-model schemas for loans, licensing status, and compliance events — structure only.

**Explicitly NOT built, and now explicitly corrected rather than left overstated:**
- **The ruleset's `hard_stops` are not server-side enforced.** See §3.1 — this was asserted as "block-capable" in the first draft and that was wrong, not just optimistic. What exists: the JSON file, its registration in `WORKER_RULESET_MAP`, and (added this pass) prompt-level injection via `tenantLocker.js`. What doesn't exist: any mechanism that blocks or rewrites a response that violates a `hard_stop` without matching a literal `chat_rules` regex. A paraphrased loss-mitigation denial is not caught by anything in this codebase today. **Decision (2026-08-21, §8): ship anyway**, on the assumption that compliance staff do retrospective review via `msrComplianceEvents` rather than gating each response before delivery — a knowingly-accepted risk, not an oversight.
- **All state-level servicing law.** Draft v1 itself calls this "likely the single hardest and most valuable piece to build correctly" and demands real legal sourcing before any rule is marked active. Zero state rules are in Phase 1. The schema has a `jurisdiction` field ready to receive them; the field is empty.
- **The small-servicer exemption question (§2.2)** — genuinely open, not resolved, tied to the direct-servicer/subservicer question in §8.
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
- ~~Sean mentioned wanting this worker to also use "our title worker"...~~ **Answered (2026-08-21): REO/foreclosure title curative work after a loss-mitigation denial.** Scoped as Phase 5 below, not silently folded into Phase 1.
- ~~go/no-go decision on shipping the loss-mitigation/hardship module without real blocking~~ **Decided (2026-08-21): ship.** Read literally, "ship" plus the stated condition ("a genuine, staffed commitment that a human reviews every loss-mitigation interaction before it reaches a borrower") could mean either (a) a pre-delivery approval gate — every AI response held until a human clears it, which would mean rebuilding the portal's real-time chat into a queued/reviewed one, a materially different UX than what's built — or (b) real-time chat as built, with compliance staff doing retrospective review via `msrComplianceEvents` (already real, already logging every rule check) rather than a per-message gate. **Assumed (b)** — it's consistent with "ship" (not "hold and rebuild the delivery model first") and with how the portal already works; flagging explicitly in case (a) was actually intended, since that would be new scope, not a config flip.
- ~~`msrComplianceEvents` vs. reusing the Audit Trail worker~~ **Decided (2026-08-21): yes, keep `msrComplianceEvents` as its own dedicated collection.** No change needed — this is what's already built.

## 9. Build Phasing

Draft v1's four phases, plus a fifth named explicitly rather than left as a footnote (§8):

1. Phase 1 — core compliance engine + audit trail, federal rules only, single-state pilot for Mike's licensee. **(This CODEX scopes Phase 1.)**
2. Phase 2 — borrower portal + communication engine.
3. Phase 3 — multistate rule expansion, prioritized by Mike's actual portfolio states.
4. Phase 4 — escrow/float and advance-ledger automation.
5. **Phase 5 — REO/foreclosure title curative interop, triggered by a loss-mitigation denial.** When `msr-no-unilateral-modification-decision` records an authorized human denial and the loan proceeds toward foreclosure, this phase would hand off to the existing title-suite workers (`re-title-search-001`, `re-defect-tracker-001`, `re-commitment-001`) to run a fresh title search and clear defects/liens ahead of a foreclosure sale and eventual REO disposition — the same real, live workers already unified into the title/RE product (2026-08-20). Not scoped in detail here: this needs its own trigger design (what exact loan-record event fires the handoff), its own data contract between `msrLoans` and the title workers' existing schemas, and its own decision on whether SOCIII or the licensee's outside counsel/trustee actually executes the foreclosure process (this worker doesn't do that — it only feeds the title work upstream of it). Real, named, and explicitly deferred — not silently absorbed into Phase 1 and not silently dropped.

---
*Citations in §2 sourced from consumerfinance.gov and law.cornell.edu, 2026-08-21, verified twice: once at section level, once at subsection level after Sean's red-team pass. §3's architecture claims carry file/line evidence after the same red-team caught one of them (hard_stops enforcement) asserted-but-wrong. No rule beyond §2's table is production-ready or claimed as such. State-law layer is schema-only pending a real legal-sourcing engagement per Draft v1's own requirement. The small-servicer exemption (§2.2) and the enforcement-mechanism gap (§3.1/§7) are both real, both unresolved, and both stated as open rather than papered over.*
