# Workout-Window Handoff — Sunday 2026-05-25 morning

**Window:** Sean working out, ~2 hours
**Status:** All committed items done

---

## What landed

### 1. Site transfer commit ✓

**Commit:** `4697f23f — S51.17 — SOCIII transition: brand cutover + IR Worker Phase 1 + Book/Script/Play scaffold + Hamilton v Che POC`

- 270 files changed
- Brand pass: ~195 customer-facing TitleApp → SOCIII
- IR Worker Phase 1 services + routes + capabilities
- Book/Script/Play (CREATIVE-001) worker scaffold
- BrandLoader polish (parent-child hex mark live)
- Hamilton v Che prose drafts (Prologue + 4 chapters)
- All CODEX docs + personas + outlines

Working tree clean except the gitignored `.firebase/hosting.cache` (untouched).

**Deploy is NOT triggered.** You run `firebase deploy --only hosting` (and `firebase deploy --only functions` for the IR Phase 1 routes) when you're back and ready.

### 2. SDK survey + cleanup brief ✓

**File:** `docs/specs/SDK-Cleanup-Brief-2026-05-25.md`

Survey of `packages/sdk/` current state (@titleapp/sdk v0.1.0, BETA, workers/vault/marketplace modules). Bounded 30-60 min agent task to:
- Rename `@titleapp/sdk` → `@sociii/sdk`
- Rename classes (`TitleApp` → `Sociii`, with back-compat alias)
- Add new `ir` module wrapping Phase 1 endpoints
- Rewrite README
- Bump to v0.2.0, ready for npm publish (you publish manually after review)

Ready for agent launch when you say so.

### 3. Kent's outbound playbook ✓

**File:** `docs/specs/Kent-Outbound-Playbook-2026-05-25.md`

Operating doc for Kent's Monday outbound. Covers:
- Audience segmentation (warm operators, warm-cold VCs, strategic operators)
- The 60-second pitch with variations by segment
- The investor flow (what happens after they say yes — IR Phase 1 plumbing)
- Talking points for the common questions ("why now," "what changed from TitleApp," "what's the moat," cap table, patents, use of proceeds)
- What's in the Data Room
- Hard rules Kent operates under (no specific raise dollar amount in writing, etc.)
- What Kent doesn't have to do (the platform handles paperwork)
- End-of-day Monday status update format

Send to Kent before Monday morning.

### 4. Wallet onboarding audit ✓

Settings → Blockchain Audit verified. Current state:
- Polygon chain via Venly
- SOCIII manages the wallet, gas fees covered
- Toggle in Settings stores to `VAULT_BLOCKCHAIN_ENABLED`
- Per-DTC blockchain records with PolygonScan link
- $0.005/record fee per `pricing.js`

Coinbase / Base migration is task #261, not blocking. Findings captured in the HOW TO guide section 13.

### 5. HOW TO guide skeleton + 3 critical sections ✓

**Directory:** `docs/help/`

- **README.md** — full table of contents (17 sections)
- **01-account-setup.md** (written in full, ~1,600 words) — magic link, persona, Stripe Identity, plans, troubleshooting
- **05-your-first-worker.md** (written in full, ~1,600 words) — browse → subscribe → onboard → output → iterate
- **07-navigating-the-interface.md** (written in full, ~1,400 words) — Nav, Chat, Canvas regions and how they work together
- **13-wallet-setup.md** (skeleton + current-state audit) — current Polygon/Venly state captured
- **02, 03, 04, 06, 08-12, 14-16** (skeleton stubs) — link structure preserved, content to fill in

Screenshots throughout marked `[Screenshot: description]` — you capture when you have eyes on the running app. The stubs are explicit about being placeholders so a reader doesn't mistake them for finished docs.

### 6. Static SEO pages re-verification ✓

All 9 static HTML files (public/ + apps/admin/ + functions/api/docs.html) verified clean of customer-facing TitleApp refs. One stray comment in `apps/business/public/sw.js` was fixed and included in the S51.17 commit.

---

## Did NOT do (intentional)

- **Did not push.** Push when you're back.
- **Did not deploy.** Run `firebase deploy --only hosting,functions` when ready.
- **Did not SDK-rename.** That's a separate agent run; brief is in `SDK-Cleanup-Brief-2026-05-25.md` ready to launch on your greenlight.
- **Did not commit the HOW TO guide + Kent playbook + SDK brief yet.** They're untracked. Bundle them in your second commit of the day or roll them into the deploy commit. (Reason: this batch is "post-workout content" vs. the S51.17 "transition" — separating felt cleaner.)
- **Did not update `MEMORY.md`** with anything new this session. Nothing structural changed.

---

## Suggested next-2-hour priorities when you're back

In order:

1. **Eyes on the docs** — read CODEX 51.16 + the HOW TO sections + Kent's playbook. If something's wrong, flag it before deploy.
2. **Manual unblocks** — Stripe product rename + SendGrid CNAMEs + Twilio + SAFE template to Dropbox Sign + env var. These start multi-day clocks that affect Storyhouse Thursday.
3. **Deploy** — `firebase deploy --only hosting,functions`. Smoke test that sociii.ai resolves and the magic-link signup flow works.
4. **Phase 1 IR end-to-end smoke test** — see the 8-step plan in CODEX 51.14 §IR Worker. Test with `you+test@example.com`.
5. **SDK agent launch** — once Phase 1 verified, greenlight the SDK cleanup. ~60 min agent run.
6. **Commit the post-workout content batch** (HOW TO guide + Kent playbook + SDK brief + this handoff doc + wallet audit) — clean second commit.

If time after all that: send Kent his playbook + walk him through the IR flow live, so Monday calls go smoothly.

---

*Workout-window handoff. Brand cutover landed. Phase 1 IR is code-complete. Kent's playbook is drafted. HOW TO guide scaffolded with 3 critical sections in full. Ready for your read + deploy.*
