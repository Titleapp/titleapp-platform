# 7. Navigating the Interface — Nav, Chat, and Canvas

SOCIII's interface is built around three regions: the **Nav** on the left (where you choose what you're working on), the **Chat** in the middle (where you talk to your workers), and the **Canvas** on the right (where work product lives). Once you understand how they relate to each other, the rest of the platform is intuitive.

This section explains the three regions and the patterns of use that make them effective.

---

## The shape of the screen

[Screenshot: full interface — nav on left, chat in middle, canvas on right]

Three vertical regions, edge-to-edge:

| Region | Position | Purpose |
|---|---|---|
| **Nav** | Left | Pick what you're working on (worker, project, file, person) |
| **Chat** | Middle | Talk to the worker, give instructions, ask questions |
| **Canvas** | Right | See structured outputs, in-progress artifacts, source documents |

On smaller screens the Canvas collapses behind a toggle. On phones the three regions stack vertically with the active one taking full screen.

---

## The Nav

The Nav contains everything you can work on:

[Screenshot: nav expanded showing the categories]

**Top section — your personal surfaces:**
- **Home** — your dashboard, Alex's recommendations, recent activity.
- **Vault** — your private data layer (records, holdings, documents tied to you).
- **Drive** — your file system, organized by worker.
- **Calendar** — your scheduled events, including office hours and worker actions.
- **Contacts** — people you've interacted with, enriched by the platform.

**Middle section — your workers:**
- **My Workers** — workers you've subscribed to. Click any to switch into its chat context.
- **My Projects** — multi-worker bundles (a launch, a deal, a campaign).
- Each worker shows a status dot: green (active), gray (idle), amber (waiting on you).

**Bottom section — discovery and admin:**
- **Marketplace** — browse and subscribe to new workers.
- **Sandbox** — build your own worker (coming soon).
- **Settings** — account, billing, members, integrations.

**Sticky pin:** any worker you use heavily can be pinned to the top of the My Workers list. Right-click → Pin.

---

## The Chat

The Chat is where the work happens. **Every conversation is scoped to whatever is selected in the Nav.** If you have the PC-12 CoPilot selected, the chat runs inside that worker's rules and memory. If you have Alex selected (the default), Alex routes across all your workers.

[Screenshot: chat panel with example exchange]

**What you can type:**
- Plain instructions: *"Draft a Title Application for VIN 1HGCM82633A123456."*
- Questions: *"What's my Vault summary look like?"*
- Commands referencing existing artifacts: *"Send me the Trade Summary from Tuesday."*
- Multi-step asks: *"Plan my Reno flight, check NOTAMs, file the plan if everything's clean."*

**What the worker can do in response:**
- Reply in chat (for conversational answers).
- Render a **structured object in the Canvas** — a Flight Plan, Title Application, Trade Summary, Campaign Outline, etc.
- Propose an action that needs your approval before it commits.
- Ask a clarifying question if your instruction is ambiguous.

**Attachments.** Drag a file into the chat. The file is uploaded to your Drive in the active worker's folder, and the worker reads it as context.

[Screenshot: drag-and-drop file upload]

**Chat history.** Each worker maintains its own chat history. Switching workers in the Nav switches chat contexts. Your conversations don't bleed across — that's an intentional design choice to keep each worker's rules and memory isolated.

**Alex special powers.** Alex can read across workers. *"What did the auto dealer worker say about the Smith deal yesterday?"* — Alex pulls the answer even though you're not currently in that worker's context. This is the main reason to keep Alex selected for general questions.

---

## The Canvas

The Canvas is where outputs become artifacts.

When a worker renders a structured object, it appears in the Canvas. The Canvas is **persistent within a worker's context** — you can leave and come back days later and the artifact is still there.

[Screenshot: canvas with structured object visible]

**Types of Canvas content:**

| Type | Example |
|---|---|
| **Structured Object** | Trade Summary, Title Application, Flight Plan, DTC, Campaign Outline |
| **Map** | Property location (Real Estate workers), flight path (Aviation), service area (Government) |
| **Document Preview** | Uploaded PDFs, generated reports, attached evidence |
| **Form** | Multi-step input for actions that need precision (KYC submission, deal close, etc.) |
| **Approval Card** | "Worker wants to do X — confirm or modify" |

**The approval gate lives on the Canvas.** When a worker proposes an action with real-world consequences — filing a flight plan, scheduling a social post, sending an email — the Canvas surfaces an Approval Card. You **confirm** or **modify** before the action executes. This is the platform's safety promise: AI proposes; humans approve.

[Screenshot: approval card with confirm + modify buttons]

**Tabs.** Heavy workers (with many output types) organize the Canvas into tabs. The Aviation PC-12 CoPilot, for example, has tabs for Aircraft, Logbook, Flight Plan, Currency, Training. The Marketing worker has tabs for Campaigns, Press List, Social Assets, Brand Voice. The tab bar appears at the top of the Canvas when a worker uses multiple Canvas surfaces.

**Closing and reopening.** Canvas state persists. You can close a Canvas (collapse the right panel) and reopen later — the artifacts and tabs are exactly where you left them.

---

## How the three regions work together — patterns of use

**Pattern 1: Conversational answer.**
You ask Alex a question in chat. Alex answers in chat. Canvas stays where it was.

**Pattern 2: Generated artifact.**
You ask a worker to draft something. Worker writes a brief acknowledgment in chat, then renders the full artifact in Canvas. The chat says *"Drafted — see Canvas."* The artifact lives there until you delete it.

**Pattern 3: Approval-gated action.**
You ask the worker to do something with a real-world effect. Worker proposes in chat, renders an Approval Card in Canvas. You confirm; the worker executes; chat confirms; Canvas updates with the receipt.

**Pattern 4: Multi-step input.**
You ask for something that needs precise inputs (a KYC, a deal close, an investor SAFE). The worker renders a multi-step form in the Canvas. You fill it in the Canvas; chat narrates progress; final step executes once Canvas form is complete.

**Pattern 5: Cross-worker reference.**
You're in Worker A but need data from Worker B. Ask Alex (switch to Alex in Nav). Alex pulls from Worker B. You return to Worker A; the answer is now in your active worker's context.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` (Mac) / `Ctrl+K` (Windows) | Quick-switch worker |
| `Cmd+/` | Focus chat input |
| `Cmd+B` | Toggle Nav |
| `Cmd+J` | Toggle Canvas |
| `Cmd+Enter` | Send chat message |
| `Esc` | Close active modal / approval card |

---

## A few things worth knowing

- **Nothing commits without your approval.** This is the central design pattern. AI agents propose actions; rules engines validate; humans confirm. If you ever see an action commit without your approval, that's a bug — file it.
- **Each worker's chat is isolated.** Switching workers switches the rule set. If you're in the Marketing worker and you ask about a deal, the Marketing worker won't answer — switch to the Real Estate worker (or ask Alex).
- **The Canvas is the durable surface.** Things in chat scroll away. Things in Canvas stay. If something matters, make sure it ends up in Canvas.
- **Alex is always available.** Even inside another worker's context, you can switch to Alex with `Cmd+K` → "Alex" → Enter. Alex sees everything you can see.
- **Right-click is useful.** Right-click on a worker in the Nav for pin/unpin, on a Canvas object for save/copy/delete, on a chat message for copy/quote/improve-suggestion.

---

*The Nav-Chat-Canvas pattern was designed to keep three things separate: where you're working (Nav), what you're saying (Chat), and what you've produced (Canvas). Most platforms collapse two of those three into one, and that's why most platforms feel cluttered as you scale. SOCIII keeps them distinct so you can think clearly even when you're running ten workers.*
