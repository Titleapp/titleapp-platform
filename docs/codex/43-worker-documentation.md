# CODEX 43 — Worker Documentation: Guide Tab + Marketplace Docs

**Status:** Design complete — implementation ready  
**Priority:** High (creator adoption + subscriber activation)  
**Touches:** `digitalWorkers/{slug}` Firestore docs, marketplace page, canvas Guide tab, sandbox publish step

---

## 1. The Problem

Every worker has a name and a chat panel. Nothing else explains what to ask, what the canvas shows, or what this worker is actually good at. Creators publish workers that users can't activate because there's no in-context instruction. Subscribers ask one question, get confused by the canvas layout, and churn.

The creator capability problem (CODEX 14) identified adoption ceiling = not knowing what's possible. Documentation is the lowest-friction fix: the user is already inside the worker, one click from "try this."

---

## 2. Two Surfaces, One Source of Truth

```
digitalWorkers/{slug}.docs  ←  source of truth
        ↓                                ↓
Marketplace page            In-worker Guide tab
(/workers/{slug})          (canvas header, always visible)
```

**Why two surfaces, not one:**
- Marketplace docs = pre-subscribe pitch. User hasn't bought yet. "Here's what you'll be able to do."
- Guide tab = in-context help. User has the worker open. "Try this now."
- Both read the same Firestore field. One write keeps both current.

---

## 3. Data Structure

Add `docs` to `digitalWorkers/{slug}`:

```json
{
  "docs": {
    "tagline": "One sentence. What this worker does in plain English.",
    "whatItDoes": "2-3 sentences. The full scope.",
    "powerMoves": [
      { "title": "Find distressed deals", "prompt": "Show me distressed CRE in Oakland" },
      { "title": "Run a CMA", "prompt": "What's 325 Battery St worth right now?" },
      { "title": "Build a net sheet", "prompt": "I'm selling for $850k with a $400k loan, what do I net?" }
    ],
    "canvasDescription": "What the right-panel canvas shows and how to read it.",
    "notForThis": "What this worker intentionally does NOT do (sets expectations).",
    "version": "1.0"
  }
}
```

**`powerMoves`** are the core UX element — each move has a title (bold chip label) and a `prompt` (the exact text injected into chat when the user clicks). Trump Rule: clicking is better than reading. Users click a chip instead of figuring out what to type.

---

## 4. Surface 1 — Marketplace Page

`/workers/{slug}` already shows: name, description, price, subscribe button, QR code.

**Add below the fold:**

```
━━━━━━━━━━━━━━━━━━━━━━
  HOW TO USE IT
━━━━━━━━━━━━━━━━━━━━━━

[tagline]

[whatItDoes]

TRY ASKING:
  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
  │  Find distressed deals  →  ▶   │   │  Run a CMA  →  ▶               │
  └─────────────────────────────────┘   └─────────────────────────────────┘
  
  (chips are not interactive on marketplace page — they're visual examples)

THE CANVAS SHOWS:
  [canvasDescription]

WHAT THIS ISN'T FOR:
  [notForThis]
```

This is a static read (no click-to-send on the public marketplace page — user hasn't subscribed yet). The chips are visual examples, not interactive.

---

## 5. Surface 2 — In-Worker Guide Tab

Inside the worker canvas, a "Guide" tab appears in the canvas header alongside the existing tabs (Dashboard, Map, Reports, etc.). It's a SYSTEM tab — always present regardless of the worker spec. The spec-defined tabs are the left group; Guide is pinned at the right.

```
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard  │  Map  │  Reports  │  Deals  │        ?  Guide  →  │
└──────────────────────────────────────────────────────────────────┘
```

**Guide tab content:**

```
┌──────────────────────────────────────────────────────────────────┐
│  CRE Analyst — How to use                                        │
│                                                                  │
│  [whatItDoes]                                                    │
│                                                                  │
│  ─── TRY THESE ─────────────────────────────────────────────    │
│                                                                  │
│  ┌─ Find distressed deals ─────────────────────────── Send ─┐   │
│  │  "Show me distressed CRE in Oakland"                      │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Run a CMA ────────────────────────────────────── Send ─┐   │
│  │  "What's 325 Battery St worth right now?"                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ─── THE CANVAS ────────────────────────────────────────────    │
│  [canvasDescription]                                             │
└──────────────────────────────────────────────────────────────────┘
```

"Send" button injects the `prompt` text directly into the chat input and fires it. This is a one-click activation from Guide to live response — no copy-paste.

**The Guide tab dismisses after the first "Send" click.** If the user is in the Guide, they clicked a prompt — switch to Dashboard so they see the canvas results. Return-to-guide via the tab is always available.

---

## 6. Where Docs Come From

### Creator-built workers

The sandbox publish step already writes: system prompt, rules, knowledge, capabilities. **Add `docs` as a required field in the publish step.** A worker without `docs` shows a placeholder: "Creator hasn't added a guide yet. Try asking your question in chat."

The sandbox "Build" step gets a new sub-step: "Write the Guide" — prompts the creator to fill in tagline, powerMoves (up to 5), and canvasDescription. Alex helps draft it from the spec.

### Platform-built workers

Seed `docs` via a one-time migration script (`/tmp/seedWorkerDocs.js`) for the existing 15+ built-in workers. Each worker's docs are authored from its CODEX spec and raas/ ruleset files.

Priority seed order (demo-critical first):
1. `cre-analyst` — Scott demo
2. `re-salesperson` — active RE demo
3. `ir-worker` — Kent demo
4. `av-copilot-001` — aviation demo
5. `platform-accounting` — spine worker
6. `platform-hr` — spine worker

---

## 7. Implementation Plan

### Phase 1 — Data + Guide tab (3-4 hours)

1. Seed `docs` for the top 6 demo-critical workers (migration script)
2. Backend: include `docs` in `/v1/raas:catalog` and `/v1/worker:get` responses (already returned as full Firestore doc — no change)
3. Frontend: Add Guide tab to `WorkerCanvas.jsx` (or wherever canvas tabs render)
   - Tab reads `activeWorkerData.docs`
   - Chip click → inject prompt → fire send
   - If no docs: show placeholder
4. Deploy

### Phase 2 — Marketplace page (2-3 hours)

1. Add "How to Use" section to the worker subscription/marketplace page
2. Reads same `docs.powerMoves` / `docs.whatItDoes` / `docs.canvasDescription`
3. Chips are visual (no click-to-send — pre-subscribe)

### Phase 3 — Sandbox authoring (2-3 hours)

1. Add "Write the Guide" sub-step to sandbox Build phase
2. Alex helps draft from spec: generates `powerMoves` and `canvasDescription` suggestions
3. Publish step validates `docs` present before allowing Distribute

---

## 8. What This Is NOT

- Not a separate documentation website or CMS
- Not a wiki or knowledge base (static, maintained separately)
- Not a replacement for the worker's system prompt (Guide is user-facing, not AI-facing)
- Not a feature flag (every worker should have a Guide)

---

## 9. Open Questions

1. **Guide tab visibility for workers without docs** — show placeholder tab or hide tab entirely? Recommendation: show placeholder so creators see the gap.

2. **Chip count** — 3 or 5 power moves? Recommendation: max 3 on the Guide tab (visible without scroll), 5 on the marketplace page (room for more content).

3. **Prompt injection via keydown or click** — use the existing `sendMessage` mechanism directly (same as canvas-to-chat bridge already built in CODEX 27).

4. **Docs versioning** — `docs.version` field allows future schema changes without breaking existing workers. Treat as opaque string for now; major version bumps only on schema breaks.
