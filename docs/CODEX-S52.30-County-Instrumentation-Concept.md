# CODEX S52.30 — County Property Record Instrumentation Campaign (Concept)

**Date:** 2026-06-05
**Status:** CONCEPT — not approved for execution. Pending DLA Piper review + platform verification.
**Creators of record:** Sean Lee Combs and Kim Bennett
**Source doc:** `~/Downloads/CODEX-County-Instrumentation-Campaign (1).md` (received from Sean's Claude.ai positioning session)
**Cross-refs:** `docs/MOAT-STACK-V1.md`, `docs/CODEX-S52.20-Audit-Substrate-Strategy.md`, memory `project_county_instrumentation_campaign.md`, memory `project_audit_substrate_thesis_locked.md`

---

## 1. What this is

A proposed campaign using existing SOCIII platform tools — the ATTOM property-data subscription and the AUDIT-001 anchor pipeline — to instrument the complete parcel record for a small remote county, and then certified-mail notify the relevant government parties that the record now exists.

This is not a sales campaign. There is no offer in the notification, no price, no product mention, no call to action. The notification is purely informational. If recipients have a problem with the current state of their records, they will find SOCIII. That inbound dynamic is the point.

This CODEX is the platform-tracked version of the concept document Sean received from his Claude.ai positioning conversation on 2026-06-05. It exists to make the concept reference-linkable from the Moat Stack and to bind the six honest gaps to platform action items that can be tracked.

---

## 2. The core mechanism

1. Pull parcel-level property data for the target county using the existing ATTOM subscription.
2. Anchor every parcel record onto the SOCIII audit chain via the AUDIT-001 pipeline (chain-agnostic; Polygon today per `feedback_chain_agnostic_positioning`).
3. Send certified mail, return receipt, to:
   - The county recorder
   - Each county council member
   - The state Attorney General
4. Each recipient gets a 50-word notification. Same text. No offer. No CTA.

> Dear [Name],
>
> As of [date] every property parcel record in [County] has been anchored to a permanent publicly verifiable audit chain.
>
> The record is complete and actively monitored.
>
> To verify: [link]
>
> SOCIII, Inc.

The entire campaign action is the pull, the anchor, and the certified letter. Nothing more.

---

## 3. Why no offer in the letter

A sales letter gets filed. A 50-word notification this confident gets read twice and shown to someone else. The question it creates — *what does this mean for us* — is more powerful than any answer SOCIII could include.

Recipients sit with the question. They Google SOCIII. They find the platform. They call when they have worked out why they are uncomfortable. *That* call is the beginning of the right conversation. The $99 government worker exists when they ask. Not before.

---

## 4. The legal theory — standard of care

In professional liability, standard of care is established not by legislation but by what a reasonably prudent professional would do given available tools and knowledge. Once audit-anchored property record governance demonstrably exists and is in use in a jurisdiction, a practitioner who chose a process producing no comparable audit record may face questions in litigation about that choice.

This is a legal theory, not an established position. It has not been tested in court. But it is coherent and plaintiff's attorneys will recognize it. DLA Piper must assess the strongest counterargument honestly — including the strongest case *against* it — not just review letter language.

The certified-mail notification creates a discoverable record that the recorder, council, and AG were told. That record matters for the standard-of-care timeline if/when a plaintiff's attorney constructs the argument later.

---

## 5. The four-county sequence

| # | County | State | Rationale | Est. cost |
|---|---|---|---|---|
| 1 | Sublette | WY | ~10K pop, ~8K parcels, WY recognizes on-chain records as legally valid, non-attorney closing state, ATTOM likely covered by existing subscription | <$50 |
| 2 | Mono | CA | Sean has personal relationship with the recorder from Mammoth Mountain development history — not a cold letter, a personal one. CA government signal weight | <$50 |
| 3 | Esmeralda or Mineral | NV | Three states makes the pattern undeniable | <$50 |
| 4 | Loving (or similar) | TX | Four states triggers trade-press attention | <$50 |

**Between drops:** no announcement, no roadmap, no vision statement. Same format every time. The pattern becomes visible without being stated.

**Total direct cost across all four:** under $200.

---

## 6. Creator framing and distribution

This is NOT a SOCIII corporate initiative. It is something two named creators (Sean Lee Combs and Kim Bennett) built on the SOCIII platform. Authentic. Demonstrates the SDK produces real consequential things. Positions SOCIII as infrastructure, not protagonist.

Kim Bennett is one of the seven Fellow advisors per the locked roster (memory `project_fellow_roster_locked`). Her name in the development community in California carries weight — which is why Gap 3 (her informed consent) is load-bearing.

**Distribution sequence:**
1. Vibe-coding and developer communities first (Reddit, dev forums, HN). NOT title industry press. NOT real estate trade press.
2. Public post tone: matter-of-fact. Not disruptive. Not threatening.
   > "I pulled an entire Wyoming county's property records and put them on chain this weekend. Sent certified letters to the county recorder and the AG. Here's the hash."
   That is the whole post. No thread. No explanation. No CTA.
3. Title-industry implications surface organically when the legal community picks it up.

**Vocabulary rule (non-negotiable):** the words *blockchain / token / crypto* DO NOT appear in any external communication. Language is: *immutable public record / permanent audit trail / chain of custody / cryptographically verified / independently verifiable*. Per `feedback_no_crypto_vocab_in_customer_surfaces` and `feedback_chain_agnostic_positioning`.

---

## 7. Six honest gaps — execution prerequisites

These are blockers if skipped. Each becomes a platform task; none is started until DLA Piper has provided the underlying assessment for the legal-theory gaps.

### Gap 1 — Standard of care theory is a theory, not a fact
DLA Piper drafts (not reviews) all three letter templates: recorder, council member, AG. Each separately. Specific deliverable from DLA Piper:
- The strongest counterargument to the standard-of-care theory, written down.
- How that counterargument affects the campaign's legal risk.
- The letter language that does NOT imply an established legal standard exists.

### Gap 2 — ATTOM terms of service
Whether bulk county pulls, public anchoring of that data, and building a commercial platform on that data are permitted uses requires a specific read of the current ATTOM subscription agreement. This is not assumed. Counsel opinion required before the script runs.

### Gap 3 — Kim Bennett informed participation
Kim needs to be fully briefed on what her name is going on, what the legal theory is, what the risks are, and what DLA Piper's assessment is — and she needs space to say no. Not a briefing where she defaults to yes. A real conversation. Includes DLA Piper's written risk assessment.

### Gap 4 — Verification link non-technical UAT
A county recorder in Pinedale Wyoming with no technical background needs to verify the record in <30 seconds without calling anyone. One field. One result. Plain English. Needs to be tested on an actual non-technical user before any letter goes out. Pass / fail. No partial credit.

### Gap 5 — Anchor script batch completeness
The AUDIT-001 anchor pipeline must process a complete county parcel list (~8K parcels for Sublette) in a single run with no gaps. Completeness is the only claim that cannot be questioned. 95% complete ≠ complete. End-to-end batch test on a synthetic county-sized list before Sublette runs, not during.

### Gap 6 — AG notification tone
State AGs have staff who will assess whether these letters require a response. The letter must be drafted so the most aggressive AG-staff reading finds nothing actionable against SOCIII. DLA Piper drafts the AG version specifically and separately from the recorder/council versions.

---

## 8. What this is NOT

- **Not a crypto play.** Vocabulary rule above is enforced across all external surfaces.
- **Not a threat to title companies.** They are not the audience for the initial campaign. They are the audience for the downstream effect when their E&O underwriters, realtors, and attorneys start asking questions.
- **Not a sales campaign.** No offer in the notification. No price. No product name. Just the fact of what was done.
- **Not a stunt.** The technical work is real. The legal notification is real. The chain anchors are permanent. If done, it is done for real with real consequences and it must be right the first time.

---

## 9. Why this is the cleanest Moat Stack v1 dogfood

Every layer of the Moat Stack v1 (`docs/MOAT-STACK-V1.md`) gets exercised by this campaign — not as a marketing claim but as actual technical dependency:

| Layer | How the campaign uses it |
|---|---|
| 1. Persona | Recorder vs council vs AG = three personas, three letters, three scope-in/scope-out rules (same pattern Site Recon uses for First-Timer/Active Operator/Veteran). |
| 2. RAAS constraint engine | Anchor script runs under a ruleset: per-parcel cost gate, audit anchor required, completeness check, no-investment-advice, ATTOM TOS composition. |
| 3. Audit substrate | This *is* the substrate. Every parcel anchored is a logbook entry. The certified letter certifying the record exists is the substrate's product-market fit moment. |
| 4. Composable catalog | Site Recon + Land Use AI Attorney + ESC-013 Parcel Atlas + AUDIT-001 + (Layer-1) Recorder/Council/AG letter workers all touch this work. The graph is what makes the campaign possible at <$200. |
| 5. Open SDK + creator economy | Sean + Kim are creators using the SDK. NOT SOCIII corporate. The blog post is published from a creator account. |

This is also the cleanest test of the audit-substrate thesis (`docs/CODEX-S52.20-Audit-Substrate-Strategy.md`) — State AGs are the forcing-function lead wedge. The certified mail to the AG is literally the State-AG wedge moving from theory to execution.

---

## 10. Upside if it works

- A multistate notification record built for under $200 in direct costs.
- A legally defensible record in four states that the audit-trail conversation has begun.
- A creator campaign in the developer community demonstrating the SDK produces real, consequential things.
- A fundraising conversation framed as demonstrated reality rather than projected potential.
- A founding myth that is true: *we were playing around with a county parcel API on a weekend and the implications turned out to be significant.*

---

## 11. Action items

These get filed as platform tasks once Sean approves the CODEX (concept stage). None can start until Gap 1 (DLA Piper engagement) returns.

| # | Action | Owner | Blocker |
|---|---|---|---|
| 1 | Send DLA Piper formal engagement request: draft (not review) the three letter templates + assess standard-of-care theory's strongest counterargument | Sean | Sean's approval of this CODEX |
| 2 | Pull ATTOM subscription agreement + commission counsel opinion on bulk pulls + public anchoring + commercial platform use | Sean (assigns to BIZ-LAW-001 worker) | Action 1 underway |
| 3 | Kim Bennett informed-consent conversation, with DLA Piper risk assessment in hand | Sean | Actions 1 + 2 returned |
| 4 | AUDIT-001 anchor script batch completeness test on synthetic 8K-parcel list | Platform | Independent of legal — can run now |
| 5 | Verification link non-technical UAT (recruit non-tech recorder, ideally Mono CA contact) | Sean | Action 4 complete |
| 6 | DLA Piper drafts AG letter version separately with explicit "most aggressive AG-staff reading finds nothing actionable" standard | DLA Piper | Action 1 underway |
| 7 | If all gaps close clean: execute Sublette WY, then 30-day pause, then Mono CA | Platform + Sean | All six gaps closed |

---

## 12. Honest assessment

This is a creative and potentially significant concept. The legal theory is coherent. The economics are real. The creator framing is authentic.

It is also untested. The standard-of-care argument has not been litigated. The notification campaign has not been run.

The gap between *interesting concept* and *executed correctly* is entirely in the six items in Section 7. None are blockers if addressed properly. All are blockers if skipped.

DLA Piper's job is to make the execution as solid as the concept. The platform's job is to make the technical substrate as solid as the concept. The concept is solid. Everything else is execution.

---

*CODEX S52.30 prepared 2026-06-05 by Alex on Sean's instruction. Concept document. Not approved for execution. Sublette WY runs only when all six gaps in Section 7 are confirmed closed.*
