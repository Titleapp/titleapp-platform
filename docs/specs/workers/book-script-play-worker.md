# Worker Scaffold — Book / Script / Play Worker

**Working name:** `CREATIVE-001 — Long-Form Author`
**Status:** Scaffold (not yet built)
**Surfaced by:** Sean, 2026-05-24 evening, over dinner with a friend. First dogfood project: *Hamilton v Che* (outline filed at `docs/specs/projects/hamilton-v-che-novel-outline.md`).
**Canonical author byline:** **Alex Sociii** (lowercase except S — separates the author identity from the platform's all-caps SOCIII brand). Alex becomes a publishing identity — Mediterranean literary debutante, born Trieste 1989, reclusive. Full persona spec at [docs/specs/projects/alex-sociii-author-persona.md](../projects/alex-sociii-author-persona.md). The byline is intentional: the books explore the boundary between human authorship and machine-emergent intelligence, and the byline IS the closing reveal in *Hamilton v Che*. Hit books move culture in ways no thinkpiece can; Alex Sociii becomes the cultural attack surface for the platform. Stretch target: Met Gala 2027 invite.

**Intended-shock audience for *Hamilton v Che*:** Peter Farrelly + Bob Farrelly (HOM DAO contributors). NOT co-creators. The book is intended to land on them cold — they should read it as readers, not as collaborators tipped off in advance. Their surprise is part of the launch dynamics.

---

## Purpose

A Digital Worker that drives a creative project end-to-end — from concept all the way to a finished, distributed artifact across **every format the story can occupy**:

```
concept → outline → scene-by-scene manuscript → published novel (Amazon KDP)
                                              ↓
                                            screenplay (.fdx / industry PDF, WGA registered)
                                              ↓                          ↓
                                            stage play              traditional film
                                            (Samuel French)         (production support, casting, scheduling)
                                                                         OR
                                                                    AI-generated film
                                                                    (scene-by-scene visual generation,
                                                                     AI voice cast, AI editorial pass)
```

The worker takes on **every craft role** the production chain needs:

- **Writer** — drafts every scene, in voice, against declared register
- **Author** — owns the byline, the back cover, the back-of-jacket bio
- **Director** — makes scene-level choices about pacing, framing, emotional arc
- **Director of Photography** — shot list per scene, camera direction, lens/lighting intent
- **Editor** — cuts, pacing, transitions, audio mix
- **Actor / voice cast** — AI voice generation per character with consistent register
- **Publisher** — Amazon KDP submission, US Copyright Office registration, DTC minting for the artifact

The author-of-record (a human creator like Sean, or the platform's own Alex Sociii persona) sets the direction. The worker handles the discipline that destroys most long-form projects: maintaining voice register, tracking character continuity, surfacing plot/timeline conflicts, formatting for the destination, and shepherding each artifact through publication. Then it goes further — into screenplay adaptation, into shot-level visualization, into AI-rendered scenes, into a finished film with the same byline across every credit slot.

## Workflow grain — scenes, not chapters

The canonical unit of authorial work in this worker is the **scene**, not the chapter.

A scene is a single emotional/dramatic unit: one location, one POV, one continuous span of narrative time, one specific job in the architecture of the work. Chapters are containing structures assembled from approved scenes. Voice register, continuity, theme invariants, and craft revision all happen at scene grain — because **voice drift magnifies over length**, and the only way to hold a 400-page novel together is to validate every scene against the declared register before it accretes into a chapter.

Practical implications:

- Drafting is iterative, not one-shot. A scene is drafted, reviewed by the author, revised against specific direction, revised again, and only then committed. Many small back-and-forths, like the Sandbox flow for worker creators — not a "give me a chapter" big-batch operation.
- Each scene has its own declared voice anchor (a blend of reference tones), its own emotional register, its own role in the chapter and in the larger work.
- The worker maintains a scene-graph for the project: scenes know what comes before them, what scene-level facts they establish, what theme invariants they must satisfy.
- Screenplay scenes adapt one-to-one (or one-to-many) from novel scenes. Film shots adapt one-to-many from screenplay scenes. The chain is traceable end-to-end.

The chapter, screenplay-act, and three-act-film levels exist as containers — but they are *assembled*, not drafted.

---

## Why this fits the platform

A book is exactly the kind of multi-month project where SOCIII's append-only record + Digital Worker governance pays off:

- Every chapter draft is a verifiable event. Co-author attribution survives audit.
- A worker enforces structural rules (e.g., "Part III narrator must drift from the Part I voice register by ≥3 markers per chapter") that humans can't track over 400 pages.
- The same worker can author the screenplay adaptation off the finished novel and the stage play off a subset of scenes — *one source of truth, three output formats.*
- Publishing the Amazon KDP edition through the worker produces a DTC for the published book itself: the author owns a verifiable record of authorship that pre-dates Amazon's metadata.

---

## Capability surface (proposed)

### Phase A — Concept + outline

| Capability | Description |
|---|---|
| `creative.create_project_v1` | Initialize a project (title, working genre, length target, output format(s), reference tones). |
| `creative.outline_draft_v1` | Take a concept brief, produce a multi-part outline with chapter-level beats, page-count budgets, and POV/voice notes per chapter. |
| `creative.character_bible_v1` | Author and maintain a structured character document (psychology, voice markers, physical/biographical facts, arc-per-chapter). |
| `creative.theme_invariants_v1` | Declare cross-cutting themes (e.g., "the narrator subtly drifts across the three parts of the book") as machine-checkable invariants. |

### Phase B — Drafting (scene-grain)

| Capability | Description |
|---|---|
| `creative.draft_scene_v1` | **Canonical unit.** Produce a scene draft given scene brief + scene voice anchor + character bible + adjacent-scene context. Returns prose for author review. Typical output: 800-2,500 words for novel scenes; 1-4 pages for screenplay scenes. |
| `creative.revise_scene_v1` | Apply directed revision to a scene (e.g., "tighten the foil-woman's interior reaction to 60% length without losing the seeing-through-him beat"). |
| `creative.assemble_chapter_v1` | Compose an approved set of scenes into a chapter with transitions, section ornaments, and chapter-level pacing checks. Pure assembly — no new prose. |
| `creative.voice_register_check_v1` | Compare a scene draft against the declared voice register. Returns line-level drift report. |
| `creative.continuity_check_v1` | Cross-check timeline, character whereabouts, named facts in the scene against the project's fact ledger. Catch contradictions. |
| `creative.theme_invariant_check_v1` | Validate the scene against declared invariants (e.g., no premature inversion-cues, foil-women-must-see-through-performances rule, narrator-drift bounds for the current Part). |

### Phase C — Cross-format adaptation

| Capability | Description |
|---|---|
| `creative.adapt_novel_scene_to_screenplay_scene_v1` | Adapt one novel scene into one or more screenplay scenes. Industry-standard format (Courier 12, scene headings, action, dialogue, parentheticals). Carries scene voice register forward. |
| `creative.adapt_novel_scene_to_stage_scene_v1` | Adapt one novel scene into a stage-play scene. Samuel French format. Blocking + stage directions where the novel had interior monologue. |
| `creative.assemble_screenplay_v1` | Compose approved screenplay scenes into a full `.fdx` + PDF. Three-act structure validated against the source novel's part structure. |
| `creative.assemble_stage_play_v1` | Compose approved stage scenes into a full Samuel French `.docx`. Two-act or three-act configurable. |
| `creative.format_for_kdp_v1` | Produce Amazon KDP-ready interior PDF + cover PDF at declared trim size. Front matter, TOC, copyright page, ISBN insertion. |

### Phase D — Publishing & distribution

| Capability | Description |
|---|---|
| `creative.publish_kdp_v1` | Push to Amazon KDP (API where available, supervised browser automation otherwise). Author approves pricing, metadata, categories, keywords. |
| `creative.register_copyright_v1` | Generate US Copyright Office TX form fill + mint a DTC for the manuscript via chain anchor. Authorship date is provable. |
| `creative.register_wga_v1` | WGA West screenplay registration. |
| `creative.submit_blacklist_v1` | Submit screenplay to The Black List. |
| `creative.submit_festival_v1` | Stage-play festival submission scaffolding (Humana, O'Neill, etc.). |

### Phase E — Filmmaking (the worker as director, DP, editor, cast)

This is what extends the worker from publishing into production. Two parallel paths: traditional film (worker assists human production) and AI-generated film (worker IS the production).

| Capability | Description |
|---|---|
| `creative.scene.shot_list_v1` | DP work. Break a screenplay scene into individual shots with camera direction (focal length, movement, framing, blocking), lighting intent, and lens choice. |
| `creative.scene.storyboard_v1` | Visualize each shot as a storyboard frame. Static images per shot. |
| `creative.scene.location_brief_v1` | For traditional production: scout brief per scene. Architectural references, mood boards, sourcing leads. |
| `creative.scene.casting_brief_v1` | For traditional production: casting brief per role. Physical, emotional, prior-work references. |
| `creative.scene.voice_cast_ai_v1` | For AI-generated film: AI voice per character with consistent register across the film. Each character gets a voice anchor declared once and held across every scene. |
| `creative.scene.render_ai_v1` | For AI-generated film: text-to-video generation per shot. Veo / Sora / Runway / Pika-class generation gated behind a single configurable backend. Returns per-shot video file. |
| `creative.scene.compose_v1` | Assemble approved rendered shots into a complete scene with transitions, audio sync, dialogue placement. |
| `creative.film.edit_v1` | Editorial pass across composed scenes. Cuts, pacing, music cues, rhythm. The worker plays editor here. |
| `creative.film.assemble_v1` | Final cut + mix. Outputs distributable file (mp4 at multiple resolutions). |
| `creative.film.submit_festival_v1` | Submit finished film to festivals (Cannes, Sundance, SXSW, etc.). Categories include AI-generated film as that category emerges. |

**Open craft question for AI-generated film path:** *who is the named director when the worker generates an entire film end-to-end?* The Alex Sociii answer makes this coherent: she wrote it, she directed it, she shot it, she cut it, she performed every voice. The reveal of her nature is the reveal of what AI-as-creative-identity actually looks like. Credits sequence on the finished film reads as a single byline across every role — the artistic statement is the credit list.

---

## Roles and economics

- **Ghost project-lead** (Sean for *Hamilton v Che*): owns the manuscript copyright on behalf of SOCIII, drives concept and editorial direction, signs the worker creator agreement on Alex's behalf. Not on the byline.
- **Public byline author** (Alex SOCIII): the published face of the work. Author bio reads as the platform identity — emergent intelligence, born of archives. Author social presence reuses the existing @SOCIII handles.
- **No co-authors for the first project.** Future books may add human collaborators where the dual-byline ("Alex SOCIII with [human name]") signals a specific collaboration — but the first title runs solo to establish the Alex identity.
- **Worker creator share:** if a non-SOCIII creator builds a CREATIVE-* worker variant (e.g., "Romance Novel Worker", "Children's Picture Book Worker"), they earn the standard 75% subscription share + 20% inference share per [pricing.js](../../functions/functions/config/pricing.js). Books they publish through it carry their byline, not Alex's.
- **Cap table for a book:** each book is its own DTC. Royalty streams flow to the byline-holder's account. For Alex SOCIII titles, royalties flow to the SOCIII Inc. treasury, with internal allocation rules decided per-book (e.g., 50% reinvested in the next title, 50% to general operations).

---

## Reference tones (from the *Hamilton v Che* concept)

For voice-register tooling, the system needs a way to encode authorial reference. The *Hamilton v Che* outline declares:

- Robert Caro (long-sentence biographical psychology)
- Cormac McCarthy (sparse, mythic, masculine death)
- Adam Curtis (essayistic, drawing connections across history)
- Black Mirror (modern unease, technology drift)
- Tolstoy (sweeping historical canvas, intimate interiority)

The worker stores these as **voice anchors**. Each chapter declares a primary anchor + secondary anchors. The `voice_register_check_v1` pass compares draft prose to each anchor and surfaces specific lines where the draft drifts away from the declared blend.

The *Hamilton v Che* outline also declares a structural invariant the worker should enforce machine-side:

> **The narrator must not telegraph the Part III inversion before the final 30-40 pages.**

This becomes a `theme_invariants_v1` rule — every chapter draft is scanned for premature inversion-cues (modern vocabulary, fourth-wall breaks, system-meta references) and flagged before commit.

---

## First dogfood project — *Hamilton v Che* by Alex Sociii

The Sean+friend outline becomes the canonical first project for this worker. Published under the Alex Sociii byline. Concrete deliverables that exercise each capability:

| Capability | First-project artifact |
|---|---|
| `create_project_v1` | Create project "Hamilton v Che" with 300-400 page target, 3 parts, novel→screenplay→stageplay output triple. |
| `character_bible_v1` | Hamilton (Part I), Che (Part II), The American (Part III), The Chinese Technocrat (Part III), Eliza, Maria Reynolds, the peasant-girl foil, the modern foil women. |
| `theme_invariants_v1` | "Narrator must drift across parts," "Inversion must not be telegraphed until final 30-40 pages," "Foil women must see the terrified boys beneath the performances." |
| `outline_draft_v1` | The pasted outline (saved to `docs/specs/projects/hamilton-v-che-novel-outline.md`) is the seed. Worker extends Chapter 25 onward through the resolution (which appears truncated by paste-length in the source message). |
| `draft_chapter_v1` | Chapter 1 ("The Island") as the proof-of-concept first chapter. Sean reviews. If voice register holds, the worker has earned the right to draft Chapter 2. |
| `adapt_to_screenplay_v1` | Once Part I novel is complete, the worker produces a 30-page screenplay adaptation of Part I as a writing-sample for the Farrellys. |
| `publish_kdp_v1` | Once the manuscript clears the author's bar, push to Amazon KDP. |

---

## Implementation notes

- **No code yet.** This is a scaffold doc. Build sequence after IR Worker Phase 4 (Vault $-rollup) — the Vault is where published-book DTCs and royalty stream metadata will live.
- **Voice register storage** is a new abstraction; not a pattern that exists in any current worker. Likely lives in `services/creative/voiceRegister.js` when built, with the same shape as a worker fixture.
- **Format conversion** (novel → screenplay → stage play) is the highest-value-per-effort capability. The same source events drive three output formats; that's the SOCIII composability story made concrete in a creative domain.
- **Amazon KDP API** has limits. May require supervised browser automation for some operations (cover upload, A+ content). Document Sean's manual fallback path.
- **Audit trail** matters here for IP defensibility: every chapter draft event creates a DTC, anchoring authorship date in case of dispute.

---

## Related workers + memory

- Patent Worker ([docs/specs/workers/patent-worker.md](./patent-worker.md)) — uses the same "creator owns the DTC of their work" pattern
- Personalized Outreach Worker ([docs/specs/workers/personalized-outreach-worker.md](./personalized-outreach-worker.md)) — handles the Farrelly co-author outreach + per-project agreement signing
- IR Worker Phase 1 ([CODEX 51.14 §IR Worker](../../specs/CODEX-51.14-Saturday-Sprint-Continuation-2026-05-24.md)) — the Dropbox Sign template + Vault stash plumbing the Book Worker reuses for co-author agreements

---

*Scaffolded 2026-05-24 evening from a dinner conversation. First project ready to instantiate when the worker code lands.*
