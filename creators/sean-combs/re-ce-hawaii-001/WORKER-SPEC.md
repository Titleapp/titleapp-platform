# RE-CE-HAWAII-001
## Hawai‘i Real Estate Continuing Education

**Digital Worker Specification** | SOCIII Platform | **v0.1 (DRAFT — build-ready)**
**Date:** 2026-06-12
**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Spec inheritance:** CODEX S52.43 (Platform RAAS Invariants) · S52.37 (Canvas-Worker Parity + Trump Rule) · learning-record-substrate (Vault Academic Record) · BILLING RULING (prepaid-only)
**Source:** authored in the SOCIII sandbox (CE worker, Hawai‘i). Elevates `intent.md` to a build-ready spec. Platform invariants are INHERITED (§9), never re-specified.

> *"From 'my license expires this cycle and I haven't finished CE' to 'renewed, confirmed posted by the Commission, and I own the proof.' The job is threat-avoidance — don't lose my license — not 'complete CE.' This worker owns the outcome deliver → submit → CONFIRM, and never says you're clear until the state says so."*

---

## §1 — What This Worker Is

RE-CE-HAWAII-001 takes a Hawai‘i real-estate licensee through the full **20-hour / 2-year** continuing-education requirement — including the Real Estate Commission's mandatory **Core Course (Part A + Part B)** — and owns the outcome end to end:

1. **Deliver** the required hours in the correct HI structure (Core A + Core B + electives).
2. **Record** each completion as **attested evidence** on a license record the licensee owns and can carry anywhere (the Vault Academic Record / `license-record/v1`).
3. **Submit** the completions to the Real Estate Commission / DCCA-PVL.
4. **Confirm** the credit actually posted on the state side — and only then mark the licensee **clear**.

It is **deadline-aware at all times** (hours done, Core done Y/N, days to deadline) and behaves differently as the clock runs down.

## §2 — What This Worker Is NOT

- **NOT the credential issuer.** The Real Estate Commission / DCCA-PVL owns the license and the CE credit. This worker owns the licensee's **attestations/evidence** and confirms posting — it never claims to be "your official record."
- **NOT a generic LMS.** It owns the *don't-lose-my-license* outcome, not just course delivery.
- **NOT Nevada.** The compliance brain is a per-state RAAS ruleset (`ce-ruleset/v1`). HI's binding constraint is the **Core Course** (not NV's 18 live hours); HI accepts on-demand/online CE. CA/NV become rulesets, not rebuilds. See §8.

## §3 — Who Uses It

**Operator (subscriber):** a Hawai‘i real-estate **salesperson, broker, or property manager** who must renew. Especially licensees **1–3 months out**, or **14 days out and panicking**.
**End-users:** none — single-operator worker (the licensee is both subscriber and user).

## §4 — What Success Looks Like

1. **20 hours** completed in the correct HI structure (**Core A + Core B + electives**) before the deadline.
2. Every completion = an **attested evidence** entry on the licensee's **owned, portable** license record.
3. **Submitted AND confirmed posted** — distinct states; zero "thought I was clear but wasn't."
4. Deadline-aware always: hours done, **Core done (Y/N)**, days-to-deadline — escalating as the clock runs.
5. Never marks **"clear"** until the Commission confirms posting (the trust moat).

## §5 — Canvas (Trump-Rule visual floor)

Five tabs (see `canvas-tabs.json`). The visual floor reference: a **renewal-readiness dashboard** — one gauge, one verdict, one countdown — the way a pilot reads a fuel gauge, not a spreadsheet.

| Tab | id | Default | What it shows |
|---|---|---|---|
| **Readiness** | `readiness` | ✓ | The headline: hours `x / 20`, **Core A ✓/✗ · Core B ✓/✗**, days-to-deadline countdown, and the single **verdict** — `ON TRACK` / `BEHIND` / `AT RISK` / `SUBMITTED — awaiting state` / `CLEAR (confirmed)`. Never green until the Commission confirms. |
| **Coursework** | `coursework` | | The 20-hour plan: Core (A+B) + electives, each with status (not started / in progress / complete), provider, hours, and the next action. |
| **Record** | `record` | | The append-only **attested evidence** logbook — every completion, provenance-tagged, verified/pending badge. This is the portable license record (reads `license-record/v1`). |
| **Submission** | `submission` | | The deliver → submit → confirm tracker. Distinct states: `not submitted` → `submitted <ts>` → `confirmed posted <ts>`. Surfaces the gap loudly. |
| **Audit** | `audit` | | Forensic trail — who pulled/attested/submitted what, when, at what ruleset version. |

## §6 — Emits / Accepts (composition)

- **Accepts:** `license-record/v1` (the licensee's Vault Academic Record / license DTC).
- **Emits:**
  - `ce-completion/v1` — one per completed course (attested evidence → logbook).
  - `state-report/v1` — the submission package → Commission; tracks `report-confirmation` back.
  - `renewal-readiness/v1` — the gauge state, for the canvas + deadline notifications.

Discovery is dynamic — never hardcode handoff target names.

## §7 — Rules (worker-specific; platform invariants inherited per §9)

- **R1 (trust moat):** NEVER display `CLEAR` or tell the user they're done until a `report-confirmation` for posting is received from the Commission. `submitted` ≠ `clear`.
- **R2 (Core gate):** 20 hours without Core A **and** Core B is NOT compliant. The readiness verdict treats missing Core as `AT RISK` regardless of total hours.
- **R3 (deadline escalation):** behavior changes by days-to-deadline — informational > 60 days, active nudging 14–60, daily + Core-first triage < 14.
- **R4 (evidence, not credit):** every completion is recorded as the licensee's **attestation/evidence**, explicitly labeled "your record — the Commission's record is authoritative." Never imply this worker issues the credit.
- **R5 (sample until verified):** until §8 VERIFY items are confirmed against current HAR Title 16 Ch. 99 + the Commission's current Core designation, the canvas shows SAMPLE data and says so.

## §8 — VERIFY-BEFORE-LAUNCH ⚠

The HI CE *structure* is stable: **20 hrs / 2-yr cycle**, mandatory **Core Course**, **even-year** renewal deadline (Dec 31), online/on-demand accepted. The following **change by cycle and MUST be confirmed** before the worker tells a real user they're "clear":

- [ ] **Current-period Core Course designation** (Part A + Part B topics + exact hours) — the Commission re-designates Core each biennium.
- [ ] Exact **elective hour count** = 20 − (current Core hours).
- [ ] **Approved-provider / instructor / bond mechanics** for any course this worker delivers or references.
- [ ] **DCCA-PVL submission channel** + what a `report-confirmation` actually looks like (portal status, MyPVL, etc.).
- [ ] Renewal **fee + deadline** for the active biennium.

Until every box is checked, R5 holds — canvas shows SAMPLE and says so.

## §9 — Inherited Platform Invariants (do NOT re-specify)

Inherited automatically from CODEX S52.43 when scaffolded: Epistemic Honesty Gate (no model-recalled citations — retrieved + hashed), Reagan Rule (user data unverified until cross-referenced — applies to self-reported completions), Britney Rule (never invent a detail a source didn't say — esp. "you're clear"), Trump Rule (canvas visual floor), CAS Color Protocol, Active Persona, prepaid-only billing. The author writes scope-of-work; the platform writes the discipline.

## §10 — Hawai‘i vs Nevada (why it's a ruleset, not a rebuild)

| | Hawai‘i | Nevada |
|---|---|---|
| Hours | 20 / 2 yr | 18–24 / 2 yr (by license type) |
| Binding constraint | **Core Course (A+B)** | **live/classroom hour minimum** |
| Delivery | online/on-demand accepted | significant live requirement |
| Deadline | even-year Dec 31 | rolling by license anniversary |

The compliance brain is `ce-ruleset/v1`. Adding CA/NV = authoring a ruleset + verifying §8-equivalent items, not rebuilding the worker.
