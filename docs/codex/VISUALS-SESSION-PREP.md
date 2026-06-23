# Visuals Session — Prep Brief (2026-06-23)

Everything below is mapped/ready so the on-screen session is review-and-decide, not discover-from-cold. All read-only mapping except the version popup (built, committed on `fix-version-check-popup`, awaiting a hosting deploy).

---

## A. "New version of SOCIII" popup — Sean's ask ✅ built, awaiting deploy
- A version-checker **already existed** (`apps/business/src/utils/versionCheck.js`, S52.47) — banner + auto-reload-on-background. It just wasn't firing reliably.
- **Hardened it** (committed, branch `fix-version-check-popup`): cache-busts the `/index.html` freshness check (the likely silent failure — a CDN/edge cache was serving stale index.html), makes the popup **reappear after dismissal** until they refresh, polls every **60s** (was 2 min) + on focus/online/bfcache. Foreground = prominent top-center popup; background tab = silent auto-reload.
- **To go live: a hosting deploy.** It only *demonstrates* across two deploys (old tab open → deploy → popup fires) — perfect to test live together.
- ⚠️ A hosting deploy bundles the **uncommitted `/portal` route** in `App.jsx` (see C) — decide whether that ships in the same deploy.

## B. Canvas / visual surfaces (Surface 2 — collapse) — mapped
- **One** state machine (`RightPanelContext`) + **one** data-driven renderer — those are clean. What's duplicated is the **`<CanvasPanel>` mount: 6 copies** (RightPanel.jsx:526 canonical · App.jsx:4628 · + 4 identical `#219` section copies in Accounting/Contacts/CommandCenter/MarketingDrafts).
- **6 `showCanvas` drivers**, incl. duplicated tab handlers (App.jsx 4490/4515, RightPanel 521/557).
- **Dead code to delete:** WorkProductCard no-payload guard (`RightPanelContext.jsx:96-102`), `showRecommendations` dead body (`RightPanelContext.jsx:18-46`, ~28 lines below an unconditional return), the 4 `#219` blocks.
- **Plan:** collapse to one `<CanvasSurface>`; sections delegate to it. Empty-state already handled by `CanvasCardShell` + `CanvasFallbackView`.
- **Aesthetic in code:** CSS vars (`--card`, `--text-primary`, `--canvas-border`…) + slate/violet inline palette + monoline stroked SVGs (no icon lib). A new card wraps `CanvasCardShell` + registers in `CanvasComponentMap.jsx` + a `canvasTypes.js` signal.

## C. Consumer Dr. Chen demo + advisor invite→Vault — mapped
**`ClientPortal.jsx`** (committed) = mobile chat + canvas-on-demand, two skins via `?company=` (meadow-vet 🐾 teal / sociii-advisors ◆ violet), persona via `?persona=` (pet-owner Mia/Clover · advisor Kent). **Chat is SCRIPTED** (chip dispatcher, 350ms fake replies, no network); the text input does nothing. Canvases (Booking/Records/Affirm/Documents) are local fixtures.

| Piece | Built | Wired | Deployed |
|---|---|---|---|
| ClientPortal UI (both personas) | ✅ | — | ❌ |
| `/portal` route in App.jsx | ✅ | ⚠️ **uncommitted working-tree only** | ❌ |
| Advisor sign→Vault (Dropbox Sign, `services/ir/advisorFlow.js`) | ✅ | ✅ | ✅ |
| Advisor invite **magic-link** (`/auth/magic?role=advisor`) | ✅ | ✅ | ✅ |
| Advisor **affirm/attest** endpoint | ❌ none exists | ❌ | ❌ |
| Agreement as **DTC in advisor's personal Vault** | ❌ (writes operator vault doc, not `dtcs`) | ❌ | ❌ |

**To record the Dr. Chen consumer demo:** commit + deploy the `/portal` route (biggest blocker — else URL 404s). Optionally add an R1 disclaimer + "talk to a human" chip to the chocolate-triage reply (it already has escalation + a source cite; missing an explicit "not a diagnosis / not a VCPR" line).

**To make the advisor invite→Vault real:** (1) add an affirm/attest endpoint (mirror `acknowledgeTerms` in advisorFlow.js — writes `affirmedAt` + auditTrail event); (2) write the signed agreement as a `dtcs` record in the advisor's **own** Vault (today it lands in the operator vault `vaults/sociii-platform/documents/...`); (3) swap advisor `DEFAULT_OBLIGATIONS` sign→affirm for the already-signed-via-Atlas cohort; (4) point the portal advisor persona at the real magic-link.

**Red-team to respect (don't regress):** R1 vet advice = info/escalation only + disclaimer + human handoff + vet-owned rules; R2 portal reads only records shared into *that* relationship (ties to the Surface 1 R2 isolation just shipped); R3 any phone/email match needs OTP before Vault access.

## D. Surface 3 T7 — the approve/reject card (backend is LIVE + tested)
- Backend endpoints exist + tested: `GET /worker:changes`, `POST /worker:change:approve|reject`, and Alex generates changes via `worker:change:fromChat`. Zero frontend yet.
- **Plan (rides the collapsed canvas, no new mount):** new `components/canvas/PendingChangesCard.jsx` (model on VetDosingCard's propose→approve), register signal `card:worker-changes` in `canvasTypes.js` + `CanvasComponentMap.jsx`, add a `liveData.js` builder hitting `/worker:changes`. Surface it via a worker `canvasTabs` entry, or have `fromChat` emit `canvasSignal:"card:worker-changes"` for the "fixed — approve?" moment.

---

## Decisions for the session
1. **Deploy the version popup now?** (Yes = hosting deploy; bundles the `/portal` route too — see #2.)
2. **Ship `/portal` live** for the Dr. Chen demo? (It's scripted fixtures, unlinked; low risk but it's public vet-triage copy — your call on the R1 framing.)
3. **Build order:** Surface 2 canvas-collapse first (clean foundation), then T7 card rides it? Or T7 card first for the fix-loop video?
4. **Advisor demo depth:** scripted affirm (fast, fake) vs. real affirm endpoint + DTC-in-Vault (a few hours, genuinely real).
