# CODEX S52.11 — Video as a First-Class Worker Output Type
**Status:** DRAFT — Sean to flesh out tonight before more creators start building.
**Date stub created:** 2026-06-01

---

## Why this matters NOW

Ruthie pitches her concept to the head of school tomorrow. If approved, she starts building. Elise has 3 EU DPP ideas she's playing with. Both will build under the *current* worker spec — which assumes text + structured data outputs.

If we don't declare video as a first-class output type before they start, they'll model their workers as text workers. Retrofitting video later means rewriting every worker's output contract, billing setup, canvas display, and editorial review pipeline.

Sean's insight (2026-06-01): *"The canvas video capability changes the definition of what a worker output can be. Right now the spec assumes text and structured data. Video as a first-class output type needs to be in the worker spec before creators start building — otherwise they'll all build text workers and you'll have to retrofit the video capability later."*

This is correct. The spec needs to ship before more creators activate.

---

## Core rule (Sean, 2026-06-01)

**Every worker spec MUST include declarations for all first-class output types — including video. Activation is the creator's choice; presence in the spec is not.**

This is the architectural commitment that prevents retrofit hell:

- **Required at spec level.** Every worker's `catalog.json` (or equivalent) carries an `outputs[]` block that enumerates every first-class output type the platform supports — text, structured_data, document, image, audio, video, multimedia_sequence. The block is exhaustive, not selective.
- **Optional at activation level.** Each output type carries an `enabled: true|false` flag. Default for new outputs (like video, when added to a type that didn't have it before) is `enabled: false`. Creator chooses when to flip it.
- **No retrofit migration.** When a creator wants to add video to their existing text-only worker, they edit one boolean and configure the activation params. They don't rewrite their spec, the platform doesn't run a migration job, no existing workers break.

This is the difference between "we support video" and "we ship video-ready." We ship video-ready. Whether any individual worker uses it is up to the creator.

---

## Three guardrails

### 1. Output type enum

The worker spec's output declaration must support, at minimum:

| Type | What it is | Example |
|---|---|---|
| `text` | Chat response, message bubble | Today |
| `structured_data` | JSON object rendered as card | Today |
| `document` | PDF / DOCX / spreadsheet | Today (partial) |
| `image` | PNG / JPG / SVG | Today (Fal.ai shipped) |
| **`audio`** | TTS voiceover, generated music | New |
| **`video`** | Generated video clip — explainer, demo, narrative | New |
| **`multimedia_sequence`** | Ordered sequence of typed outputs (course module, film chapter) | New |

### 2. Per-output declaration at worker-spec level

In `catalog.json` or equivalent, each worker declares **all** output types the platform supports, with an `enabled` flag per type. For types the creator hasn't activated, the declaration stub is still present but `enabled: false` and other fields can be empty.

```yaml
worker:
  slug: er-nursing-001
  outputs:
    - type: text
      enabled: true
      contexts: [chat_response]
      cost_model: per_call
    - type: structured_data
      enabled: true
      contexts: [chart_summary_card, shift_handoff_card]
      cost_model: per_call
    - type: document
      enabled: true
      contexts: [chart_export, shift_summary]
      cost_model: per_call
    - type: image
      enabled: false  # creator can flip to true + populate when ready
    - type: audio
      enabled: false
    - type: video
      enabled: true
      contexts: [canvas_explainer, canvas_protocol_walkthrough]
      cost_model: per_render
      cost_cents: 100  # billed via dataFee, kling:video markup
      max_duration_sec: 15
      render_policy: on_demand
      wearable_contexts: [phone_mobile, vision_pro_spatial]  # future-proofing per CODEX S52.10
    - type: multimedia_sequence
      enabled: false  # creator activates when ready to ship course modules
```

The validation rule is: every `type` value enumerated in the platform's output-type registry MUST appear in every worker's `outputs[]` block. New types added to the platform registry trigger an automated stub-insertion (all `enabled: false`) across existing workers. Creators opt in per type when they're ready.

### 3. Render policy hooks

Two policies for video outputs (and audio):

- **`on_demand`** — Creator authors the video; subscriber clicks "generate this explainer" → cost-quote → render
- **`auto_generate_with_context`** — When a particular chat context triggers (e.g., subscriber asks "show me how to triage chest pain"), the worker auto-generates a video as part of the response. Cost is auto-debited (with tier-based confirm gate per existing `dataFee.js`).

Both policies need explicit creator opt-in per output context. Default = off (don't surprise creators with surprise costs to their subscribers).

---

## What this implies for the rest of the spec

- **`dataFee.js` already has `kling:video`** — extends to `video:render_<vendor>`, `audio:tts_<vendor>`, etc.
- **Canvas tab schema** (`canvasTabs[]` on every worker) needs a `media_player` tab type — different from text card / structured card / map
- **Audit log per action** (`outputs save to your Drive · audit log per action`) must record video outputs distinctly — file pointer + cost + render-vendor used + render-params
- **Editorial review for video outputs** — automated QA-001-style for `auto_generate_with_context` (worse failure mode than text; embarrassing video can't be quietly redacted)
- **Storage and retention** — video outputs live in worker's Drive, served via Firebase Storage with audit-anchor hash recorded
- **Creator pricing variants** — workers that include video outputs cost more (e.g., $49/mo instead of $29/mo) OR sell video credits separately

---

## Action this week

| When | Who | Action |
|---|---|---|
| Tonight | Sean | Draft this spec fully — fill in the open questions below |
| This week | Sean + Code | Update `canvasTabs` schema to include `media_player` tab type |
| This week | Sean + Code | Update worker `catalog.json` schema to support output declarations |
| This week | Sean + Code | Update `dataFee.js` registry with audio + multimedia_sequence source keys |
| Before Ruthie ships | — | Her worker spec uses the new output declarations |
| Before Elise ships | — | Her DPP worker uses the new output declarations |

---

## Open questions for Sean to resolve tonight

- Should `multimedia_sequence` be its own type, or a metadata tag on a sequence of typed outputs? (Argument for "own type": ordering and progress are first-class. Argument against: less flexible.)
- Per-context output declarations: do creators declare them at intent-spec time, or can they edit them post-publish?
- Pricing model: workers that include video are inherently more expensive — does that flow through to subscriber price, creator share, or both?
- Editorial review for `auto_generate_with_context` video outputs: human checkpoint or auto-only?
- What does the canvas look like when a worker produces a *sequence* of typed outputs (text + video + document) in one response? Threaded? Stacked cards? Inline? (This UI decision blocks Phase 3 in CODEX S52.10.)

---

## Related

- `[[CODEX-S52.10-Video-Application-Maturity-Model]]` — the video application progression from ads to films. This spec (S52.11) is the foundational scaffolding under it.
- `[[project-video-in-canvas-pattern]]` — display surface
- `[[project-creator-video-generation-pipeline]]` — generation chain
- Worker canvas spec — `docs/CODEX-50.10-T3-Canvas-Tab-Schema-spec.md` (extends from there)
- `dataFee.js` — billing infra already wired

---

*Draft created 2026-06-01 by Code as a starting frame. Sean to expand to full spec tonight. Lock before Ruthie and Elise activate as creators.*
