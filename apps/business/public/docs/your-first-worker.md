# Your first worker

End-to-end walkthrough of what building your first Digital Worker actually looks like. No code shown — just the conversation you'll have with Claude Code, and what each step produces.

## Before you start

You should have already completed **[Install the tools](/docs/install)** — Claude account, Claude Code, GitHub. If you haven't, do that first. The rest of this walkthrough assumes those three are working.

## Step 1 — Clone the SOCIII repo

In your terminal:

```
git clone https://github.com/sociii/sociii.git
cd sociii
claude
```

The `claude` command starts Claude Code in the repo directory. The first thing Claude Code will do is read the `CLAUDE.md` file in the repo — that's the platform's own instructions for how to author a worker.

## Step 2 — Tell Claude Code what you're building

Claude Code starts with a blank prompt. Your first message is the most important. Be specific:

> I want to build a worker for nurses doing patient evaluations. The worker should take a patient's chart (text + lab values) and produce a SOAP note that flags any out-of-range labs and suggests next-step orders consistent with my hospital's protocols.

Claude Code will respond with a draft **Intent Spec** — the formal description of what the worker does, what it accepts as input, what it produces as output, and what it refuses to do. It'll also ask you 3–5 clarifying questions.

### Iterate with your AI before you commit

The clearer you define what you want the worker to do, the better we can build it for you. A good practice **before** you start this terminal session is to have a back-and-forth conversation with your AI of choice — Claude on claude.ai, ChatGPT, Gemini, whatever you use — about what you actually want this worker to do.

Walk it through:

- What does success look like for this worker?
- Who is the user? What's the moment in their day when they reach for it?
- What inputs does it need? What outputs should it produce?
- What should it absolutely never do?
- What's the one thing that, if this worker got it wrong, would make you regret building it?

Bring the answers into the terminal session with Claude Code. The Intent Spec gets dramatically sharper when you've already thought through these questions out loud with another AI — the build phase becomes execution, not discovery.

This is the most important conversation in the whole build. The clearer you are about what success looks like, the better the rest goes.

## Step 3 — Draft the rules

Once the Intent Spec is locked, Claude Code will ask:

> What rules should this worker always follow? Think invariants — things that must hold regardless of input.

You answer in plain language:
- "Never recommend a medication outside its FDA-approved indication."
- "Always cite the protocol section the recommendation came from."
- "Refuse if the patient's allergy list shows a contraindication."

Claude Code converts each rule into a structured YAML entry and saves it. **[See RAAS docs →](/docs/raas)**

## Step 4 — Provide a sample case

Claude Code will ask for a real example:

> Give me one example patient case — the kind of input the worker will see. I'll turn it into a fixture and run the worker against it.

You paste a (de-identified) example chart. Claude Code:
1. Saves it as a `fixtures/case-001.json`
2. Runs the worker against it
3. Shows you the output
4. Asks: "Is this what you expected? What's wrong?"

You iterate. This loop is where most of the build time goes — and it's the most valuable, because it's where your domain expertise becomes encoded.

## Step 5 — Design the canvas tabs

Claude Code will ask:

> What does a nurse see when they open this worker?

You describe in plain language: "There's a tab for the current case, a tab for protocol references, a tab for past evaluations I've done." Claude Code drafts the **canvas-tabs.json** entries.

For the v1 build, 3–5 tabs is plenty. You can add more later.

## Step 6 — Run the validator

```
npm run validate -- nurse-eval-001
```

The QA-001 validator runs your assertions and reports what passed and what failed. Anything failing comes back with a plain-language explanation and a button to ask Claude Code to fix it.

When all your defined assertions pass, you're ready to ship.

## Step 7 — Open the pull request

```
git checkout -b nurse-eval-001
git add .
git commit -m "Add nurse-eval-001 worker"
git push origin nurse-eval-001
```

Then open a PR on github.com/sociii/sociii. CI runs the validator + an AI reviewer. Most PRs merge automatically. If the reviewer flags something, Claude Code can address the feedback and push again.

## Step 8 — Watch your worker go live

Within a few minutes of merge:
- Your worker appears in the SOCIII Marketplace at `sociii.ai/marketplace`
- Your public Creator Profile lights up at `sociii.ai/c/<your-github-handle>`
- A platform-funded reviewer (**Forge Reviews**) subscribes to your worker and writes a structured first review
- Your worker is discoverable in search

You then share it with your network. Email primary, LinkedIn secondary. Most workers get their first 50 customers from the creator's own network — that's why domain expertise matters.

## What's actually shipped today

Every step above runs end-to-end in production. The validator is partial (v1 covers structural + behavioral assertions; performance assertions in v2). The Forge Reviews flow is opt-in (a creator can opt out for the first month if they want time to iterate before a public review).

## Common questions

**"How long does this take?"** Most creators take a focused weekend for their first worker, then 2–3 days for each subsequent one. Your domain knowledge is the bottleneck, not the tools.

**"What if I get stuck?"** Two paths: (1) paste a screenshot of whatever's stuck into Claude Chat (browser) — it'll explain. (2) Ask Alex on sociii.ai — there's a chat surface in every page that knows the platform.

**"What if my worker isn't good enough?"** You can ship to the **Experimental** lane (no marketplace promotion, AI-reviewer only) while you iterate. You can move to Marketplace later when it's ready. **[See three lanes →](/docs/three-lanes)**

**"Do I need a co-author?"** No. Most creators are solo. If you want one, Claude Code can be your co-author all the way through.
