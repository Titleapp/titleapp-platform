# CODEX — Customer Portal (White-Label) + Managed Comms

**Status:** 🟡 **PROPOSED — red-team before build.** A working *prototype* exists
(unwired, not deployed) at `apps/business/src/pages/ClientPortal.jsx` as a
concrete artifact to attack.
**Owner:** Sean · **Created:** 2026-06-22
**Why it matters:** the demo shows the operator (Dr. Chen running her business)
but not the **customer** — the bigger video hook and the bigger market. The
customer surface is where "why should you care" lives, on both sides.

---

## 1. Objective

A **white-label, customer-facing surface**: the pet owner, the advisor, the
client of any SOCIII business gets a branded, chat-first experience — onboarded
by a **link or QR**, pre-filled from the operator's CRM, with their records
owned for life. One primitive, skinned per company.

**Value prop (leads the videos, ~60s, both sides):**
- **Business owner:** immediate, *correct* answers off the front desk / answering
  service / dispatch; better service; new revenue (AI handles routine Q&A, even
  paid AI calls); scales without headcount.
- **Customer:** instant correct answers, first-aid/triage when it matters, easy
  booking, transparent pricing, records they own — easier and cheaper.

---

## 2. The pattern (locked with Sean)

> A **customer is a white-labeled SOCIII account**, onboarded by a link/QR.
> Pet owner and advisor are the *same flow*, different skin.

- **Interface:** Claude-like — chat center + **canvas that appears only when it
  matters** + subtle nav. Reuses our `ChatPanel` + `RightPanel` canvas. Stripped
  + skinned. The customer **never** sees the operator cockpit.
- **Skin follows the door, not the person.** Enter via Meadow Vet's link → Meadow
  Vet skin. Identity is singular; **presentation is per-relationship.**
- **Super user** (customer of one company *and* owner of their own): sees the
  **company skin by default**, with a quiet "switch to your SOCIII" escape hatch
  (= the existing workspace switcher). Most customers only ever have one skin.
- **CRM-seeded:** the operator's contacts populate the customer account (Dr.
  Chen's 160 contacts → pet-owner account; advisor contact list → advisor
  account). Match by phone/email.
- **Advisors affirm, don't sign:** agreements are already signed (Dropbox Sign /
  Atlas) → pre-placed in their Vault → they just **affirm** (attestation, on-chain).
- **Soft cross-sell** ("yours to keep — use it for your own stuff too") — the
  land-and-expand doorway; the business is the acquisition channel.

---

## 3. Managed communications

- **Core loop is IN-APP** — chat + push. **No telephony, no DNS, no approval
  hell.** Ship this first; it needs none of the below.
- **SMS / email (reminders, "text us") = platform/ISV model:** SOCIII holds one
  master account (Twilio/SendGrid), auto-provisions a **branded number per
  business**, and absorbs A2P 10DLC / TCPA / STOP / quiet-hours **centrally**.
  Email sends from a **SOCIII subdomain** branded with the business name → zero
  customer DNS. **BYO-number/domain** stays an optional power-user path.
- **Ownership:** customer's contact list = the **business's** data (portable);
  the customer owns **their identity**; SOCIII owns only the **rails**. Metered
  → revenue line, not cost center.
- ⚠️ **See red-team #4 — the "no approval for anyone" claim is partly
  over-promised and must be scoped honestly.**

---

## 4. Scope

**In scope:** in-app chat (per vertical), canvas-on-demand (book / records /
affirm), CRM-seeded identity, silent-port auth, soft cross-sell, the advisor
affirm instance, the vet pet-owner instance.

**Out of scope (v1):** the full operator workspace for consumers; live paid AI
**voice** calls; BYO-number self-serve; non-vet/non-advisor verticals.

---

## 5. RED TEAM — attack the plan

> Severity: 🔴 critical (can hurt someone / sink the company) · 🟠 high · 🟡 medium

### 🔴 R1 — Veterinary advice is practicing medicine. The "first aid / 911" hero is the most dangerous feature we have.
A public AI triaging "is chocolate dangerous" is **giving veterinary medical
advice**. Two failure modes:
- **Under-triage** a real emergency → pet dies → lawsuit + the vet's name (and
  ours) on it. Catastrophic and unrecoverable.
- Most US states require a **VCPR** (veterinary-client-patient relationship)
  before specific medical advice; an AI doing it may be **unauthorized practice**.

**Mitigations (non-negotiable for ship):** information/triage **only**, never
diagnosis; **conservative escalation** (when in doubt → "call us / ER now");
hard, visible disclaimers; **human handoff** for anything ambiguous; every
exchange **logged + attributable**; the **vet (Dr. Chen) owns and configures**
the triage rules (it's *her* protocol, her liability boundary, not ours). The
rules-engine + sourced-answers model is the defense — but a 24/7 bot can't have a
human approve every reply, so the **safe defaults must be built in, not bolted
on.** This same finding generalizes: every regulated vertical (legal = UPL,
financial = fiduciary/SEC, medical = HIPAA) inherits its own version of R1. **The
"AI gives correct answers" promise is a liability surface, not just a feature.**

### 🔴 R2 — Cross-tenant / cross-context data leakage.
"Skin follows the door" + one shared identity means the ACL boundary between
*what the vet shared* and *the customer's private life* (and *other businesses'
data*) must be airtight. One bug → a pet owner sees another client's records, or
the vet sees the customer's personal Vault. **Catastrophic trust failure.**
**Mitigation:** strict per-relationship scoping; the consumer surface reads only
records explicitly shared into *that* relationship; red-team the ACL with an
explicit cross-tenant test suite before any real data.

### 🟠 R3 — Silent-port by phone number is an account-takeover vector.
Matching a customer to an existing account by phone/email **without verification**
lets someone claim another person's account/Vault. **Mitigation:** silent-port
must still require an **OTP** to the matched number/email before granting access —
"seamless" ≠ "unverified." Account-merge (customer + their own SOCIII) is
notoriously bug-prone → gate it, log it, make it reversible.

### 🟠 R4 — The comms "no approval hell" claim is over-promised at scale.
Carriers are tightening 10DLC; shared/ISV campaigns get vetted; **sole-prop
campaigns throttle hard** (~tens of msgs/day) and high-volume senders increasingly
must register the **actual** business. So "SOCIII registers once, nobody else ever
does" holds for **low-volume**, but at scale carriers want to know the real
sender. Also: **shared sending reputation** — one business spamming can tank the
SOCIII subdomain/number pool for **everyone**. **Honest version:** SOCIII eats the
registration **once per tier** and shields customers from it as far as carrier
policy allows; we **meter + monitor + rate-limit** to protect shared reputation;
heavy senders graduate to their own (vetted) registration that we still
operate. Don't tell investors/customers it's *zero* approval forever — tell them
it's *zero approval for them* and *we run the rails*.

### 🟠 R5 — Auto-creating accounts from CRM may be unlawful.
Pre-minting an identity/Vault for a person from CRM data **before they opt in**
can violate GDPR/CCPA/CASL (and TCPA for any resulting text). **Mitigation:** the
account is *provisioned but dormant* until the customer themselves activates it
via the link (their action = consent); texting requires prior express consent
captured at booking. CRM data is messy too — no phone, shared family numbers (one
number, many pets/people), duplicates — so matching is best-effort, not assumed.

### 🟡 R6 — White-label cross-sell can anger the business.
"Powered by SOCIII — use it for your own stuff" reads to some operators as
**poaching their customers** off their own branded surface. Enterprise white-label
buyers may hard-refuse it. **Mitigation:** make the cross-sell **a tenant setting**
(on by default for SMB, off for enterprise white-label); keep it a footer, never
an interstitial.

### 🟡 R7 — Demo-vs-reality gap.
The prototype is fully **scripted** (deterministic chips) — it will demo
beautifully. The real thing needs a **live, grounded, safe** LLM, which reintroduces
R1 + hallucination risk and is ~10× the work. **Risk:** we demo something we can't
safely ship and over-promise. **Mitigation:** be explicit internally about
scripted-demo vs. shippable; ship the **bounded** version first (curated Q&A +
escalation), expand the free-chat surface only behind the safety rails.

### 🟡 R8 — Voice ("AI answers the calls for a fee") is a different, harder beast.
STT/TTS latency + accuracy + even higher liability (a misheard dose/symptom on a
live call). **Keep voice out of v1**; it's a separate CODEX once text is proven safe.

### 🟡 R9 — Reputational transfer.
A confidently-wrong answer damages the **vet's** brand (their name is on it). Vets
may not accept bearing reputational risk for our AI. **Mitigation:** R1's
conservative defaults + vet-owned rules + visible "powered by, not authored by"
framing + easy human handoff.

---

## 6. Build phases (post red-team sign-off)

1. **In-app pet-owner portal** (bounded Q&A + escalation, book, owned records) —
   no telephony, vet-owned triage rules, ACL test suite (R1, R2).
2. **Advisor affirm** instance (dormant-until-activated, OTP silent-port) (R3, R5).
3. **Managed SMS/email** reminders (metered, rate-limited, shared-reputation
   guardrails) (R4).
4. Cross-sell as a tenant setting (R6); voice as a later CODEX (R8).
