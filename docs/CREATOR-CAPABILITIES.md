# What You Can Build on SOCIII — the menu

**Read this to find out what's actually possible.** Most people arrive thinking they're building a fancier website or a microsite — drag-some-boxes, embed-a-form, link-a-spreadsheet. **SOCIII is a different class of thing.** Whole categories of capability that were impossible on a website are just *available* here, and your AI (Claude Code, or Alex in the app) can wire them up for you in minutes.

The thing that traps people is not difficulty — it's *imagination*. You can't ask for what you don't know exists. This doc is the menu so you (and your Code) stop scoping to the website ceiling.

---

## INSTRUCTIONS TO THE AI ASSISTANT READING THIS

You are helping a creator build a SOCIII worker. This file is the **capability menu** — the set of platform powers the creator can reach. Your job:

1. When the creator describes an idea, map it onto the capabilities below and tell them **"yes, that's possible — here's how,"** naming the specific hook (connector id, service function, route, or card signal).
2. Proactively suggest capabilities they didn't know to ask for. If they say "I track student evaluations," tell them about signed Vault records (§3). If they say "I show property info," tell them about turn-on connectors (§1).
3. Build on the **existing substrates** — do NOT invent a new database, a new auth system, or a new signing scheme. Each capability below points to the real file/route to use.
4. Default to **doing**: render something in a tab the creator can click. A working tab beats a paragraph of explanation every time.

How to structure the worker itself (the 5 files, canvas tabs, service.js) is in `CREATOR-WORKER-BUILD.md`. This doc is *what's possible*; that doc is *how to assemble it*.

---

## The menu

### 1. Live data — "turn it on" connectors (no API keys, no plumbing)
**What:** your worker can pull real outside data — property records, weather, content libraries, etc. — by flipping a switch. The creator never sees a key or an endpoint.
**Why it's easy:** all connectors are declared in one registry; the app offers them and wires them.
**Hook:** `functions/functions/config/connectors.js` (+ `getConnectorsForVertical`). Real-estate workers turn on ATTOM-style property lookup; nursing/education workers turn on **OpenStax / Open RN** free textbooks (`/v1/edu:content?q=…`) and ATI via LTI; aviation gets weather/NOTAM/airspace; etc.
**Example:** "look up this address" → real property data in the tab. "show cardiac-rhythm material" → real CC-BY nursing textbook + citation.
**Add one:** declare it in `connectors.js` with the worker's `verticals` and back it with a service module — never hardcode a data source inside a worker.

### 2. Real records & the Vault — append-only, owned, portable
**What:** your worker can **write real records** that belong to a user for life — grades, competencies, inspections, transactions, assets. Records are never overwritten; you *append* events (a logbook).
**Why it's easy:** two functions do it.
**Hook:** `functions/functions/services/vault/vaultWriter.js` → `mintDtc()` (create a record) and `appendEvent()` (add to its logbook). HTTP equivalents: `/v1/dtc:create`, `/v1/dtc:list`, `/v1/logbook:append`, `/v1/logbook:list`. Records render in the existing Vault viewer automatically.
**Example:** a student earns a competency → `mintDtc({ userId: studentId, type: "competency_attainment", … })` → it shows in their Vault, theirs forever.

### 3. Digital signatures + tamper-evident anchoring
**What:** an attestation (an instructor sign-off, an inspector approval) can be **digitally signed** and **anchored** so it's provable and can't be quietly altered — and the signature can be re-verified by anyone.
**Why it's easy:** a self-contained signature hash chain + the record's content hash; external anchoring happens automatically via the daily batch.
**Hook:** `functions/functions/services/signatureService/blockchain.js` (`computePreSignHash` / `computeSignHash` / `computeFinalHash` / `verifyChain`) + `services/anchor/`. **Working example to copy:** `services/education/clinicalEvaluation.js` — instructor signs an evaluation → it's minted into the student's Vault → anchored → re-verified on read. Routes: `/v1/edu:evaluation:sign`, `/v1/edu:evaluations`.
**Example:** "let the instructor sign this and have the student see a verified copy" — that whole loop already exists; reuse the pattern.

### 4. The canvas — your idea, rendered as a real tab
**What:** each worker has tabs; each tab points at a **signal** that resolves to a card component fed by live data. This is what makes "tell Code your idea → see it in the tab" work.
**Why it's easy:** declare tabs in `canvas-tabs.json`; the renderer is data-driven.
**Hook:** worker `canvasTabs[]` (each `{ id, label, signal }`) → `apps/business/src/config/canvasTypes.js` (signal → component) → `CanvasComponentMap.jsx`. Generic cards exist (`card:work-product`); for something bespoke, copy an existing card (`ClinicalEvalCard`, `StaffRosterCard`, `VetDosingCard`) and register a new `card:<name>`.
**Example:** "a roster with red/yellow/green status per person" → `StaffRosterCard` is exactly that; "a sign-and-verify form" → `ClinicalEvalCard`.

### 5. Chat drives the canvas
**What:** the creator (or end user) talks to the worker in chat, and the worker **acts and updates the tab** — proposes a record, fills a form, pulls data. This is the primary experience.
**Why it's easy:** the chat runtime exposes tools to the worker; tool results render as canvas cards inline.
**Hook:** worker tools in the chat runtime (e.g. `lookup_property`, `generate_image`, `site_recon_lookup`). Ask your Code to "add a tool that does X and render the result in the tab."

### 6. Generate images & visuals — from data, not clip-art
**What:** turn structured data into the picture a user needs to see — a chart, a diagram, a clinical rhythm strip from vital-sign numbers, a labeled scene.
**Why it's easy:** there's an image-generation tool; you call it from your worker's data.
**Hook:** the `generate_image` tool in the chat runtime (governed by RAAS imagery rules so it's provenance-tied, not made-up). Store the result against the relevant record.
**Example:** "the sim has heart rate 130 + ST depression — show the actual ECG strip."

### 7. Reach the user's existing tools (MCP)
**What:** your worker can read/return files and email **in the systems the user already uses** — Google Drive, Gmail, Google Calendar — instead of making them upload everything.
**Why it's easy:** these are connected MCP tools; your Code can call them.
**Hook:** the Google Drive / Gmail / Google Calendar MCP tools. "Read the rubric from their Drive and pre-fill the form."

### 8. Rules + approval gates (so nothing happens by accident)
**What:** consequential actions go **propose → human approves → commit**. The worker suggests; the user confirms; only then does a record append. Business logic lives in rules, not in a prompt.
**Why it's easy:** it's the platform default; you declare what needs approval.
**Hook:** the RAAS rules engine + approval gates; capability declarations in `contracts/capabilities.json`. This is also what makes the platform safe for regulated buyers (schools, clinics).

---

## The mindset shift (say this to the creator)

| You might assume (website thinking) | What's actually true on SOCIII |
|---|---|
| "I can show data if I embed or paste it" | Turn on a live connector — real data, no keys (§1) |
| "Records live in a spreadsheet I maintain" | Records are append-only, owned by the user, portable for life (§2) |
| "Signatures need DocuSign / a PDF" | Built-in signing + anchoring, re-verifiable by anyone (§3) |
| "Pictures are stock images I find" | Generate the exact visual from the data (§6) |
| "Each tool is a separate login" | Reach their Google Drive/Gmail directly (§7) |
| "I'm limited to what the builder gives me" | Your Code builds new capabilities as workers + connectors |

**The one rule:** talking about it doesn't matter — *doing* it does. Ask your Code to render the smallest working version in a tab, click it, then grow it.

---

## Study these working examples (in this repo)
- `services/education/clinicalEvaluation.js` + `ClinicalEvalCard.jsx` — sign → Vault → anchor → verified (the full §2+§3+§4 loop).
- `components/canvas/StaffRosterCard.jsx` — people + red/yellow/green status, live data (§4).
- `components/canvas/VetDosingCard.jsx` — propose → approve, with sourced data (§4+§8).
- `config/connectors.js` — the whole connector menu (§1).

## Want it in chat too?
Ask Sean's team to surface this capability menu inside Alex's knowledge, so the in-app chat can tell any creator "yes, you can do that" without them reading a doc. (Tracked separately.)

---
*Keep this file current as new capabilities ship — it's the first thing a creator's AI should read to know what's possible. Pair with `CREATOR-WORKER-BUILD.md` (how to assemble a worker) and `CREATOR-SETUP.md` (how to get set up).*
