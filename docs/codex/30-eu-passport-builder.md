# CODEX 30 — EU Passport Builder: JSON-LD Generation + Registry Export

**Status:** SPEC — build follows CODEX 29 (Compliance Auditor) reaching 100% data completeness  
**Suite:** EU DPP · Worker 2 of 5  
**Slug:** `eu-passport-builder-001`  
**Regulation anchor:** EU Battery Regulation 2023/1542, Annex XIII · DIN DKE SPEC 99100  
**Hard deadline:** 18 Feb 2027 (passport must be registered before this date)

---

## 1. What This Worker Does

Takes a battery product whose 90 attributes are fully collected (Compliance Auditor = 100%) and generates a registry-ready Digital Battery Passport in the **Annex XIII JSON-LD format** required by the EU DPP Central Registry.

The Compliance Auditor is the data collection layer. The Passport Builder is the export and submission preparation layer. They are separate workers because the compliance advisor role (data validation) must be clearly separated from the registry submission role (legal act) — both for EU AI Act purposes and for client liability reasons.

**Key constraint:** Cluster 3 (carbon footprint) must be 100% complete before export is enabled. This is a hard RAAS rule, not a UX suggestion.

---

## 2. Worker Identity

| Field | Value |
|-------|-------|
| Slug | `eu-passport-builder-001` |
| Worker name | EU Passport Builder |
| Vertical | `unassigned` |
| Suite | `EU DPP` |
| Persona name | Elara (shared with Compliance Auditor) |
| Anchor | Battery product + completed Compliance Auditor record |
| Catalog listing | "Generates EU registry-ready Digital Battery Passports in Annex XIII JSON-LD format. Converts completed compliance records into submission-ready passport files with QR code and product identifier." |

---

## 3. Canvas Tabs

### Tab 1 — Passport Queue
- Table of products where Compliance Auditor = 100% → eligible for passport generation
- Table of products still in progress → ineligible (with blocking reason)
- Cluster 3 gate status per product

### Tab 2 — Passport Preview
For a selected product: rendered view of all 90 attributes in passport format
- Section by section (mirrors the 7 cluster structure)
- Each attribute shows: value · source · certificate reference · format compliance check
- Red flag on any attribute that fails format validation (e.g. wrong unit, missing ISO 8601 date)

### Tab 3 — Export + Submit
- **Export Passport Draft** button → downloads JSON-LD file (Annex XIII format)
- Pre-submission checklist (Cluster 3 verified, DPA signed, EU residency confirmed)
- **Submit to EU Registry** → calls `POST /v1/dpp:submit` → returns passport ID + QR code
- QR code display: downloadable PNG for product label

### Tab 4 — Passport Ledger
- All generated passports for this workspace
- Status: Draft / Submitted / Registered / Requires update
- Registry ID, submission timestamp, QR code link
- Vault DTC minted automatically on registration

---

## 4. RAAS Rules

1. **Cluster 3 hard gate** — `POST /v1/dpp:generate` rejected if Cluster 3 completionPct < 100
2. **Format enforcement** — carbon footprint must be in kg CO₂ eq/kWh; SoH in %; batch IDs in ISO 8601; all validated before export
3. **Submission lock** — once submitted, passport record is immutable; updates go through `POST /v1/dpp:update` (append-only)
4. **Dual Vault write** — on registry confirmation, DTC minted in both the advisor's Vault AND the client's Vault (the regulated entity holds their own immutable record)
5. **Attribution integrity** — every attribute in the JSON-LD must carry provenance metadata (source, date, certifier)

---

## 5. API Surface

- `POST /v1/dpp:generate` — produce Annex XIII JSON-LD draft
- `POST /v1/dpp:submit` — submit to EU DPP Central Registry API (available post-19 Jul 2026)
- `GET /v1/dpp:qr` — return QR code PNG for a registered passport ID
- `POST /v1/dpp:update` — append lifecycle event to a registered passport

---

## 6. Build Prerequisites

- EU DPP Central Registry API access (government allowlist required; apply when registry opens 19 Jul 2026)
- Annex XIII JSON-LD schema implementation (schema published by EU Commission)
- EU data residency (Firestore EU-region) before storing submission records for EU clients
- Dual Vault write hook from `POST /v1/dpp:submit` confirmation handler

---

## 7. Build Steps

1. Implement `POST /v1/dpp:generate` — map 90 Firestore attributes to Annex XIII JSON-LD fields
2. Add format validation pass (units, date formats, required fields)
3. Build Passport Preview tab — render the JSON-LD as a readable structured view
4. Implement `POST /v1/dpp:submit` stub (returns mock registry ID until Jul 2026)
5. Build QR code generation and download
6. Wire dual Vault write on submit confirmation
7. Build Passport Ledger tab (reads submitted passports from Firestore)
