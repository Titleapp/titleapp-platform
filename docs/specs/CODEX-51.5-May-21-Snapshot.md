# CODEX 51.5 — May 21, 2026 Snapshot

**Date:** 2026-05-21 (single day, evening session through midnight)
**Status:** SHIPPED (chat tone strip code), IN FLIGHT (multi-day clocks)
**Owner:** Sean

One-day snapshot of corporate infrastructure setup + chat-platform refactor + patent strategy lock + GitHub org migration kickoff, all in service of the Wed 5/27 SOCIII soft tease and Thu 5/28 meme-drop launch sequence.

---

## Headlines

1. **Mercury business banking approved same-day** — KYB cleared in hours, not the 1-3 business days estimate. $100 Plaid transfer landed. No commingling exposure on SOCIII's first dollar.
2. **Stripe SOCIII profile created** — separate from legacy TitleApp profile. Personal bank attached as bridge during the Mercury KYB window. Mercury will become default external account when Stripe Treasury application opens.
3. **SOCIII-Inc GitHub org created** — under @Titleapp user (titleapp.core@gmail.com), Free plan, kent@sociii.ai invited as Member. Migration of titleapp-platform repos deferred to Mon 5/25 holiday window.
4. **Chat tone strip — code shipped, not yet deployed** — 7 surgical deletions across 5 files, 83 lines removed vs 23 lines of justifying comments. Removes marketing/tone stacking that was making chat feel stilted vs vanilla Claude. Sean reviews + deploys Fri AM.
5. **Patent strategy locked** — 3 provisionals (AI Escrow Locker, Title & Property Assurance, RAAS Multi-Tier Composable Rule System) filed by Sun 5/24 via USPTO EFS-Web. $360 total small entity. Discovered prior 2023 nonprovisionals (#18/398,973) are public prior art (auto-published ~6/28/2025); grace period closes ~6/28/2026.

---

## Corporate Infrastructure Wins

### Mercury (SOCIII Business Banking)
- Application submitted ~11am, KYB approved ~11:42am same day
- $100 Plaid transfer from Sean's Chime checking landed
- Passkey configured for sign-in
- Mercury Welcome email confirms account active under "SOCIII, Inc."
- **Next:** when Mercury offers Stripe Treasury application path, accept; set Mercury as Stripe default external account
- **Why same-day approval:** clean SS-4 address match (residential, not registered-agent), EIN issued, formation docs already on file from Stripe Atlas. KYB had nothing to flag.

### Stripe SOCIII
- New profile created under existing Sean login (account switcher pattern, not new account)
- Bancorp Bank (Sean's Chime) attached as bridge — micro-deposit verification 3-5 days
- Old TitleApp Stripe profile stays accessible for wind-down accounting
- Treasury enrollment is a separate application (dashboard.stripe.com/treasury/applications) — NOT auto-enabled by funding; queue for next week post-Mercury-as-default-bank

### DUNS, SendGrid, Apple/Google Developer
- DUNS application moved to Fri 5/22 AM (no overnight queue benefit; $229 expedite recommended; NAICS 541512 Computer Systems Design)
- SendGrid sociii.ai domain auth moved to Fri 5/22 AM (24-48h DNS propagation; required before sean@sociii.ai cold-send works)
- Apple Developer + Google Play Console enrollment gated on DUNS approval (5 business days expedited)

---

## Chat Tone Strip (Task #245) — Code Shipped

**Problem:** 8+ layers of marketing/voice instruction were being stacked into chat session prompt assembly, making chat feel corporate and constrained vs the vanilla Claude experience users come from. Diagnosed by an Explore agent producing `/tmp/chat-tone-strip-diagnostic.md`.

**Principle locked into memory** (`feedback_chat_tone_no_marketing_stack.md`): Chat session prompt should equal identity + active worker scope + RAAS safety constraints + user message. **Nothing else.** RAAS is a safety layer (block/modify/permit actions), NOT a tone layer. Marketing canonical language (Swiss tone, brand voice, disclaimers, "we" over "I") belongs ONLY in outbound-content workers (campaign generator, email composer, social composer), NEVER in chat.

**Sean's "ship and stable" answers to Q1-Q5** collapsed all 7 edits to pure deletions — no new code paths, no new toggles, no new fetch logic.

**Files modified (5):**
1. `functions/functions/services/alex/prompts/core.js` — deleted PRICING_RULES constant + injection + export; deleted PERSONALITY block ("warm, professional, direct, calm"); trimmed UNIVERSAL TONE RULES to formatting-only (no emojis, no markdown, plain text, use name)
2. `functions/functions/services/alex/promptBuilder.js` — removed `sections.push(getCommunicationModule()...)` line that stacked concise/detailed/executive_summary template into every prompt
3. `functions/functions/services/alex/prompts/rules.js` — removed trailing tone line "Keep your tone warm but professional -- direct, calm, no hype"
4. `functions/functions/services/alex/prompts/surfaces.js` — investor overlay: removed TONE ADJUSTMENT block; developer overlay: removed lead-in "tour guide not consultant" + RULE 1 (BE BRIEF) + RULE 7 (CELEBRATE MILESTONES), trimmed RULE 3 to operational, trimmed RULE 5 to operational-only; sandbox overlay: removed BREVITY RULES + tone NEVER lines
5. `functions/functions/index.js` — removed VOICE MODE prompt injection (lines 257-263); rewrote OPERATOR POSTURE to drop "advisor mode" framing + "max 2 sentences of context" tone instruction (kept all operational rules: no markdown lists, OFFER format, no TODOs at end, ONE specific question, NEVER invent)

**Diff size:** 83 deletions, 23 insertions (most insertions are comments explaining what was removed so future-Claude doesn't re-stack the same layers).

**Syntax verified:** all 5 files pass `node -c`.

**NOT YET DEPLOYED.** Sean's Fri AM workflow: `git diff` to review → `firebase deploy --only functions` → test chat across Alex + Accounting + a vertical worker → confirm closer-to-vanilla-Claude feel. Rollback if anything regresses: `git checkout` on the 5 files. Pure subtraction = clean rollback.

---

## Patent Strategy Lock

**Filing slate for Sun 5/24** (3 provisionals, $360 total small entity):
1. **Filing A — AI Escrow Locker** — base: `/tmp/ai-escrow-locker-2025.md` (Feb 2025 provisional draft, lapsed without conversion). Refile as fresh provisional with new May 2026 priority. Add 2026 platform deltas: worker composition, RAAS multi-tier, audit chain anchoring, IDV inheritance from Coinbase, data-fee metering.
2. **Filing B — Title and Property Assurance** — base: `/tmp/title-assurance-2025.md` (Feb 2025 provisional draft, lapsed). Refile as fresh provisional. Layer in DTC + logbook + smart contract automation as composed system. CAREFUL: prior 2023 nonprovisional #18/398,973 is public prior art (auto-published ~6/28/2025) — Filing B must frame as *system that uses* those primitives, not as primitives themselves.
3. **Filing C — RAAS Multi-Tier Composable Rule System** — net-new draft. Covers rule composition across base + vertical + workspace layers, version-pinned audit trail, pre-publish constraint check, regulatory ingestion service, hash-anchored audit chain. The actual moat.

**Deferred to next check (~early June, 3 more provisionals):**
- Audit Trail
- Knowledge Capture Pipeline (already public via CODEX 51.4 — disclosure clock running)
- Build-Without-Code

**Hard deadline:** Sun 6/28/2026 — grace period (35 USC 102(b)(1)) closes on the 2023 nonprovisional disclosures. Anything depending on those disclosures must file by then or becomes prior art against itself.

**Applicant:** SOCIII Inc. (not Sean personally — assign on filing to avoid IP repatriation issues).
**Named inventor:** Sean Lee Combs.
**Filing receipts:** store in `~/titleapp-platform/docs/patents/2026-05-24/` (create on filing day).
**Calendar alerts:** 5/24/2027 (12-month conversion deadline), 4/24/2027 (prep window opens).

---

## SOCIII-Inc GitHub Org

- Org name: `SOCIII-Inc` (sociii was likely taken; -Inc fallback)
- Owner: @Titleapp user (titleapp.core@gmail.com)
- Plan: Free (unlimited public + private repos; CI/CD minutes free on public)
- Contact email: alex@sociii.ai
- Members invited: kent@sociii.ai (Member), sean@sociii.ai (Owner)

**Brand-account hygiene preserved:**
- titleapp.core stays as Sean's private GitHub admin login (org owner)
- alex@sociii.ai NOT invited to GitHub — brand persona for social/marketing surfaces, not a code-pusher
- Advisors NOT invited — domain experts, not developers; their material belongs in docs site + Drive

**Migration plan:**
- Tonight (Sean before sleep): nothing more. Org exists; that's enough.
- Fri 5/22 AM: push `~/sociii-landing` to new `SOCIII-Inc` org via `git remote add` + `git push -u origin main`
- Mon 5/25 (holiday window): migrate titleapp-platform and titleapp-landing via GitHub Transfer Ownership (preserves history + auto-redirects URLs). Update CI tokens, webhook URLs, Firebase deploy targets.

---

## New Tasks Created Today

- **#261 Coinbase Base** — corporate account opens Mon 5/25 (KYB takes days; holiday quiet window). Pull Base / OnchainKit / Smart Wallet / CDP Embedded Wallet API docs. Wire Base as chain anchor for SOCIII audit-trail hash anchoring. Three-legged story for Wed launch: (1) functional product, (2) developer sandbox+OSS, (3) audit-on-Base.
- **#262 Advisor deck slide — creator economics + warrants stack** — single slide for vertical-advisor decks (Eric, Kim, Scott, future). Three revenue layers stacked: 75% subscription share + 20% inference margin share + 0.5%/worker equity warrants capped at 2.5%. Concrete math at three adoption scales so the upside is visible at-a-glance.

---

## Closed Today

- **#254 Stripe Treasury bank fix** — resolved via Mercury same-day (better solve than personal-bank-on-Stripe; no commingling)
- **#258 Confirm patent filing status** — confirmed Feb 2025 filings were provisionals (lapsed silently Feb 2026 without conversion); 2023 nonprovisionals abandoned in prosecution, auto-published ~6/28/2025 (now public prior art); grace period closes ~6/28/2026
- **#245 Chat tone strip** — code shipped, syntax-verified, awaiting Sean's Fri AM review + deploy

---

## 5-Day Plan Reference

Full day-by-day plan in `/tmp/sociii-5day-plan.md` (also reproduced verbatim in `project_sociii_launch_sequence_2026_05_27.md` memory). Anchors:
- **Fri 5/22:** DUNS + SendGrid + chat-tone deploy + brand creative (Sean drops SVGs, AI does brandConfig flip + BrandLoader wiring + audit)
- **Sat 5/23:** Patent drafting day 1 (Filing A + B)
- **Sun 5/24:** Patent drafting day 2 (Filing C) + USPTO file all 3
- **Mon 5/25 (Memorial Day):** Coinbase Business account opens; Reddit + agent-review-site strategy; GitHub repo migration to SOCIII-Inc org
- **Tue 5/26:** Pre-launch final prep — Mercury already default external account; HR worker finish; Marketing worker activation; social handles registered; video recording day (4× 60-sec scripts)
- **Wed 5/27:** Soft tease (anchor) — 8am Kent angel emails, 10am Apollo+accelerator tranche, LinkedIn announcement, soft X tease
- **Thu 5/28:** Meme drop (peak 1-3pm ET) — TikTok + X + YouTube + Sean LI long-form

---

## Memory Updates

Two new memory files written this session:
- `project_sociii_launch_sequence_2026_05_27.md` — Wed tease + Thu meme drop sequence, two-track narrative non-negotiable, brand-account hygiene
- `feedback_chat_tone_no_marketing_stack.md` — chat prompt assembly principle, RAAS = safety not tone, marketing tone belongs only in outbound workers

Index entries appended to `MEMORY.md`.

---

## State of Union (End of Day)

**Corporate:**
- SOCIII Inc. formed (DE C-corp via Stripe Atlas)
- EIN issued
- Mercury business banking LIVE
- Stripe SOCIII profile created
- GitHub SOCIII-Inc org created
- DUNS pending (Fri AM submit)
- SendGrid pending (Fri AM submit)

**Product:**
- Platform live at titleapp.ai (Firebase Hosting)
- Chat tone strip code ready to deploy
- 226 catalog workers across 8 verticals
- 11 Aviation CoPilots live including PC12-NG reference implementation
- Document Control platform pillar in place
- Brand cutover to SOCIII gated on Sean's SVG export

**Legal/IP:**
- 3 patent provisionals queued for Sun 5/24 filing under SOCIII Inc.
- Grace period clock running on 2023 disclosures (~6/28/2026)
- Robert Rosenstien loan formalization in progress (4% quarterly, transfers to SOCIII on LLC wind-down)

**Team:**
- Sean — sole founder, sole director (per project_sociii_ip_governance_philosophy)
- Kent — cofounder title (external only), 15% milestone-vested + 5% success fee, fundraising-scoped
- Advisors — up to 7, 0.5%/worker equity capped at 2.5% each, vertical domain experts not developers
- Creators — cash economics + (pHOM holders) warrants

**Launch window:**
- T-6 days to Wed 5/27 tease
- T-7 days to Thu 5/28 meme drop
- Memorial Day holiday Mon 5/25 = best solo deep-work day of the week

Sleep.
