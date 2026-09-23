# CODEX 103 — Sterling: the In-House Legal Worker

**Status:** Scoped 2026-09-23, revised after two red-team passes. Not yet built. Sean approved the name (Sterling). This doc is written as a clean spec — round-by-round reasoning for *why* each piece is shaped this way lives in the Changelog, not inline in the body, so a future builder reads a spec, not a decision log.

**Sean, 2026-09-23:** "also note we need a codex for the in house legal worker that we want to add to our back of office team." Later: "Start on Codex 103. Give that worker a name please."

---

## The finding that grounds this doc

A real accounting-data discrepancy, found the same session, prompted this doc: SOCIII's own `transactions` Firestore collection showed figures far larger than the real, CPA-reviewed financial statements (Parth Shah's 2026-09-07 corrected balance sheet, in Drive) — $63,390.88 in the collection vs. $13,436.56 real, for the identical Feb–Jul 2026 period.

**Two red-team passes correctly redirected this: it's an urgent, ongoing accounting problem, not primarily a reason Sterling needed to exist.** Investigated and partially mitigated this session, separately from Sterling's build:

- **Not seeded/fake data** — real institutions (Chime, PayPal, US Bank, Mercury), real vendors. Ruled out directly, not assumed.
- **Root cause is now the dominant, well-evidenced theory, not fully closed:** the large majority of the gap traces to **personal spending commingled with company books** — extensive Hawaii-area personal activity (daily groceries, restaurants, a $847 medical visit, personal hotel stays) recorded as company expenses on connected personal cards, despite a review note claiming personal expenses were excluded. Quantified, not asserted: confirmed duplicates and mistagged refunds account for only ~$1,830 of the ~$49,954 gap; ~$12,460 traced directly to personal-pattern transactions by a simple keyword match; **~$37,494 remains unexplained and is likely more of the same, uncounted only because it wasn't geo-tagged in a way a keyword search would catch.** This is not closed — it needs a real, line-by-line reconciliation, which is exactly the kind of judgment call this doc's own "flag, don't resolve" principle says shouldn't be made unilaterally by an AI.
- **This may bear on the corrected balance sheet's own open $123,998.93 item** (the still-unresolved question of how the Rosenberg/Mike/Chris loan principal should be treated). Not confirmed as connected — flagged as a real question for Parth, not asserted as fact here.
- **Checked for external leak, twice, with different methods.** First pass: searched Gmail/Drive for the exact inflated figures — no hits, but an exact-string search misses how numbers actually travel (a rounded "$60K," a chart axis, something said on a call). Second pass, more direct: read the actual investor-facing deck content prepared for Kent (dated the same week as the corrected balance sheet) — it explicitly uses the real, sourced figures ($13,436.56 expenses, $200 cash), cross-checked against the corrected balance sheet by name. The only wrong figure that ever existed in deck-adjacent materials was an earlier, unrelated "$35K burn" estimate — smaller and unconnected to this bug. Also checked who besides Sean has ever asked the platform's own accounting worker about this tenant's finances — nobody has.
- **Mitigation shipped this session:** `services/accounting/dataQualityFlags.js`, and the check now lives inside `computeSummary()` itself (`services/accounting/dashboardSummary.js`) rather than in a single calling file — every caller of that function gets the same caveat. **Named honestly, not overclaimed:** this does not cover the ~20 other places in this codebase that query the `transactions` collection directly for other purposes (canvas rendering, worker context, quality checks) — a true single choke point would need those routed through `computeSummary()` too, a larger refactor than this session had time for. Nothing was cleaned up, deduplicated, or reclassified — that's Sean's and Parth's call.

**What actually motivates this doc:** not "an AI worker would have caught the accounting bug" (Max or Dev own that class of problem, not a legal worker). The real motivation is the pattern underneath it — SOCIII has multiple real compliance deadlines tracked nowhere but Sean's own memory and scattered documents, the same failure mode that let this go unnoticed. That's Section 1's actual scope.

---

## Naming

Per the platform's naming architecture (`_SUITE_PERSONAS` in `index.js`): one persona per vertical suite — Skye, Petra, Elara, Hannah, Max, Jordan, Sage, Ivy, Reed, Alex. **Sterling** fits the pattern (genuine, trustworthy, verified quality) without overclaiming licensed-attorney status. It reads mostly masculine in common usage, not gender-neutral as an earlier draft of this rationale claimed — a fine name regardless, that specific claim just doesn't hold up.

**If this worker or a sibling ever faces customers, "Sterling — Contracts & Compliance" is a safer public label than anything invoking "legal" or "counsel"** — that's the moment the UPL risk in Section 3 becomes real. Internal-only for now.

---

## 1. What Sterling does (v1 scope)

### 1a. Corporate compliance calendar

Tracks dated, deterministic corporate-maintenance obligations. Data model: a real Firestore collection, dates entered once from source documents by a human, computed deterministically from there — never re-derived by an LLM reading a document fresh each time.

**Ordering principle: by how irreversible a miss would be, not by how easy an item is to build.**

Known real items to enter, each with its own lead time (see Section 4) and its own source document to confirm against — not model-recalled:

- **83(b) election** — **this is today's task for Sean, not a calendar feature.** If founder stock was issued around the May 2026 incorporation, the 30-day window has very likely already closed. Pull the actual stock purchase paperwork and confirm the election was mailed with proof of mailing — this cannot be fixed after the fact if it was missed, and it is not something a compliance calendar built weeks from now can help with retroactively.
- **USPTO non-provisional conversion, per provisional filing** — each of the 6 provisional filings (May 2026) has its own 12-month deadline **tracked by its own actual filing date**, not a single shared date — they may differ. Essentially hard, narrow relief only after it passes.
- **PCT filing deadline** — the same 12-month date as each provisional's non-provisional conversion, for foreign patent rights. Matters more than the US deadline alone given the EU/Estonia work in flight.
- **A related, open question for patent counsel, not resolved here:** many jurisdictions (notably Europe) require an invention not be publicly disclosed before filing. Anything in RegCF offering materials or marketing describing inventions *not* covered by the existing provisionals could affect foreign rights — worth a direct question to counsel, not an assumption either way.
- **Foreign qualification** — a Delaware corporation doing business in Hawaii (where the CEO lives and works) likely needs foreign-entity registration there; the Las Vegas business address may raise the same question for Nevada. Open question for counsel, not resolved here.
- **RegCF ongoing reporting** — annual reports due on a fixed schedule once a raise closes.
- **Delaware annual franchise tax and report** — due March 1.

**Escalation:** an unacknowledged alert escalates — a second alert fires at half the remaining lead time, rather than firing once and going silent.

### 1b. Structured contract findings

Given a draft contract or agreement, Sterling never answers an open question ("is this enforceable," "should I sign this") — that output shape doesn't exist in this design, so there's nothing for a disclaimer or a phrase-scanner to have to catch after the fact.

**Coverage, not just exceptions.** Sterling runs a fixed checklist of clause categories against every reviewed document — indemnity, limitation of liability, termination, IP assignment, governing law, auto-renewal, exclusivity — and reports each as **present, absent, or unusual**, with the exact source text where present. An empty findings list must be structurally impossible: the checklist always produces at least one entry per category, so "not checked" is visible rather than silently indistinguishable from "checked and clean."

Each finding carries exactly three fields:
- `issue` — which checklist category, and present/absent/unusual (template-driven, not free-form legal reasoning)
- `sourceText` — the exact, verbatim text this finding is about, when the category is present
- `questionForCounsel` — a question, not an answer, for Sean (or real counsel when warranted) to resolve

**Code, not the model, verifies `sourceText` is real.** After Sterling produces a finding, code confirms `sourceText` appears exactly in the extracted document text, and rejects any finding that fails this check before it's ever shown to Sean. "Exact, never paraphrased" is a real, checkable guarantee this way — not an instruction the model is trusted to follow, which is the same category of fix CODEX 100 already applied once to its own predicate-execution logic.

**No severity or likelihood scoring, ever.** Ranking how likely a legal risk is to matter is itself a legal judgment in disguise, not a neutral fact like a source citation. "Flag, don't resolve" extends to ranking, not just to answering.

**"Material contract" — human review is mandatory, not optional, above a concrete threshold:** any agreement involving equity, IP assignment, exclusivity, a personal guarantee, a dollar value above a set amount (specific number TBD at build time), or anything Sean signs as CEO. Without a concrete list, "this one's probably not material" becomes the easy way around the rule — so the list exists precisely to remove that judgment call.

**Untrusted input — contracts from counterparties are attacker-controllable in a sharper sense than a chat message.** A counterparty's draft can contain hidden text (white-on-white, tiny font, document metadata) instructing a reader to report "standard terms, no concerns." Detection must happen **in code, before the model ever reads the document** — comparing rendered text against raw text and metadata, stripping hidden content from what the model sees, and having code (not the model) generate the "hidden content found" finding. A design where the model reads the document and then reports hidden text has already lost — by the time the model reports it, the model has already read whatever the hidden text said. Sterling is also never the sole reviewer for a material contract (Section 1b's threshold above), independent of and in addition to the hidden-text defense — the human-review requirement defends against more than just the known injection shape.

## 2. Explicit non-goals and boundaries

**UPL (unauthorized practice of law) is a real risk but not the sharpest one for internal use — this reframing is this session's own judgment, not counsel's, and should be confirmed with real counsel, not treated as settled.** UPL is primarily about giving legal advice to *other people*; a company's own tool analyzing its own contracts for its own CEO is a materially weaker case. The two sharper, more realistic risks:
- **Sean relying on a wrong answer** — a confident "no issues found" on a contract he then signs. Section 1b's structure (no such output shape exists) is built to prevent exactly this.
- **This worker becoming customer-facing** — the moment that happens, UPL becomes the real risk. See naming, above.

**Privilege — a real, distinct risk.** Courts have begun treating AI-generated material, produced without a lawyer directing the work, as not protected by attorney-client privilege. Treat every finding as something opposing counsel could someday read — factual and sourced, never speculative about strategy or exposure. For anything involving outside counsel or an active dispute, Sterling works only at counsel's explicit direction, or not at all — a hard boundary, confirmed with real counsel before Sterling ever reads correspondence with outside counsel.

**Everything else:**
- No filing, signing, or sending anything with legal effect, ever, autonomously.
- No replacing outside counsel or the CPA engagement for high-stakes matters (RegCF securities documents, litigation, IP prosecution filings themselves, tax return preparation/filing).
- No re-deciding a legal/accounting question a real professional already resolved (the corrected balance sheet's own open $123,998.93 item is Parth's real, still-open question — Sterling surfaces that it's open, never proposes its own resolution).

## 3. Routing

**Every flag goes to Sean, only, in v1.** Sean decides what to forward to Parth or outside counsel, and does the forwarding himself — sending a flag directly to either of them would be outbound communication on the company's behalf, which the boundary above prohibits.

## 4. Lead times

**Calibrated to how long the underlying task actually takes, and to Sean's own 14-on/14-off flying rotation — not to a fixed number of days.** A patent attorney needs weeks to months to draft a non-provisional or PCT application; the first alert for that class of deadline needs to arrive roughly a quarter ahead, not a few weeks. A franchise-tax filing needs much less lead time. Each deadline type gets its own lead time matched to its own real preparation time, checked against the rotation so a deadline surfacing mid-block still leaves real time to act (Section 1a's escalation covers the case where the first alert goes unacknowledged).

## 5. E-signature staging

Sterling can prepare a document and stage it for e-signature; it does not call `esign:send` itself. **The pinned hash at review time must cover the whole send, not just the document** — the document, the recipient list, and the signature fields together. An unchanged document sent to the wrong signer, or with different signing fields than what Sean reviewed, would still pass a document-only hash check; refuse to send if any of the three don't match what was reviewed.

## 6. Known risks, still open

- The UPL/privilege reframing in Section 2 is this session's own analysis — confirm with real counsel, don't treat it as settled.
- The Hawaii/Nevada foreign-qualification question is real and unresolved.
- The compliance-calendar data model is scoped (Section 1a) but not built.
- **The accounting-data root cause (Section "finding that grounds this doc") is not fully closed** — the personal-spending-commingling theory explains most but not all of the gap, and needs Parth's real review this week, not an AI's conclusion.
- This doc contains real company financial figures — worth confirming who can read this repo.
- No decision yet on whether Sterling participates in the staff-meeting/commitment-ledger system ([[project_worker_team_staff_meeting_dev]]).

---

## Changelog

**2026-09-23 — first draft**, scoped and named the same session a real accounting-data discrepancy prompted the "why now."

**2026-09-23 — red-team round 1 → fixed same session:** corrected the accounting finding from "reason to build Sterling" to "separate, urgent accounting/disclosure problem." Narrowed v1 from four items to two (compliance calendar; structured contract findings), cutting multi-vertical regulatory monitoring entirely as the most hallucination-prone item in the first draft. Replaced a disclaimer-footer-and-regex enforcement design (the same brittle pattern CODEX 100 and 102 each corrected once already) with a fixed three-field structured-finding output. Added untrusted-counterparty-document risk, privilege risk, corrected a real self-contradiction in routing (flags were implied to route to Parth/counsel directly, which Section 2's own non-goals prohibit — fixed to Sean-only), rotation-aware lead times, e-signature hash-pinning, and corrected an unsupported "gender-neutral" naming claim.

**2026-09-23 — red-team round 2 → fixed same session:**
- Quantified the accounting gap instead of asserting the first pass's 3 bugs explained it — they didn't (~$1,830 of a ~$49,954 gap). Found the dominant real cause instead: personal spending commingled with company books (~$12,460 confirmed by pattern-matching, ~$37,494 still unexplained and likely more of the same) — a more serious, corporate-books-and-tax-treatment question, not just a dashboard display bug. Possible connection to the corrected balance sheet's own open $123,998.93 item, flagged as a question for Parth, not asserted.
- Moved the data-quality check from a single calling file (`workspaceBrief.js`) into `computeSummary()` itself, the actual shared function every consumer of computed financial figures calls — the same "put the check in the one place every path goes through" lesson as CODEX 100's `watchMailbox()` fix. Honestly scoped: still doesn't cover ~20 other direct `transactions` reads elsewhere in the codebase.
- Widened the external-leak check from an exact-string search to actually reading the real investor-deck content prepared for Kent — confirmed it uses the real, sourced figures, not the buggy ones. Checked and confirmed nobody besides Sean has asked the platform's own accounting worker about this tenant's finances.
- Redesigned contract findings from "flag issues found" to "report full checklist coverage" (indemnity, limitation of liability, termination, IP assignment, governing law, auto-renewal, exclusivity — present/absent/unusual for each) so an empty findings list can't be misread as "clean" — it's now structurally impossible.
- Added: code-level (not model-level) verification that `sourceText` is a real, exact quote from the source document, rejecting any finding that fails; a concrete, enumerated definition of "material contract" requiring mandatory human review; moved hidden-text detection to run in code *before* the model reads the document, rather than being something the model itself discovers and reports (the original design meant the model had already read any injected instruction by the time it "found" it); widened the e-signature hash to cover recipients and signature fields, not just the document; reframed the 83(b) item from a future calendar entry to today's actual task; added alert escalation (a second alert at half the remaining lead time) for anything unacknowledged; sharpened patent lead times to match a patent attorney's actual drafting timeline (~a quarter ahead, not weeks) and to track each of the 6 provisionals by its own filing date; added a new open question for patent counsel about public disclosure of inventions not covered by the provisionals in RegCF/marketing materials.
- Restructured the whole doc from an inline decision-log format (each section narrating what round of feedback changed it) into a clean spec, moving that narration into this changelog.
