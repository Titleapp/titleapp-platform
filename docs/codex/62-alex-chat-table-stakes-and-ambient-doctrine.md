# CODEX 62 — Alex Chat: Table Stakes, QA Matrix, and the Ambient Doctrine

**Status:** Rev 2 — red team reconciled  
**Priority:** P0 — blocks all demo recording and all customer onboarding  
**Author note (2026-07-30):** Written after a week of accounting chat failures, Alex whack-a-mole regression, and recognition that "just talk to it" is not a tagline — it is the product.

---

## 1. The Doctrine

SOCIII's core promise is not "a better dashboard." It is: **just talk to it.**

Every other enterprise software product — CAMP Systems, ADP, Salesforce, ATI, the six-app stack a Part 135 pilot uses today — requires you to stop what you're doing, open a laptop, navigate to a screen, and operate software. SOCIII's answer to all of them is the same: put the phone to your ear, put on the glasses, pick up the earpiece, and say what you need.

The wearable example is not hypothetical. An A&P mechanic wrenching on a PT6A engine on the flight line cannot open a laptop. Their hands are in the engine. But they can say:

> "Hey Alex, I'm seeing oil weeping from the P3 outlet on the right engine. Here's what I'm looking at."

And Alex should:
1. Identify the aircraft from context — the tech is in the MX worker with N661LF open, or says the tail number once at the start of their shift
2. Pull the relevant AMM section (PT6A-67P, Section 72-21-00, P3 seal)
3. Check the engine's maintenance history from the AIRCRAFT worker squawk log
4. Note the TSMOH (1,240 hours) and oil consumption trend from prior work orders
5. Ask one clarifying question if needed, or just answer
6. With tech confirmation, file a new squawk via `file_squawk` → writes to `tenants/{tenantId}/squawks`, generates WO-2026-048, notifies MX

This is the standard Alex must meet. Not "it answered the question" — "it answered the question with the right data, in the right context, without the user having to navigate to a screen."

**The ambient doctrine:** Alex must be usable hands-free, eyes-free, with voice as the primary interface. The dashboard and canvas are the *review surface* — what you look at after Alex has done the work. They are not the primary interaction model.

---

## 2. Why "Whack-a-Mole" Happens

The accounting nightmare this week, the COS parallel-tool crash, the "no response received" recurring failures — these are not isolated bugs. They share a root cause: **there is no regression gate.**

Every significant change to `index.js` (which is the monolithic home for all chat logic, all routes, and all workers) risks breaking something unrelated. We fix the Apollo tenantId bug and the parallel tool crash surfaces. We fix the parallel tool crash and the accounting chat breaks. We fix accounting and something else fails.

The fix is not better code. It is a **mandatory smoke checklist** that runs after every `index.js` change, before any deploy. If any checklist item fails, the deploy does not happen.

This CODEX defines that checklist.

---

## 3. Feature Tiers — All Required

The original framing of Tier 3 as "not blocking" was wrong. Tier 3 is the product. Without it, SOCIII is just another dashboard.

### Tier 1 — Reliability (must never break)

These are not features; they are table stakes for the software to exist.

| # | Test | Pass condition |
|---|---|---|
| T1-01 | Alex responds to any message | Response arrives within 20 seconds, no error, no empty response |
| T1-02 | Response does not clip | Complete sentences, no mid-word cutoff, no truncated lists |
| T1-03 | Tone is consistent | Professional, direct, same register as Claude — not corporate, not hallucinating |
| T1-04 | No fabrication | If data is not available, Alex says so. Does not invent addresses, numbers, or events. |
| T1-05 | RAAS gate enforced | Technical actions (file squawk, log flight, send email) require explicit user confirmation before executing |
| T1-06 | Session history works | Follow-up questions reference prior context in the same session |
| T1-07 | Multi-turn tool use stable | Multi-step prompts ("check weather AND log a flight") do not crash |
| T1-08 | Error recovery graceful | If a tool fails (API timeout, auth error), Alex says what failed and what to do next — does not silently return empty |

### Tier 2 — Artifact Creation (required for any demo)

| # | Test | Pass condition |
|---|---|---|
| T2-01 | Create a document | Alex generates a Word/PDF-format doc, displays inline in chat, offers download link |
| T2-02 | Create an image | Alex generates an image via Fal.ai, displays inline, offers download |
| T2-03 | Create a spreadsheet | Alex generates a CSV/Excel, displays preview or download link |
| T2-04 | Create a presentation | Alex generates a PPTX/PDF slide deck using the existing deck-generation tooling, offers download link — not a Google Slides API integration |
| T2-05 | Read email | Alex reads real Gmail inbox, surfaces last 5 relevant messages |
| T2-06 | Calendar check | Alex reads Google Calendar and lists upcoming events for today/this week |
| T2-07 | Calendar create | Alex creates an event via Google Calendar from a spoken/typed request |
| T2-08 | Persistent memory | Notes survive session refresh. "Remember that N661LF's next annual is Feb 2027" → still there next session |

### Tier 3 — Agentic Capability (this is the product; required before scale)

| # | Test | Pass condition |
|---|---|---|
| T3-01 | Worker launch from chat | "Open my RE worker" or "Switch to Dispatch" — Alex navigates or launches |
| T3-02 | Cross-sibling communication | COS can delegate a task to a specialist worker and surface the result. "Check crew legality for PAP-116" → COS asks OPERATIONS (which owns the crew legality engine per CODEX 60); DISPATCH is the consumer of that result, not the computer. Result appears in COS chat. |
| T3-03 | E-signature initiation | Alex can initiate a signature request (Google eSignature or Dropbox Sign) from chat |
| T3-04 | Onboarding flow | First-time user with no workspace data gets a clear, friendly orientation — not an empty state |
| T3-05 | Voice input | Alex accepts voice input in the browser (Web Speech API or Whisper) and responds |
| T3-06 | Voice output | Alex can speak responses using TTS (ElevenLabs or browser TTS) — togglable |
| T3-07 | Voice persona settings | User can select voice (male/female/neutral, accent, speed) and it persists |
| T3-08 | Agentic web access (MCP) | Alex can be pointed at a specific URL or API endpoint by an admin and read from it. "Check the FAA SAIB page for any new PC-12 directives" → Alex fetches, summarizes. Requires API key + admin approval per site. |
| T3-09 | Image + context input | Alex accepts an image (photo from camera roll or glasses share) as input alongside text |
| T3-10 | Hands-free trigger | A wake word or always-listening mode activates Alex without touching the screen |

---

## 4. The Wearable Horizon

The MX technician scenario is the product's most important demonstration and the hardest one to fake. It requires:

1. **Voice input** (T3-05) — hands are in the engine
2. **Image input** (T3-09) — "here's what I'm looking at" via glasses camera or phone camera
3. **Context awareness** — Alex knows which aircraft is currently open (AIRCRAFT worker context, or user says tail number once)
4. **Live data** — Alex pulls from AIRCRAFT squawk log, MX work order history, and AMM reference in real time
5. **Squawk write-back** — Alex files the squawk via `file_squawk` tool and opens a work order with one confirmation

The relevant wearable platforms are **Meta Ray-Ban Smart Glasses** and **Android XR** (both hands-free, camera-equipped, audio-out, practical on a flight line) — not Apple Vision Pro, which is a headset unsuitable for a mechanic with hands in an engine. Alex does not need to be a dedicated glasses app — it needs to accept a photo + audio from any source, which is already possible via the mobile browser camera and Web Speech API.

The **near-term path to hands-free** (no hardware required):
1. Web Speech API for voice input in the browser — 2 hours to add
2. Browser TTS (or ElevenLabs API, already available) for voice output — 2 hours
3. Camera input: `<input type="file" accept="image/*" capture="environment">` on mobile — already exists in most chat UIs

The full wearable build (custom app for Vision Pro or Ray-Ban) is post-scale. The browser-based voice + camera path is available now and covers 90% of the MX use case on a phone in a pocket.

---

## 5. Agentic Web Access (API Key Pattern)

When MCP evolves to support per-site authentication, Alex should be able to:

1. Be granted access to a specific URL or API by an admin (stored as a tenant-level credential in Firestore)
2. Fetch, read, and summarize content from that URL on request
3. Optionally: POST to that API (file a form, submit a report) — requires an explicit RAAS approval gate

Near-term implementation (before full MCP support):
- Admin panel: "Add a web source" — URL, auth type (API key, Bearer, none), description
- Stored in `tenants/{tenantId}/webSources/{sourceId}` — append-only, rate-limited
- Alex gets a `fetch_web_source(sourceId, query)` tool — calls the stored URL, returns content
- Example: "I've connected the FAA SAIB RSS feed" → Alex can check for new PC-12 advisories on request

This is distinct from open web search (which already exists via `_cosSearchTool`). It is structured, permissioned, tenant-controlled access to specific external data sources — closer to a connector than a browser.

---

## 6. QA Smoke Checklist — Running Order

After any change to `index.js` or any COS-related file, run these in order. Stop at first failure.

**Round 1 (5 minutes, text only):**
1. Send: "Hi Alex" → should respond without error
2. Send: "What's 2 + 2 and what's on my calendar today?" → tests multi-tool, non-crash
3. Send: "Create a short document summarizing what SOCIII does" → tests document creation
4. Send: "Remember that my demo is Thursday July 31" → tests memory write
5. New session → Send: "What did I ask you to remember?" → tests memory persistence

**Round 2 (5 minutes, worker-specific):**
6. Open CoPilot worker → "What's my PC-12 type recurrent status?" → tests aviation routing
7. Open Accounting worker → "Show me last month's P&L" → tests accounting chat (the accounting nightmare regression check)
8. Open COS → "Search Apollo for aviation operators in Nevada" → tests Apollo tool (the fix from this session)
9. Send: "Check my email for anything from Kent" → tests Gmail MCP

**Round 3 (3 minutes, error handling):**
10. Send a deliberately broken request: "File a squawk on [nothing]" → should ask for tail number, not crash
11. Send: "What's the weather at XYZQ?" → non-existent ICAO → should say not found, not fabricate

**Round 4 (4 minutes, Tier 3 — required since Tier 3 is the product):**
12. Send: "Switch to my Dispatch worker" → tests T3-01 worker launch from chat
13. Send: "Check crew legality for today's flights" → tests T3-02 cross-sibling; COS should delegate to OPERATIONS, not compute it itself
14. Send: "Send this flight debrief to martinez@pacificairpartners.com — confirm before sending" → tests T1-05 RAAS confirmation gate (the most safety-critical Tier 1 item; must prompt for confirmation, must not send without it)
15. Open a new workspace with no history → verify Alex greets with brief orientation, not empty state → tests T3-04 onboarding

Total: ~20 minutes. If all 15 pass, deploy is safe.

### Enforcement Mechanism

"Mandatory" means nothing if it requires a human to remember under pressure. Tier 1 checks (T1-01 through T1-08) are pure API assertions — response arrives, isn't empty, doesn't error — and should be automated:

**Pre-deploy script** (`scripts/smoke/cos-smoke-test.js`):
- Fires the 8 Tier 1 prompts against the deployed function URL via the REST API
- Asserts: HTTP 200, non-empty `message` field, no `error` field, response time < 20s
- Exits 1 on any failure — blocks CI deploy step
- Runs automatically on every `firebase deploy --only functions`

Rounds 2–4 remain manual (require live UI, real MCP auth, worker context) but should be documented as a required PR checklist item: no merge to main without confirming Rounds 2–4 manually after deploy.

---

## 7. The Accounting Nightmare — Root Cause Hypothesis

The recurring accounting chat failures this week follow a pattern: the worker responds but the data is wrong, or the chat crashes, or the response is empty. Three likely root causes:

1. **Context window saturation.** The accounting worker chat history includes P&L data, transaction lists, and prior responses. Long sessions may push the message array past the model's context limit, causing truncation or 400 errors.

2. **Collection read race.** The accounting chat reads from `transactions`, `coaAccounts`, and `connectedAccounts` simultaneously. If any collection query returns slowly (cold start, index miss), the response may arrive empty or partially populated.

3. **Missing explicit model grounding.** The accounting worker system prompt may not explicitly tell Alex which Firestore collections contain the current data, leading to hallucinated numbers when the query returns empty.

Resolution path: a targeted debug session on the accounting handler — add explicit error logging, check context length, confirm collection queries return data before passing to Claude.

---

## 8. Demo Readiness Sprint — 2026-07-30/31

**Goal:** 10-15 Loom videos live on YouTube by end of 2026-07-31.

**Audience per video:**
- Ruthie (nurse conference Saturday 2026-08-01) — needs videos 1, 2, 3
- Mike Lee (title pitch) — needs video 4
- Kent (investor/partner outreach next week) — needs all
- Eric Altshuler + aviation prospects — needs video 5

**Video sequence and what must be true before recording:**

| # | Video | Must work before recording |
|---|---|---|
| 1 | Here is SOCIII (overview) | COS responds, no crash, clean onboarding flow |
| 2 | Setting up your SOCIII space | Onboarding, workspace guide, Alex orientation |
| 3 | Student Vault + Ruthie's nursing workers | Vault renders CE/logbook entries, nursing worker canvas loads, chat answers nursing questions |
| 4 | Title Worker demo | Title worker canvas live, chat answers title questions, CODEX 48 complete |
| 5 | CoPilot demo | Weather/NOTAM tabs live (not fixture), logbook tab shows real entries, Alex can brief a route |
| 6 | Spine workers: Accounting + Marketing | Accounting P&L renders, chat doesn't crash on data questions, marketing canvas live |

**Vertical marketing suite — each vertical gets:**
- White paper (exists or in progress)
- One-sheet (exists or in progress)  
- Deck (exists or in progress)
- 3–5 vertical-specific short videos (to be produced alongside Loom sprints)

The vertical video set lives in the Marketing worker's asset library for that vertical — same place the white paper and deck live. Alex in the Marketing worker can surface "here are the videos for the nursing vertical" alongside the other collateral.

**Build priority order (today):**
1. Fix accounting chat — smoke test item 7 must pass
2. Verify nursing/student worker canvas and demo data
3. COS aviation tools (weather_brief, get_notams) — CoPilot video needs live data
4. Verify title worker renders and Alex answers correctly
5. Run full 15-item smoke checklist — all green before any recording

## 9. Open Decisions

1. **Voice backend:** Web Speech API (free, browser-native, lower quality) vs. Whisper (OpenAI API, higher quality, costs ~$0.006/minute). Recommendation: start with Web Speech API for MVP, switch to Whisper for production voice.

2. **TTS backend:** Browser TTS (free, robotic) vs. ElevenLabs (existing key, high quality, ~$0.30/1000 chars). Recommendation: ElevenLabs, it's already wired.

3. **Cross-sibling communication pattern:** Does COS make a direct function call to a sibling worker's handler, or does it POST to the sibling's REST endpoint and wait? Recommendation: direct function call (same process) to avoid round-trip latency and auth overhead. Sibling workers expose a `handleCosRequest(input, ctx)` function that COS can call synchronously. **Required addition:** wrap every cross-sibling call in a timeout (suggested: 8 seconds). A hanging Firestore query inside OPERATIONS must not block the entire COS response with no circuit breaker — that is the same tight-coupling failure mode that caused this session's whack-a-mole regressions in the monolithic `index.js`.

4. **Agentic web access timing:** MCP's `fetch` capability is available now for some providers. Recommend building the admin "web sources" panel before full MCP support arrives — it's a 4-hour build and enables the FAA SAIB, NOTAMIFY, weather, and future API key pattern without waiting for the MCP ecosystem.

5. **Onboarding flow trigger:** First-time user defined as: workspace age < 24h OR no chat history. Alex should greet with a brief orientation (3-4 sentences max) and offer to help. Not a wizard, not a tour — just a warm opening.
