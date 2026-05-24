# CODEX 51.13 — Day Snapshot (May 24, 2026 — Saturday)

**Period:** Saturday 2026-05-24, full day
**Owner:** Sean (rest day — most of the active work was deck iteration + structural planning)
**Status:** Shipped what was needed; rest itself is the headline

---

## Headline

Sean took a rest day. After three intense days of patent drafting, corporate infrastructure setup, chat platform hardening, and deck production, the right move on Saturday was sleep, not push. The active work was deck iteration (advisor → Elise; investor v3 restructure), one significant structural planning artifact (creditor warrants memo), and email drafting. Patent filing, DUNS, and Coinbase moved to Sunday.

This is a good outcome. The previous three days produced enough committed work that Saturday could be deliberately lighter without breaking momentum. The Wednesday 5/27 soft launch is still on schedule.

---

## What Shipped Today (modest by recent standards, intentionally)

### Advisor Deck Iteration → Send-Ready

Three drafts iterated (v1 → v4) for the Elise van der Bel personalization. By v4 the deck reflected the final structural decisions:

- **Equity structure locked at 2% baseline cap for all advisors.** Creator path is now warrants tracked separately from advisor equity, not an additional equity slot. This collapsed the original 0.5%/worker-up-to-2.5% scheme into a cleaner two-track model: advisors get 2% flat for advising; if they also build workers, they participate via the creator program (cash economics + separate warrants).
- **TitleApp LLC replacement clause** added for legacy advisors. Scott Eschelman, and any other LLC-era advisor, gets a mutual-release alongside their SOCIII grant.
- **Personalized "Why You" slide** confirmed working for Elise (EU DPP + ecommerce + sandbox no-code authoring). Template extends to each advisor.
- **Conversational close** (3-checkbox acceptance flow) carried forward from the advisor template.

### Email to Elise — Drafted, Refined, Sent

Two passes on the email. Final version preserved Sean's voice ("Aloha", Hawaii/SF framing, the "robot talk to my robot" line) while removing securities-law exposure (specific $25M valuation + unicorn projection language replaced with hedged "early-stage" framing). Sent.

### Investor Deck Restructure

Sean restructured the investor deck (v3) based on the principle that **investors evaluate companies first, founders second**. Three Chapters / Founder's Journey moved out of the lead position. Important Notices slide added. Why You + Closing slides added. Tech Stack moved to appendix.

Open structural question: slide 2 is still "Founder's Journey · Why This Time Will Work" — the title rebrand earns its slot, but it remains in tension with Sean's stated intent ("leading with history is wrong"). Two paths: leave it (the retitled framing reads as "proof of pattern recognition," appropriate at slot 2) or move to slot 11-12 (right before The Team, where it functions as "here's why this founder will execute"). Sean's call after rest.

### Pre-Formation Creditor Warrants Memo

`docs/specs/Pre-Formation-Creditor-Warrants-Memo-2026-05-22.md` (drafted 5/22, locked-in framing today). The morally important decision: pre-formation commitments are honored from Sean's founder allocation, not from future investors' dilution. Three-tier structure (single-venture / two-venture / three-venture) recognizes patience across the RealEx → HOM DAO → TitleApp arc. Special handling for Robert's stolen $100K. Bass family / HUB Culture follow-on framing built in.

Documented stakeholders: Robert Rosenberg, Eric Altshuler, Peter Farrley, Mike Lee, Chris Dunn, Dan Bass, Stan Stalknaker, Tony Grenberg. ~$615K total exposure across three prior ventures. Estimated creditor warrant pool: ~1.7% of company at Series A, absorbed from founder allocation, not from general pool.

---

## What Did NOT Ship (deferred to Sunday)

These were originally on Saturday's docket and slid to Sunday by deliberate Sean decision:

- **Three patent provisional filings via USPTO EFS-Web** ($360 total small entity fees). Filing 1 (Audit Trail), Filing 2 (Knowledge Capture Pipeline), Filing D (Build-Without-Code). Drafts complete; PDFs being staged tonight by Claude for Sunday morning execution.
- **DUNS application** at dnb.com ($229 expedite recommended; NAICS 541512). 20-minute task; moved to Sunday.
- **Coinbase Business account** application. KYB takes 5-10 business days; Sunday start vs Saturday start costs ~24h of approval queue time but doesn't change anything materially.
- **Brand cutover execution** — gated on Sean's SVG export from Figma; planned for Sunday once SVGs land.

---

## What Got Done Autonomously While Sean Rested (this CODEX section being written now)

Sean's explicit ask before rest: *"PLEASE PLEASE PLEASE make sure the chat is fixed and the canvas + chat is working."*

### Chat + Canvas Integrity Audit — VERIFIED ✓

Systematic verification of every chat/canvas deploy from the prior three days:

- **Chat tone strip (5/22):** all 5 marker strings still absent from the deployed code (PRICING_RULES, PERSONALITY block, VOICE MODE injection, advisor-mode framing, communication-mode stacking). No regression.
- **Phrase blocklist (5/22):** `stripCanvasClaimPhrases` deployed and verified. Runtime test: 14/14 cases pass. 7 bug-pattern outputs correctly rewritten; 6 legitimate "right"/"canvas" uses correctly preserved; 1 marker-present case correctly skipped (the blocklist doesn't run when a canvas marker is emitted, so the chat can legitimately reference the canvas it just rendered).
- **Spine sections canvas surface (5/22):** all 4 spine sections (Accounting, Contacts, CommandCenter, MarketingDrafts) have `useRightPanel` imports, `CanvasPanel` imports, and the `panel?.state === "CANVAS"` short-circuit at the top of each render.
- **Obligations tenant formation date filter (5/22):** `getTenantFormationDate` deployed and active. SOCIII workspace no longer sees pre-formation tax obligations.
- **Syntax check:** all 7 modified files parse clean via `node -c`.

The chat + canvas pipeline is stable. Sean can rest on this one.

### Three New Worker Scaffolds (in this commit)

Per Sean's directive: scaffold the new workers identified this week so they benefit from patent filings + investor capital + marketing momentum as those land.

**1. Patent Worker** (task #264) — `docs/specs/workers/patent-worker.md`
**2. Vendor & Subscription Controller Worker** (task #265) — `docs/specs/workers/vendor-controller-worker.md`
**3. Personalized Outreach Worker** (NEW concept Sean surfaced today) — `docs/specs/workers/personalized-outreach-worker.md`

The third worker captures Sean's IR→HR handoff framing: the canonical lifecycle for advisor/creator/investor recruiting is outreach (IR) → acceptance → onboarding → ongoing relationship (HR). Rather than two siloed workers, one worker with phased states.

### Patent Filing PDFs — Staged for Sunday

Three Markdown drafts converted to DOCX format via pandoc, placed in `~/Downloads/SOCIII-Patent-Filings-2026-05-25/` ready for Sunday morning:

- `Filing-1-Audit-Trail-Provisional.docx`
- `Filing-2-Knowledge-Capture-Pipeline-Provisional.docx`
- `Filing-D-Build-Without-Code-Provisional.docx`
- Plus a `00-Filing-Checklist.md` with USPTO EFS-Web step-by-step

Sunday morning Sean opens any of the three DOCX files in Word/Pages, exports to PDF, then submits via USPTO EFS-Web. No surprises.

---

## Tomorrow's Order of Operations (Sunday 2026-05-25)

In priority order:

1. **File the three patent provisionals via USPTO EFS-Web.** $360 total. Drafts + DOCX are ready in Downloads.
2. **DUNS application** at dnb.com (~20 min, $229 expedite).
3. **Coinbase Business** account application (~30-40 min, KYB submission).
4. **Brand cutover execution** if SVGs land — brandConfig flip, BrandLoader wiring, hosting deploy.
5. **Send creditor warrant outreach** to Robert, Eric, etc. (when Sean has bandwidth to personalize each one with their relationship history).
6. **Investor deck slide 2 decision** + send to one friendly first reader.

Anything beyond that is bonus.

---

## Commits in This Block

| Commit | Description |
|--------|-------------|
| (this commit) | S51.13 — Day Snapshot 5/24 + three new worker scaffolds + patent filing prep |

---

## Memory Updates

None new today. The structural decisions (warrant duration, advisor cap, creditor warrant approach, IR→HR handoff for decks) all live in the spec documents in `docs/specs/`.

---

## Strategic Note for Investor Conversations Going Forward

The single most important framing that emerged today, in the deck iteration:

> *"Investors evaluate companies first, founders second. Advisors evaluate founders first, companies second."*

Different decks for different audiences because their evaluation order is different. The advisor deck leads with the relationship and the history because that's what advisors are betting on. The investor deck leads with the company and the market because that's what investors are betting on. Same underlying truth, different sequencing. This is the kind of structural insight that comes from doing the iteration, not from reading about it.

---

*Day snapshot, written by Claude / Alex on Sean's behalf while Sean rests. Sunday is filing day.*
