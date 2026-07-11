# CODEX 29 — EU Battery Passport Worker: Elise's DPP Advisory Practice

**Status:** SPEC — ready to build  
**Date:** 2026-07-10  
**Creator:** Elise — TRAITLY (EU entity, licenses from SOCIII)  
**Regulation anchor:** EU Battery Regulation 2023/1542 · ESPR 2024/1781  
**Hard deadline:** 18 February 2027 (full Battery Passport mandatory, no exceptions)

---

## 1. Context

Elise runs **TRAITLY**, a Netherlands-based EU market entry advisory firm. TRAITLY **licenses this worker from SOCIII** (inherent in the worker build — Elise creates it on the SOCIII platform, which establishes the license relationship). TRAITLY then sells Battery Passport compliance services to EU battery manufacturers, with the SOCIII worker as the delivery substrate.

**Why batteries first:** The EU Battery Regulation (2023/1542) mandates that from 18 February 2027, all EV, industrial (>2kWh), and LMT batteries must have a registered Digital Battery Passport accessible via QR code. The EU DPP Central Registry goes live 19 July 2026. No passport = no EU market access. This is a hard legal requirement, not a voluntary initiative.

**Elise's launch client:** Battlink (NL)  
**Pipeline:** HOPPECKE (DE), FIAMM (IT), WETAC (NL)

---

## 2. Worker Identity

| Field | Value |
|-------|-------|
| Slug | `eu-battery-dpp-001` |
| Worker name | EU Battery Passport Advisor |
| Vertical | `compliance` |
| Suite | `EU DPP` |
| Persona name | Elara |
| Anchor | Battery product (one product line = one passport record) |
| Catalog listing | "EU Battery Passport compliance workspace — tracks 90 mandatory attributes, generates registry-ready passport drafts, and manages advisory client pipeline ahead of the Feb 2027 deadline." |

---

## 3. Canvas Tabs

### Tab 1 — Dashboard
- Client roster with compliance % per client
- Live countdown: days to 18 Feb 2027
- EU DPP Central Registry status
- Revenue pipeline summary

**KPI row:** Active clients · Avg compliance score · Passports registered · Open data gaps

### Tab 2 — Battery Passport Builder
The 90 mandatory Battery Pass Consortium attributes across 7 clusters. Per attribute:
- Status: Collected / In Review / Missing / Waived
- Data value + source + certificate reference
- Required format (text, numeric, kg CO₂ eq/kWh, %, ISO 8601, etc.)

**7 clusters:**
1. General battery & manufacturer information
2. Compliance, labels & certifications
3. Battery carbon footprint (third-party verified)
4. Supply chain due diligence (cobalt, lithium, nickel, graphite)
5. Battery materials & composition
6. Circularity & resource efficiency
7. Performance & durability (SoH, charge cycles, degradation)

**CTA:** "Export Passport Draft" → JSON-LD (Annex XIII format) for EU registry submission. Blocked until Cluster 3 is 100%.

### Tab 3 — Compliance Timeline
- Hard deadline table (Aug 2025 / Jul 2026 / Feb 2027)
- Client milestone tracker: audit → gap fill → draft → review → submit → registered
- WBSO application status
- ISO 42001 certification progress
- EU AI Act classification documentation status

### Tab 4 — Client File
- Company details, jurisdiction, contact
- Battery products in scope
- License / reseller agreement status
- DPA + SCC status
- EU data residency confirmation
- EU entity status (Eenmanszaak → BV roadmap)
- Invoicing history

### Tab 5 — Advisory Reports
- Compliance Gap Analysis
- Passport Readiness Score
- Regulatory Roadmap
- DPP Central Registry submission checklist

Export: PDF, Word (client-deliverable)

---

## 4. Chat Persona — Elara

**Voice:** Precise, regulatory-fluent, calm. Speaks to manufacturing compliance leads.

**Can do:**
- Answer questions about Battery Regulation 2023/1542 specifics (citing articles)
- Walk through the 90 attributes and explain required data, format, source
- Identify gaps from client's product description
- Draft compliance memos and gap analysis sections
- Alert when deadlines are approaching

**Cannot do:**
- Give legal advice on contract interpretation
- Fabricate attribute data — missing = Missing, not estimated
- Speculate beyond ESPR Working Plan 2025–2030

**Sample opener:**
> "I'm tracking your battery compliance for the February 2027 deadline. Your Battlink passport is 67% complete — the main gaps are in Cluster 3 (carbon footprint certification) and Cluster 4 (supply chain due diligence for cobalt). Want to work through those now?"

---

## 5. Client Tiers and Attachment Points

Three client profiles — same canvas, different data ingestion:

| Tier | Who | Inbound | Outbound | What to build |
|------|-----|---------|---------|--------------|
| **Small business** | Small distributors, 3–5 SKUs | File upload (works today) | JSON-LD download → Elise submits manually | Nothing new |
| **Mid-market** | Shopify merchants, fashion/electronics brands | Shopify connector (already built) | `POST /v1/dpp:submit` → EU registry API → QR pushed back to Shopify listing | `/v1/dpp:submit` route post-July 19 |
| **Enterprise** | HOPPECKE, FIAMM, SAP/ERP manufacturers | `POST /v1/dpp:ingest` — ERP pushes structured product data | Full API response: passport ID, QR, status | Full `/v1/dpp:*` route family |

**The `/v1/dpp:*` API route family** (add to `functions/functions/index.js`):
- `POST /v1/dpp:ingest` — accept product data from any source
- `GET /v1/dpp:status` — compliance completion % per passport
- `POST /v1/dpp:generate` — produce JSON-LD passport draft
- `POST /v1/dpp:submit` — call EU DPP Central Registry API
- `POST /v1/dpp:update` — append lifecycle data (SoH, etc.)
- `GET /v1/dpp:qr` — return QR code for product label

Every canvas action is a call to one of these routes — the canvas is the human-facing layer on top of a clean API that any external system (ERP, Shopify, BMS) can also call directly.

**Acquisition relevance:** The `/v1/dpp:*` API is a white-labelable compliance backend. Any acquirer (ERP vendor, Big 4 compliance firm, logistics platform) licenses the engine and surfaces it through their own UI. TRAITLY is the first customer-facing instantiation; the IP is the engine underneath.

## 5a. Supplier Data Network — The Strategic Layer

Manual document upload is the starting point, not the ceiling. The goal is data flowing directly from its origin so clients do progressively less manual work over time.

**Three data source tiers:**

| Source | Clusters covered | Mechanism | Phase |
|--------|-----------------|-----------|-------|
| **Supplier Portal** | 4 (supply chain), 5 (materials) | Battlink invites their cell manufacturer to a stripped-down TRAITLY account. Supplier submits sourcing declarations and materials data once — flows to every passport using their cells, across all TRAITLY clients sharing that supplier. | Phase 2 |
| **Platform connectors** | 2 (certifications), 4, 5 | Direct API connections to Catena-X, GBA Battery Passport framework, SCIP (EU hazardous substances), IEC/CE certification bodies (TÜV, Bureau Veritas, SGS). Data pulled automatically. | Phase 2–3 |
| **BMS direct** | 7 (SoH, charge cycles, degradation) | API from deployed battery management systems. Passport updates itself throughout operational life — the core of the Platform subscription's ongoing value. | Platform tier |

**Data source indicator on the charge bar:**
Each cluster shows its source alongside charge level: `[Supplier-direct]`, `[Platform connector]`, `[Manual upload]`, or `[BMS live]`. Clients see which parts are automated vs. still requiring manual effort.

**The network effect:** Once multiple TRAITLY clients share common suppliers, each supplier updates data once and satisfies every client simultaneously. This compounds with scale — the data moat that makes TRAITLY defensible and acquisition-attractive beyond the advisory practice itself.

**Battlink year-one trajectory:**
- Launch: manual upload for most clusters
- After Supplier Portal: Clusters 4 + 5 automated for key suppliers
- After BMS connection: Cluster 7 becomes a live feed
- Remaining manual: Cluster 3 (carbon footprint — always requires third-party assessor) + one-off certifications

**Dashboard design (Battlink client view):**
- One row per battery product in scope
- **Passport Charge Bar**: grey (nothing) → yellow (in progress) → green (fully charged) — uses battery charging visual language intentionally
- Time-in-status indicator: how many days the product has been at its current charge level
- Hover tooltip: lists missing clusters by name + deeplink directly to the upload zone for that product/cluster
- Priority flag: Battlink marks high-revenue SKUs for priority charging
- Document upload zone per product: fallback for data with no digital source yet

**Weekly status report:**
Auto-generated, held for Elise's review before sending to client. Contains: products in scope, status per product, fully charged count, urgent action items. Never asserts compliance conclusions — data status only. Elise's advisory layer adds the interpretation.

## 6. Data Model

All records are append-only (platform invariant).

| Collection | Document | Purpose |
|-----------|----------|---------|
| `tenants/{tenantId}/dppClients` | `{clientId}` | Client company + product scope |
| `tenants/{tenantId}/batteryPassports` | `{passportId}` | Full 90-attribute record per product |
| `tenants/{tenantId}/complianceEvents` | `{eventId}` | Audit trail of every attribute update |
| `tenants/{tenantId}/advisoryReports` | `{reportId}` | Report metadata + Storage path |
| `tenants/{tenantId}/commercialPipeline` | `{dealId}` | License agreement + fee + EU entity status |

**Vault integration:** On EU registry submission, mint a DTC in the creator's Vault as immutable delivery record.

---

## 6. RAAS Rules

1. **Carbon footprint gate** — Cluster 3 must be 100% before "Export Passport Draft" is enabled
2. **Data residency check** — reject storage of battery attribute data until EU data residency confirmed per client
3. **Deadline alert** — flag any client with compliance score < 80% within 90 days of 18 Feb 2027
4. **Format enforcement** — carbon footprint: kg CO₂ eq/kWh; SoH: %; batch IDs: ISO 8601
5. **Attribution integrity** — every attribute value must carry source (provider, date, certificate reference)

---

## 7. Implementation Notes

### Why this is a strong SOCIII use case

- The 90-attribute data model maps perfectly to the DTC substrate (structured, typed, attested records)
- The "append-only audit trail" invariant is exactly what EU compliance requires — tamper-proof record of who submitted what attribute and when
- The Vault anchor (DTC on submission) gives clients an immutable delivery certificate, which is the SOCIII moat
- The EU AI Act "limited risk" classification is pre-documented (not high risk) — Elara proposes, compliance lead reviews, human approves before any registry submission

### Revenue model — TRAITLY structure
- **TRAITLY licenses the worker from SOCIII** — inherent in the worker build; creating it on the platform establishes the license
- **TRAITLY sells to EU battery clients** — advisory fee + reseller spread on top of SOCIII cost
- BV conversion threshold: €80K revenue (currently Eenmanszaak)
- EIC Accelerator target: 2027 call, up to €2.5M grant — live Battlink client is the TRL evidence

### Key dates to track in the worker
- 18 Aug 2025 — carbon footprint declarations already in force (some clients may already be non-compliant)
- 19 Jul 2026 — EU DPP Central Registry goes live (can start submitting early, credibility advantage)
- 18 Feb 2027 — full passport mandatory, no exceptions

---

## 8. Creator Build Steps (for Elise's Claude Code session)

1. **Design** — Upload canvas tab diagram + Battery Pass visual reference → lock layout
2. **Define** — Fill worker identity; paste Elara guardrails into behavioral rules
3. **Knowledge** — Upload this codex + Battery Regulation 2023/1542 Annex XIII summary + Battery Pass Consortium Data Longlist v1.2
4. **Rules** — Add the 5 RAAS rules above one at a time
5. **Test** — Use Battlink scenario: industrial Li battery, has CE marking, missing carbon footprint LCA → Elara should flag Cluster 3 as blocker
6. **Publish** — Share worker link with Battlink as their compliance workspace

---

## 9. Key Reference Documents

- EU Battery Regulation (EU) 2023/1542 — Articles 77 & 78, Annex XIII
- DIN DKE SPEC 99100 — Battery Passport data attribute standard (updated Jan 2025)
- Battery Pass Consortium Data Longlist v1.2 — thebatterypass.eu
- ESPR Working Plan 2025–2030 — European Commission (April 2025)
- EU AI Act Regulation 2024/1689 — provider obligations for AI systems
- EIC Accelerator 2026 Work Programme — eic.ec.europa.eu
