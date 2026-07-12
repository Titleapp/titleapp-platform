# CODEX 33 — EU Lifecycle Monitor: BMS Direct + Ongoing Passport Updates

**Status:** SPEC — Platform tier (requires BMS API access from battery manufacturer)  
**Suite:** EU DPP · Worker 5 of 5  
**Slug:** `eu-lifecycle-monitor-001`  
**Regulation anchor:** EU Battery Regulation 2023/1542, Annex XIII Cluster 7 (performance & durability); Articles 14–15 (SoH reporting obligations)  
**Phase:** Post-registration, ongoing (the passport is a living document)

---

## 1. What This Worker Does

A Digital Battery Passport is not a one-time submission — it must be updated as the battery ages. Cluster 7 (performance & durability) requires ongoing reporting of State of Health (SoH), charge cycle count, and degradation data. The Lifecycle Monitor connects directly to the battery management system (BMS) deployed in the field, pulls live telemetry, and keeps the registered passport current automatically.

This is the highest-value SOCIII moat in the DPP suite: it transforms the platform from a compliance filing tool into an ongoing data relationship with physical batteries in the field. It is also the core of the Platform subscription tier — the client pays monthly because the data keeps flowing.

**Why this is defensible:** The BMS connection requires technical integration with the battery manufacturer's hardware and firmware team. Once established, it is extremely sticky — migrating to a different platform would require re-establishing the BMS connection, which is expensive and risky for the manufacturer.

---

## 2. Worker Identity

| Field | Value |
|-------|-------|
| Slug | `eu-lifecycle-monitor-001` |
| Worker name | Lifecycle Monitor |
| Vertical | `unassigned` |
| Suite | `EU DPP` |
| Persona name | Elara |
| Anchor | BMS API endpoint per battery product line |
| Catalog listing | "Connects directly to battery management systems to pull live State of Health and performance data. Automatically updates registered EU passports as batteries age — turning compliance into a continuous, automated process." |

---

## 3. Canvas Tabs

### Tab 1 — Live Battery Fleet
- One row per connected battery product
- Real-time SoH % (color-coded: green >80%, yellow 60–80%, red <60%)
- Charge cycle count vs. rated cycle life
- Last telemetry pull timestamp
- BMS connection status: Live / Stale / Disconnected

### Tab 2 — SoH Trends
- Per product: SoH trend chart over time (weeks/months)
- Degradation rate vs. manufacturer specification
- Projected end-of-life date
- Repurposing flag: SoH < 80% for EV use → eligible for second-life industrial/LMT use (regulatory pathway exists in EU Battery Regulation)

### Tab 3 — Passport Update Queue
- Lifecycle events that require a passport amendment (SoH milestone, repurposing event, capacity change)
- Pre-drafted amendment for advisor review
- One-click submit to EU Registry Manager (Worker 4)
- Audit trail: all amendments with before/after values

### Tab 4 — BMS Connections
- Per product: BMS API endpoint, authentication status, polling frequency
- Connection setup wizard: endpoint URL → test pull → map fields → activate
- Data field mapping: BMS proprietary format → Cluster 7 standard attributes (SoH %, charge cycles, capacity kWh, degradation mode)
- Alert configuration: notify advisor when SoH drops below threshold

### Tab 5 — Second-Life Tracker
- Batteries approaching or below 80% SoH (EV second-life threshold per EU Battery Reg)
- Repurposing workflow: initiate second-life passport (new product identity, new passport ID)
- Second-life market connections: battery recyclers, second-life integrators, EU-registered refurbishers
- **Open decision (red team finding):** "second-life market connections" must be scoped before building. Two distinct models: (a) **informational only** — display a curated list of registered refurbishers, no commercial relationship; or (b) **referral/marketplace** — SOCIII receives a fee when a Volta Advisory client connects with a recycler. If (b), this is a new monetization pattern requiring Sean's explicit go-ahead, reseller terms, and its own revenue accounting. Do not build Tab 5's connection layer until this decision is made.

---

## 4. RAAS Rules

1. **SoH amendment threshold** — RAAS triggers a passport amendment when SoH drops more than 10% since last registered value
2. **Repurposing alert** — SoH < 80% for EV-classified batteries fires a mandatory EU compliance alert (repurposing or retirement must be documented). Regulatory basis: EU Battery Reg 2023/1542, Article 14 (passport update obligations upon "significant change in relevant characteristics") and Annex XIII Cluster 7 (SoH reporting). **Hedge:** the specific 80% SoH threshold as the repurposing trigger is the Battery Pass Consortium's current interpretation; the regulation itself sets the mandatory *reporting* obligation but the precise threshold may evolve via implementing acts before 2027. Monitor ESPR Working Plan updates.
3. **Data freshness** — if BMS data is >30 days stale, RAAS flags the product as "Stale — passport may be non-compliant"
4. **Amendment approval gate** — lifecycle amendments are prepared by the worker but require advisor review before submission (same approval model as status reports in the Compliance Auditor)
5. **End-of-life notification** — when battery reaches manufacturer's rated end-of-life cycle count, RAAS fires a mandatory decommission or repurposing notification

---

## 5. API Surface

- `POST /v1/dpp:update` — append lifecycle event to a registered passport (triggers Registry Manager)
- `GET /v1/dpp:status` — return current SoH and telemetry for a passport ID
- New: `POST /v1/bms:connect` — register a BMS API endpoint for a product
- New: `GET /v1/bms:pull` — trigger an on-demand telemetry pull from a connected BMS

---

## 6. Build Prerequisites

- BMS API integration per manufacturer (custom per client — no standard BMS API exists; requires manufacturer cooperation). **Scalability flag (red team finding):** the Platform-tier sales pitch in §8 promises "no manual effort" and implies automated scale, but each BMS integration is bespoke. The pitch is accurate for a single established client (e.g. Voltara after integration is complete), but should not be used with HOPPECKE or FIAMM until a Voltara integration is live and the field-mapping layer has been validated. Do not imply automated BMS connectivity to prospects who haven't yet commissioned their own BMS adapter.
- **EU data residency (Firestore EU-region)** — required before live battery telemetry is stored; SoH data tied to deployed physical assets is EU-regulated at the product level
- Field mapping layer: BMS proprietary → Cluster 7 standard attributes
- `POST /v1/bms:connect` and `GET /v1/bms:pull` route implementations
- EU registry amendment API (requires Registry Manager to be live first)
- Webhook or scheduled job for periodic BMS polling (Cloud Scheduler or Firestore TTL trigger)

---

## 7. Build Steps

1. Implement `POST /v1/bms:connect` — store BMS endpoint + credentials per product
2. Implement `GET /v1/bms:pull` — generic BMS poll with field mapping
3. Build Voltara-specific BMS adapter (first live integration, proof of concept)
4. Build Live Battery Fleet tab — real-time SoH display
5. Build SoH trend calculation + chart
6. Wire RAAS amendment threshold alert → Passport Update Queue
7. Build second-life detection logic (SoH < 80% → flag + workflow)
8. Wire Registry Manager (Worker 4) for amendment submission

---

## 8. The Platform Subscription Argument

When pitching the Platform tier to Voltara (after BMS integration is live — see §6 scalability flag):

> "The first three workers get you registered by February 2027. The Lifecycle Monitor is why you stay. Every month, your passport automatically reflects your battery's actual performance — no manual effort, no compliance risk from stale data. And when a battery hits 80% SoH, we flag it for second-life repurposing, which is its own revenue stream. The platform pays for itself."

This is the recurring revenue moat. Advisory (Workers 1–4) is a project. Lifecycle monitoring (Worker 5) is a subscription.

**Reseller economics caveat:** The specific pricing for the Platform tier (e.g. €1,490/month referenced in earlier discussions) reflects illustrative positioning only. Revenue split and margin terms between SOCIII and Volta Advisory / Elise are **not yet agreed**. Do not treat any quoted price as settled in proposals to Voltara or other clients until Sean/SOCIII and Elise have confirmed the reseller terms in writing.
