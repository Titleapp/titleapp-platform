# CODEX 12 — Chat grounding: the "chat fails in every worker" root-cause fix

**Status:** 🟢 shipped + verified · **Date:** 2026-06-25/26 · **Owner:** Sean
**Frame:** baseline-demo readiness (Meadow Creek / Dr. Maya Chen on sociii.ai). The
worker *canvases* were already strong; **chat** was the systemic failure blocking videos.

---

## The symptom (a week of whack-a-mole)
Every worker's chat misbehaved differently: the vet worker quoted a real-estate address
("123 Maple Street"), HR said "zero employees" while its canvas showed five, Marketing
said "no campaigns" with six on the canvas, the COS asked Dr. Chen "what business are you
in?", and Alex kept saying "I told you already / duplicate messages — refresh your
browser." Found by clicking, it looked like ten bugs.

## The root cause (one disease, ten masks)
1. **Shared conversation history.** Worker chat history lives in
   `chatSessions.{id}.state.salesHistory` — a single flat array. The frontend reuses one
   `sessionId` across every worker, and the backend **resumes the most recent session by
   uid**. So every worker inherited every other worker's turns → cross-worker bleed, stale
   parroting, "duplicate message" reactions. This is why a *vet* worker produced an RE
   address: it was replaying a *title* worker turn.
2. **Chat read different DB collections than the canvas.** Sibling-state read `employees`
   + `emailCampaigns`; the real data (and the canvas) use `staff_credentials` +
   `campaigns`. So chat said "you have none" while the canvas showed real records.
3. **COS ran the wrong flow.** An authenticated owner with no worker selected fell into
   `surface === 'landing'` — the **website-visitor discovery script** (ask their name,
   pitch signup). Hence "what should I call you?" inside her own workspace.
4. **Curated worker prompts wiped the data injection** in the (dead) second handler; the
   live worker-direct path prepends sibling state *after* the curated prompt, so it
   survives there — the fix had to go in the live path.

## The fixes (all generic — read the caller's OWN workspace, nothing hardcoded)
- **Per-worker history scoping** (`index.js`, worker-direct + COS/sales + landing paths):
  tag each `salesHistory` turn with `workerSlug`; load only the current worker's thread.
  This is THE fix for "chat fails in every worker."
- **Authenticated Chief-of-Staff branch** (`index.js`, before the `landing` handler):
  for a logged-in owner of an established workspace, build a grounded COS prompt from
  *their* workspace doc (`name/vertical/ownerName/ownerRole/location`) + sibling state +
  workspace brief; never run intake, never ask their name, never invent data.
- **Chat reads canvas collections** (`services/canvas/spineState.js`): `staff_credentials`
  for HR, `campaigns` (by tenantId) for Marketing.
- **Workspace brief** (`services/alex/workspaceBrief.js`): read `staff_credentials`
  (underscore) and walk each doc's `credentials[]` for overdue/expiring.
- **Intake suppression** (`services/alex/prompts/intake.js`): established workspace →
  emphatic "run NO intake" (don't ask what they do / industry / location).
- **Dashboard overlay** (`apps/business/src/context/RightPanelContext.jsx`): an empty
  WorkProductCard now clears a stale discovery canvas instead of leaving it painted over
  the worker (fixes blank-then-correct-on-2nd-click).
- **Data (Firestore, not git):** trimmed `platform-hr` to its 4 clean DB-backed tabs
  (People/Onboarding/Compliance/Documents) — the Schedule panel was hardcoded "Sean+Kent"
  and Notices was the advisor flow, both broken for every tenant; original saved as
  `canvasTabsBackup`. Genericized `spine-4-staff-credentials` headline (industry-agnostic).

## The exit from whack-a-mole: a deterministic chat test
`functions/functions/scripts/test/chatTest.js` — mints a token for the demo account, hits
the **real** `/v1/chat:message` for the COS + every worker on both business + personal
surfaces, clears polluted history first, and asserts each reply is grounded and
fabrication-free. **Result: 🟢 10/10 green.** Run `node scripts/test/chatTest.js` before any
recording session. This is how we verify the whole surface at once instead of discovering
bugs on camera.

## Genericity audit (re: "will all accounts only talk to Dr. Chen?")
Grepped all production paths for `meadow/maya/chen/<demo-uid>/<demo-tenant>` → **zero in
logic** (only explanatory comments). Every fix reads `authUser.uid` + the request's
tenantId + that user's own workspace doc. Confirmed against Ruthie's account: her COS is
**clean** (no Dr. Chen leak) — isolation holds. (Her account on sociii.ai is an empty stub;
she works on a separate fork — that port is a separate track, staged at
`/tmp/ruthie-fork-port/`.)

## QA-001
989 findings (P0:21 P1:967 P2:1), **all pre-existing** in unrelated areas
(aviation/web3 catalog structural fields, IR/creator flow state machines). **Zero findings
reference any file edited in this work.** No regressions. Run saved:
`docs/qa-001-runs/2026-06-26-run.txt`.

## Demo imagery + reports (2026-06-26, overnight) — 🟢 shipped
- **Marketing real ad creatives:** `scripts/demo/seedMarketingImages.js` generates 6
  Fal.ai ad images (pet/vet themed, no real places/PHI), stores them with stable
  Firebase download-token URLs, and writes `imageUrl` onto each campaign doc. The
  `/v1/marketing:campaigns` endpoint already spreads all fields, so `imageUrl` flows
  through. `MarketingCampaignBoardCard.jsx` now renders the real image (Creative tiles +
  row thumbnails) with a gradient scrim for headline legibility; falls back to the
  gradient when no image.
- **Accounting Reports from real data:** `scripts/demo/seedAccountingReports.js` computes
  P&L / Cash Flow / Balance Sheet from the 84 committed transactions (Rev $588.6k,
  Exp $247.6k, Net $341k for Jan–Jun 2026 — matches the dashboard's $98.1k/$41.3k/$56.8k
  MTD) and writes them as `.xlsx` storageObjects (tags `accounting`, `reportPeriodYear`,
  `reportFormat`) so the Reports tab populates with real, downloadable financials.
  Exported `buildBuffer`/`formatFor` from `canvasArchive.js` to reuse its ExcelJS builders;
  wrote the blobs + storageObjects directly (server signs the download URL).

## Still open (next)
- "Dr.'s Personal Space" name derivation; training-records structure.
- Port chat fixes to Ruthie's fork (separate track, only if her videos use chat).
