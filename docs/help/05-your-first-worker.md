# 5. Your First Worker

A Digital Worker is the unit of work on SOCIII. Each one is an AI agent governed by a rules engine, designed for a specific domain — aviation pilots, real estate developers, auto dealerships, content marketers, accountants, and many more. There are 200+ in the catalog as of 2026.

This section walks you through picking the right first worker, subscribing to it, and getting useful output in under ten minutes.

---

## Before you pick — let Alex recommend

If you completed account setup, **Alex** (your Chief of Staff) read your persona line and already has 1-3 worker recommendations on your home screen.

[Screenshot: home screen with Alex's recommendation cards]

If those look right, click the one that fits and skip to **Step 2** below.

If you want to browse instead, click **Marketplace** in the nav.

---

## Step 1 — Browse the marketplace

The marketplace shows every worker available on the platform, organized by **suite** (group of related workers) and **vertical** (industry).

[Screenshot: marketplace landing page with suite pills]

**Useful filters:**

- **Industry** — narrows to your domain (Aviation, Real Estate, Auto Dealer, Government, etc.)
- **Free / Paid** — workers are $0, $29, $49, or $79 per month. The price column is in the worker card.
- **Recently active** — workers used by other operators this week. Often a signal of fit.

When a worker looks promising, click it to open the worker landing page.

[Screenshot: worker landing page example]

The landing page shows:
- **What it does** (one-paragraph plain language)
- **Sample outputs** (the kind of artifacts it produces — Trade Summary, DTC, Flight Plan, etc.)
- **Capabilities** (the specific actions it can take)
- **Governance** (which rules engine it operates under — important for regulated verticals)
- **Price** (monthly subscription, plus credit costs per action)
- **Audit trail** (whether it mints blockchain records; optional but recommended for compliance-heavy work)

---

## Step 2 — Subscribe

Click **Subscribe** on the worker landing page.

[Screenshot: subscribe modal with confirmation]

If this is your first paid worker, the platform asks you to confirm your plan and your payment method. If you're on the Free plan and the worker is $0, you're in instantly.

**What "subscribe" actually does:**
- Adds the worker to your **My Workers** list in the nav.
- Provisions a private workspace for that worker — its own Drive folder, its own Canvas, its own chat context.
- Starts the worker's onboarding sequence (see [Section 4 — Onboarding](./06-onboarding-first-worker.md)).
- Begins counting against your monthly subscription budget.

You can unsubscribe any time. Subscriptions are pro-rated.

---

## Step 3 — Onboarding

Every worker has an onboarding sequence. Most run 5-10 minutes the first time you use the worker. Examples:

- **PC-12 CoPilot** asks for your tail number, your home base, your typical mission profile, and any aircraft-specific quirks you want it to remember.
- **Auto Dealer Title Worker** asks for your dealer license number, your state, your typical inventory, and your DMS integration if you have one.
- **Long-Form Author** (the worker that helped write the *Hamilton v Che* novel) asks for your genre, your length target, your reference tones, and your byline.

[Screenshot: example worker onboarding card]

The onboarding is also when the worker explains its **scope and limits** — what it will do, what it will not do, and what jurisdictions or regulations apply. For regulated workers (healthcare, aviation, finance, legal), this is also where you'll see disclaimers and required acknowledgments.

You can skip onboarding and start using the worker immediately, but you'll get materially worse results. The onboarding is teaching the worker who you are.

---

## Step 4 — Get useful output

The worker now lives in your nav under **My Workers**. Click it to enter the worker's chat surface.

[Screenshot: active worker chat surface with Canvas open]

Type what you want. Examples:

- *"Pull up my Tuesday flight to Reno, file the IFR plan, and check NOTAMs."*
- *"Draft a Title Application for VIN 1HGCM82633A123456 — buyer is John Smith, paid $18,500 cash."*
- *"Start a marketing campaign for the Q3 product launch — generate the launch sequence outline."*

The worker either responds in chat (for conversational answers) or **renders a structured object in the Canvas on the right** — a Flight Plan, a Title Application, a Campaign Outline. The Canvas object is the durable artifact; the chat is the working conversation.

[Screenshot: split view — chat on left, Canvas with structured object on right]

**Approval gate.** For any action that produces a real-world side effect (filing a plan, scheduling a post, executing a transaction), the worker proposes the action and **you confirm.** Nothing leaves the platform without your explicit approval. The platform's safety promise is that AI agents propose; humans approve; only then do events commit.

---

## Step 5 — Iterate

The worker remembers your conversations. Subsequent sessions inherit context — you don't re-explain your operation every time.

Useful patterns:

- **Pin to your nav.** Workers you use daily go to the top.
- **Use Alex across workers.** Ask Alex *"what did the PC-12 worker say about the Reno flight?"* — Alex pulls the answer from across all your workers' contexts.
- **Refer to artifacts by name.** "Send me the Flight Plan from Tuesday" — the worker fetches it from your Canvas / Vault.

---

## Picking the right first worker — a frame

If you're new and unsure:

- **You want to validate the platform.** Pick a $0 worker in any vertical and try it for an hour. The Free plan covers it. The point is to see the chat / canvas / approval flow in action before paying.
- **You have a real, recurring task in mind.** Pick the paid worker closest to that task. Spend a week. Cancel if it doesn't pay for itself in time saved.
- **You're a creator considering building your own.** Subscribe to one worker in the vertical you'd build for, study how its rules and onboarding work, then read the Sandbox preview ([Section 14](./14-sandbox-overview.md)).

---

## Common first-worker questions

| Question | Answer |
|---|---|
| Can I subscribe to multiple workers? | Yes. Most operators run 3-7 simultaneously. Discounts kick in at 3, 5, and 10 workers. |
| Can I share a worker with a teammate? | Yes — invite them to your workspace from Settings → Members. They use your subscription. |
| Can I cancel mid-month? | Yes. Pro-rated refund. The worker becomes read-only at month-end. |
| What if a worker gives me wrong output? | Use the in-worker **Suggest Improvement** link. Sean reviews these weekly. For regulated verticals, the worker has an attestation gate — output you approved is logged on the audit trail and is your responsibility, but the platform also keeps the worker's reasoning so we can fix systemic issues. |
| Can I see what data the worker has? | Yes. Open the worker → Settings → Memory. Shows everything the worker knows about you. You can edit or delete. |

---

*Most operators find their first useful worker output in under ten minutes. If you're still circling after thirty, message Alex in chat — Alex will either point you at the right worker or honestly tell you the platform isn't a fit for what you're trying to do.*
