# Worker: `re-ce-hawaii-001`

**Creator:** Sean Lee Combs (`seanlcombs@gmail.com`)
**Status:** Draft — spec authored in the SOCIII sandbox; ready for Code build
**Working title:** Hawai‘i Real Estate CE
**Vertical:** Real Estate (real-estate-professional)
**Source spec:** SOCIII sandbox session (CE worker, Hawai‘i) → see `WORKER-SPEC.md`

## What it does

Takes a Hawai‘i real-estate licensee from *"I haven't finished my CE and my license expires this cycle"* to *"renewed, **confirmed posted by the Commission**, and I own the proof."* The real job is **threat-avoidance — don't lose my license** — not "complete CE." It delivers the full **20-hour / 2-year** requirement (including the Real Estate Commission's mandatory **Core Course**, Part A + Part B), records each completion as **attested evidence** on a license record the licensee owns, **submits to the Commission / DCCA-PVL, and confirms it actually posted.** What no other worker does: it owns the outcome **deliver → submit → CONFIRM**, behaves differently as the deadline nears, and never lets you believe you're clear until the state confirms.

## Who uses it

**Operators** (the tenant — the person who subscribes):
- Hawai‘i real-estate **salespersons, brokers, and property managers** who must renew their license
- Especially: licensees **1–3 months out**, or **14 days out and panicking**

**End-users:** none — single-operator worker (the licensee is both subscriber and user).

## What success looks like

1. **20 hours** completed in the correct HI structure (**Core Course Part A + B + electives**) before the deadline
2. Every completion = an **attested evidence** entry on the licensee's **owned, portable** license record
3. **Submitted to the Commission AND confirmed posted** — distinct states; zero "thought I was clear but wasn't"
4. Deadline-aware always: hours done, **Core done (Y/N)**, days-to-deadline — escalating as the clock runs
5. Never marks **"clear"** until the Commission confirms posting (the trust moat)

## What this worker is NOT

- **NOT the credential issuer.** The Real Estate Commission / DCCA-PVL owns the license + the CE credit. This worker owns the licensee's **attestations/evidence** and confirms posting — it never claims to be "your official record."
- **NOT a generic LMS.** It owns the *don't-lose-my-license* outcome end-to-end, not just course delivery.
- **NOT Nevada.** The compliance brain is a per-state RAAS ruleset (`ce-ruleset/v1`). HI ≠ NV: HI's **binding constraint is the Core Course** (not NV's 18 live hours), and HI accepts on-demand CE. See `WORKER-SPEC.md` → "Hawai‘i vs Nevada."

## Why this dovetails with the SOCIII platform

| Need | Platform capability |
|---|---|
| License DTC + CE logbook | Vault learning/license record; this worker reads `license-record/v1` |
| Per-completion attested evidence | append-only logbook; emits `ce-completion/v1` |
| Submitted-vs-confirmed reporting | emits `state-report/v1` → Commission, tracks `report-confirmation` back |
| Compliance brain portable across states | reads a per-state `ce-ruleset/v1` — CA/NV become rulesets, not rebuilds |
| Deadline-aware behavior | renewal-readiness gauge; emits `renewal-readiness/v1` |
| The relief moment outside the app | text/email the instant the Commission confirms |

## ⚠ Verify before launch

The HI CE *structure* (20 hrs/2yr, mandatory Core, even-year renewal, online accepted) is stable; the **provider/instructor/bond mechanics + the exact current-period Core hours** change by cycle. See `WORKER-SPEC.md` → "VERIFY-BEFORE-LAUNCH" — every flagged item must be confirmed against the current **HAR Title 16 Ch. 99** + the Commission's current Core designation before the worker tells a real user they're "clear." Until then the canvas shows SAMPLE data and says so.
