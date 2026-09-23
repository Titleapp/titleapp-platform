# CODEX 103 — Sterling: the In-House Legal Worker

**Status:** Scoped 2026-09-23, revised same night after a red-team pass caught real design gaps before anything was built. Not yet built. Sean approved the name (Sterling); the redesign below is what should actually get built, not the first draft.

**Sean, 2026-09-23:** "also note we need a codex for the in house legal worker that we want to add to our back of office team." Later, same session: "Start on Codex 103. Give that worker a name please."

---

## The finding that grounds this doc, corrected

The first draft of this doc was triggered by a real accounting-data discrepancy found the same session: SOCIII's own `transactions` Firestore collection showed figures wildly different from the real, CPA-reviewed financial statements (Parth Shah's 2026-09-07 corrected balance sheet, in Drive).

**The red-team pass correctly identified that this framing had it backwards: the discrepancy is an urgent accounting/disclosure problem to act on immediately, not a reason Sterling needed to exist.** Acted on the same session, separately from this doc:

- **Root cause found and confirmed, not guessed at.** It is real transaction data (real institutions — Chime, PayPal, US Bank, Mercury; real vendors — Anthropic, Cloudflare, actual travel bookings), **not seeded/fake demo data** (the round-2 red-team's hypothesis, checked and ruled out). Three real, distinct data-quality bugs, confirmed by direct query: (1) refunds inconsistently tagged `classification: "expense"` instead of `"refund"`, so they aren't excluded from revenue sums the way properly-tagged refunds are; (2) 8 confirmed exact-duplicate transaction imports (same date/description/amount/direction appearing twice); (3) at least one personal expense (a Target purchase in Hilo, HI — Sean's own area) not actually excluded despite a review note claiming personal expenses were filtered out. Even after correcting for a separate mistake in this session's own first-pass analysis script (which didn't exclude `internal_transfer`-classified rows and overstated the gap further), a real, large gap remains: $63,390.88 in the collection vs. the real $13,436.56 CPA-reviewed figure for the identical Feb–Jul 2026 period.
- **Checked whether any of it reached outside the company** — searched Gmail and Drive for the specific inflated figures. No hits. This is a real but bounded check (exact-string search only, not a guarantee against every possible channel or phrasing) — reported honestly as that, not as a clean bill of health.
- **Immediate mitigation shipped this session, not deferred to Sterling's eventual build:** a new `accountingDataQualityFlags` collection and `getDataQualityFlag`/`setDataQualityFlag` functions (`services/accounting/dataQualityFlags.js`). SOCIII's own tenant is flagged now. `workspaceBrief.js` (which grounds Max's and Alex's answers) checks this flag and appends an explicit caveat to any finance figures it surfaces, rather than presenting a number from known-bad data with full confidence. This does **not** clean up, deduplicate, or reclassify any transaction — per this doc's own "flag, don't resolve" principle applied to this session's own actions, deciding which specific records are duplicates or personal expenses is a human/CPA judgment call (Sean, ideally with Parth), not something to guess at unilaterally against real financial records.

**What actually motivates this doc, correctly stated:** not "an AI worker would have prevented this" (a generic-purpose accounting worker — Max, or Dev's existing cross-source-consistency instincts — is the right owner of catching this class of bug, not a legal worker; CODEX 103 is scoped narrower, see below). The real motivation is the pattern underneath it: SOCIII has multiple real compliance/legal deadlines (patent conversion, 83(b) elections, foreign qualification, franchise tax, RegCF reporting) tracked nowhere except Sean's own memory and scattered documents, the same failure mode that let the accounting divergence go unnoticed. That's a compliance-calendar problem, and it's the sharpest, most valuable, lowest-risk piece of this doc — see Section 2.

---

## Naming rationale

Per the platform's real, committed naming architecture (2026-09-05, `_SUITE_PERSONAS` in `index.js`): one persona per vertical suite — Skye, Petra, Elara, Hannah, Max, Jordan, Sage, Ivy, Reed, Alex.

**Sterling** — chosen for the connotation (genuine, trustworthy, of verified quality) without overclaiming licensed-attorney status. **Red-team correction:** the first draft's naming rationale called this "gender-neutral" — that claim doesn't hold up; the name reads mostly masculine in common usage. Corrected here rather than repeated: it's a fine name on its own merits, the gender-neutral framing was a stretch not worth defending.

**A second, sharper naming concern, from the red-team pass:** the label **"In-House Legal Worker" itself risks implying counsel** the moment this appears in any customer-facing marketing or a future decks/roadmap slide — which is exactly the scenario where the UPL risk this doc names becomes real (Section 3). If this worker or a sibling ever faces customers, "Sterling — Contracts & Compliance" (or similar) is a safer public label than anything invoking "legal" or "counsel." Internal-only for now; naming this explicitly so it isn't lost before the name spreads through decks and code.

---

## 1. What Sterling does (v1 scope — narrowed by the red-team pass)

**Red-team correction: the first draft's v1 scope was too broad, mixing the doc's most valuable piece (compliance calendar) with its most hallucination-prone, most advice-like piece (multi-vertical regulatory monitoring) and its most legally fraught piece (open-ended contract Q&A). Narrowed here to two things:**

### 1a. Corporate compliance calendar — the actual v1 focus

Tracks dated, deterministic corporate-maintenance obligations. Per the red-team pass, specific real dates to verify and enter (not model-recalled, not guessed — sourced once from real documents, by a human, then computed deterministically going forward):

- **USPTO non-provisional conversion deadline** — 12 months from each of the 6 provisional filings (May 2026), essentially hard with only narrow relief after it passes.
- **PCT filing deadline** — the **same 12-month date** as the non-provisional conversion above, for foreign patent rights. Given the EU/Estonia entity work already in flight, this may matter more than the US deadline and was missing from the first draft entirely.
- **83(b) election** — if founder stock was issued around the May 2026 incorporation, the 30-day window has very likely already closed. This item is "confirm an election was actually filed" (a fact-finding task, urgent, do now), not a calendar entry for the future — it cannot be fixed after the fact if it was missed.
- **Foreign qualification** — a Delaware corporation doing business in Hawaii (where the CEO lives and works) likely needs foreign-entity registration there; the Las Vegas business address may raise the same question for Nevada. Needs a real answer, not an assumption either way — flagged as a question for counsel, not resolved here.
- **RegCF ongoing reporting** — annual reports come due on a fixed schedule once a raise closes.
- **Delaware annual franchise tax and report** — due March 1.

**Ordering principle (red-team correction):** order the calendar by how irreversible a miss would be, not by how easy an item is to build. An 83(b) miss is unrecoverable; a franchise-tax late fee is not. Build accordingly.

**Data model:** a real Firestore collection, dates entered once from source documents by a human, computed deterministically from there — not re-derived by an LLM reading a document fresh each time (this was already flagged as a real gap in the first draft; restated here as the actual v1 requirement, not an open question).

### 1b. Structured contract findings — replaces open-ended contract Q&A

**Red-team correction, the single most important architectural fix in this pass:** the first draft's "contract review" item implied Sterling could answer open questions like "is this enforceable" or "does this look okay to sign." A mandatory disclaimer footer and phrase-scanning for words like "enforceable" (the first draft's proposed enforcement mechanism) is exactly the brittle, prompt-instruction-dependent pattern this whole codebase's own track record (CODEX 100, twice) has already shown doesn't hold up — a footer becomes invisible within a week of daily use, and a regex misses paraphrases while blocking legitimate quotes from the contract itself.

**Fixed by constraining the output's structure, not by scanning its content:** given a draft contract or agreement, Sterling produces **only** a list of structured findings, each with exactly three fields:
- `issue` — what's unusual or inconsistent (a fixed, template-driven description, not free-form legal reasoning)
- `sourceText` — the exact, verbatim text from the document this finding is about (never paraphrased — paraphrase is where a subtle misstatement of a legal document's actual language could hide)
- `questionForCounsel` — a question, not an answer, for a human (Sean, or real counsel when the matter warrants it) to resolve

**Sterling never answers "is this enforceable," "should I sign this," or any other question that resolves to a legal conclusion.** Not because a disclaimer says not to — because that output shape doesn't exist in this design. This is deterministic-structure-as-enforcement, the same lesson CODEX 100's own predicate-execution fix already established: a structural guarantee holds up better than a check on free-form prose ever will.

**Consistency checks (kept from the first draft, narrowed to this same structured-finding shape):** when two documents that should agree about the same fact don't (loan balances, entity name, incorporation date, EIN), Sterling reports it the same way — the two conflicting values and their sources, never picking one and presenting it as resolved.

**No severity or likelihood scoring, ever — round-2 addition.** The red-team pass caught this precisely: ranking how likely a legal risk is to matter is itself a legal judgment in disguise, not a neutral fact like a source citation. "Flag, don't resolve" extends to ranking, not just to answering.

## 2. Untrusted input — contracts from counterparties, round-2 addition

**A risk specific to a contract reviewer, not covered by this doc's general injection-risk language elsewhere (CODEX 102's `ask_worker` risk is a different shape).** A counterparty's draft contract is attacker-controllable input in a sharper sense than a chat message: it can contain hidden text (white-on-white, tiny font, or document metadata) instructing a model reader to report "standard terms, no concerns found." Two required mitigations, not optional hardening:

1. **Text extraction must expose hidden content, not just visible-rendered text** — and any hidden content found is itself a structured finding (`issue: "hidden/non-visible text found in source document"`, with the hidden text itself as `sourceText`), never silently stripped or silently obeyed.
2. **Sterling is never the sole reviewer for a material contract.** For anything that actually matters, a human review remains required regardless of what Sterling's findings say — this is a belt-and-suspenders requirement, not redundant with the injection mitigation above, because the injection mitigation only defends against the *known* attack shape.

## 3. Explicit non-goals and boundaries — reframed by the red-team pass

**Round-2 correction to the risk framing itself:** the first draft treated unauthorized practice of law (UPL) as this worker's single largest risk in the abstract. **The red-team pass is right that this overstates the internal-use case and understates two sharper, more realistic risks — though this reframing itself should be confirmed with real counsel, not treated as settled by an AI's own risk analysis:**

- UPL is primarily about giving legal advice to *other people*. A company's own AI tool analyzing its own contracts for its own CEO is a materially weaker UPL case than the first draft implied — likely still worth a real conversation with counsel, but not the sharpest risk in this design.
- **The realistic, sharper risk is Sean relying on a wrong answer** — a confident, polished "no issues found" on a contract he then signs. This is exactly what Section 1b's structured-findings-only redesign is built to prevent: there is no "no issues found, looks good" output shape available; there are only specific findings with sourced text and open questions.
- **The second sharper risk is this worker (or a sibling) becoming customer-facing.** The moment "Sterling" or anything like it interacts with someone other than SOCIII's own team, the UPL risk the first draft named becomes the real one — see the naming section above.

**Privilege — a real, distinct risk the first draft didn't address at all, round-2 addition:** courts have begun treating AI-generated material, produced without a lawyer directing the work, as not protected by attorney-client privilege. Concrete consequences for this design:
- **Treat every `legalFindings` entry as something opposing counsel could someday read.** Write findings accordingly — factual, sourced, never speculative about strategy or exposure.
- **For anything involving outside counsel or an active dispute, Sterling works only at counsel's explicit direction, or not at all.** This is a hard boundary, not a preference — confirm the exact line with real counsel before Sterling ever reads correspondence with outside counsel.

**Everything else from the first draft's non-goals stands, restated for clarity:**
- No filing, signing, or sending anything with legal effect, ever, autonomously. Sterling drafts findings; a human decides and executes.
- No replacing outside counsel or the CPA engagement for genuinely high-stakes matters (RegCF securities documents, litigation, IP prosecution filings themselves, tax return preparation/filing).
- No re-deciding a legal/accounting question a real professional already resolved (the corrected balance sheet's own open $123,998.93 item is Parth's real, still-open question — Sterling surfaces that it's open, never proposes its own resolution).

## 4. Routing — corrected, a real conflict the first draft had in it

**Round-2 correction: the first draft's routing plan directly conflicted with its own non-goals.** Section 3 (both drafts) prohibits autonomous outbound communication; the first draft's Section 4 nonetheless implied flags could route "to Parth vs. outside counsel vs. Sean" as if that were just an implementation detail. Sending a flag directly to Parth or outside counsel **is** outbound communication on the company's behalf — the exact thing prohibited above.

**Fixed: in v1, every flag goes to Sean, only.** Sean decides what to forward to Parth or outside counsel, and does the forwarding himself. No exceptions in v1.

**Lead time — round-2 addition, a real operational constraint the first draft missed:** Sean flies 14-on/14-off. A patent-deadline alert surfacing mid-rotation with 5 days of lead time is effectively a missed deadline. Compliance-calendar alerts need lead times of **weeks**, not days, calibrated to that rotation — not the same escalation cadence CODEX 100 uses for its own, differently-shaped alerts.

## 5. E-signature staging — needs the same protection CODEX 100 established

Sterling can prepare a document and stage it for e-signature; it does not call `esign:send` itself (unchanged from the first draft — matches this platform's own action-category boundary for anything irreversible and externally visible).

**Round-2 addition:** the staged document's hash must be pinned at the moment Sean reviews it, and the send must refuse if what would actually be transmitted doesn't match that pinned hash — the same tamper-detection principle CODEX 100 built for `capabilityGates.js` (hash-pin the reviewed-and-approved version; any mismatch fails closed), applied here to "the document Sean approved" vs. "the document that's about to go out."

## 6. Known risks, still open after this pass

- **Reframing the UPL/privilege risk analysis above is this session's own judgment, not counsel's** — the one-line disclaimer at the top of this doc's own red-team input applies here too: confirm with real counsel, don't treat this doc's risk analysis as settled.
- **Foreign-qualification question (Hawaii, Nevada) is a real open question, not resolved here** — needs a real answer from counsel, one way or the other, before it becomes a compliance-calendar entry with a specific deadline.
- **The compliance-calendar data model (a real Firestore collection, human-sourced dates) is still unbuilt** — scoped in Section 1a, not yet built.
- **This doc itself contains real company financial figures** (round-2 point, minor but real) — worth a one-line confirmation of who can read this repo, same as any doc containing real financial detail.
- **No decision yet on whether Sterling participates in the staff-meeting/commitment-ledger system** ([[project_worker_team_staff_meeting_dev]]) — reasonable eventually (compliance-calendar items are exactly the kind of dated commitment that system already models), not scoped here.

---

## Changelog

**2026-09-23 — first draft, scoped and named same session as a real, live accounting-data discrepancy prompted the "why now."**

**2026-09-23 — red-team pass (external review) → mostly fixed same session, some deliberately left as open questions for counsel:**
- The accounting-data finding was corrected from "reason to build Sterling" to "urgent, separate accounting/disclosure problem" — investigated for real (root cause confirmed: real data with 3 specific bugs, not seeded fake data; checked for external leak, none found via search), and mitigated for real (`accountingDataQualityFlags` collection + `workspaceBrief.js` caveat, shipped and deployed this session, independent of Sterling's own build).
- V1 scope narrowed from four items to two: compliance calendar (sharpened with real, specific dates including the previously-missing PCT deadline and the urgent 83(b) check) and structured contract findings (redesigned from open-ended Q&A + disclaimer-footer enforcement to a fixed three-field output shape, closing the same "stated intent, not enforced fact" gap CODEX 100 and 102 both found in their own first drafts).
- Added: untrusted-counterparty-document risk (hidden text), privilege risk, corrected routing (Sean-only in v1, fixing a real self-contradiction in the first draft), rotation-aware lead times, e-signature hash-pinning, and a corrected (weaker) naming claim.
- Cut from v1 entirely: multi-vertical regulatory monitoring — the broadest, most hallucination-prone, most advice-like item in the first draft.
