# CODEX Surface 2 — Canvas Collapse

**Status:** 🟡 partially wired (renderer intact, mounts duplicated) · **Owner:** Sean · 2026-06-22
**Why now:** quick win; kills the recurring dead-overlay / popup-over-canvas garbage so every
demo and every client surface is clean. The canvas is the picture-first half of "people don't
read" (Trump Rule).

---

## Objective
**One** canvas surface, **one** state machine, **one** set of drivers. Canvas appears only when
it matters (Claude-style) and never as a dead overlay.

## What's built vs. the gap (audit 2026-06-22)
**Built & working:** the data-driven renderer is sound — `config/canvasTypes.js` (signal →
{component, dataSource, emptyPrompt}), `services/CanvasResolver.js`, `CanvasComponentMap.jsx`,
`CanvasPanel.jsx`, `context/RightPanelContext.jsx` state machine. Bespoke cards built this
session (marketing board, vet dosing, edu cohort) prove the pattern.

**The gap:** 2 duplicate canvas **mounts** + 6 separate `showCanvas` **drivers** + the dead-overlay
path (WorkProductCard-with-no-payload — guard already added in `RightPanelContext.jsx`). Multiple
sources of truth for "what's on the canvas" = the popups-over-canvas symptom.

## Turn-on tasks
- [ ] **T1 — Inventory** the 2 mounts + 6 `showCanvas` call sites (grep `showCanvas`/`CanvasPanel`).
- [ ] **T2 — Collapse to one `CanvasSurface`** mounted once; all drivers route through the single
      `RightPanelContext` state machine (showCanvas/dismissCanvas/resetCanvas).
- [ ] **T3 — Delete** the dead-overlay path entirely (not just guard it).
- [ ] **T4 — Empty-state contract:** every signal resolves to a component OR an emptyPrompt —
      never a blank/dead panel.
- [ ] **T5 — Regression pass** across the worker set (vet, edu, RE, aviation, marketing) — no
      double-mount, no stuck overlay, canvas dismisses cleanly.

## RED TEAM
- 🟠 **RT1 — Collapsing mounts breaks a worker that quietly depends on the second mount.**
  **Mitigation:** T5 regression across all active workers before merge; ship behind a flag if any
  worker is load-bearing for a video.
- 🟡 **RT2 — "Collapse" becomes a rewrite.** Operating principle violation. **Mitigation:** this is
  *delete duplicates + reroute drivers*, not a new renderer. If it grows past that, stop.
- 🟡 **RT3 — Empty-state prompts feel like errors.** **Mitigation:** emptyPrompt copy is an
  invitation ("ask Alex to pull X"), not "no data."

## Sign-off gate
One mount, one state machine, dead-overlay deleted, full regression green.
