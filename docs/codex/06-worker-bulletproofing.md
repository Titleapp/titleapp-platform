# CODEX Surface 6 — Worker Bulletproofing (make the 3–5 clients' workers really work)

**Status:** ⚪ ongoing · **Owner:** Sean · 2026-06-22
**Bar:** for 50 educators / 350 distributors, "this shit has to work." Depth over breadth —
curate the portfolio (Ruthie / Elise / Sean), don't open the floodgates.

---

## Objective
The handful of workers the 3–5 core clients actually depend on are **reliable, grounded, and
record-true** — no fabricated data, no "No response received," no fixtures masquerading as real.

## What's built vs. the gap
**Built:** the worker set exists (aviation, RE/title/parcel/zoning, Shopify+DPP, vet/edu suite:
VET-003 / EDU-001 / SPINE-4). Data-driven canvas renderer (#31). Live ATTOM, live Vault writes
in progress.
**The recurring gap (from junk-code memory + audit):** fabrication-by-fixture, render-time sample
data instead of seeded real records, duplicate chat handlers, sticky `dev_discovery` causing
"No response received," 3 sources of truth for the active worker (#36/#43).

## Client × "bulletproof =" (from 100-DAY §2)
| Client | Workers | Bulletproof = |
|---|---|---|
| U of H (Ruthie) | EDU-001 | real students, tamper-evident records, cohort live |
| Elise | Shopify + DPP + returns | connector actually works end-to-end |
| Scott / BuildSF | RE (title/parcel/zoning) | live per-address data, advisor agreement signed ✓ |
| Sean | Aviation + RE + IR/83(b) | aviation suite + RE + IR really work |
| Dr. Chen (DEMO) | vet/edu suite | scripted, demo-grade only — not a client |

## Turn-on tasks
- [ ] **T1 — Kill fabrication-by-fixture.** Replace render-time `sampleData.js` fallbacks with
      seeded real records in the demo space + per client (#70, #60).
- [ ] **T2 — One active-worker source of truth + one render mount** (#36/#43 — overlaps Surface 1/2).
- [ ] **T3 — Chat reliability** — the `dev_discovery` / field-split root cause is fixed; keep the
      15-min canary green (chat-reliability memory).
- [ ] **T4 — Live Vault writes** — workers mint + append real DTC/logbook (education + aviation +
      RE) (#60), so records are true, not fixtures.
- [ ] **T5 — Per-client smoke test** before each weekly win: run the client's actual workflow
      end-to-end, no fabrication, canvas renders real data.
- [ ] **T6 — knip / dead-code sweep** (#39) so junk doesn't reintroduce discontinuities.

## RED TEAM
- 🟠 **RT1 — "Bulletproofing" turns into endless polish** with no ship. **Mitigation:** scope to the
  *specific workflow each client demos/uses*, not the whole worker. T5 is the gate, not perfection.
- 🟠 **RT2 — Fixtures sneak back** as "just for the demo" and become the fabrication bug again.
  **Mitigation:** demo space uses **seeded real records** (#70), not render-time fixtures; fixtures
  are a code smell flagged in review.
- 🟠 **RT3 — Concentration risk** (P3): 3–5 clients, relationship-held. One churn craters the story.
  **Mitigation:** get real usage + records *into* SOCIII so it's sticky; document each as a
  referenceable case.
- 🟡 **RT4 — Fast iteration (Surface 3) edits a worker into breakage.** **Mitigation:** Surface 3's
  preview + approval + rollback; T5 smoke test after any change.

## Sign-off gate
Each client's demoed/used workflow runs end-to-end on **real seeded records** with no fabrication
and clean canvas render, before that client is announced as a weekly win.
