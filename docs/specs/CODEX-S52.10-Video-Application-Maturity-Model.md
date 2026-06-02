# CODEX S52.10 — Video Application Maturity Model
*Tracking the video-in-workers thesis from simple ads through full feature films*

**Date:** 2026-06-01
**Status:** Phases 0-1 shipped today. 2-5 mapped, sequenced, costed.

---

## The model in one paragraph

Video becomes a first-class output for every worker on SOCIII. Workers don't just *answer* — they *show*. The same render pipeline, asset registry, and data-credit billing infrastructure that ships character ads today scales through explainer clips, course modules, and feature-length films. Phase 0 starts in marketing creative; Phase 4 ends in produced films. Each phase reuses the previous phase's infrastructure and expands the worker roster. The marketplace progression compounds — the workers that ship Phase 0 are the workers that subscribe to Phase 2's services and produce Phase 3's content and cast Phase 4's films.

---

## What we want workers to DO at each phase

| Phase | Worker outcome | User outcome | Reused infra |
|---|---|---|---|
| **0 — Ads** | Marketing worker produces character ad creative for every worker in the catalog | User encounters domain expertise as social-feed entertainment | New: asset registry + render pipeline + brand-frame compositor |
| **1 — Embedded** | Worker landing surface auto-embeds its own demo video alongside the subscribe card | User sees the expertise before deciding to subscribe | Add: per-character routing, workspace pre-seed, UTM capture |
| **2 — Explainer** | Worker generates context-specific video clips on demand when chat needs to *show* something | User gets a 5-30 sec clip when a written answer wouldn't land | Add: video gen API, branded composite template per worker, canvas media_player tab |
| **3 — Multi-clip** | Worker sequences clips into modules, courses, micro-curricula | User learns the discipline, not just queries it | Add: module sequencing, progress tracking, completion certificates |
| **4 — Film** | Worker chain produces feature-length narrative content end-to-end | Viewer watches a film authored, cast, voiced, scored, edited entirely by the platform | Add: Storyboard, Director, Casting, TTS, Score, Editor workers |
| **5 — Marketplace** | Filmmakers direct films using their workers; viewers subscribe to film libraries | Same | Same; new economics tier (per-film vs. per-month) |

---

## Tool stack

The platform must abstract over the video-gen layer rather than lock to one vendor. Different vendors win on different tasks; quality, price, and availability move month-to-month.

| Layer | Current default | Alternatives | Notes |
|---|---|---|---|
| **Video gen (5-30 sec clips)** | Kling v3 ($0.50/clip) | Veo (Google, via Vertex AI), Runway Gen-3, Pika, Sora | Vendor-agnostic abstraction. Switch per task quality/price. |
| **Image gen** | Fal.ai (integrated) | Replicate, Recraft, Midjourney API, DALL·E 3 | Already wired for image-to-canvas |
| **TTS voice** | (not yet integrated) | ElevenLabs (best quality), Cartesia (cheaper), Play.ht, OpenAI Voice API | Phase 2+ requirement |
| **Music / score** | (not yet integrated) | Suno, Udio, AIVA, Epidemic Sound (licensed library) | Phase 3+ requirement |
| **Image composition** | Sharp + ImageMagick (Phase 0 shipped) | Pillow (Python), Canvas API | Server-side compositing for brand frame overlay |
| **Video composition** | ffmpeg | Remotion (React programmatic), Shotstack API | Phase 4 needs ffmpeg-based assembly + Remotion for animated motion graphics |

**Architectural rule:** The render pipeline accepts a "generation spec" (prompt + style + duration + aspect) and routes to the appropriate vendor. Vendors are swappable without changing the canvas display contract, the worker spec, or the billing surface. This protects us from vendor lock-in and lets us optimize cost per quality tier.

**Open question for Sean:** Do we need an in-house generation tool (text-to-image-to-video pipeline trained on our own outputs) or is multi-vendor + abstraction sufficient? In-house = expensive but defensible; multi-vendor = cheap but exposed to vendor risk. Decision: multi-vendor with abstraction for v1; revisit at $1M ARR.

---

## Data token economics — both sides of the transaction

Every video interaction sells data tokens. Each token call generates revenue on two distinct moments — generation and usage — and each moment runs through the same markup-share model.

**The token-pricing rule:** `user pays = base cost × 2` (i.e., 100% markup over the platform's actual vendor cost). Of the markup (the 1× over cost), **20% goes to the creator who owns the worker**; the remaining 80% is platform net. The cost itself is recovered first.

**Walking the numbers on a single Kling video gen:**
- Platform pays Kling: **$0.50** (base cost)
- User pays for the call: **$1.00** (cost + 100% markup)
- Cost recovered: $0.50 (covers Kling invoice)
- Creator share: **$0.10** (20% of the $0.50 markup)
- Platform net: **$0.40** (80% of the $0.50 markup)

**Generation side (creator-driven call):**
- Creator triggers a video generation → data credit debited
- Wired through `dataFee.js` source registry (`kling:video` etc.); existing `quoteDataFee` + `recordDataFee` flow
- Creator-facing UI: tier-classified (silent / warn / confirm) per cost; existing infrastructure

**Usage side (subscriber-driven call):**
- Subscriber triggers a worker-generated explainer to render (or re-render with different context) → data credit debited per call
- Same per-call markup split. The creator earns from their own users.
- Subscription fee covers a per-month allowance; overages billed via the same data-credit floor.

**Compound effect:** A single generated explainer clip costs the creator $1 to make ($0.50 cost + $0.50 markup × 80% platform net = $0.40 to platform, $0.10 to creator from their own generation). If it gets re-rendered/viewed 500 times by subscribers at $0.01-$0.05/call, that's another $5-$25 of usage revenue from the same asset, each call splitting cost/creator/platform on the same markup-share rule. The asset earns repeatedly; the platform takes margin every time.

**Pricing model implication:** Workers with video outputs cost more to subscribe to ($49/mo, $99/mo tiers) — OR — base subscription includes N video credits/month with overage data-billed. Both models flow through the same `dataFee.js` infra. Recommendation: bundle N credits at the subscription tier; data-bill overages.

**Why this is structurally important.** Subscription marketplace economics (75/25 split on the $29/mo subscription fee) are separate from token economics (cost + 100% markup, 20% of markup to creator). They are two distinct revenue surfaces and they STACK. A creator earns 75% of every $29/mo subscription AND 20% of every data-token markup their worker drives. The same worker contributes through both surfaces simultaneously. The platform's net on tokens (80% of markup) funds the vendor relationships, the compute infra, and the data-credit floor reserves that keep the cost model intact.

This pattern only works because we built the data-credit infrastructure as a first-class billing primitive months ago. Without it, video would be a cost center. With it, video is a revenue compounder on both sides.

---

## Structural dependencies (the rest of the platform that makes this work)

The video maturity model is not standalone. It rides on top of platform primitives that must already be solid:

| Primitive | Why video needs it |
|---|---|
| **Append-only audit trail** | Every video output records: who generated it, what prompt drove it, which vendor, cost, version. Required for both billing reconciliation AND legal defense (likeness consent, copyright, regulatory). |
| **QA-001 (worker quality assurance)** | Video output failure modes (wrong character, factually inaccurate explainer, brand-off creative) are harder to detect than text failures. QA-001 assertions need video-output checks per worker. |
| **Brand Voice Studio Locker** | Every video must enforce per-worker voice/style/visual consistency. Studio Locker holds the brand contract; renderer enforces it at composite time. |
| **Data credit infrastructure (`dataFee.js`)** | Without per-call billing, video outputs are unsustainable. Already wired. |
| **Canvas tab schema (`canvasTabs[]`)** | Where video outputs render. Needs new `media_player` tab type. |
| **Worker output declaration in catalog** | What types of output each worker produces (text, structured_data, video, audio, multimedia_sequence). See CODEX S52.11. |
| **Likeness licensing + attribution (Patent claim #4)** | Required for Phase 4 (films) and recommended for Phase 2 (any human likeness in explainers). |

These primitives are foundational. Video maturity is a high-leverage application of them. **You can't sequence video output ahead of the primitives — but the primitives also can't justify themselves without applications like this.** Build them together.

---

## Worker gap analysis — what's missing per phase

| Phase | Workers we have | Workers we need to add |
|---|---|---|
| **0 — Ads** | Marketing & Content worker (the producer) | **Character Generator worker** — takes catalog entry → outputs character name + hourly-rate equivalent + visual prompt + Alex opening line. Automates what we did manually for 17 characters. |
| **1 — Embedded** | CreatorLanding component (the surface) | Per-worker landing for the existing 238 catalog workers (non-character). Today only the 21 launch characters have landings. |
| **2 — Explainer** | Render pipeline, dataFee.js, asset registry | (1) **Video Gen abstraction worker** — vendor-agnostic gen API. (2) **Script Generator worker** — extends Author worker; brief → short script for video. (3) **Branded Composite worker** — applies per-worker brand frame to gen output. (4) Canvas media_player tab. |
| **3 — Multi-clip** | Author worker scaffold | (1) **Module Sequencer worker** — orders clips into curricula. (2) **Progress Tracker worker** — per-subscriber state. (3) **Assessment worker** — quizzes / completion checks. (4) **Certificate worker** — issues credentials, anchors on-chain (existing audit anchor infra). |
| **4 — Film** | Author worker (Chapter 1 prose POC) | (1) **Storyboard worker** — script → shot list + framing/mood. (2) **Director worker** — shot list → per-shot gen prompts with character consistency. (3) **Casting worker** — character → licensed likeness token (architecture from Patent #4 ready). (4) **TTS Voice worker** — vendor wrap (ElevenLabs). (5) **Score worker** — vendor wrap (Suno). (6) **Editor worker** — ffmpeg assembly with cuts/transitions/sync. (7) **QA / Continuity worker** — cross-scene consistency. |

**Total new workers across phases 2-4:** ~14. Most are thin wrappers / orchestrators rather than novel workers — they coordinate existing infrastructure and vendor APIs. Build cost per worker: hours to days, not weeks.

---

## The wearables / post-screen lens

Apple announced a new wearable product for the 2026 holidays. The trajectory is clear: AI-generated and human-generated video — and viewing — moves off the phone screen and onto glasses, Vision Pro, watches, and ambient surfaces. Workers that produce video outputs today need to be architected to render those outputs into wearable contexts tomorrow.

Practical implications for the worker spec:

- **Output declarations need wearable-context tags.** A video output isn't just "video" — it's "5-sec_vertical_mobile" or "10-sec_spatial_AR" or "glanceable_watch_card" or "ambient_kitchen_display." Render pipeline routes per context.
- **Stub for wearable from day one.** Per CODEX S52.11: every new worker should declare which wearable contexts it supports (or stub "phone-only" explicitly so we know what to retrofit).
- **Use cases already emerging:**
  - **Aviation (CoPilot, MX):** preflight briefing video on Vision Pro, maneuver demonstration overlaid on flight environment, MEL lookup glanceable on Apple Watch during walkaround.
  - **Healthcare (Maria, Madison):** procedure walkthroughs at the bedside on AR glasses, vital-sign trend visualizations on watch.
  - **Real Estate:** property walkthroughs in AR before scheduling a showing, parcel map overlays in spatial.
  - **Trade / DIY:** how-to video overlaid on the actual workbench / engine bay / electrical panel.
- **Spatial audio + glanceable cards** become first-class output types alongside vertical video. The output enum in CODEX S52.11 needs to anticipate this.

**We are moving post-screen.** Workers built with phone-screen assumptions will need retrofitting; workers built with output-context-as-metadata can serve any surface. Decision: lock the spec extension before more creators activate (this week — same urgency as Ruthie + Elise onboarding).

---

## Sequencing — what gets built in what order

| When | What |
|---|---|
| **This week** | Phase A (render in Marketing worker → Cloud Run). Lock CODEX S52.11 (video as first-class output). Stub the wearable-context dimension in the worker output spec. |
| **Next 2 weeks** | Build Character Generator worker. Auto-generate landings for the 238 existing workers (Phase 0+1 for the full catalog). |
| **Month 2** | Phase 2 infrastructure: Video Gen abstraction worker (Kling/Veo/Runway). Script Generator extension to Author. Branded Composite worker. Canvas media_player tab. |
| **Month 3** | Phase 2 in production. Workers with explainers shipping. First wearable-context rendering pilot (probably aviation preflight on Vision Pro if available, otherwise mobile-AR fallback). |
| **Month 4-6** | Phase 3 (modules + courses). Nursing education flagship (Ruthie). EU DPP curriculum (Elise / Katarzyna). Aviation training (Captain Lisa / Randy). |
| **Month 6-12** | Phase 4 POC (Hamilton x Che). Patent claim #5 filing. Editor + Storyboard + Director workers shipped. |
| **Month 12-24** | Phase 5 marketplace (films as products). Speculative; do not architect against. |

---

## What this means for the immediate roadmap

Phase 0-1 shipped today. Phase 2 is the next infrastructure block — and it's the phase that unlocks the rest. Without explainer clip generation working server-side, creators can't build with video; with it, every worker on the platform can stamp out branded explainers in seconds. That capability flows directly into Phase 3 (sequence clips into modules) and Phase 4 (sequence + cast + score + edit clips into films).

The structural dependencies (audit trail, QA-001, Studio Locker, data credits, canvas tabs) must all be solid before Phase 2 ships. Most are. The remaining gap is the video-output declaration in the worker spec — CODEX S52.11 — which must lock before Ruthie and Elise start building, otherwise we retrofit.

---

## Related

- `CODEX-S52.9-Conversion-Machine-Campaign.md` — Phase 0 + 1 (what shipped today)
- `CODEX-S52.11-Video-as-First-Class-Worker-Output-DRAFT.md` — the worker-spec extension that unblocks Phase 2
- `dataFee.js` — billing primitive
- Worker canvas schema — `docs/CODEX-50.10-T3-Canvas-Tab-Schema-spec.md`
- Patent claim #5 — full-film orchestration (file after Hamilton POC works)
