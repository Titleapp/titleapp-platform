# CODEX 77 — Repo-Wide Dead Code &amp; Clutter Audit

**Status:** AUDIT COMPLETE — read-only findings, nothing deleted; for Sean's review before any pruning
**Date:** 2026-08-25
**Trigger:** Sean asked for a general deep-dive to find dead/cluttered code worth pruning. Four parallel research passes covered: repo-wide build artifacts/stray files, backend (`functions/functions/`), frontend (`apps/`), and `docs/`.
**Method:** read-only research only — no files modified, moved, or deleted as part of this audit.

---

## 1. Highest-priority finding: a real functional bug, not just clutter

`functions/functions/index.js`'s router is a strict sequential `if (route === X && method === Y)` chain — first match wins, so any duplicate route+method pair makes the *second* block permanently unreachable. Five duplicates were found:

| Route | First (wins) | Second (dead or shadowed) | Verdict |
|---|---|---|---|
| `POST /admin:locker:batch-ingest` | 13774 | 17714 | Byte-identical — safe to delete the second block |
| `POST /studio:intake` | 12954 | 15091 | Byte-identical — safe to delete the second block |
| `GET /credential:verify` | 12913 | 14950 | Byte-identical — safe to delete the second block |
| `GET /creator:public-profile` | 12847 | 14883 | Byte-identical — safe to delete the second block |
| **`GET /hr:people:list`** | **21930 (wins)** | 23159 (never runs) | **Not identical — the block that never executes is the more complete implementation** (reads `tenants/{id}/teamMembers` for real); the one that wins is a simpler delegate. This may mean HR's people list is silently running on the wrong/older logic in production right now. **This needs your direct look, not a cleanup pass.** |

## 2. Security note (found incidentally, not the point of this audit)

Three admin-only routes in `index.js` have **no auth check at all**:
- `POST /admin:registry:seed` (line 25099)
- `POST /admin:backfillContacts` (line 25195)
- `POST /investor:seed-configs` (line 29052) — writes real hardcoded SOCIII Inc. legal/EIN data

These read like one-time setup scripts that were left reachable. Worth confirming they're not exploitable in production (add an auth/admin-UID gate, or remove if truly one-time and already run).

## 3. Safe to act on now (highest confidence across all four passes)

- **`functions/functions/services/apiHealth.deprecated/`** — self-named `.deprecated`, its own successor's header says it was "consolidated from apiHealth/messages.js." Zero live references.
- **4 of the 5 duplicate route blocks in `index.js`** (§1 above, excluding `hr:people:list`).
- **The stale git worktree** `.claude/worktrees/agent-a602fa2649afc6622` — confirmed zero unique commits, 206 commits behind. `git worktree remove` is safe.
- **`git rm --cached .DS_Store`** at repo root — tracked despite being gitignored.
- **`apps/business/src/pages/NursingDemoShell.jsx`** — superseded by `NursingAdminDemoSignIn.jsx`/`NursingStudentDemoSignIn.jsx`, zero references anywhere.
- **`apps/business/src/pages/landing/LandingPage.jsx`** — a dead duplicate of the actively-used `apps/business/src/components/LandingPage.jsx` (different file, same name, only one is ever imported).
- **`functions/functions/services/github/`** — literally empty directory.
- **Local (untracked, never-committed) stray files**: `functions/functions/.env.bak-1781308800000`, `.env.bak.1777821378`, and **`.env.live-backup`** — the last one is a plaintext dump of real production secrets (Stripe, Twilio, SendGrid, Plaid, Anthropic/OpenAI keys). Never made it into git, but worth deleting off local disk once you're sure you don't need it as reference.
- **`docs/specs/CODEX-S52.57-Studio-Locker-Prompt-Builder-Wiring.md`** — self-declared "SUPERSEDED (2026-08-20), folded into CODEX S52.48," corroborated by a later doc.
- **`docs/codex/72-dpp-round-2-red-team-briefing.md`** — already known, self-declared retired, superseded by CODEX 71.
- **`docs/legal-templates/SOCIII-Mutual-NDA-DRAFT.docx`** — literally opens "DRAFT — pending counsel review"; the clean final `SOCIII-Mutual-NDA.docx`/`.md` pair already exists.
- **`functions/functions/scripts/fix-marketing-status.js`, `fix-vertical-naming.js`, `fixSociiTenant.js`, `listMemberships.js`** — trivial, self-documented one-off patches/diagnostics, already run.
- **`functions/functions/scripts/demo/createDemoSpace.js`** — its own sibling README says it's "superseded by createDemoAccount.js, kept for reference" — safe to actually archive now.

## 4. Real (not dead) but worth consolidating

Nine files in `functions/functions/billing/` each define a byte-for-byte identical `getStripe()` helper: `createBillingPortalSession.js`, `seatSync.js`, `purchaseWorker.js`, `createConnectAccount.js`, `trackUsage.js`, `stripeWebhook.js`, `createSubscription.js`, `purchaseCreditPack.js`, `usageProcessor.js`. Worth extracting to `billing/_shared/stripeClient.js` (there's already a `services/_shared/` convention to follow) — not dead code, but a real duplication smell, and directly relevant groundwork if CODEX 76's institution-billing work touches these files anyway.

## 5. Needs your decision (evidence points one way, but it's a product/business call, not a code-safety one)

- **`apps/admin/` — the whole app.** No substantive commits in ~10 days (vs. daily on `apps/business/`), no live deploy pipeline found wired to it, zero cross-references between the two codebases, and its features (DataRoom, MyLogbook, Wallet, Vault sections, CoPilot EFB) all have actively-maintained equivalents already rebuilt in `apps/business/`. `CLAUDE.md` still describes it as "the frontend," which is itself stale. Strong signal it's fully superseded — but nobody here can confirm zero live traffic on its Firebase hosting target from a repo audit alone. Worth a `firebase hosting:sites:list` check or just asking directly before retiring it.
- **The retired `auto_dealer` vertical's frontend plumbing.** Per your own governance doc, this vertical was retired 2026-07-07 with "no workers, no bundle, no customers ever existed." But ~20 files still actively reference it, including a fully wired `AutoDealerDealModal.jsx` component reachable from the canvas UI. It's not "dead" by any normal definition (it's reachable, wired-in code) — it's product-vestigial. Worth a direct conversation: either the retirement decision has quietly reversed, or this is ~20 files of dead weight for a vertical you decided against.
- **`billing/trackUsage.js`** — appears superseded by `usageProcessor.js` (which is the one actually wired into `index.js`), but this is the exact file CODEX 76 is about to modify for institution-level overage billing. **Don't archive this until CODEX 76 confirms whether it's really the current call site or genuinely dead** — resolving that ambiguity was already flagged as CODEX 76's own open item #1.
- **`services/clients/clientInviteEmail.js`** — built to mirror a working invite-email flow, but never called from anywhere. This might mean a client-invite feature is half-shipped (creates the invite, never sends the email) rather than leftover migration cruft. Worth checking before deleting.
- **Marketing collateral accuracy (carried over from CODEX 71, not fully fixed):**
  - `docs/sales/dpp-one-pager.md:19` — still has a leftover internal editorial instruction embedded in customer-facing text ("confirmed via code check that it is not yet wired to DPP records specifically... do not imply...") — this reads like a note-to-self that shipped by accident.
  - `docs/whitepapers/dpp-provenance-business-in-a-box.md:91` — unqualified "cryptographic hash... anchored to the Base blockchain" claim for DPP specifically, which CODEX 71 already said shouldn't be asserted either way. Same file's worker-stack table (lines 65-71) still lists the pre-consolidation 5 workers, contradicting CODEX 71's own claim that this was fixed "throughout both files."
  - `docs/marketing/dpp/deck.md:80,142` — "Live in weeks, not months" / "Live in five weeks" — concrete timeline promises worth a gut-check against the Passport & Registry Manager's actual (still spec-only) build state.
  - Broader pattern worth naming: multiple customer-facing docs have internal-review asides like "(Pricing under active revision...)" left visible in shipped prose rather than resolved and removed — a repo-wide habit worth flagging once rather than fixing file-by-file.
- **Several one-off seed/backfill scripts** (`scripts/seedWorkerRegistry.js` — likely superseded by `scripts/seedFromCatalog.js`; `scripts/seedHamiltonVChe.js`, `seedHendersonCountyDemo.js`, `seedTitleProductionSuite.js` — tied to specific named prospects; `scripts/fix-subscription-status.js`) — need a quick "did this already run / is this prospect closed out" confirmation before archiving.
- **`docs/codex/66-patch-notes-round-1.md` + `round-2.md`** and **`docs/legal-templates/SOCIII - Post-Money SAFE 05-26-26.docx`** — likely safe to archive, but verify content is fully folded into the current versions first (a changelog doc and a legal instrument, respectively — worth the extra care).
- **`docs/CODEX-100-DAY-PLAN.md`** — status banner still says "PROPOSED, awaiting sign-off" despite two months of subsequent shipped work clearly having executed against it. Not a deletion candidate, just a stale status line worth updating.
- **Root-level misfiled file**: a file literally named `Add Auto RAAS IL service module` (no extension) sits at the repo root — real 136-line content about Illinois auto-sales RAAS rules, just written to a path named after its own commit message by a past tooling bug. Recommend moving it to a proper path under `raas/auto/IL/...` rather than deleting.

## 6. Flagged for awareness only — not recommending action without explicit sign-off

- **`.git` history is 169MB**, driven by old committed binaries that no longer exist in the working tree (a Cloudflare `workerd` binary at 86.6MB is the single largest blob, plus old `node_modules` binaries and ~11 stale hashed `dist/` bundle copies from past accidental commits). Fixing this requires a history rewrite (`git filter-repo`/BFG) — every collaborator would need to re-clone, and all commit hashes change. Not doing this without your explicit go-ahead.
- **Investor/contact CSVs committed to git** (`kent-investor-prospects.csv`, `demo-customers.csv`) — real business/contact data living permanently in git history. Worth a data-hygiene look, your call.
- **~50MB of `.pptx` decks** across `docs/investor/`, `docs/sales/`, `marketing/decks/` — legitimate active assets, not clutter, but a candidate if you ever want to move large binaries out of git and into Drive.
- **`docs/investor/current/TitleApp_One_Pager_v7.pdf`** — a May 2026 audit flagged this exact file as stale; being a PDF, it couldn't be checked in this pass. Worth a manual reopen.

---

## Recommended immediate action

Section 3 above (the "safe to act on now" list) is low-risk and mostly mechanical. If you want, I can execute that whole list in one pass — it's the kind of change worth doing as its own clean, isolated commit rather than mixed into product work. Everything in sections 5 and 6 needs your input first; I haven't touched any of it.
