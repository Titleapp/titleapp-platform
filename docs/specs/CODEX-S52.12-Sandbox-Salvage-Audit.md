# CODEX S52.12 — Sandbox Salvage Audit
*What's still useful in DeveloperSandbox.jsx after the no-code builder was killed*

**Date:** 2026-06-01
**Trigger:** Sean — *"What else is in the developersandbox.jsx that we should use. There was a lot of work there and a lot of it is still probably relevant — including parts of the ideation process, marketing publishing etc. Don't throw the baby out with the bathwater."*

---

## Context

`apps/business/src/pages/DeveloperSandbox.jsx` is **3,690 lines** and was the host page for the visual no-code worker builder. That builder was **deprecated 2026-05-31** in favor of the Substack-pattern creator model (Claude Code + open-source fork + sponsored Anthropic Team seat). The PAGE is dead, but most of its component children are **fully usable** and represent significant prior work that should NOT be thrown out.

Many of the components are already extracted into `components/` and `components/sandbox/` — they just lost their host surface when the sandbox went away. The salvage work is mostly about re-mounting them in surfaces creators actually visit (Creator Workspace, Creator Onboarding, Worker Settings).

---

## What's still in the codebase

### ✅ Already extracted into shared component libraries

All of these are STANDALONE COMPONENTS — they don't depend on the sandbox host. They're plug-and-play:

| Component | Path | What it does |
|---|---|---|
| `CreatorSpotlight` | `components/CreatorSpotlight.jsx` | Featured-creator submission flow: photo upload, bio, worker description, release-agreed checkbox, submit. The "get featured" onboarding. |
| `DistributionKit` | `components/DistributionKit.jsx` | **The worker promo deck generator.** PowerPoint/Keynote export, QR code for worker URL, embed code (iframe), paid distribution options. Routes for `isGame` workers vs worker workers. |
| `PublishPreflight` | `components/PublishPreflight.jsx` | Pre-publish checks: required fields, completeness, lifecycle gates. Stops creators from shipping incomplete workers. |
| `TestWorkerPanel` | `components/TestWorkerPanel.jsx` | Test-mode wrapper that runs the worker in a sandboxed context for the creator to dogfood. |
| `BuildProgress` | `components/BuildProgress.jsx` | Build-stage progress UI. Step-by-step visualization for creators. |
| `CommsPreferences` | `components/CommsPreferences.jsx` | Per-worker communication preferences (email/SMS frequency, subscriber notifications). |
| `MyImagesPanel` | `components/MyImagesPanel.jsx` | Image-library surface for creator-uploaded media (logos, banners, hero images). |
| `PostLaunchAlex` | `components/studio/PostLaunchAlex.jsx` | Post-launch Alex behavior — what Alex says AFTER the worker is published. Different tone than pre-publish. |
| `DataLinkStatus` | `components/studio/DataLinkStatus.jsx` | Status indicator for external data sources connected to the worker. |
| `CreatorStudioHeader` | `components/sandbox/CreatorStudioHeader.jsx` | Top-bar for the creator studio: title, step indicator, save state, profile. |
| `StepStatusBar` | `components/sandbox/StepStatusBar.jsx` | Linear progress strip across the 7-step Creator Journey (Start / Define / Build / Test / Preflight / Distribute / Grow). |
| `FileUploadBar` | `components/sandbox/FileUploadBar.jsx` | Drag-drop file upload with classification (`classifyFile`) and validation (`validateFiles`). |
| `CollapsibleSection` | `components/sandbox/CollapsibleSection.jsx` | Expandable section primitive used throughout the studio. |
| `CanvasComingSoon` | `components/sandbox/CanvasComingSoon.jsx` | Placeholder UI for canvas tabs that aren't built yet. |
| `GameBoardPanel` | `components/sandbox/GameBoardPanel.jsx` | Game-type worker board (alternative to worker-type canvas). |
| `GameEndScreen` | `components/sandbox/GameEndScreen.jsx` | End-game scoring + share screen. |

### ⚠️ Still embedded in `DeveloperSandbox.jsx` (need extraction)

These are defined INSIDE the sandbox file as inline components. They should be extracted to `components/` as standalone, then re-mounted:

| Component (inline) | What it does | Where to mount next |
|---|---|---|
| `InlineDraftCard` | Worker card rendered IN-CHAT as the creator iterates. Shows current draft state as Alex helps shape it. | Creator workspace chat panel during build phase |
| `ProgressiveCard` | Worker card on the right panel that fills in as the conversation progresses. Visual feedback for the build process. | Creator workspace canvas during build phase |
| `LifecycleCard` | "How This Works" reference card showing the 7-step Creator Journey. | Creator workspace sidebar / onboarding |
| `DeviceSelector` | One-tap device picker shown before game test mode launches. | Pre-test modal for any worker that supports mobile/desktop variants |
| `CreatorStudioNav` | Left-nav for the Creator Studio with flow-step awareness, workspace switcher, image gallery toggle. | Creator workspace sidebar (replaces our current minimal sidebar for creator-mode) |
| `TestPanelFallback` | Fallback test panel when the main one fails to load. | Keep as fallback in test mode |

### 📚 Constants and helpers worth preserving

| Item | What it is | Why keep |
|---|---|---|
| `FLOW_STEPS = ["Start", "Define", "Build", "Test", "Preflight", "Distribute", "Grow"]` | The 7-step Creator Journey | Should be the canonical schema across creator surfaces |
| `SURVEY_QUESTIONS` | Initial onboarding survey | Already a working ideation entry point |
| `renderMarkdown` (shared) | Markdown rendering with safe-HTML | Used everywhere — keep |
| `isAffirmative`, `isMetaQuestion`, `isTestTrigger` | Conversation classifiers | Useful in any chat-driven worker flow |
| `waitForAuthInternal` | Firebase ID-token getter with timeout | Keep — robust auth helper |

---

## What to do with this — recommended plan

Don't move all 3,690 lines at once. Move things only when there's a real surface for them. Here's the sequenced plan:

### Phase 1 — Wire `DistributionKit` into a creator-facing surface (THIS WEEK)

**Why first:** Ruthie pitches her concept tomorrow. The `DistributionKit` generates worker promo decks (PowerPoint/Keynote/PDF) — exactly what she needs to present. Right now it's stranded in the dead sandbox; no creator can reach it.

**Action:** Mount `DistributionKit` in the new `Creator Workspace` page (proposed `/creator-workspace/<worker-slug>`). For Ruthie's flow tomorrow, generate the deck for the IR worker (or the nursing-eval worker stub) so she can demo what HER deck will look like once her worker exists.

### Phase 2 — Build the Creator Workspace page using salvaged components

**The 60-second plan for `/creator-workspace/<worker-slug>`:** mount these in one page:
- `CreatorStudioHeader` (top)
- `StepStatusBar` (the 7-step journey indicator)
- `CreatorStudioNav` (sidebar — needs extraction first)
- Center column: 4 tabs
  - **Build** — `BuildProgress` + `ProgressiveCard` + chat
  - **Test** — `TestWorkerPanel`
  - **Preflight** — `PublishPreflight` + `PublishPreflightChecklist`
  - **Distribute** — `DistributionKit` + `CreatorSpotlight`
- Right rail: `MyImagesPanel`, `CommsPreferences`, `DataLinkStatus`

This is mostly already built — it's a re-mount, not new development.

### Phase 3 — Extract the inline components

`InlineDraftCard`, `ProgressiveCard`, `LifecycleCard`, `CreatorStudioNav` — these are ~600 lines of useful code stuck in the sandbox file. Pull them into `components/sandbox/` (or just `components/`) as standalone, then dispose of the dead host.

### Phase 4 — Delete the sandbox page

Only after Phases 1-3 are done. Don't delete the host until every useful child has a new home.

---

## Specific tie-ins to current work

| Today's work | What from sandbox helps |
|---|---|
| **Ruthie's tomorrow pitch** | `DistributionKit` → generate her deck right now from the IR worker as a stand-in |
| **OF gallery as marketplace browse** | `CreatorSpotlight` → creators submit themselves for spotlight placement; CreatorGallery surfaces it |
| **Video as first-class output (CODEX S52.11)** | `MyImagesPanel` → extend to `MyMediaPanel` (images + video clips), already has upload + classification infra |
| **Creator Workspace view (Sean's IR-as-creator request)** | Phase 2 above — direct fit |
| **Phase 2 explainer videos (CODEX S52.10)** | `BuildProgress` step-by-step UI maps to video-generation progress tracking |
| **Worker promotion decks** | `DistributionKit` already does .pptx / .key / .pdf export. This is the "AI-generated worker deck" Sean recalled. |

---

## The big save

**Approximately 70-80% of the work in DeveloperSandbox.jsx is reusable.** Most of it is already extracted into shared components. The work is *re-mounting*, not rebuilding. The components are battle-tested (worked in the sandbox for months) and the underlying APIs (`sandboxWorkerApi.js`) are still hot.

If we had to rebuild `DistributionKit` from scratch — QR + PowerPoint export + paid options + embed code — that's 2-3 days of work. It already exists. Same for `PublishPreflight`, `TestWorkerPanel`, `CreatorSpotlight`, `BuildProgress`.

**Estimated total re-mount cost: 1-2 days of focused work** to get the Creator Workspace page live with all these surfaces. That gives every creator who joins SOCIII a complete build → test → publish → promote pipeline. Without any of them, creators are flying blind from build to launch.

---

## Open questions for Sean

1. Should we move sandbox components into a new namespace (`components/creator-studio/`) to make their purpose clear, or keep them in `components/sandbox/` and rely on memory?
2. Do we keep the 7-step `FLOW_STEPS` canonical or evolve it now that the creator journey has changed (Substack-pattern, no visual builder)?
3. `CreatorSpotlight` requires a release agreement — does that need legal review again now that we're in SOCIII Inc.?
4. `DistributionKit` exports worker URLs to `sociii.ai/w/<slug>` — that URL pattern is different from our new `/creator/<character>` pattern. Need to reconcile.

---

## Related

- `apps/business/src/pages/DeveloperSandbox.jsx` — the host being phased out
- `apps/business/src/components/sandbox/` — already-extracted children
- `apps/business/src/components/studio/` — adjacent creator-studio bits
- [[project-sandbox-killed-substack-pattern]] — the decision that triggered this audit
- CODEX S52.10 (Video Application Maturity Model) — where these components plug into the broader build
