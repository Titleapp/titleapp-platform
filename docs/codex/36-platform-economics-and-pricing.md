# CODEX 36 — SOCIII Platform Economics + Pricing Philosophy

**Status:** SPEC v4 — red-teamed twice 2026-07-12, creator fee + minting structure corrected  
**Owner:** Sean  
**Date:** 2026-07-12  
**Trigger:** Elise/DPP engagement — first real encounter with consultant/creator pricing dynamics  
**Applies to:** All workers, all verticals, all creators

---

## 1. The Philosophy: Little Piggy, Not a Hog

SOCIII competes on **affordability + IP moat**, not on margin extraction.

> "The goal isn't to be a hog. It's to be a little piggy. I want it to be so affordable to use SOCIII that there really is no other choice in the market."
> — Sean, 2026-07-11

If SOCIII prices like a hog:
- Creators mark up to cover their costs and margin → clients feel gouged
- CFO/tech team figures this out within 6–12 months → churn
- Competitors clone the model at a lower price point
- SOCIII gets caught in the consultant-client crossfire

If SOCIII prices like a little piggy:
- There is no cheaper substitute — not because of lock-in, but because the price doesn't justify building an alternative
- Creators compete on expertise and domain value, not on gatekeeping access
- The IP moat (append-only records, minting, rules engine) is what clients can't replicate, not the price

---

## 2. Two Distribution Tracks — Know Which Model Applies

**This CODEX governs the creator-led B2B track.** CODEX 22 governs the marketplace track. These are not competing models — they describe different billing relationships.

**Track determination rule (objective, applies to every worker):**

> The track is determined by who receives and processes the client's payment. If the client pays the creator directly and the creator pays SOCIII — creator-led B2B (this CODEX). If the client pays SOCIII directly and SOCIII pays the creator — marketplace (CODEX 22).

| Track | Client pays | Creator earns | SOCIII's revenue |
|-------|------------|---------------|-----------------|
| **Creator-led B2B** (this CODEX) | Creator directly | Sets own price; pays SOCIII ~$50/year creator fee + compute credits + minting | Creator fee + compute markup + minting fees |
| **SOCIII Marketplace** (CODEX 22) | SOCIII directly | 75% of collected subscription + 20% of compute revenue generated through their workers | 25% of collected subscription + 80% of compute revenue + minting |

**Creator-led B2B has two sub-patterns — both governed by the same terms:**

- **Multi-client creator** (Elise model): Creator is a consultant or advisory firm serving multiple named clients using the same published workers. Creator bills each client separately; pays SOCIII one annual creator fee regardless of how many clients or workers.
- **Single-tenant custom** (Ford model): Creator builds a bespoke worker for one named client, locked to that tenant. Same economics — annual creator fee + credits + minting.

**Confirmed marketplace example — UH / Ruthie:** SOCIII pitched UH on "Academic Business in a Box" with a monthly per-student fee. UH pays SOCIII the institutional subscription. When UH students use Ruthie's workers, Ruthie earns 72% of the subscription revenue attributable to her workers plus a share of compute consumed (% TBD). This is the marketplace track — CODEX 22 governs the full mechanics including the graduation threshold at 5K seats.

A single worker can only operate under one track at a time. If a worker published under the creator-led B2B track is later listed in the SOCIII marketplace and a client subscribes independently, that subscription flows through the marketplace track (SOCIII bills, 72% to creator). The billing track follows the client's payment path, not the worker's slug.

---

## 3. Three Pricing Dimensions

### Dimension 1 — Creator Registration (Annual Fee)

**Model: App Store, not per-worker.**

SOCIII charges creators an annual platform registration fee, not a per-worker fee. Charging per worker would penalize creators for building more — that's not pono.

- **Annual creator fee:** $50/year *(confirmed 2026-07-12)*
- **Waiver:** Waived for all creators through November 2026 (first 6 months of the platform). Beginning December 2026, $50/year applies to all creators including Sean and advisors. This is a first-mover courtesy, not permanent policy.
- **Model alignment:** Apple App Store ($99/year developer account), Google Play ($25 one-time). SOCIII's marketplace revenue share (28% to SOCIII, 72% to creator) is comparable to the App Store split. Creator-led B2B creators pay only the annual fee — SOCIII does not share in their client revenue.
- **No per-worker fees.** A creator with 1 worker and a creator with 50 workers pay the same annual fee. Scale is rewarded, not taxed.

---

### Dimension 2 — Compute (Pre-Funded Credits)

Applies to both tracks identically.

- **What:** API calls — AI inference, data lookups (ATTOM, SCIP, ECHA, registry API), document processing, image generation, identity checks
- **Who pays:** Pre-funded credits, purchased in advance. No invoicing from SOCIII. No credit terms. No net-30 from SOCIII.
- **SOCIII markup:** 2× actual cost (`dataFeeMarkupMultiplier: 2.0` in `pricing.js`). If an API call costs SOCIII $0.01, the creator's credit balance is debited $0.02. Margin on compute is ~50% gross. This is already coded and live.
- **Creator compute share (marketplace track):** 20% of compute revenue generated through their workers (`creatorRevenueSharePct: 0.20` in `pricing.js`). Locked. Matches Sean's stated recollection.
- **Minimum:** $10 minimum credit load for ALL workers — even on a free-tier worker. No credits = no API calls = worker pauses.
- **New self-serve accounts:** $10 platform-subsidized trial credit at account creation. Hard gate kicks in after trial depletion.
- **Model:** AWS/utility. Credits deplete as usage occurs. When credits run out, usage pauses — SOCIII never goes into arrears.
- **Currency:** Credit balances held in USD. EU-facing fees are quoted in EUR; conversion occurs at credit purchase time at the prevailing rate. FX risk sits with the creator's credit balance, not SOCIII.
- **Rule 5 scope:** No-invoicing rule governs the SOCIII↔creator relationship only. Creator→client billing terms (POs, net-30, enterprise invoicing) are entirely the creator's business. A FIAMM or HOPPECKE procurement department can invoice Elise on whatever terms they negotiate; SOCIII is not party to that.
- **The Homdao lesson:** The old Squarespace/Google Homdao situation was this failure mode — a platform extending implicit credit to a reseller's client relationship and absorbing the nonpayment risk. SOCIII will not repeat this.

---

### Dimension 3 — Minting (Per-Event, Value-Based)

**Do not conflate minting events across verticals.** A student transcript anchor and an EU DPP passport registration are both minting events, but the value they unlock is orders of magnitude apart. The fee reflects that. There is a platform minimum, and then value-calibrated rates per event class.

**Platform minimum:** $1 per minting event. Every anchoring action carries at minimum a $1 fee — this covers platform costs and establishes that minting is never free. Applies to low-value records: logbook entries, draft signatures, internal attestations, student certifications.

**Value-calibrated rates (confirmed 2026-07-12):**

| Event class | Event | Fee | Value unlocked |
|-------------|-------|-----|----------------|
| **EU regulatory access** | DPP initial passport registration | €75 | EU market access for one battery product |
| **EU regulatory maintenance** | DPP lifecycle amendment | €20 | Passport currency; compliance standing |
| **Personal Vault anchor** | DTC mint (Vault) | €5 | Immutable ownership/provenance record |
| **Platform minimum** | Student transcript, logbook, attestation | $1 | Permanence; audit trail |

The gap between a student transcript ($1) and a DPP passport registration (€75) reflects the gap in business value, not the gap in compute cost. SOCIII's marginal cost is near zero in both cases.

**Value ceiling (the "little piggy" constraint):**

Minting fees are value-based but bounded. The ceiling for a given event class is never more than the SOCIII marketplace take on one month of the relevant worker's subscription revenue — calibrated to the App Store analogy: SOCIII captures value at minting the same way it captures value in the marketplace, as a share of the value created, not as a tax on infrastructure.

**Pre-flight credit check (atomicity rule):**

The minting trigger is the **submit step**, not the generate step. For DPP specifically:
- `POST /v1/dpp:generate` (JSON-LD generation) = compute event, credits consumed as normal
- `POST /v1/dpp:submit` (EU Registry API call) = minting event — full minting fee reserved before the call is initiated

If insufficient credits at submit time: reject before the registry call. No mid-transaction depletion. The record is either fully submitted with the minting fee consumed, or not submitted at all.

Same rule applies to all minting-eligible actions across all verticals: **reserve first, execute second.**

---

## 4. The Six Platform Rules

Non-negotiable. Must appear in creator onboarding and creator terms of service.

**Rule 1 — No subscription resale.**
SOCIII subscription prices are public and non-negotiable. Creators may not quote SOCIII prices to clients at a markup. Creators bill clients separately for their own expertise and service.

**Rule 2 — Expertise billed separately.**
A creator's advisory, implementation, and domain expertise is entirely theirs to price. SOCIII has no opinion on consulting rates. The platform is infrastructure; the expertise is the creator's business.

**Rule 3 — Pricing transparency (target state).**
SOCIII platform fees (creator registration, credit prices, minting rates) will be published and public. Clients will always be able to see what SOCIII charges. No hidden platform markups. *(Becomes present-tense policy once the fee schedule in §9 is published.)*

**Rule 4 — No client lockout.**
A creator cannot hold a client's data hostage. If a client terminates a creator relationship, their workspace data (Firestore records, Vault assets, passport files) remains accessible to them. Enforcement: server-side claims-based access scoping — a client's SOCIII login is scoped to their own records independent of the creator relationship. This is a structural property of the Firestore security model. Pattern: CODEX 23 §4a (Property Manager) and CODEX 31 §4 (Supply Chain Tracer) — both instances of the same platform-wide rule.

**Rule 5 — SOCIII's data fees pre-funded; no invoicing from SOCIII.**
SOCIII will never invoice a creator or client after the fact for compute or data consumption. Credits deplete; usage pauses; creator tops up. Governs the SOCIII↔creator relationship only. Creator→client billing terms are Rule 6's territory.

**Rule 6 — Creator assumes all client payment risk.**
If a creator's client doesn't pay their consulting invoice, that is between the creator and client. SOCIII's credit charges are settled at top-up time. SOCIII does not participate in collection, extend credit, or adjust charges based on creator invoicing outcomes. No exceptions.

---

## 5. Why Natural Competition Is Good (Creator-Led B2B Track)

On the creator-led B2B track, subscription fees creators charge clients will compress as competition increases. That's expected and healthy:

- Creator client fees compress toward commodity (SOCIII's $50/year creator fee is stable regardless)
- Compute credit volume grows as the platform scales (volume play)
- Minting fees grow as real-world anchored events multiply (the compounding moat)

SOCIII's long-run economics on this track: **annual creator fee + volume × minting.** The creator fee is the floor; minting at volume is the ceiling.

**On the marketplace track (CODEX 22):** SOCIII collects 28% of subscription revenue. Subscription compression on the marketplace track does affect SOCIII — the moat there is marketplace network effect and graduated pricing curve, not just minting. Different moat shape; this section applies to creator-led B2B only.

---

## 6. The Elise/DPP Use Case as the Model Example

Creator-led B2B / multi-client creator:

| Dimension | What Battlink pays | Where it goes |
|-----------|-------------------|---------------|
| Creator registration | (Battlink doesn't pay this — Elise does) | Elise pays SOCIII ~$50/year |
| Compute credits | Pre-funded by Elise (~$200/mo for SCIP + ATTOM + AI inference) | SOCIII debits Elise's credit balance as calls are made |
| Minting | €75/passport at EU Registry + €5/Vault DTC + $1 for minor attestations | Reserved from Elise's credit balance at submit step |
| Subscription | Elise-set fee (~$500/mo for 5 workers) | Elise charges this; 100% hers |
| Advisory | Whatever Elise charges for compliance expertise | 100% Elise's revenue; SOCIII has no view |

SOCIII's revenue from Elise across 10 clients: $50/year creator fee + ~$200/mo compute + ~€750/batch in minting. Near-zero marginal cost to SOCIII. Every new Elise client improves SOCIII's unit economics.

---

## 7. EU Patent Consideration (Tabled)

Tabled per Sean 2026-07-12. Three elements identified: dual-write minting, snapshot immutability model, RAAS advisor approval gate. The defensible novelty is the specific combination applied to EU battery passport regulation, not any individual technique. File a priority application when timeline allows — priority date is the asset.

---

## 8. Minimum Credit Requirement — Rationale

Even "free" workers require a $10 minimum credit load:

1. Every worker run involves at minimum: AI inference + one identity/auth check
2. $10 covers roughly 10–20 AI calls, 1 identity verification, basic data lookups
3. The $0 entry point trains users to expect free compute at unsustainable scale
4. Credits don't expire — utility deposit, not a paywall

New self-serve accounts: $10 platform-subsidized trial credit at signup. Hard gate after depletion. $10 minimum (after trial) applies universally — no vertical exempt.

---

## 9. Open Items

| Item | Status | Owner | Deadline |
|------|--------|-------|---------|
| Annual creator fee billing activation | Not built — activates December 2026 | Build backlog | November 2026 |
| Creator terms of service incorporating Rules 1–6 | Not written | Legal / Sean | Before first creator signs |
| Published platform fee schedule (creator fee, credit prices, minting rates) | Not published | Sean | 19 Jul 2026 |
| DPP minting fee billing (credit debit at dpp:submit) | Not built | Build backlog | 19 Jul 2026 |
| Pre-flight credit reservation logic in RAAS | Not built | Build backlog | Before first DPP minting event |
| Trial credit ($10) provisioning at self-serve signup | Not built | Build backlog | Before UH launch |
| Credit top-up UI (in-app) | Not built | Build backlog | Before first DPP minting event |
| Fix CODEX 22 subscription split — doc says 72%, correct is 75/25 | Engineering | Build backlog | Before Ruthie's agreement is signed |
| Second-life marketplace model (CODEX 33 Open Decision A) | Sean's call | Sean | Before Worker 5 Tab 5 build |

---

## 10. What This Is Not

- **Not a per-worker subscription model.** Creator registration is annual and flat — scale is rewarded, not taxed.
- **Not a reseller model.** SOCIII does not set prices creators mark up. Creators price their expertise independently.
- **Not a credit financing scheme.** No invoicing from SOCIII. No net-30 from SOCIII.
- **Not a one-size-fits-all minting model.** A student transcript and an EU passport registration are both minting events with completely different fee structures reflecting the value they unlock.
- **Not a replacement for CODEX 22.** This CODEX governs creator-led B2B. CODEX 22's marketplace model remains in effect for marketplace-distributed workers.
