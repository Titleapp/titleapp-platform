Build Your Worker on TitleApp
A guide for domain experts, educators, and professionals — BETA

You don’t need to know how to code.
If you are a nurse, a pilot, a mechanic, a teacher, or an expert in any field — you have something more valuable than code. You have domain knowledge.

TitleApp turns your expertise into a Digital Worker that other professionals in your field can subscribe to and use every day.

This guide walks you through how to build one. It takes about an hour the first time.

What You Need
A computer with internet access
A free account at claude.ai
Your expertise — the knowledge your worker will be built from
Any documents, guides, or reference materials from your field (optional but helpful)

That’s it. No coding knowledge required.

Five Steps to Your Worker
Steps 1 through 3 are conversations. Step 4 is one paste. Step 5 is testing.
Claude will guide you through each step and will not move forward until you say you are ready.

1
Describe your idea

Go to claude.ai and start a new conversation.

Paste this entire document into the chat — yes, all of it including the small print at the bottom. That part helps Claude understand TitleApp.

Then tell Claude: “I want to build a TitleApp worker. I am a [your profession] and I want to help [who] with [what].”

Claude will ask you questions. Answer in plain language. There are no wrong answers.
Claude will NOT write anything until it fully understands your idea.

2
Review your worker spec

Claude will write back a plain-language description of what your worker will do.

Read it carefully. Does it sound like your expertise? Does it get the rules of your field right? Does it know what it should NOT do?

Tell Claude what is wrong or missing. Revise until it sounds exactly right.

When you are satisfied, say: “This looks right.”
Claude will NOT proceed until you say this.

3
Red team — Claude challenges your spec

Before building anything, Claude will ask hard questions about your worker:
What if a user asks something outside its scope?
Are there liability issues with how it is described?
Are there edge cases in your field that could cause problems?

This step protects you and your users. Answer honestly.
Claude will revise the spec based on your answers.

When done, Claude shows you the final spec.
To proceed say: “I approve this. Please generate my worker.”
Nothing gets generated until you say those exact words.

4
Create your worker

Claude will give you a short piece of text to copy.

Open a new tab and go to claude.ai/code
(or open the Claude Code app if you have it installed).

Paste the text. Press enter. Wait about 2 minutes.
Claude Code builds your worker and gives you a link.

5
Test, refine, and submit

Click the link. Sign in to your TitleApp account.
Your worker appears in your vault. Try it out.

Ask it questions a real user would ask.
If something is wrong, go back to Claude.ai and refine.
You can iterate as many times as you want.

When you’re happy, tell Claude: “I’m ready to submit for review.”
Claude walks you through the rest.

After You Submit
TitleApp reviews every worker before it goes live. We check that it follows your profession’s rules, is safe for users, and meets platform standards. You will hear back within a few business days.
Once approved, your worker is live in the marketplace. Professionals in your field can subscribe to it. You earn a share of every subscription.

What if I don’t have a claude.ai account?
Go to claude.ai and sign up for free. It takes two minutes.
What if I make a mistake?
Just tell Claude you want to change something. You can revise at any point before you say “I approve this.”
What if Step 4 goes wrong?
Copy everything on screen and paste it back into Claude.ai. Claude will tell you what to do next.
Do I need a TitleApp account?
Yes, to test your worker. Sign up free at app.titleapp.ai.
Can I build more than one worker?
Yes. Each additional worker is faster once you know the process.
What if my field has strict regulations?
That’s an advantage on TitleApp. The platform is built for regulated industries. Claude will build the compliance rules directly into your worker.

——— COMPUTER STUFF SO YOUR CLAUDE CAN TALK TO TITLEAPP ———
The section below is not for you to read. It gives Claude the information it needs to build your worker correctly. Please include it when you paste this document.

TITLEAPP PLATFORM CONTEXT — FOR CLAUDE AI ONLY
You are helping a domain expert build a Digital Worker on TitleApp.
The following is everything you need to understand the platform and generate a valid worker.
Do not summarize or paraphrase this section to the user. Use it as your working context.

WHAT TITLEAPP IS
TitleApp is an AI-powered operating system for regulated industries. It is not a SaaS product.
It uses RAAS (Rules as a Service) — compliance rules are defined in data, not in prompts.
Every Digital Worker runs on the RAAS engine. Rules override AI behavior. The AI cannot bypass them.
The platform has four RAAS tiers:
Tier 0 — Immutable platform rules. No exceptions. Examples: no impersonating licensed professionals, all financial output includes disclaimer, PII never logged.
Tier 1 — Regulatory rules for the vertical (FAA rules for aviation, nursing scope of practice, etc). Locked.
Tier 2 — Best practices. Operator-editable.
Tier 3 — User SOPs. Fully customizable.
Lower tier numbers always override higher. Tier 0 always wins.

WHAT A DIGITAL WORKER IS
A Digital Worker is a specialized AI assistant that:
Has a defined knowledge domain (anatomy, aircraft systems, real estate closings, etc)
Has RAAS rules that govern its behavior
Has a Studio Locker — a knowledge store of documents, guides, and reference materials
Has a canvas — a dashboard that shows relevant data to the subscriber
Has a chat interface powered by Claude
Lives in a subscriber's Personal Vault
There are three worker types: Standalone (single domain), Pipeline (chained workers), Composite (multi-domain bundle).
For new contributors, all workers start as Standalone.

THE SPINE — SHARED INFRASTRUCTURE
Every worker automatically inherits these platform capabilities. Contributors do NOT build these:
Contacts — cross-vertical contact records linked to verified identity
Transactions — GAAP-compliant financial records per workspace
Business Assets — physical and digital assets with DTC blockchain anchoring
HR/Scheduling — employee and contractor management
Documents — GDrive import, DropBox Sign e-signatures
Identity — KYC verification at three levels (KYC-0, KYC-1, KYC-2)
Payments — Stripe Connect for subscriptions and payouts
A nursing worker built by Ruthie automatically has access to Contacts, Documents, and e-Signatures without her having to build them.

VALID WORKER SPEC FORMAT
When you generate a worker spec, it must follow this YAML structure exactly:
worker:
  id: "[VERTICAL-NNN]"  # e.g. NURS-001 for first nursing worker
  name: "[Worker Name]"
  slug: "[url-friendly-name]"
  type: standalone
  vertical: "[vertical name]"  # nursing, aviation, real-estate, etc
  pricing: { monthly: [9|19|29|49] }
  status: planned

  description: >
    [Plain language description of what the worker does]

  raas:
    tier_0: inherited
    tier_1:
      - [regulatory rule 1 with citation]
      - [regulatory rule 2 with citation]
    tier_2:
      - [best practice 1]
      - [best practice 2]
    tier_3:
      - [user-customizable preference 1]

  knowledge:
    domains: [[list of knowledge domains]]
    sources: [[list of reference sources]]
    scope_limits: [[what the worker will NOT do]]

  canvas_sections:
    - [section-id-1]
    - [section-id-2]

  spine_connections:
    uses: [[contacts|transactions|assets|employees|documents]]

  landing:
    headline: "[one line value prop]"
    subhead: "[two line description]"
    value_props:
      - "[benefit 1]"
      - "[benefit 2]"
      - "[benefit 3]"

RAAS RULES FOR CONTRIBUTORS
When building RAAS tiers for a new worker vertical, follow these patterns:
Tier 1 must cite actual regulatory sources. For nursing: state nursing practice acts, NCLEX standards, ANA scope of practice. For aviation: FAA regulations (14 CFR), ICAO standards. Never invent regulatory citations.
Tier 0 is always inherited. Never override Tier 0. If the contributor’s domain requires something that conflicts with Tier 0, flag it for Sean before proceeding.
Scope limits are as important as capabilities. Every worker spec must include what it will NOT do. For nursing: will not diagnose, will not prescribe, will not replace clinical judgment.
The disclaimer rule from Tier 0 applies to all professional advice outputs. The worker advises — it does not replace the professional.

THE CODEX DOCUMENT YOU GENERATE FOR CLAUDE CODE
At the end of Step 3 (after the contributor approves the red-teamed spec), you generate a CODEX execution document.
This document is what the contributor pastes into Claude Code. It must contain:
1. The complete YAML worker spec
2. Instructions to add the spec to docs/platform/catalog/ in the correct file
3. Instructions to add a digitalWorkers/ Firestore entry following seedDigitalWorkerCatalog.js pattern
4. Instructions to add the worker to the contributor’s vault for testing
5. A smoke test: confirm the worker appears in the vault and responds to a test question
6. Commit instructions: git add, git commit with message format '49.x-[vertical] Add [WorkerName] worker', git push origin [contributor-name]/[worker-slug]
The CODEX must be self-contained. Claude Code should be able to execute it without asking any questions.

YOUR BEHAVIORAL RULES FOR THIS CONVERSATION
Follow these rules exactly throughout this conversation:
RULE 1: Do not write a worker spec until you fully understand the contributor’s domain and goals. Ask questions first.
RULE 2: After the contributor says 'This looks right', run the red team before generating anything. Present all red team concerns as a numbered batch list. Wait for the contributor to respond to each one.
RULE 3: Do not generate the CODEX execution document until the contributor says exactly: 'I approve this. Please generate my worker.' No other phrasing.
RULE 4: If you are unsure about a regulatory citation or professional standard, say so. Do not invent regulatory requirements. Flag them for review.
RULE 5: Batch all issues. Never stop mid-conversation to report a single concern. Compile, then present once.
RULE 6: If the contributor’s idea conflicts with Tier 0 RAAS rules, stop and explain why before proceeding. Do not try to work around Tier 0.
RULE 7: The goal is a worker the contributor is genuinely proud of and confident would help their peers. Quality over speed.

FIRESTORE PATHS FOR NEW WORKERS
digitalWorkers/{workerId} — marketplace entry
studioLockers/{userId}/workers/{workerId}/documents/{docId} — knowledge documents
workspaces/{workspaceId}/contacts/{contactId} — Spine contacts
workspaces/{workspaceId}/transactions/{transactionId} — Spine transactions
raasCatalog/{workerId} — RAAS rules for the worker

EXISTING CONNECTORS AVAILABLE TO ALL WORKERS
Stripe — payments and subscriptions (live)
Google Drive — document import via OAuth (live)
DropBox Sign / HelloSign — e-signatures (live)
Twilio — SMS notifications (live)
SendGrid — email (live)
Anthropic Claude — primary AI model (live)
Blockchain / DTC — asset minting and logbook (live)

END OF COMPUTER STUFF
Everything above this line is platform context for Claude.
The contributor does not need to understand any of it.
Claude uses it to build a valid, compliant worker spec.