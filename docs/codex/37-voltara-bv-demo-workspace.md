# CODEX 37 — Voltara BV Demo Workspace

**Status:** SPEC — red team before build  
**Date:** 2026-07-12  
**Owner:** Sean  
**Builds on:** CODEX 29–33 (EU DPP suite specs)  
**Analogous to:** Meadow Creek Vet Clinic demo, RE demo personas (CODEX 25)

---

## What This Is and Why It Exists

The five EU DPP workers (CODEX 29–33) were specced, red-teamed, and had their canvases built. But every piece of data they display today is a frontend fixture — numbers painted directly into `DPPWorkerCanvas.jsx`. Elara can't answer a real question about Voltara's products because there are no real records to read from. The workers look right but don't function.

This CODEX creates a **standalone demo workspace for Voltara BV**: a fictional Dutch industrial battery manufacturer seeded with real Firestore records across all five DPP workers. No advisor layer, no fixture data, no canvas paint-by-numbers. The workers read from the database; Elara reasons over actual records; the demo is live.

**Why standalone, not a client record under Volta Advisory:** The demo's job is to show what SOCIII's platform does — not to showcase Elise's advisory business model. A manufacturer seeing this demo should see themselves, not an intermediary. Any viewer can decide: "I'll run this myself" or "I'll hire a Volta Advisory to do it for me." Both lead to SOCIII. The platform sells itself; the advisor relationship is one commercial option on top of it.

**Why now:** The EU DPP Central Registry opens 19 July 2026 — seven days from the date this CODEX is written. That deadline is baked into the demo narrative and makes the urgency real without any salesmanship. The calendar does the work.

---

## 1. Company Profile: Voltara BV

| Field | Value |
|-------|-------|
| Company name | Voltara BV |
| Headquarters | Amsterdam, Netherlands |
| Sector | Industrial + light mobility battery manufacturer |
| Products | Lithium-ion batteries for industrial (forklift/warehouse), LMT (e-cargo bike/scooter), and EV applications |
| EU regulatory status | Batteries in scope for EU Battery Reg 2023/1542 — passport mandatory by 18 Feb 2027 |
| Registry deadline pressure | EU DPP Central Registry opens 19 Jul 2026; Voltara wants to be first-mover registered |
| SOCIII workspace ID | `ws_voltara_demo` (idempotent — same as DEMO SPACE pattern) |

---

## 2. The Demo Narrative

Voltara BV has six battery product lines in scope for the EU Battery Regulation. The registry opens in seven days. Two products are ready; four are not. The demo shows all five workers operating on this real situation — auditing gaps, building passports, tracing supply chain, managing the registry countdown, and monitoring the batteries already deployed in the field.

The narrative arc across the five workers:

> **"We have two products ready to register on day one. Here's what's blocking the other four — and here's the plan to close the gaps before February 2027."**

This is the story every battery manufacturer in Europe is living right now. The demo makes it tangible.

---

## 3. The Six SKUs

Each SKU represents a distinct product line at a different compliance stage. Together they show the full spectrum — from ready-to-submit to just getting started.

| SKU | Product | Application | Charge State | Cluster 3 (LCA) | Overall % | Demo role |
|-----|---------|-------------|-------------|-----------------|-----------|-----------|
| VLT-IND24 | Industrial 24V 500Ah | Forklift / warehouse | 🟡 Yellow | 0% | 38% | Hard gate — C3 not initiated; Hanam Cell Corp. not submitted |
| VLT-IND48 | Industrial 48V 400Ah | Heavy forklift | 🟡 Yellow | 8% | 64% | Advancing — LCA started, Rheinwerk GmbH cert missing |
| VLT-LMT12 | LMT Module 12V 100Ah | E-cargo bike | 🟡 Yellow | 60% | 87% | Cluster 3 blocked — third-party LCA cert outstanding |
| VLT-LMT24 | LMT Module 24V 80Ah | E-scooter fleet | 🟢 Green | 80% | 95% | Most complete — LCA cert still needed to reach 100% |
| VLT-EV48 | EV Module 48V 200Ah | Light EV / micro-mobility | ⬜ Grey | 0% | 0% | EV line — BMS not connected, not yet started |
| VLT-EV72 | EV Module 72V 150Ah | Full EV | ⬜ Grey | 0% | 8% | EV line — just started, lowest priority |

**Cluster completion by SKU (the 90 attributes across 7 clusters):**

| Cluster | Topic | IND24 | IND48 | LMT12 | LMT24 | EV48 | EV72 |
|---------|-------|-------|-------|-------|-------|------|------|
| 1 | General info + ID | 90% | 100% | 100% | 100% | 0% | 55% |
| 2 | Compliance + certifications | 75% | 100% | 100% | 100% | 0% | 0% |
| 3 | Carbon footprint (LCA) **hard gate** | **0%** | 8% | 60% | 80% | 0% | 0% |
| 4 | Supply chain due diligence | 30% | 65% | 95% | 100% | 0% | 0% |
| 5 | Battery materials + composition | 20% | 70% | 95% | 100% | 0% | 0% |
| 6 | Circularity + resource efficiency | 0% | 40% | 90% | 100% | 0% | 0% |
| 7 | SoH + durability (lifecycle) | 0% | 55% | 85% | 100% | 0% | 0% |

---

## 4. The Supplier Network + Multilingual Demo

Four suppliers cover Voltara's component sourcing. They are at different stages of data submission. Each supplier submits data in their own language — and the platform handles all of it. This is the multilingual demo in a single screen.

| Supplier | HQ | Portal language | Materials covered | Products supplied | Status |
|----------|-----|----------------|-------------------|-------------------|--------|
| Zhenghe Celltech Co. | Ningde, China | **Mandarin (ZH)** | Cell (EV modules) | VLT-EV48, VLT-EV72 | ✅ Connected + verified |
| Hanam Cell Corp. | Suwon, South Korea | **Korean (KO)** | Cell (Industrial) | VLT-IND24, VLT-IND48 | ⏳ Invited — not yet submitted |
| ShinPower Corp. | Seoul, South Korea | **Korean (KO)** | Cell (LMT modules) | VLT-LMT12, VLT-LMT24 | ✅ Connected, cert renewal pending Nov 2026 |
| Rheinwerk GmbH | Ludwigshafen, Germany | **German (DE)** | Electrolyte + cathode | VLT-IND24, VLT-IND48, VLT-LMT12, VLT-LMT24 | ⚠️ Partial — conflict minerals cert missing |

**Voltara BV (the client):** Dutch (NL) — client-facing reports and canvas labels delivered in Dutch.  
**Platform/Elara interface:** English (EN) — base language for the advisor and platform chrome.

**Five languages in one demo workspace: English · Dutch · Mandarin · German · Korean.**

The supplier portal UI renders in the supplier's language. Elara operates in English regardless. Generated passport JSON-LD and status reports stay in English for the demo pass (CODEX 34). This is the CODEX 34 localization architecture in action — one platform, five languages, zero manual translation by the advisor.

**Korean is a new scope not yet in CODEX 34** — Hanam Cell Corp. and ShinPower add KO as a required supplier portal language. CODEX 34 amendment needed before build.

The Hanam Cell Corp. non-submission is what's holding VLT-IND24 and VLT-IND48 at low Cluster 4+5 coverage. The Rheinwerk GmbH cert gap is holding both IND48 and LMT12 at partial Cluster 3. ShinPower is connected and verified — their submission feeds VLT-LMT12 and VLT-LMT24 data automatically.

---

## 5. What Each Worker Sees and Can Do

### Worker 1 — Compliance Auditor (`eu-battery-dpp-001`)
**Reads:** `dppProducts/{sku}` with full cluster breakdown per attribute  
**Can do:** Elara answers "what's missing for VLT-IND24?" with Cluster 3 not initiated + Hanam Cell Corp. data gap. Answers "which SKU is closest to registration?" with VLT-LMT24 (95%, C3=80%). Generates a full status report on demand.  
**Demo moment:** Ask Elara which SKU is furthest from compliance. She identifies VLT-EV48/EV72 as not started, and VLT-IND24 as the highest-priority industrial SKU that's blocked — Cluster 3 never initiated, Hanam Cell Corp. hasn't submitted data yet.

### Worker 2 — Passport Builder (`eu-passport-builder-001`)
**Reads:** Same `dppProducts` + cluster data  
**Can do:** Shows all 6 SKUs in generation status — VLT-LMT12 and VLT-LMT24 as "Cluster 3 blocked" (C3 at 60% and 80% respectively), IND24 and IND48 as "Data in progress" (C3 at 0% and 8%). Tab 2 (Passport Preview) renders even for blocked SKUs.  
**Demo moment:** Try to generate VLT-LMT12's passport. Elara refuses — "Cluster 3 is at 60% — I need the third-party LCA certificate to unlock passport generation." She shows exactly what's outstanding. This proves the rules engine is real: not a UI toggle, a hard RAAS enforcement.

### Worker 3 — Supply Chain Tracer (`eu-supply-chain-tracer-001`)
**Reads:** `dppSuppliers/` + supplier→product relationships  
**Can do:** Shows all 4 suppliers — Zhenghe Celltech (EV lines, verified), ShinPower Corp. (LMT lines, connected), Hanam Cell Corp. (Industrial lines, invited/not submitted), Rheinwerk GmbH (all lines, partial cert). Flags Rheinwerk conflict minerals cert as the specific gap.  
**Demo moment:** Ask what happens when Hanam Cell Corp. submits. Elara explains their data flows automatically to both VLT-IND24 and VLT-IND48 passports — one supplier submission, two passports' Clusters 4+5 satisfied. This is the network effect that makes the platform defensible.

### Worker 4 — Registry Manager (`eu-registry-manager-001`)
**Reads:** `dppRegistryStatus/` + product readiness  
**Can do:** Shows 7-day countdown to 19 Jul from a real date calculation (not hardcoded). Shows VLT-IND24 as queued for day-one submission. Shows the allowlist application status.  
**Demo moment:** "What happens on July 19th?" Elara describes the submission sequence for VLT-IND24, what the QR code will look like, and what Voltara needs to do before then.

### Worker 5 — Lifecycle Monitor (`eu-lifecycle-monitor-001`)
**Reads:** `dppFleet/` with BMS connection status and SoH per SKU  
**Can do:** Shows live SoH for IND24 (94%, 23 units in field) and IND48 (88%, 41 units). Shows LMT lines in yellow (SoH 79% and 71% — amendment pending). Shows EV lines as BMS-not-connected.  
**Demo moment:** Ask about the LMT12 fleet. Elara flags that 67 units are at 79% SoH — approaching the 80% repurposing threshold — and that a passport amendment is pre-drafted and waiting for approval.

---

## 6. Firestore Data Model

All records live under Voltara BV's tenant (`tenantId: "ws_voltara_demo"`).

### Collection: `dppProducts`
One document per SKU. Fields:
```
{
  sku: "VLT-IND24",
  name: "Industrial 24V 500Ah",
  application: "Forklift / warehouse",
  category: "Industrial",
  overallPct: 38,              // matches canvas fixture — C3=0% makes it blocked
  chargeColor: "yellow",
  clusters: {
    c1: { pct: 90, name: "General battery & manufacturer information", total: 12 },
    c2: { pct: 75, name: "Compliance, labels & certifications",        total: 8  },
    c3: { pct: 0,  name: "Battery carbon footprint (LCA)",              total: 15, note: "LCA not initiated — hard gate" },
    c4: { pct: 30, name: "Supply chain due diligence",                 total: 18 },
    c5: { pct: 20, name: "Battery materials & composition",            total: 14 },
    c6: { pct: 0,  name: "Circularity & resource efficiency",          total: 10 },
    c7: { pct: 0,  name: "Performance & durability (SoH)",             total: 13 },
  },
  passportStatus: "blocked",   // blocked | draft | registered
  registryId: null,
  tenantId: "ws_1783763627546_mv3rpx"
}
```

**Enum alignment (CODEX 30 canonical):** `passportStatus` values: `blocked` (C3 < 100% or other hard gate) | `draft` (generation-eligible, C3 complete, not yet submitted) | `registered` (registry ID assigned). The "ready" and "generating" values from earlier drafts are not used.

### Collection: `dppSuppliers`
One document per supplier. Fields:
```
{
  supplierId: "hanam-kr-a",
  name: "Hanam Cell Corp.",
  country: "KR",
  language: "KO",
  status: "invited",           // verified | partial | invited | pending
  products: ["VLT-IND24", "VLT-IND48"],
  certExpiry: null,
  tenantId: "ws_1783763627546_mv3rpx"
}
```

**Enum alignment:** `dppSuppliers.status` values: `verified` (submitted + cert valid) | `partial` (submitted, cert issue) | `invited` (portal access sent, not yet submitted) | `pending` (pre-invitation).

### Collection: `dppRegistryStatus`
One document per workspace (doc ID = tenantId). Fields:
```
{
  tenantId: "ws_1783763627546_mv3rpx",
  allowlistStatus: "applied",  // not_applied | applied | approved
  registryGoLive: "2026-07-19",
  submissionQueue: [],         // no SKUs ready to queue yet — all C3-blocked
  registered: [],
  lastSync: null
}
```

### Collection: `dppFleet`
One document per SKU in the field. Fields:
```
{
  sku: "VLT-LMT12",
  name: "LMT Module 12V 100Ah",
  category: "LMT",
  unitsDeployed: 67,
  sohPct: 79,
  sohColor: "yellow",
  cycleCount: 1103,
  ratedCycles: 1500,           // LMT rated cycles (not 2000 — that is Industrial/EV)
  bmsStatus: "live",           // live | stale | Disconnected
  lastPull: "3 hours ago",
  sohTrend: "-0.6%/mo",
  amendmentPending: true,
  amendmentNote: "SoH at 79% — approaching 80% repurposing threshold",
  tenantId: "ws_1783763627546_mv3rpx"
}
```

**⚠ LMT SoH threshold open flag:** The 80% SoH repurposing threshold is confirmed for EV-classified batteries under CODEX 33 Rule 2. Whether this same threshold applies to LMT-classified batteries is **not yet confirmed** — it may differ by regulation. The seed data flags VLT-LMT12 (79%) as "approaching threshold" and VLT-LMT24 (71%) as "second-life" based on the EV rule applied by analogy. Elise should confirm the LMT threshold with her EU regulatory counsel before Worker 5's LMT scenario is built as authoritative. The RAAS ruleset (`eu_battery_dpp_v1.json`, rule `dpp-ev-soh-threshold`) already instructs Elara to flag this uncertainty rather than state it as fact.

---

## 7. Build Steps

**✅ DONE (2026-07-12):**
1. `/tmp/seedVoltaraBV.js` written and executed — idempotent, explicit overwrite (this is a sandbox reset, not an append-only ledger operation). Seeded: `dppProducts` (6 docs), `dppSuppliers` (4 docs), `dppRegistryStatus` (1 doc), `dppFleet` (6 docs) under tenant `ws_1783763627546_mv3rpx`.
2. Five `workerOwnData.js` builder functions wired — chat reads from Firestore, not fixtures.
3. RAAS ruleset `eu_battery_dpp_v1.json` deployed — 8 anti-hallucination rules enforced at chat layer.
4. `BUNDLE_SHAPES` + `WORKER_RULESET_MAP` updated — sibling injection and rule loading active.
5. DPP workers created in Firestore with `status: "active"` — sibling query now finds them.

**Still open:**
- Wire Workers 1–5 canvas to read from Firestore instead of `DPPWorkerCanvas.jsx` fixtures (canvas currently uses hardcoded arrays; chat is grounded, canvas is not). Do this after the demo.
- Verify Elara can answer 5 real questions (one per worker) before marking complete.

---

## 8. Demo Scenarios (What to Show)

**Opening (30 seconds):** Open Voltara BV workspace. Worker 1 dashboard shows the charge bar grid — two green, two yellow, two grey. The 19 Jul countdown is live in Worker 4. No explanation needed. The canvas does the talking.

**The hard gate (1 minute):** Switch to Worker 2. Click "Generate Passport" on VLT-LMT12. Elara refuses. Shows exactly what Cluster 3 needs. This proves the rules engine is real — AI can't bypass compliance requirements.

**The supply chain story (1 minute):** Switch to Worker 3. Show ShinPower Corp. as verified (LMT lines already fed), Hanam Cell Corp. as invited but not submitted (blocking IND lines), Rheinwerk GmbH as partial cert (Cluster 3 blocker across all lines). Ask Elara: "What happens when Hanam submits?" She explains the fan-out — one supplier submission, VLT-IND24 + VLT-IND48 Clusters 4+5 satisfied automatically. This is the network effect that makes the platform defensible.

**The urgency close (30 seconds):** Switch to Worker 4. Registry opens in 7 days. VLT-IND24 is queued. Everything is real — the date, the readiness status, the submission plan. No theatre.

**The ongoing relationship (1 minute):** Switch to Worker 5. Show the LMT12 fleet at 79% SoH. Amendment pre-drafted, waiting for approval. This is why the client stays subscribed after registration — the passport is a living document, not a one-time filing.

---

## 9. Sign-off Gate

**Seed + data:**
- [x] Seed script runs idempotently without errors (executed 2026-07-12)
- [x] 6 dppProducts, 4 dppSuppliers, 1 dppRegistryStatus, 6 dppFleet seeded under `ws_1783763627546_mv3rpx`

**Chat grounding (Elara must cite real records, not fabricate):**
- [ ] Elara can answer "what's missing for VLT-IND48?" with the Rheinwerk GmbH conflict minerals cert gap
- [ ] Elara can answer "what's holding up VLT-IND24?" with Cluster 3 at 0% + Hanam Cell Corp. not submitted
- [ ] Elara refuses to say VLT-IND24 is "EU compliant" (passportStatus = "blocked", not "registered")
- [ ] Elara names the LMT12 SoH threshold as "approaching 80%" and flags that the LMT threshold is pending regulatory confirmation (not just states it as fact)
- [ ] Elara knows Hanam Cell Corp.'s non-submission affects both VLT-IND24 and VLT-IND48

**Canvas:**
- [ ] All 6 SKUs visible in Worker 1 canvas with correct charge bar states
- [ ] Worker 2 shows VLT-IND24 as generation-blocked (Cluster 3 = 0%)
- [ ] Tab 2 Preview renders for Cluster-3-blocked SKUs (shows what passport will look like)
- [ ] Worker 4 countdown shows a real calculated date (not hardcoded "8 days")
- [ ] Worker 5 shows LMT12 amendment as pending, not empty state

**Minting + TEST MODE (pre-19 Jul):**
- [ ] QR code on any submitted passport shows TEST MODE banner + disabled download before 19 Jul 2026
- [ ] Attempting `dpp:submit` on an eligible SKU shows minting fee (€75) reserved before registry call

**Open gap (post-demo):**
- [ ] Canvas reads from Firestore instead of `DPPWorkerCanvas.jsx` hardcoded arrays
