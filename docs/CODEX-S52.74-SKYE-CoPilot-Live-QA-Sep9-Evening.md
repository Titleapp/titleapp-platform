# CODEX S52.74 — SKYE CoPilot Live Simulator QA, Sep 9 Evening

**Status:** Raw findings from Sean's live click-through in the rebuilt iPad mini Simulator (iOS 26.3), following the 9 fixes shipped earlier today (`CODEX-S52.69` addendum). Not yet triaged into fix order beyond the grouping below. Sean's own words paraphrased into checklist form; nothing here has been fixed yet.
**Context:** Sean self-reported ~40% on the last full pass, ~65% now — this session's build is closing the gap but real gaps remain, several structural (navigation/IA), some functional bugs, several just missing data/copy.

---

## Fix status (2026-09-09 evening, same session)

Fixed in code, not yet re-verified in a rebuilt Simulator (needs `npm run cap:aviation:sync` + Xcode rebuild, or a quick check on the Vite dev server first):
1. **Google Maps API rejection leaking into UI** — root cause confirmed: Google's Maps Embed API rejects any request with an empty `Referer` header, which every Capacitor WebView sends (custom app scheme, not http/https) — not something fixable by loosening the key's referrer restriction from the client side, and the rejection renders as a page *inside* the iframe (not a JS-catchable load error). Fix: skip the embed entirely on native (`Capacitor.isNativePlatform()`) in both `FlightPlanningCard.jsx` and `MapCard.jsx` (same bug, same fix, shared by any other vertical's native build) — the live Leaflet-based `AviationMap.jsx` (Map tab) already covers this without a referrer-restricted key.
2. **Skye chat opening the wrong role (Pilots → Dispatch)** — root cause confirmed: `RoleSwitcher`'s Pilots/MX/Dispatch tabs only updated `AviationWorkerCanvas`'s own local `roleOverride` state — it never fired `ta:select-worker`, the actual event `App.jsx` and `ChatPanel.jsx` both listen for to know which worker is "really" active. So the canvas visually switched roles, but chat (and anything else keyed off `currentSection`) stayed on whatever worker was selected before. Fix: `RoleSwitcher`'s `onSwitch` now also dispatches `ta:select-worker` with the new slug, same mechanism every other worker-switch surface (Sidebar, `CrewRolePrompt`, ChatPanel's own `[[SWITCH_WORKER:...]]`) already uses.
3. **Hamburger menu "just greys out the screen"** — root cause: the topbar's hamburger button rendered a raw `☰` (U+2630) text character instead of an inline SVG, unlike every other icon button in the same file (cart, sidebar-collapse-toggle, the mobile chat header's own hamburger). That glyph isn't guaranteed to be in the native WebView's font fallback chain and was rendering as a generic missing-glyph box — the tap itself was almost certainly working (opening the sidebar + backdrop correctly), the icon was just invisible, which read as "nothing happened, just grey." Fixed with an inline SVG matching the existing pattern.
4. **Dark-mode white border/frame** (new finding, same session) — the aviation canvas's own `data-av-theme="dark"` scoping was working correctly (confirmed: `--av-bg` etc. tokens were right), but the *app shell's* `.main` container (which wraps every worker canvas, aviation or not) has no background of its own — it just showed the page's white through its 28px padding gutter around the dark canvas. Fixed with a `.main:has([data-av-theme="dark"])` rule in `App.css` that flips that gutter dark too.

**Likely same root cause as #3, not yet fixed — needs confirmation:** several other icon-only buttons in this same evening's screenshots (Dark/Light toggle's ☀️/🌙, Scratch Pad, Profile, and the unlabeled map-layer toggle icons) all showed as a "[?]" box in Sean's screenshots — consistent with the same missing-glyph pattern (raw emoji/Unicode symbol characters instead of inline SVG), not necessarily "these icons are unclear" as originally read. Worth a systematic pass replacing all such icon-as-Unicode-character usages with inline SVG, the same fix already applied to the hamburger — recommend doing this together with the map-layer icon relabeling Sean already asked for below, since it's the same underlying defect.

## Confirmed bugs (broken, not a design opinion)

1. **Preflight tab surfaces a raw API error to the user**: `Google Maps Platform rejected your request. This IP, site or mobile application is not authorized to use this API key. Request received from IP address 24.153.211.234, with empty referer` — shown inline under the route-weather table instead of being caught/handled. Real backend/config issue (API key restriction or missing referer), not just a UI polish item.
2. **Skye chat button opens the wrong role context**: tapping the "Skye" chat bubble from the **Pilots** workspace opened **"Skye · Dispatch"** instead of staying in Pilot. Cross-role bleed in the chat entry point — same family of bug as the tenant-scoping/role-scoping issues already tracked elsewhere in this codebase, worth checking whether it's the same root cause class.
3. **Chat then failed outright**: in that same Dispatch-context chat, Sean asked to plan MEM→LIT, gave tail number `N662LF PC12` when asked, and the flow died (a truncated red "…engine failed" badge visible, no further response). Needs live reproduction with console open, not a static-code read.
4. **Map layer sidebar visually bleeds into the chat panel**: the left-side map layer icon stack (zoom, airports, airspace, navaids, traffic toggles) appears overlaid on top of the Skye chat view in at least one screenshot — looks like a z-index/layout leak between the map component and the chat modal/panel.
5. **Hamburger menu (top-left ≡) does nothing but grey out the screen** — no menu content appears, just a dimmed overlay with no visible way to act on it beyond dismissing.
6. **Approach plates still aren't working** — not visible/renderable at all currently (carried over from the ForeFlight gap analysis, `CODEX-S52.67`/`.70` — not new, but confirmed still broken in this build).

## Navigation / information-architecture — Sean's restructuring proposal

Current tab bar: `Map · Dashboard · Flight · Currency · Preflight · Past Trips · Debrief · Logbook · Aircraft`. Sean's read: it fits the screen now (confirmed the earlier CSS fix worked), but the *set and order* of tabs doesn't match how a pilot actually thinks about the workflow, and several tabs are different doors to overlapping information.

**Proposed priority tab order:** `Map → Airports → Aircraft (W&B + Performance nested under here) → Plates → Flight (Past Trips folded in here) → WX (weather + full briefing content) → Logbook`. Overflow/rest behind a **"More"** menu rather than a flat 9-wide tab bar.

Specific moves called out:
- **Aircraft** should be repositioned right after **Flight**, and needs real population: the day's relevant CAN (aircraft logbook) page requiring pilot attestation, plus fleet info.
- **Plates** deserves its own top-level nav item (ForeFlight does this) rather than being buried/broken as-is; **Currency + Logbook** should be consolidated together rather than being two separate destinations.
- **Preflight** is currently WX/NOTAMs-only and reads as "a little light" — Sean wants it to carry the *full* briefing set: WX, NOTAMs, Navaids, Runways, Procedures, Aircraft — plus something that doesn't exist yet at all: **a pilot personal-readiness / risk-assessment section** (aircraft airworthiness + pilot currency + personal readiness/IMSAFE-type check), not just weather and airspace data. His framing: preflight risk isn't only WX/NOTAMs/navaids/procedures, it's also "is the aircraft airworthy and is the pilot current and ready."
- **CAN** (aircraft logbook / airworthiness record) should reference the aircraft's **AFM/POH performance documents**, and should hold copies of the physical documents required to be carried in the aircraft (Sean's shorthand: "SPARROW" — the standard required-aboard-document set). Clicking into CAN opening a layered overlay (e.g., an airworthiness check) on top of the current view is fine as a pattern — already used elsewhere.
- **Debrief** should include a link to file an ASAP, FOQA, or NASA report when there was an incident — currently has no such path.
- **Past Trips** has good per-trip detail but needs a **summary/list view** more like ForeFlight's own Flight-tab history view (Sean referenced a ForeFlight screen capture he shared this morning) — the detail view is fine as a drill-down, not as the only view.

## Profile (vertical-profile view)

Sean likes the concept but flags it's currently disconnected: it should integrate with the map as an **overlay**, not a separate unlinked view — should show both vertical profile and the actual flight-plan route directly on/over the map. Longer-term, per his ForeFlight comparison: this is also where **Synthetic Vision** should eventually live, alongside a **layer menu** (clutter/declutter map overlays) — same pattern as ForeFlight's Maps screen.

## Map layer controls

The left-side icon stack (zoom, airports/airspace/navaids/traffic toggle icons) isn't self-explanatory — icons need to be clearer and/or replaced with a labeled dropdown menu for layer selection, matching the ForeFlight screen grabs Sean uploaded yesterday.

## Copy / small polish items

- Remove the **No-Go / Caution / Advisory / Reference / Go count "pills"** row under the CoPilot header — Sean doesn't know what they're for and doesn't see them adding value as currently presented.
- **"+ Log Flight" → "+ New Flight"** — the button plans a *future* flight, "Log" implies recording something already flown.
- **Flight tab** formatting: text is too large and the layout reads oddly; Sean's proposed column set: `DATE · AIRCRAFT · DEP · ARRIVAL · ALTITUDE · ROUTE · FUEL · W&B · STATUS (Filed / Assigned / Completed)`.
- Header buttons (`Dark`/`Light`, `Scratch Pad`, `Profile` — each with a `?` icon) could be smaller.
- The **Dark/Light toggle** should be a small round icon button, not a labeled text pill.
- Text size in general should follow the platform's own accessibility/Settings text-scaling, not be baked oversized into the layout — if a user needs bigger type, that's a Settings/Account-level control, not a per-screen default.
- Top bar showing **"Title App LLC"** as the org name reads as confusing/out-of-place in the aviation context — flagged, not diagnosed (likely just the current demo tenant's real name, but worth a second look).
- The top-right icon (split-pane style, used to return to canvas) isn't intuitively "back to canvas" on first glance — acceptable since it's already used consistently elsewhere in the app.

## Confirmed working / no action needed

- Tab bar now fits the screen width correctly (validates today's earlier `.appShell` flex-direction CSS fix).
- Scratch Pad — liked as-is, draw/undo/clear all worked in the walkthrough.
- Currency tab — layout is fine, just has no real data yet (expected on a fresh tenant).
- Aircraft/Logbook tabs — same, structurally fine, just empty (expected on a fresh tenant).

## Additional findings (later in the same live pass)

- **Training/Education and Locker/Documents tabs are missing from the aviation tab set entirely** — Sean's read: these weren't scoped out deliberately, they slipped through the build. Training should cover ongoing flight training/CFRs/instrument/compliance/currency/WX/aerodynamics/systems for the specific aircraft — doesn't need to be primary nav, fits under the proposed "More" menu. Locker is the reference-document home: generic CFR/FAA pubs/GOM/OpSpecs SOPs (a generic version SOCIII ships) plus company-specific documents plus the aircraft's AFM/POH (housed under an Aircraft **Type** reference worker, which itself should be a tab, probably nested under Aircraft). **Not a fresh build** — a generic `"studio-locker"` section (`WorkerLibrarySection`) already exists and is routed in `App.jsx`, just never wired into the aviation worker's own tab set.
- **Wearable "Attach RealWear" button** — Sean's call: add it as a small icon button in the same header row as Dark/Scratch Pad/Profile (matching his own note that those could be smaller), styled as a **"coming soon"** entry point, not live functionality — the actual RealWear integration hasn't been built yet (`CODEX-S52.72`/`.74`-adjacent testing hasn't even run). Not yet implemented.
- **Tab bar should carry small icons + label**, ForeFlight-style (similar but distinct iconography), not text-only labels. Not yet implemented — pairs naturally with the "systematic icon pass" noted above.

## Not addressed in this pass, carried forward

- Whether the light/dark **default** (Pilot → dark) is actually applying on first load vs. a stale per-device preference — flagged earlier this session, not yet resolved by Sean's own click-through (he was in light mode with a "Dark" toggle offered at the start of this pass).
- Portrait-orientation verification of the map/tab-bar fix — not explicitly confirmed in this QA pass (all screenshots shown were effectively landscape/full-width).
