# SOCIII Capability Strategy
### How we stay on pace as AI models advance

**For:** Advisors, technical reviewers, potential engineering hires
**Author:** Sean Combs, SOCIII Inc.
**Date:** July 2026
**Status:** Seeking input — open questions at the bottom

---

## The core thesis

Every AI company faces the same question: when the base model gets smarter every 6 months,
what's your moat?

SOCIII's answer is the **governance layer**, not the model.

Raw GPT-4o or Claude in a chat box can answer questions. What it can't do is:
- Validate every output against a tenant-configurable ruleset before it commits to a record
- Maintain an append-only audit trail of every AI action, visible and contestable
- Gate each capability behind explicit user consent and role-based access
- Operate across multiple AI providers simultaneously, routing by user preference or cost

That's RAAS — Rules + AI-as-a-Service. The smarter the base model, the more valuable a
governance layer becomes.

**Why this is hard to replicate:** the governance layer is not four bullet points — it's
vertical-specific rule depth accumulated over real deployments. An accounting worker
running on RAAS has industry-specific validation rules for how financial figures can be
stated, what requires a CPA flag, and what gets blocked entirely. Those rules come from
real customer engagements, not a whitepaper. The accumulated audit trail itself also
becomes a data asset: once a customer's records live in the append-only store, switching
to a raw-model competitor requires migrating that record of truth, not just preferences.
The moat compounds with usage in a way that a governance-layer clone, starting from zero
rule depth and zero audit history, can't shortcut. An accounting workspace with 18 months
of append-only transaction history can't be migrated by exporting a CSV — the event
sequence, the classification history, and the AI-action audit trail are the asset, not
just the current balances.

---

## The model swap process

When Anthropic or OpenAI ships a new frontier model, switching SOCIII takes:

1. Update `ANTHROPIC_MODEL` or `OPENAI_MODEL` in Firebase Secret Manager
2. Deploy functions (2–3 min)
3. Run the quality canary live pass — verifies the new model gives correct answers
   AND that the numbers it reports match Firestore ground truth
4. If all probes pass, we're live. If the canary flags a regression, we diagnose
   before shipping.

Swapping models never requires touching RAAS rule code. It may require prompt
adjustments if the canary flags a regression — different models have different default
verbosity and formatting, which can affect whether keyword probes pass. The RAAS
validation layer itself is model-agnostic; it sees the output, not the model.

---

## What the canary system proves

Before we added quality monitoring, we could only detect "is the API alive?" That's
uptime, not correctness. An accounting worker that confidently states a wrong balance
would pass an uptime check while causing the exact customer failure we're trying to prevent.

We now run four canary types automatically. The two that matter most for product quality
are Chat Uptime (table stakes) and Quality, which has three distinct probe tiers:

### Tier 1 — Identity correctness (keyword match)

Send Alex known-answer questions and verify the response contains expected content.
Examples: "What is SOCIII?" (must mention RAAS/Digital Worker/AI), "What is this
platform's name?" (must say SOCIII, must NOT say QuickBooks or Salesforce).

**Known ceiling:** keyword match catches *absent* content, not *wrong* content sitting
next to a correct keyword. A response could mention "RAAS" while also stating a
hallucinated figure two sentences later, and this tier would show green. Tier 2 is
the real guard against domain hallucination.

### Tier 2 — Domain-fact correctness (ground-truth comparison)

This is what catches the "hallucinated balance" class of failure — the incident that
motivated building this system.

The probe works like this:
1. Query Firestore directly to compute two ground-truth values:
   - **Expected liabilities** = sum of all loan `principalCents` in the `loans` collection
   - **Expected cash** = loan principals + revenue transactions − expense transactions
     (mirrors the backend formula exactly: `cash = funding_received + revenue − spending`)
2. Call the accounting reports API with the canary user's credentials
3. Diff the returned `cashCents` against expected cash, and `totalLiabilitiesCents`
   against expected liabilities — flag if either discrepancy exceeds 1% of the balance,
   with a $1 floor to prevent false positives near zero (1% is the operative threshold;
   $1 is a minimum, not an OR condition)

If the accounting backend returns a number that doesn't match what's in the database,
this probe pages. It catches both AI hallucination (Alex inventing a figure) and
data-pipeline bugs (backend computing the wrong value from real data).

*Infrastructure note:* the domain probe requires `FIREBASE_WEB_API_KEY` in Secret Manager
to mint canary credentials. If that key is absent or token exchange fails, the probe
degrades to WARN rather than RED — the ongoing degraded state stays quiet in the Operating
Feed, but the *transition into* degraded state triggers a one-time SMS page. Tier 2 going
dark is loud exactly once; it doesn't spam if the key stays missing for days.

### Tier 3 — Structural data existence

Spot-check that key Firestore collections are non-empty for the canary workspace:
raasPackages, transactions, loans, and raasCatalog live workers. Catches catastrophic
data-loss scenarios and deploy regressions that silently break collection writes.

**Seeded-data limitation:** all probes run against a canary workspace with clean, seeded
records. This is the right call for safety (never touching real customer data), but it
means the canary has not been exercised against the messy edge cases — unusual transaction
descriptions, partial records, encoding issues — that have caused real incidents. An
anonymized real-data spot-check path is on the backlog. We flag this explicitly rather
than treating seeded-only as sufficient by default.

### Tier 4 — Integration health (warn-only, no page)

Checks Gmail, Calendar, Drive, and Stripe token freshness from Firestore. Integration
tokens expire legitimately — this surfaces as an Operating Feed advisory so the user
sees it when they open the app, not as an SMS at 2am.

---

## The capability gap roadmap

We have a disciplined process for evaluating new AI capabilities:

> **Gate:** before shipping any new Alex capability, three questions must be answered:
> 1. Does the AI output get validated before it commits to a record?
> 2. Is the capability scoped to the right worker/vertical?
> 3. Is there an audit trail?

With that gate in place, here's the near-term roadmap:

### Q3 2026: Web search

**Gap:** Alex can't look up live data. A real estate worker can't pull today's listing
price. An aviation worker can't fetch a live NOTAM. The accounting worker can't check
current IRS rates.

**Solution:** Brave Search or Tavily API (~$3/1k queries). One-day integration.
Worker-scoped: only workers with `search: true` in their capability declaration get access.

**Why now:** the domain-fact canary (Tier 2 above) had to exist before this shipped.
If Alex can search the web but we can't detect when it cites a wrong number, search makes
hallucination harder to catch, not easier. The quality canary unlocks this safely.

**Vertical priority:** This is an open question — see below.

### Q3 2026: Native document understanding

**Gap:** When users upload PDFs (bank statements, contracts), we parse text before sending
to the model. Tables become flat text, form fields lose their labels.

**Solution:** Send document bytes directly to the model vision API. Claude and GPT-4o
handle PDFs natively. The accounting worker benefits immediately: upload a bank statement,
Alex extracts line items with the correct amounts and categories, no parser in between.
The domain-fact canary would catch a mis-read amount — it compares reported figures
against Firestore ground truth regardless of how the input arrived.

### Q4 2026: Agentic task chains

**Gap:** Today Alex does single-turn Q&A. Frontier expectation has shifted: "here's a
task, go execute it."

**Solution:** Structured task chains with explicit approval gates. The approval gate
design is the key safety question — see below. Worked example:

1. User: "Analyze my Q2 financials and draft a summary for my CPA"
2. Alex pulls transactions, categorizes, identifies anomalies. **No Firestore writes
   happen here.** All intermediate results are held in working memory (the session
   context), sandboxed until the user approves. This is enforced at the architecture
   level — the accounting route only accepts writes on explicit `POST /accounting:*`
   calls, not during read/analysis operations.
3. Alex: "Here's what I found [structured summary]. Want me to generate the CPA report?" → user approves
4. Alex generates the report and offers to send via Gmail → user approves, event appended
5. Audit record: `{action: "financial_summary_generated", approvedBy: uid, atMs: ...}`

The model change needed is to hold intermediate results client-side and show progress,
not to change the write semantics. The RAAS layer doesn't need to change — it already
validates on write. To be precise about what write-time validation covers: RAAS checks
permissions (is this user allowed to write this record type?), shape (does the payload
match the declared schema?), and rule constraints (e.g., is a dollar amount within a
plausible range?). It does not re-derive the categorization from source transactions at
write time — the user's approval of the sandboxed analysis is what authorizes the write.
Content accuracy after that is on the user, not the system. This is the right design:
the approval gate exists precisely so users can verify content before it commits.

### 2027: Voice

**Gap:** Text-only excludes aviation (hands-free preflight) and physical workflows
(warehouse workers using DPP scanner with full hands).

**Solution:** Whisper for transcription, piped into the existing chat engine.

**Safety note specific to aviation:** RAAS validates Alex's *response*, not whether
Whisper accurately transcribed what the pilot said. A misheard altitude, callsign, or
routing instruction produces bad *input* that RAAS never sees as bad — it validates the
response to whatever text Whisper handed it. For the aviation use case specifically,
this requires a mitigation layer: read-back confirmation before any action is taken on
a voice command, confidence-threshold flagging on ambiguous transcriptions (Whisper
returns confidence scores), and a "I heard X — is that right?" gate before executing.
This is the correct design for voice in a life-safety context. For other verticals
(DPP warehouse scanning, general office use) the stakes are lower and the standard
RAAS approval gate is sufficient.

---

## Full canary system summary

Four scheduled functions in total (not three — the technical appendix is complete):

| Canary | Schedule | What it catches | Alert |
|--------|----------|-----------------|-------|
| Chat uptime | Every 15 min | API down, auth broken, empty reply | SMS + email on first RED |
| Quality | Every 30 min | Wrong answers, hallucinated numbers, missing data, stale integrations | SMS + email on new RED (correctness/data); Operating Feed WARN (integrations) |
| Worker catalog | Every 6 hours | Rules silently off, workers rendering generic shell, broken catalog rows | SMS + email on new RED |
| Monthly usage reset | 1st of month | Operational — not a canary | N/A |

All canary state is in Firestore under `config/` and browsable on-demand. The quality
canary accepts `?run=1` for a live pass with alerts suppressed — safe to trigger manually
when investigating a suspected issue.

---

## Open questions — seeking input

**1. Coverage gaps in the correctness probe set**

The current probe set catches brand-identity hallucination and accounting figure
mismatch. What correctness failures would be most damaging in your domain that
aren't covered? Specifically: what question would a customer ask on their first day
where a wrong answer would cause them to churn immediately?

**2. The agentic-chains approval gate design**

The worked example above shows two named approval gates (generate report, send email)
with all intermediate analysis sandboxed in session memory (no writes). Is this the
right pattern? Are there agentic systems you've seen in production where the gate
placement caused problems — too many interruptions, or not enough?

**3. Web search vertical priority**

We've ranked web search candidates as: real estate (listing/pricing data) → aviation
(NOTAMs, weather) → accounting (IRS rates, EDGAR). The tension in this ranking: real
estate is higher commercial volume, but aviation is life-safety — a wrong NOTAM could
ground a flight that should stay grounded, or vice versa. Is revenue-per-vertical the
right ranking axis, or consequence-severity?

**4. The RAAS governance gate — missing checks?**

Our current three-question gate before any new capability: (1) validated before write?
(2) scoped to the right worker? (3) audit trail? The gate doesn't explicitly address
resource governance — an individually safe capability could still be abused at volume
(e.g., a user triggering 500 ATTOM lookups in a loop, or a web-search capability
scraped programmatically). Should there be a fourth check for rate-limit and cost-overrun
scenarios before any capability ships? Or is that an infrastructure concern that belongs
in credits/billing, not in the capability gate itself?
