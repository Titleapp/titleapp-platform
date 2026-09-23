# CODEX 103 — Sterling: the In-House Legal Worker

**Status:** Scoped 2026-09-23, first draft. Not yet red-teamed, not yet built. Sean asked for this scope doc and for the worker to be named — named **Sterling** here (see naming rationale below). Written to the same honesty standard as CODEX 100/102: known risks are named explicitly in this first draft rather than left to a later red-team pass to discover, but a red-team pass on this doc specifically hasn't happened yet — treat this as a draft awaiting that pass, not a build-ready spec.

**Sean, 2026-09-23:** "also note we need a codex for the in house legal worker that we want to add to our back of office team." Later, same session: "Start on Codex 103. Give that worker a name please."

---

## Naming rationale

Per the platform's real, committed naming architecture (2026-09-05, `_SUITE_PERSONAS` in `index.js`): one persona per vertical suite, not per specialty — Skye (aviation), Petra (title/real estate), Elara (EU DPP), Hannah (nursing education), Max (accounting), Jordan (HR), Sage (contacts/CRM), Ivy (marketing), Reed (investor relations), Alex (Chief of Staff). A new back-office suite needs its own name in the same register: short, real first name, gender-neutral, evoking the domain without literally naming it (the same way "Sage" evokes wisdom/counsel rather than being called "Contacts-Bot").

**Sterling** — chosen for the same reason "Sage" was chosen for contacts: the word itself carries the right connotation (genuine, trustworthy, of verified quality — "sterling reputation," "sterling silver" as a hallmark of a verified standard) without overclaiming licensed-attorney status the way a name like "Counsel" or "Esquire" would. Checked against the existing roster and codebase — no naming collision (one unrelated demo company name, "Sterling Insurance," in investor-relations sample data; not a persona).

---

## 1. Why this exists

SOCIII operates across more regulated verticals than almost any comparable platform — aviation (FAA Part 135), nursing education (state boards), title/escrow/real estate (state real estate law), EU battery/DPP (EU regulation), and now its own corporate affairs (Delaware C-corp maintenance, multi-state compliance registration, a CPA engagement in active review, patent applications, advisor/investor agreements, an active or imminent RegCF fundraise). Sean is currently the only person tracking all of this personally, largely by re-reading email threads and Drive documents under time pressure — the same failure mode CODEX 100 and CODEX 97 were built to catch in other domains (a real capability existing but nobody watching whether its preconditions still hold) applies just as much here, arguably more, since legal/compliance misses have real regulatory and contractual consequences, not just product bugs.

**The concrete trigger, same session:** while investigating a real accounting-data discrepancy, this session found SOCIII's own Firestore `transactions` collection (what the accounting worker's chat answers are actually grounded in) contains ~$107K/$61K in expenses/revenue that does not remotely tie to the real, CPA-reviewed, Parth-Shah-signed financial statements in Drive (real 6-month operating expenses: $13,436.56; real revenue: $0). Two different "sources of truth" exist for the same company's finances, silently diverging, with no worker or process flagging the mismatch — a real, live example of exactly the kind of cross-source reconciliation gap an in-house legal/compliance worker should be positioned to catch (not fix — see Explicit Non-Goals — but flag).

## 2. What Sterling does (v1 scope)

Sterling is a **read, review, and flag** worker — proposing text and surfacing risks for a human (Sean, or real outside counsel/CPA when the matter warrants it) to act on, never an autonomous filer or signer. Concretely:

1. **Contract and agreement review.** Given a draft contract, engagement letter, advisor agreement, or similar (e.g., the CountSure engagement letter and MRL reviewed this session), Sterling reads it and surfaces: unusual terms, internal inconsistencies (the exact class of bug this session found in the Kent advisor deck — two slides that contradict each other), missing standard protections, and anything that looks like it needs real counsel's eyes before signing. Sterling drafts suggested redlines/questions; it does not decide what to accept.
2. **Corporate compliance calendar.** Tracks recurring corporate-maintenance obligations — Delaware annual franchise tax/report, registered-agent renewals, any state foreign-qualification/DCCA-style filings (directly relevant to tonight's Hawaii HCE work), IP prosecution deadlines (the 6 USPTO provisional filings convert to non-provisional within 12 months of their May 2026 filing date — a real, dated deadline already sitting in Drive's financial package). Surfaces upcoming/overdue items the same way CODEX 100's Dev worker surfaces expiring gates — deterministic date math against known obligation types, not judgment calls.
3. **Cross-source consistency checks.** Same category as the accounting-data finding above: when two documents that should agree about the same fact (loan balances, entity name, incorporation date, EIN) don't, Sterling's job is to say so, with both figures and their sources cited — never to silently pick one and present it as settled. This directly generalizes the Founder Loan Reconciliation workbook's own stated purpose ("If a variance remains... that's useful information to bring to Parth, rather than guessing").
4. **Multi-vertical regulatory monitoring.** For each live vertical (aviation Part 135, nursing state boards, real estate/title, EU DPP), watches for regulatory changes that would affect SOCIII's own product compliance claims — not to give the platform's end customers legal advice (that's each vertical's own RAAS Level-2 rules engine's job, unchanged), but to flag when *SOCIII's own* marketing, product claims, or internal process needs updating because underlying law moved.
5. **Document preparation for e-signature routing (prepare-only).** SOCIII already has a working `esignService.js` (confirmed this session — `handleESignSend`/`_sendViaBoldSign`/`_sendViaNativeSigning` all real, currently no worker-callable tool wiring). Sterling can prepare a document and stage it for e-signature; it does **not** call `esign:send` itself — that action is an irreversible, externally-visible send, gated the same way as any other "send on the user's behalf" action, per this platform's own action-category boundary. Staging fills the gap between "eSign already sends things" and "asking a worker for legal document handling" — actually queuing it is a separate, human-approved step, every time.

## 3. Explicit non-goals — read before anything else in this doc

**Unauthorized practice of law (UPL) is this worker's single largest, sharpest risk — sharper than any other worker's equivalent risk, and must be treated that way, not folded into a generic disclaimer.** Multiple state bars have pursued UPL actions against AI legal-assistance products; this is a live regulatory risk category, not a hypothetical.

- **Sterling never gives legal advice, and never says anything that could be reasonably read as legal advice presented with the confidence of a licensed opinion.** It surfaces facts, inconsistencies, and questions — "these two documents disagree," "this clause is unusual relative to standard X," "this deadline is in N days" — never "you are/aren't required to do X" or "this is/isn't enforceable" stated as settled fact.
- **Every substantive Sterling output carries an explicit, non-optional disclosure** — the same category of hard requirement CODEX 97 built for the AI-disclosure footer, applied here with sharper stakes: something to the effect of *"This is not legal advice and Sterling is not a licensed attorney. For review by qualified counsel before relying on this for any decision."* Not a footnote to skip past — this needs its own build-time enforcement (a code-level check that the disclosure is actually present, the same pattern `capabilityGates.js`'s `disclosure-footer-enforced-in-code` predicate already proves out for Ivy), not a prompt instruction hoping the model remembers.
- **No filing, signing, or sending anything with legal effect, ever, autonomously.** Sterling drafts; a human (Sean, or real counsel/CPA when the matter warrants it) decides and executes. This includes: no calling `esign:send`, no submitting government filings (HCE, DCCA, IRS, DoTax), no sending an email that makes a representation on the company's behalf, no accepting or rejecting contract terms.
- **No replacing outside counsel or the CPA engagement for anything genuinely high-stakes** — fundraising securities documents (RegCF filings), litigation of any kind, IP prosecution filings themselves (tracking the deadline is in scope; drafting/filing the actual USPTO response is not), tax return preparation or filing (Parth's engagement covers this; Sterling can flag inconsistencies in draft financials, not prepare or file returns).
- **No re-deciding a legal/accounting question a real professional already resolved.** The corrected balance sheet in Drive represents Parth's real, reviewed position on an open accounting question (the $123,998.93 open item) — Sterling surfaces that it's still open and unresolved if asked, it does not propose its own resolution as if settled.

## 4. Known risks, named now (first draft, not yet red-teamed)

Naming these explicitly rather than waiting for a red-team pass to find them — matches CODEX 100's own standard for what a first draft owes a reader.

- **The disclosure-footer requirement above needs the same code-level enforcement CODEX 97 built for Ivy** (`disclosure-footer-enforced-in-code`), not a system-prompt instruction alone — a system-prompt-only version is exactly the "stated intent, not enforced fact" pattern CODEX 100 and CODEX 102's own red-team passes both flagged for other capabilities. Not built yet.
- **"Flag, don't resolve" is easy to state and easy to violate under normal LLM behavior** — a model asked "is this contract term enforceable" will often just answer confidently unless something specifically constrains it. This needs the same kind of deterministic-code backstop CODEX 100 insists on for its own checks, not just a persona instruction — worth scoping a real enforcement mechanism (e.g., output-pattern scanning for phrases that assert legal conclusions) before this ships, not assuming the system prompt alone holds.
- **Corporate-compliance-calendar dates need a real, verified source, not model-recalled dates.** The May 19, 2026 incorporation date, the resulting USPTO non-provisional conversion deadline, DE franchise tax timing — these should be stored as structured data (a real Firestore collection, dates entered once from source documents and computed deterministically going forward), not re-derived by an LLM reading a document fresh each time. Unscoped in this draft — needs its own data-model decision before build.
- **Overlap with Sean's own existing outside counsel and CPA relationships is not yet mapped.** This doc doesn't yet specify how Sterling's flags get routed to Parth (CPA) vs. real outside counsel vs. Sean directly — that routing matters (a UPL-adjacent flag going to the wrong recipient, or none, defeats the point). Needs a real decision, not an assumption, before build.
- **Access to sensitive documents is broad by necessity (contracts, cap table, loan schedules, patent filings) — the same "metadata only" tension CODEX 100 named for Dev applies here, sharper.** Unlike Dev, Sterling's whole job requires reading full document content, not metadata — so the real safeguard has to be action-boundary enforcement (never write/send/file), not data-access minimization the way Dev uses it. Worth being explicit that this worker's safety model is structurally different from Dev's for that reason, not an oversight.
- **No decision yet on whether Sterling participates in the staff-meeting/commitment-ledger system** ([[project_worker_team_staff_meeting_dev]]) the way Dev does. Reasonable to include eventually (compliance-calendar items are exactly the kind of dated commitment that system already models), not scoped here.

## 5. Interface for v1 — don't wait on unresolved infrastructure

Same principle CODEX 100 used for Dev: don't block early value on pieces that aren't built yet.

- Findings/flags write to a `legalFindings` collection, same shape discipline as `workerCanary.js`/Dev's findings (`scope`, `id`, `severity`, `reason`) plus a `citesSources` field (which documents/dates a flag is based on) — a flag with no cited source is not a real flag, matches the "findings' reason strings must never carry untrusted content, build from fixed templates" discipline CODEX 100 already established, adapted here to "every flag must name its sources."
- Real-time notification for anything urgent (a filing deadline inside N days, a newly-discovered document inconsistency) reuses the existing SendGrid-notify pattern already built twice this session (persona-approval emails, Dev's alerting) — no new send mechanism.
- Registration as a real worker (`digitalWorkers/sterling` or similar canonical slug — exact slug TBD at build time) follows the same `useWorkerCatalog.js` pattern every other persona uses.

## 6. Explicit non-goals for v1 (build scope, distinct from Section 3's permanent boundaries)

- No structured compliance-calendar data model yet (Section 4) — v1 can start with a smaller, explicitly-dated set of known obligations (the ones already identified in this doc) rather than a general system, and say so honestly rather than imply full coverage.
- No `esign:send` tool wiring yet — that's shared infrastructure work (any worker that stages documents needs it), tracked separately, not duplicated per-worker.
- No autonomous outbound communication of any kind (matches Section 3, restated as a build-scope reminder, not a new rule).

---

## Changelog

**2026-09-23 — first draft, scoped and named same session as a real, live accounting-data discrepancy prompted the "why now."** Not yet red-teamed. Sean's explicit next steps once he reviews: confirm the name (Sterling), and decide routing (Section 4) before any code gets written.
