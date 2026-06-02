# Canvas

The **canvas** is the right-hand panel of the SOCIII workspace. It's where your worker shows the user what it's doing — and increasingly, where workers create, present, and adapt content across surfaces (chat thread, full-canvas, wearable glance).

This page covers four things:

1. **Tabs** — how you organize the canvas surface (the schema)
2. **What renders inside a tab** — the content-type registry
3. **Workers as content creators** — when a worker authors content (video, document, image) into the canvas at runtime
4. **Wearables — where the canvas is going** — Vision Pro spatial, glanceable watch cards, the future render contexts

## The schema

```json
{
  "tabs": [
    {
      "id": "current-case",
      "title": "Current case",
      "signal": "card:current-case",
      "default": true,
      "icon": "clipboard",
      "data_source": "live"
    },
    {
      "id": "protocols",
      "title": "Protocols",
      "signal": "card:protocols",
      "data_source": "hospital-protocol-locker",
      "fixture": "fixtures/protocols-sample.json"
    },
    {
      "id": "history",
      "title": "Past evaluations",
      "signal": "card:history",
      "data_source": "live",
      "scope": "user"
    }
  ]
}
```

## Field reference

| Field | Required | Description |
|---|---|---|
| `id` | yes | Stable identifier (kebab-case). Used in URLs and analytics. |
| `title` | yes | Display label. Keep under 20 chars. |
| `signal` | yes | The canvas signal the platform watches for. Convention: `card:<id>`. |
| `default` | no | One tab can set `default: true` — it's open when the worker first loads. |
| `icon` | no | Icon name. Optional; if omitted, the title shows alone. |
| `data_source` | no | `live` (real data from your backend), `sample` (fixture only), or a named source like `hospital-protocol-locker`. |
| `fixture` | no | Path to a JSON fixture used in demo mode. |
| `scope` | no | `user` (per-end-user data) or `tenant` (shared across the customer's team). Default `tenant`. |
| `coming_soon` | no | If true, renders the tab as a "coming soon" placeholder. Useful for staging your roadmap publicly. |

## How tabs render

When a user clicks a tab, the platform:
1. Emits the tab's `signal` to the right-panel renderer
2. The renderer looks up the worker's canvas component (or falls back to a generic card)
3. Loads data per `data_source` (live API call or fixture)
4. Renders the result

If your worker provides bespoke components for any tab (e.g., a custom map view), you can register them in the worker's component map. Otherwise the platform's generic card renderer handles it.

## SAMPLE mode

When a user first opens a worker without any data, the platform shows fixtures. Each fixture entry tagged `SAMPLE` renders a chip in the card header so the user knows what they're seeing. This is critical for demo experience.

You provide fixtures per tab. Claude Code will help you author them from a single example.

## How many tabs?

Three guidelines:
- **3–5 tabs** for v1. Add more later.
- **The default tab is the most-used view.** Customers will see it first every time.
- **One tab per major thing the user does.** Not per data source.

Bad: `[Patient Data] [Lab Data] [Order Data] [Note Data]` — those are data sources, not user activities.

Good: `[Current case] [Protocols] [History]` — those are things a nurse actually does.

## The "Coming soon" pattern

Sometimes you want a tab to be visible (so users know it's planned) but not yet functional. Use `coming_soon: true`:

```json
{
  "id": "team-handoff",
  "title": "Team handoff",
  "signal": "card:team-handoff",
  "coming_soon": true,
  "coming_soon_note": "Coming v2 — shift handoff bundles with co-sign workflow"
}
```

This is the **transparency rule** ([memory](https://sociii.ai)) — name what's not built yet so users aren't surprised by gaps.

---

## What renders inside a tab — the content-type registry

Tabs are the organizing surface. **What renders inside a tab** is the content. The platform supports a registry of first-class output types — every worker spec carries declarations for each, and the creator activates the ones their worker actually produces.

| Type | What it is | Render context |
|---|---|---|
| `text` | Chat-style message or paragraph | Chat thread, inline card |
| `structured_data` | JSON object rendered as a typed card (e.g., a SOAP note, a deal summary, a flight plan) | Card on canvas |
| `document` | PDF / DOCX / spreadsheet | Inline preview + download |
| `image` | PNG / JPG / SVG (Fal.ai-rendered or uploaded) | Card on canvas, gallery view |
| `audio` | TTS voiceover, generated music, narration | Inline player |
| `video` | Generated explainer clip, demo walkthrough, narrative — including externally-linked YouTube embeds | Inline player, full-canvas modal |
| `multimedia_sequence` | Ordered sequence of typed outputs (course module, film chapter, multi-step training package) | Sequenced playback with progress |

Every worker's `catalog.json` carries declarations for **all** of these types with an `enabled: true | false` flag. Defaults to `false`; the creator flips it to `true` and configures activation when they're ready to ship that output type. New types added to the registry trigger automated stub-insertion across existing workers — creators opt in per type when they want, no migration required.

This is the architectural commitment: the platform ships video-ready, audio-ready, and multimedia-sequence-ready from day one. Whether your worker uses those types is your choice. Whether you can flip them on later is guaranteed.

## Workers as content creators

A canvas isn't just where existing data is displayed — it's also where workers can **author content at runtime**.

Examples already live today:

- **Marketing Worker** generates campaign videos (Kling-rendered character clips) and renders them directly into the canvas with a price quote against your data credits before each render
- **Brand Voice Studio Worker** generates branded images (Fal.ai) into the canvas and saves them to your Drive
- **IR Worker** generates investor-update documents and renders them as previewable PDFs in the canvas before any send

The pattern is consistent: the worker proposes the content with a cost-quote, you approve, the render happens, the audit log captures it (rule version pinned, cost recorded, data-credit charge logged), and the rendered artifact lands in the canvas.

Two render policies for content-generating tabs:

- **`on_demand`** — Subscriber clicks a "generate this" CTA → worker shows cost quote → subscriber confirms → render
- **`auto_generate_with_context`** — When a particular chat context triggers, the worker auto-generates content as part of its response. Cost auto-debited within tier limits.

Both are explicit creator opt-ins per output context. Default off — no surprise costs.

## Wearables — where the canvas is going

The canvas today is a desktop / mobile-web surface. The architecture is committed to extending it to wearables, with output types already carrying a `wearable_contexts` field in their spec.

**Planned render contexts (not yet shipped — flagging publicly so creators design with them in mind):**

| Context | Surface | What it shows |
|---|---|---|
| `phone_mobile` | iOS / Android responsive | Same canvas, mobile-laid-out (shipping) |
| `glanceable_watch_card` | Apple Watch · Wear OS · WHOOP | A single "next thing to do" or "current status" card, refreshable |
| `vision_pro_spatial` | Apple Vision Pro · Quest · spatial-OS devices | Canvas as a spatial panel — multiple tabs as floating boards, with the worker's outputs anchored in 3D space |
| `voice_only` | CarPlay · Siri · home assistants | Audio-rendered version of the canvas's most actionable card |

A creator authoring a worker today doesn't need to ship to all of these — most workers will only declare `phone_mobile`. But the wearable context fields are reserved in the spec, so when a creator wants to extend their worker to a watch face or a Vision Pro spatial panel later, they flip an `enabled: true` flag rather than retrofitting.

**The thesis:** the canvas isn't a screen. It's a presentation surface that adapts to the device the user is on. A nurse checking a patient evaluation on Vision Pro should see the same worker's outputs as the nurse glancing at their watch between rounds — same rules, same audit trail, different render.

We'll ship the wearable contexts incrementally. The earliest target is the glanceable watch card for high-frequency workers (HR Schedule, FlightPlanning, EMR Triage). Vision Pro is queued for a later release once spatial rendering primitives stabilize across spatial-OS vendors.

## Patent reference

The canvas's multi-context rendering architecture is part of the SOCIII patent portfolio (Filing C — Multi-Tier Composable Rule-Based Governance), specifically the AI-Worker output validation layer that operates uniformly across render contexts. Each rendered output across phone, watch, spatial, or voice is governed by the same composed ruleset, version-pinned at render time, and anchored in the audit chain.

## What comes next

**[→ Worker anatomy](/docs/worker-anatomy)** — how canvas tabs fit with the other five files
**[→ Intent Spec](/docs/intent-spec)** — declaring the user activities your tabs serve
**[→ QA-001 validator](/docs/qa-001)** — validator checks for tab schema compliance
**[→ RAAS](/docs/raas)** — how the five-tier rule hierarchy governs every render
