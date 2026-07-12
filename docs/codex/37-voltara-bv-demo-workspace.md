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
| VLT-IND24 | 24V Industrial Li-ion | Forklift / warehouse | 🟢 Green | 100% | 94% | The win — ready to submit day one |
| VLT-IND48 | 48V Industrial Li-ion | Heavy forklift | 🟡 Yellow | 85% | 78% | Almost there — blocked by one missing supplier cert |
| VLT-LMT12 | 12V LMT Li-ion | E-cargo bike | 🟡 Yellow | 0% | 62% | Hard gate — Cluster 3 at zero, passport generation blocked |
| VLT-LMT24 | 24V LMT Li-ion | E-scooter fleet | 🟡 Yellow | 0% | 55% | Hard gate — same Cluster 3 block |
| VLT-EV48 | 48V EV Li-ion | Light EV / micro-mobility | ⬜ Grey | 0% | 28% | EV line — BMS not connected, LCA not started |
| VLT-EV72 | 72V EV Li-ion | Full EV | ⬜ Grey | 0% | 14% | EV line — just started, lowest priority |

**Cluster completion by SKU (the 90 attributes across 7 clusters):**

| Cluster | Topic | IND24 | IND48 | LMT12 | LMT24 | EV48 | EV72 |
|---------|-------|-------|-------|-------|-------|------|------|
| 1 | General info + ID | 100% | 100% | 100% | 100% | 100% | 80% |
| 2 | Cell chemistry + electrochemical | 100% | 95% | 90% | 85% | 70% | 40% |
| 3 | Carbon footprint (LCA) | 100% | 85% | 0% | 0% | 0% | 0% |
| 4 | Supply chain due diligence | 90% | 75% | 60% | 55% | 20% | 10% |
| 5 | Battery materials + composition | 95% | 80% | 65% | 60% | 25% | 10% |
| 6 | Safety + performance | 100% | 100% | 95% | 90% | 80% | 50% |
| 7 | SoH + durability (lifecycle) | 95% | 85% | 70% | 65% | 0% | 0% |

---

## 4. The Supplier Network + Multilingual Demo

Four suppliers cover Voltara's component sourcing. They are at different stages of data submission. Each supplier submits data in their own language — and the platform handles all of it. This is the multilingual demo in a single screen.

| Supplier | HQ | Portal language | Materials covered | Products supplied | Status |
|----------|-----|----------------|-------------------|-------------------|--------|
| Zhenghe Celltech Co. | Ningde, China | **Mandarin (ZH)** | Cell chemistry, electrodes | VLT-IND24, VLT-IND48 | ✅ Submitted + verified |
| Hanam Cell Corp. | Suwon, South Korea | **Korean (KO)** | Cell chemistry, electrolyte | VLT-LMT12, VLT-LMT24 | ✅ Submitted, cert pending renewal |
| ShinPower Corp. | Seoul, South Korea | **Korean (KO)** | Cell assembly, BMS | VLT-EV48, VLT-EV72 | ⏳ Invited — not yet submitted |
| Rheinwerk GmbH | Ludwigshafen, Germany | **German (DE)** | Lithium, cobalt, manganese | VLT-IND48 (partial) | ⚠️ Partial — conflict minerals cert missing |

**Voltara BV (the client):** Dutch (NL) — client-facing reports and canvas labels delivered in Dutch.  
**Platform/Elara interface:** English (EN) — base language for the advisor and platform chrome.

**Five languages in one demo workspace: English · Dutch · Mandarin · German · Korean.**

The supplier portal UI renders in the supplier's language. Elara operates in English regardless. Generated passport JSON-LD and status reports stay in English for the demo pass (CODEX 34). This is the CODEX 34 localization architecture in action — one platform, five languages, zero manual translation by the advisor.

**Korean is a new scope not yet in CODEX 34** — Hanam Cell Corp. and ShinPower add KO as a required supplier portal language. CODEX 34 amendment needed before build.

The Rheinwerk GmbH gap is what's holding VLT-IND48 at 78% instead of 100%. The ShinPower Corp. non-submission is what's blocking EV lines from Cluster 4+5 data.

---

## 5. What Each Worker Sees and Can Do

### Worker 1 — Compliance Auditor (`eu-battery-dpp-001`)
**Reads:** `dppProducts/{sku}` with full cluster breakdown per attribute  
**Can do:** Elara answers "what's missing for VLT-LMT12?" with a specific attribute-level gap list. Answers "which SKUs are ready for registration?" with VLT-IND24 as the answer. Generates a status report on demand.  
**Demo moment:** Ask Elara why VLT-LMT24 is blocked. She identifies Cluster 3 at 0% and names the specific missing attributes (LCA report, carbon intensity per kWh, recycled content %).

### Worker 2 — Passport Builder (`eu-passport-builder-001`)
**Reads:** Same `dppProducts` + cluster data  
**Can do:** Shows VLT-IND24 as generation-ready. Attempts `dpp:generate` on VLT-LMT12 and RAAS hard-gates it (Cluster 3 = 0%). Tab 2 (Passport Preview) is always available even for gated SKUs.  
**Demo moment:** Try to generate VLT-LMT12's passport. Elara refuses — "Cluster 3 carbon footprint data is required before I can generate this passport" — and shows exactly what's needed to unblock it.

### Worker 3 — Supply Chain Tracer (`eu-supply-chain-tracer-001`)
**Reads:** `dppSuppliers/` + supplier→product relationships  
**Can do:** Shows Zhenghe Celltech as fully verified. Flags Rheinwerk GmbH conflict minerals cert as the specific gap blocking VLT-IND48. Shows ShinPower Corp. as invited but not submitted.  
**Demo moment:** Ask what happens when ShinPower Corp. submits. Elara explains their data will flow automatically to both EV SKU passports — one submission, two passports satisfied.

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
  name: "24V Industrial Li-ion",
  application: "forklift",
  overallPct: 94,
  clusters: {
    c1: { pct: 100, attributes: { ... } },
    c2: { pct: 100, attributes: { ... } },
    c3: { pct: 100, lcaReport: "gs://voltara/lca/ind24.pdf", carbonIntensity: 42.3 },
    c4: { pct: 90, attributes: { ... } },
    c5: { pct: 95, attributes: { ... } },
    c6: { pct: 100, attributes: { ... } },
    c7: { pct: 95, sohRated: 2000, sohCurrent: 94 }
  },
  passportStatus: "ready",   // ready | generating | blocked | registered
  registryId: null,          // populated on registration
  createdAt: ...,
  updatedAt: ...
}
```

### Collection: `dppSuppliers`
One document per supplier. Fields:
```
{
  supplierId: "zhenghe-bv-nl",
  name: "Zhenghe Celltech (Rotterdam)",
  status: "verified",        // verified | pending | invited | partial
  submittedAt: ...,
  products: ["VLT-IND24", "VLT-IND48"],
  attributes: { ... },       // the actual cluster 4+5 data they submitted
  certExpiry: "2027-03-15"
}
```

### Collection: `dppRegistryStatus`
One document for the workspace. Fields:
```
{
  tenantId: "ws_voltara_demo",
  allowlistStatus: "applied",   // not_applied | applied | approved
  registryGoLive: "2026-07-19",
  submissionQueue: ["VLT-IND24"],
  registered: [],
  lastSync: null
}
```

### Collection: `dppFleet`
One document per SKU in the field. Fields:
```
{
  sku: "VLT-LMT12",
  unitsDeployed: 67,
  sohPct: 79,
  sohColor: "yellow",
  cycleCount: 1240,
  ratedCycles: 2000,
  bmsStatus: "live",         // live | stale | not_connected
  lastPull: ...,
  amendmentPending: true,
  amendmentDraft: { ... }    // pre-drafted amendment for advisor approval
}
```

---

## 7. Build Steps

1. Write `/tmp/seedVoltaraBV.js` — idempotent seed script (same pattern as `seedVault.js`, `createDemoSpace.js`)
2. Script creates or overwrites: `dppProducts` (6 docs), `dppSuppliers` (4 docs), `dppRegistryStatus` (1 doc), `dppFleet` (6 docs)
3. Creates workspace tenant record `tenants/ws_voltara_demo` if not present
4. Adds `ws_voltara_demo` to Sean's demo account workspaces so it's accessible in the app
5. Wire Workers 1–5 to read from these collections instead of canvas fixtures — RAAS `getCtx` already extracts `tenantId`; the handlers need to query `dppProducts` by `tenantId`
6. Verify Elara can answer 5 real questions (one per worker) before marking complete

---

## 8. Demo Scenarios (What to Show)

**Opening (30 seconds):** Open Voltara BV workspace. Worker 1 dashboard shows the charge bar grid — two green, two yellow, two grey. The 19 Jul countdown is live in Worker 4. No explanation needed. The canvas does the talking.

**The hard gate (1 minute):** Switch to Worker 2. Click "Generate Passport" on VLT-LMT12. Elara refuses. Shows exactly what Cluster 3 needs. This proves the rules engine is real — AI can't bypass compliance requirements.

**The supply chain story (1 minute):** Switch to Worker 3. Show Zhenghe Celltech as verified, Rheinwerk GmbH as partial, ShinPower as not yet submitted. Ask Elara: "What happens when LG submits?" She explains the fan-out — one submission, two passports satisfied. This is the network effect that makes the platform defensible.

**The urgency close (30 seconds):** Switch to Worker 4. Registry opens in 7 days. VLT-IND24 is queued. Everything is real — the date, the readiness status, the submission plan. No theatre.

**The ongoing relationship (1 minute):** Switch to Worker 5. Show the LMT12 fleet at 79% SoH. Amendment pre-drafted, waiting for approval. This is why the client stays subscribed after registration — the passport is a living document, not a one-time filing.

---

## 9. Sign-off Gate

- [ ] Seed script runs idempotently without errors
- [ ] All 6 SKUs visible in Worker 1 canvas with correct charge states
- [ ] `dpp:generate` on VLT-LMT12 is rejected by RAAS (Cluster 3 = 0%)
- [ ] Elara can answer "what's missing for VLT-IND48?" with the Rheinwerk GmbH cert gap
- [ ] Worker 4 countdown shows a real calculated date, not a hardcoded string
- [ ] Worker 5 shows LMT12 fleet amendment as pending, not as an empty state
- [ ] No canvas fixtures remain — all data reads from Firestore
