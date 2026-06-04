# CODEX S52.27 — Session Wrap: Medevac Founding Myth Locked + Dispatch Worker Spec'd + Full Day Housekeeping

**Status:** SHIPPED (2026-06-04 night, into Sean's sleep window)
**Author:** Sean Lee Combs + Alex
**Predecessors:** S52.23 Audit Trail design lock (overnight 2026-06-03), S52.24 multi-day wrap, S52.25 VideoCard + chain-agnostic + proactive housekeeping, S52.26 (skipped — went directly to .27 to mark the founding-myth lock)
**Patent refs:** USPTO 64/073,693, Filing C

---

## Why this CODEX is different

This is the session where the dispatch-medevac-001 worker plan was fully scoped AND where Sean shared a real safety incident that becomes the founding myth of the platform. It's the strategic pivot — the platform's positioning shifts from "audit substrate for AI" to "audit substrate for AI, anchored in a real story about why this is needed, told by a working pilot."

The session covered:
1. Atlas verification + cap table Exhibit A drafted (par value bug found in Kent V3 RSPA)
2. Mike Lee package drafted (release + IP assignment + warrant agreement)
3. VideoCard built + deployed (YouTube embed for canvas)
4. Chain-agnostic positioning locked (Polygon today, L2 EVM only, no SOL, no own chain, not a crypto company; Base Smart Wallet advantage flagged)
5. Daily housekeeping cadence locked as memory principle
6. Alex-proactively-triggers-housekeeping locked as memory principle
7. dispatch-medevac-001 worker spec built — first creator worker authored via Substack-pattern (Claude Code + fork repo)
8. **Sean's PC-12 NG incident shared (the founding myth)**
9. **Medevac blog post drafted from incident + research**
10. 4 parallel research agents ran: Part 135 Subpart L + state/CAMTS + NTSB safety record + existing software stack
11. Today's housekeeping (commit + push + CODEX + Downloads copy + Alex update queued)

## Headline ships

### 1. The blog post — "The system held because the people in it are good. That's not safety. That's luck."

Lives at `apps/business/public/docs/blog/medevac-safety-case-the-system-held-because.md`. ~2400 words, first-person from a pilot's perspective, anonymized incident details, NTSB-citation-backed thesis.

Structure:
1. Lede — anonymized PC-12 incident
2. What happened, what almost happened
3. NTSB data — 12 dispatch-failure accidents 2010-2022, 45 fatalities + 13 serious injuries; pre-Subpart L baseline (1 fatal every 3-4 months); post-Subpart L (1 fatal/yr)
4. What Subpart L did not fix (OCS not certificated dispatchers, no override authority, applies only at 10+ helicopters, doesn't cover fixed-wing)
5. What the existing software stack does not do (Flight Vector, Baldwin, RAMCO, ForeFlight, emsCharts — collectively don't catch the failure modes the NTSB names)
6. What needs to be different (dispatcher-level aviation knowledge + EMD-level clinical knowledge + operator-specific overlay + continuous risk + cross-operator turndown registry + audit substrate)
7. What we are building — the soft pitch, frames as infrastructure not crypto, open SDK + closed substrate

Routing into PressPage.jsx is TODO for Sean's next session (he can wire it in or I can on his green light — but the file is staged + visible).

### 2. dispatch-medevac-001 worker spec — full scope locked

`project_dispatch_worker_medevac_creator_dogfood.md` updated with:
- The pain (Sean's domain dump: $17/hr dispatchers, Flight Vector Ops shows currency only, SOPs disconnected from aviation+medical, hospital calls life-critical decisions through untrained staff)
- The Sean vision ("Uber for medevac" + regulatory substrate)
- The matching intelligence factors (weather, NOTAMs, regs, aircraft type, crew experience, crew rest, mission type taxonomy NEO/trauma/scene/ICU/stroke/STEMI/ECMO/etc.)
- Real-time during transport (tracking + health monitoring to sending+receiving facilities)
- Post-transport (team rating + billing + charting + flight reporting + safety features)
- The worker family (dispatch + Aviation CoPilot + OpSpecs + medical worker + billing + legal/paralegal + future drone-transport)
- Access-equity reframe (Alaska clinic to Harborview)
- Brutal honest safety reality (Sean's lived observation matches NTSB data)
- Existing software shitshow (Flight Vector / Baldwin / Protean→Ninth Brain? / RAMCO / ForeFlight / emsCharts + state-specific charting)
- Integration phasing (manual export→import / API where exists / browser automation / direct replacement)
- HIPAA boundary at clinical-data layer (emsCharts requires BAA + audit-anchored access)
- RAAS tier mapping (Tier 0/1/2/3/4)
- Deposition Rule auditTriggers candidates (individual + batched + 4 forensic lenses)
- Sean's first prompt for Claude Code (staged)

### 3. Medevac research compiled — all 4 agent reports

`project_medevac_safety_research_compiled_2026_06_04.md` — ~10K-word reference doc covering:
- Sean's incident (anonymized, founding-myth canonical example)
- Part 135 Subpart L full breakdown (every § cited with thresholds + dates + subparagraphs)
- Part 65 Subpart C Aircraft Dispatcher (and why HEMS uses OCS instead)
- AC 135-14B (HEMS current), AC 135-15 (fixed-wing 1990 stale), AC 00-63 (HEMS Tool)
- HEMS Tool integration path (NOAA AWC, free, no API key)
- State variation — CA/TX/HI (interisland charting!)/AK (frontier carve-out)/FL/NY/WA (Harborview catchment)/WY-MT (sparse/scene-heavy)
- CAMTS 12th Ed (2022) — current standard, NOT 11th — with Std 03 Comms + Std 07 SMS + Std 09 QA detailed
- NTSB safety record — historical rates, current rates, 50-100× worse than Part 121, specific case files (CEN19FA072 Survival Flight Zaleski, ERA16FA140 Enterprise AL, CEN11FA599 Mosby MO, N127LN Hazelhurst WI, ANC14MA008 Saint Mary's AK, ANC16FA017 Angoon AK)
- 2024 NTSB recommendation calling for certificated dispatchers in all Part 135 (the regulatory wedge — not yet rule)
- HFACS frame — dispatch lives in Tier 3 Unsafe Supervision + Tier 4 Organizational Influences
- Why HEMS uniquely dangerous (mission pull, night ops, single-pilot, weather risk-taking, unimproved LZ)
- What's been tried (NVG worked, HTAWS marginal, autopilot underutilized, FRAT half-worked, OCC partially worked)
- Existing software stack integration roadmap (Flight Vector / Baldwin / RAMCO / Protean→Ninth Brain? / ForeFlight Dispatch API / emsCharts FHIR/HL7 / NOAA HEMS Tool / Spidertracks / Air Maestro / NinthBrain / Priority Dispatch ProQA)
- IAED EMD certification + MPDS protocols + how it maps to HEMS
- CMS 42 CFR 410.40 + 414.605 billing requirements + 63.5% denial rate for "insufficient documentation"
- No Surprises Act air ambulance scope
- Engineering implications (12 hard constraints ranked by enforcement teeth)
- Specific failure modes worker must catch tied to documented NTSB cases

This compiled file IS the regulatory + safety baseline for the dispatch worker build. Use as authoritative reference.

### 4. VideoCard + dogfood test route

`/sandbox/video` route now renders Sean's YouTube Short via the new VideoCard component. End-to-end YouTube embed pipe verified before press/Reddit traffic arrives.

### 5. Chain-agnostic positioning locked

`/docs/audit-trail` "Chain-agnostic by design" section + glossary `Audit chain` entry reconciled. Polygon production today, L2 EVM only (Polygon/Base/Optimism/Arbitrum), Base advantage flagged for Smart Wallet UX, no SOL, no own chain, "not a crypto company" framing. Lives in two memories (chain-agnostic principle + Base wallet advantage).

### 6. Daily housekeeping cadence locked

Two memories pinned at top of MEMORY.md:
- `feedback_daily_housekeeping_cadence` — commit + push + CODEX + Alex refresh + MEMORY.md update at every session end
- `feedback_alex_proactively_triggers_housekeeping` — Alex auto-triggers on signals (shift/sleep/wrap/see-you/heading-out), work-volume (>5 uncommitted), and time gaps. Sean is one-human-one-terminal; he shouldn't have to remind.

## Tasks captured (post-sleep work)

- #406 P0 Alex prompt refresh across ALL surfaces (the dogfood found `/creators/journey` Alex serving 2-week-stale magic-link flow)
- #407 Duplicate Alex response bug
- #404 Seed SOCIII founder cap table into IR worker
- #405 Sweep SOCIII spine workers for sample-vs-real data
- #408 dispatch-medevac-001 build via Creator Sandbox + Claude Code

## What Sean picks up post-sleep

1. **Open Claude Code in repo root.** First prompt staged in dispatch-medevac-001 memory.
2. **Review the blog post** at `apps/business/public/docs/blog/medevac-safety-case-the-system-held-because.md`. Decide whether to wire into PressPage.jsx now or polish first.
3. **Decide on Mike Lee warrant terms** (the held-back doc — par value, share count, structure).
4. **Send Kent V3 redline** (par value bug — RSPA §1(b) and CAA §2(b) say $0.0001 but Atlas Certificate IV says $0.00001).
5. **Alex prompt refresh** (#406) — if not started, queue for next session.

## Deploy verification

- Hosting: title-app-alpha.web.app ✓ (VideoCard test route live at /sandbox/video, blog post lives at /docs/blog/medevac-safety-case-the-system-held-because)
- Functions: api(us-central1) ✓ (audit trail endpoints + test-mint)
- Commits today: `65f0af2f` → `4f4497d5` → about to push S52.27 with blog + research + this CODEX

## Memory files added this session

- `project_dispatch_worker_medevac_creator_dogfood.md` (created + 3× updated)
- `project_medevac_safety_research_compiled_2026_06_04.md` (created)
- `feedback_deposition_rule_lives_in_dev_docs.md`
- `feedback_chain_agnostic_positioning.md`
- `feedback_daily_housekeeping_cadence.md`
- `feedback_alex_proactively_triggers_housekeeping.md`

All pinned at top of MEMORY.md.
