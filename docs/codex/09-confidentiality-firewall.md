# CODEX Surface 9 — Confidentiality Firewall (data-silo sanctity in chat)

**Status:** 🟢 shipped + deployed + QA-001 green · **Owner:** Sean · 2026-06-23
**Trigger:** Live demo regression — the Meadow Creek vet demo persona asked Alex "what's my
day / how's the company doing" and got **"Hi Sean!" + SOCIII's confidential internal data**
(Storyhouse $2M, Kent cofounder terms, six patent application numbers, 6-28 grace date, cap
table). A customer-facing persona was reciting SOCIII, Inc.'s confidential corporate facts.

---

## Objective
No tenant's Alex ever sees another tenant's data, and **no customer-facing surface ever
recites SOCIII, Inc.'s own confidential corporate facts.** Company status comes from REAL
Firestore at runtime — never hardcoded prose.

## Root cause (two faults, compounding)
1. **Confidential data hardcoded in the always-on prompt.** `services/alex/prompts/core.js`
   `getCore()` is prepended to EVERY Alex chat on EVERY surface (`promptBuilder.assemblePrompt`).
   It embedded SOCIII's cap table, raise terms, six patent application numbers + the 6-28 grace
   date, EIN, registered address, and internal GTM strategy (AG wedge, Sublette pilot, Bloomberg
   distribution, Deposition Rule). All of it reached every customer.
2. **Demo persona had no identity.** `users/{demoUid}/workspaces/{demoTid}` had `ownerName`
   undefined → no person for Alex to address → with SOCIII's text flooding the prompt, Alex
   latched onto the only named human ("Sean Lee Combs") and recited the company's internals.

A system prompt is **instructions**, never a **system of record.** The hardcoded company facts
were also stale/fabricated. Real company status now flows from `services/alex/workspaceBrief.js`
(computeSummary + obligations + Vault DTCs + staffCredentials), tenant-scoped.

## What was done (all deployed to functions:api)
- **core.js** — stripped the IR/cap-table block, the EIN + registered address + cap-structure
  line, the patent application numbers, and the internal GTM strategy (AG wedge, Sublette,
  Bloomberg, Deposition Rule, the profane creator thesis, PLAT-008 gating, legal-worker roadmap,
  creator-tier economics). Added a **CONFIDENTIALITY FIREWALL** instruction. Kept public-safe
  brand/voice/positioning guardrails. Corrected stale SDK claim (it IS published at
  github.com/SOCIII-Inc/sociii-sdk).
- **sovereign.js** — same prune (used by investor/discovery/dev/contact/sandbox/authoring
  surfaces): kept brand/voice/chain-agnostic guardrails + a confidentiality clause; removed the
  internal strategy.
- **Deleted** `knowledge/ir-context.md` + `knowledge/sociii-platform-context.md` (full cap table
  + real third-party names; confirmed loaded by ZERO code) and their dangling refs in core.js.
- **nursing-education-context.md** (loaded for education customers) — removed a patent number.
- **platform.json** catalog (customer-browsable) — USPTO application numbers → "patent-pending".
- **Contact surfaces** (`index.js` + `surfaces.js`) — pulled EIN/DUNS/registered-agent off the
  public surfaces; Alex now refuses to recite tax IDs and routes such requests to hello@sociii.ai.
- **Demo persona identity** — set `ownerName: "Dr. Maya Chen"`, role, location on the demo
  workspace doc so Alex addresses Maya, not Sean.

## Scope confirmed (the reassuring part)
- The ONLY surface that ever reached a customer was `core.js` (always-on). Now clean.
- `raas/company-knowledge.md` (raise terms, advisor bios) injects ONLY on investor-gated surfaces
  (`index.js` 4442 + the `vertical==="investor"` branch) — never a customer workspace.
- The two scary reference docs (full cap table + real names) were loaded by zero code — deleted.
- No hardcoded live secrets in source (only a fake `sk-ant-...configured` placeholder string).

## QA-001 (2026-06-23, all green)
- Syntax/JSON: core.js, sovereign.js, surfaces.js, index.js, platform.json — all OK.
- Assembled business-surface prompt (46K chars) → confidential-residue scan: **NONE**.
- Live demo chat ("how's our company doing and who am I?") → "Dr. Maya Chen, DVM, Bishop CA" +
  vet team + real financials, **zero** Sean/SOCIII/patent leakage.
- Investor surface still intact (company-knowledge present) — IR not broken.

## RED TEAM
- 🟡 **RT1 — Residual confidential text on a customer-reachable surface.** Mitigation: full sweep
  of all 9 prompt files + 3 knowledge files + catalog + inline index.js prompts; residue scan in
  QA-001 returns NONE. Any future confidential fact belongs behind the investor gate or the
  workspace data brief, never in core.js.
- 🟡 **RT2 — A new always-on injection re-introduces a leak.** Mitigation: the Confidentiality
  Firewall instruction is now IN core.js itself; treat any hardcoded company number in a prompt
  as a bug (see [[junk-code-and-fabrication-vectors]]).
- 🟡 **RT3 — Another persona ships with a blank `ownerName`** and Alex guesses a name. Mitigation:
  demo persona fixed; seeds should always set ownerName/role/vertical. Open: enforce at workspace
  creation.
- 🟢 **RT4 — Breaking the investor surface by over-pruning.** Checked: investor prompt still
  assembles with raise context; company-knowledge.md is investor-gated and untouched.

## Sign-off gate
Customer/demo Alex answers "how's the company doing" from REAL tenant data with zero SOCIII
internals. ✅ Met and verified live. Remaining (non-blocking, admin/data — not chat): reconcile
the two stale EINs in admin config/Settings defaults; the SF vs Las Vegas addresses are both
legitimate (Las Vegas = registered HQ, SF = Kent's office) and intentionally kept.

## Not a code issue — flagged for Sean (real-world, time-sensitive)
The 6-28 date is REAL (it's in the actual filing-planning docs, not just the deleted prompt
text): **35 USC 102(b)(1) one-year grace-period anchor**, distinct from the provisional→
non-provisional conversion deadline (~2027-05-24). Needs patent counsel THIS WEEK — see the
session note / counsel-email draft.
