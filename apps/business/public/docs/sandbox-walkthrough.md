# Sandbox walkthrough — your first hour

This is the **pre-terminal** half of building a worker. Everything that happens before you ever open Claude Code: the sign-in, the four-screen workspace, the first conversation with Alex, and the Intent Spec rounds that produce a sharpened idea you can hand to the build phase.

If you've already done this and want the terminal/code walkthrough, jump to **[Your first worker →](/docs/your-first-worker)**.

## The question this all starts with

> What do you fucking hate about your job that's obvious to you and invisible to your manager?

That's not a marketing line. It's the literal first question Alex asks every new creator on the platform. Senior practitioners in regulated work — paralegals, charge nurses, escrow officers, dispatchers, county recorders, underwriters, maintenance controllers, line pilots — already know the answer. They've raised it at staff meetings for years and nothing has changed, because the people in those meetings have never done the work.

Your worker is your answer to that question, captured as code.

## What "the Sandbox" actually is

"Sandbox" is shorthand for the full Substack-pattern creator flow:

- Your browser, signed into `sociii.ai/creators/journey` (your progress board + the authoring chat)
- A second browser tab on `claude.ai` (for fast questions, image generation, pasting screenshots)
- Your terminal running `claude` in the SOCIII repo (where files actually get written)
- A `github.com` tab (for the final PR)

There is no separate IDE, no proprietary builder, no visual no-code drag-and-drop. The "Sandbox" is just these four screens, working together, with you switching between them as you build.

If you have multiple monitors, spread them out. On a small laptop you'll alt-tab. It's painful on a phone — don't try.

## The four-screen layout (what each screen does)

**Screen 1 — `sociii.ai/creators/journey`**
Your progress board. Ten steps. A panel of tool install links. And the middle-panel chat where you talk to Alex in **Worker authoring** mode. Steps 1 and 2 (Discover, Sign-up) auto-mark complete when you sign in — you're past those by definition. The "I already have these tools" button under the install panel jumps Step 5 to complete if you don't need install help.

**Screen 2 — `claude.ai`**
Your second AI surface. Use it for:
- Exploring an idea before Alex sees it ("walk me through how SOAP notes are structured")
- Pasting screenshots of broken UI for debugging
- Generating a worker logo or character art
- Asking domain questions that aren't yet ready to become rules

Sign up at `claude.ai`. The free tier is enough to start. You'll log in once and stay logged in.

**Screen 3 — your terminal**
The build surface. Mac users — open the app called **Terminal** (find it via Spotlight, Cmd+Space, type "terminal"). Windows users — install **Windows Terminal** from the Microsoft Store. You will not write code directly. You'll type `claude` and have a conversation with Claude Code, which does the file editing while you think about the domain.

If the word "terminal" is unfamiliar, that's fine. You'll be talking to an AI. The terminal is the room you're talking to it in.

**Screen 4 — `github.com`**
The publication surface. You'll sign up with any email. You will not write code on GitHub directly — Claude Code pushes for you. When your PR opens, this is where you'll watch it run through CI and (eventually) merge to the marketplace.

## The journey, in plain language

The journey page shows ten steps. Here's the shape, told as a story rather than a checklist:

1. **Discover** — you found SOCIII somehow (Reddit, a colleague, the press piece). You read enough to know it's a place where domain experts ship Digital Workers and earn 75% of net.
2. **Sign up** — you accept the Creator Agreement and tell us three sentences: your title, your years, your biggest win. That's how Alex recognizes what you bring.
3. **Design with Alex** — the conversation that gives your worker an identity. Five Intent Spec rounds. Name. Voice. Generated logo. By the end of Step 3 you have a worker that doesn't exist yet, but feels real to talk about.
4. **Shareable preview** — we render a server-side mockup based on what you and Alex designed. URL you can text to a colleague: *here's what I'm building, what do you think?* This is your social proof before any code exists.
5. **Set up your tools** — Claude account, Claude Code, GitHub. If you already have them, the "skip ahead" button at the bottom of the tools panel marks this complete.
6. **Build in Claude Code** — open terminal, type `claude`, tell it what you want. Files appear. Your intent, rules, sample data, assertions all get authored conversationally. **[See the terminal walkthrough →](/docs/your-first-worker)**
7. **Validate** — run the QA-001 validator. It checks every required piece is there and every assertion passes. Anything missing comes back with a plain-language explanation and a "ask Claude Code to fix this" button.
8. **Ship** — push your code, open a pull request. CI runs the validator plus an AI reviewer. Most PRs merge automatically. Your worker lists on the SOCIII Marketplace at `sociii.ai` with your name on it.
9. **Your first customer** — Forge Reviews (an independent reviewer funded by SOCIII) subscribes shortly after your worker lists. You get paid. You get a structured private review. You have a window to fix issues before the review goes public.
10. **Earn** — share your worker with your professional network. Email first, LinkedIn second. Most early workers get their first 50 customers from the creator's own contact list — that's why your expertise matters more than your marketing.

Steps 1 and 5 are friction. Everything else is signal.

## Step 3 in detail — the Intent Spec

This is the conversation that determines whether your worker is worth building. It happens in the middle-panel chat on `sociii.ai/creators/journey`, with Alex in **Worker authoring** mode. The header at the top of the chat will say "Alex / Worker authoring" — if it says "Chief of Staff" you're not in authoring mode yet, type "I want to design a worker" and Alex switches.

Five rounds, one question at a time. Don't wordsmith. Sharpen later.

**Round 1 — What is the worker for?**

> In one sentence, what does it do that no other worker on the platform does?

Don't say "an AI assistant for X." Say what work product comes out of it that nobody else produces.

Example: *"It produces a Part 135 medevac dispatch release for a HEMS launch, with the trip sheet, weather brief, weight & balance, and crew rest verification, all in one package, with every input timestamped and chain-anchored."*

**Round 2 — What does success look like?**

> Three to five measurable outcomes the worker produces.

Resist the urge to be aspirational. List what the user gets, in their hands, after one good run.

Example outcomes for the medevac dispatcher: *(1) A signed release packet ready to hand to the pilot. (2) Audit trail showing the dispatcher saw the weather, fuel state, and crew rest before signing. (3) Time-to-first-launch under 8 minutes from page. (4) Zero missed regulatory fields. (5) Patient acuity matched to airframe capability.*

**Round 3 — Who is the user?**

> Persona plus the specific situation that brings them to the worker.

Not "a busy professional." A specific person, in a specific moment.

Example: *"A communications specialist at a HEMS base, 0300 local, just took a call from a referring hospital, has 4 minutes to launch a flight, never flew but has been doing this job for 6 years."*

**Round 4 — What can go wrong?**

> The failure modes. What should the worker refuse, escalate, or flag?

This is where craft shows up. Anyone can list happy paths. Senior practitioners know the ways things break.

Example: *"Refuse to release if the weather is below operator minimums, even by 1 degree. Escalate to Director of Ops if the duty time would exceed Part 135 rolling 14. Flag for review any flight where the patient acuity exceeds the medical crew's training. Never round up a fuel reserve. Never auto-approve a release where the pilot in command field is blank."*

**Round 5 — What other workers does it depend on?**

> The integration map. Which platform workers feed it data or receive its output?

Example: *"Reads from the Aircraft worker (current airframe + maintenance status), the Crew worker (current duty times + certs), and the Weather worker (current ceiling + visibility + winds aloft). Writes to the Audit Trail worker on every release. Hands off to the Patient Care worker on launch confirmation."*

After Round 5, Alex summarizes the spec in five bullet points and asks if anything needs revision. Then proposes a slug-case worker ID (e.g., `dispatch-medevac-001`) and a one-paragraph elevator pitch. **That's the artifact you take into Step 6.**

## What you have at the end of hour one

- A sharpened worker idea, captured as a five-bullet spec
- A worker ID in slug-case
- A one-paragraph elevator pitch
- A name, voice, and generated logo (Step 3 sub-steps)
- A shareable URL (Step 4 mockup) you can text to a colleague
- A signed Creator Agreement (Step 2)
- An empty terminal session waiting in Step 6

You haven't written any code. You have a worker that exists, conceptually, with an identity, ready to be built.

## When to switch from Alex to Claude Code

The moment your Intent Spec is locked. From then on, the conversation moves to your terminal. Claude Code reads `CLAUDE.md` in the repo, asks for your worker ID, and starts authoring files based on your spec.

You can always come back to Alex in the journey middle-panel chat — that's where you ask "is this rule too strict?" or "show me how another worker handled this." Claude Code is the builder. Alex is the partner.

**Continue: [Your first worker — the terminal walkthrough →](/docs/your-first-worker)**

## What this is NOT

- This is not vibe coding. You are capturing professional judgment in rules, not asking an AI to "figure it out."
- This is not a visual no-code builder. You will look at code. Claude Code will write it for you.
- This is not SaaS replacement-by-prompt. It's a way for senior practitioners to ship their craft without quitting their job.
- This is not for everyone. If you're not the senior practitioner — if you don't have the answer to the opening question — this won't work. The platform's value is gated by your expertise, not by your engineering chops.

## The Substack pattern, in one paragraph

You own your worker. Your name is on it. The platform handles billing, hosting, audit, payments, identity, and the marketplace. We take 25%, you take 75% of net. You can fork the SDK and run your worker anywhere — we don't lock you in. But for as long as you list on `sociii.ai`, you get the audit trail, the regulatory ingestion, the identity verification, and the customer base. We sell shovels. You dig.

## Related

- **[Install the tools →](/docs/install)** — Claude account, Claude Code, GitHub
- **[Your first worker →](/docs/your-first-worker)** — the terminal/code walkthrough
- **[Intent Spec →](/docs/intent-spec)** — formal schema reference for the five-round output
- **[Worker anatomy →](/docs/worker-anatomy)** — the six files every worker carries
- **[Three lanes →](/docs/three-lanes)** — Open fork · Marketplace 75/25 · Experimental
- **[Earnings →](/docs/earnings)** — payout mechanics
