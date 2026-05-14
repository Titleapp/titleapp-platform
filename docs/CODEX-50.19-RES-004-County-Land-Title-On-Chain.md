# CODEX 50.19 — RES-004 County Land Title On-Chain

**Status:** Spec'd 2026-05-11 · Build kickoff May 23 · Reference implementation target mid-June 2026
**Owner:** Sean (product + go-to-market) · Claude (implementation)
**Strategic anchor:** This is the **founding-thesis worker**. TitleApp originated to put land/property title records on-chain. Substrate exists (CODEX 50.13 DTC chain anchor + hash anchor + Vault). This memo orchestrates that substrate into a county-deployable product.

---

## Why this exists

> "I want a government moving to this pretty fast if we have it live." — Sean, 2026-05-10

The patent-pending IP behind TitleApp AI is the RAAS architecture **plus the audit-trail ledger system**. The audit-trail substrate is shipped. What's missing is the worker that productizes it for county-level adoption.

Without this worker, the founding moat is theoretical to potential government buyers. With it, TitleApp AI walks into any county RFP with a reference implementation that's deployable in 60 days.

---

## What this worker does (capability summary)

The County Land Title On-Chain worker (RES-004) helps a county or state:

1. **Ingest** their existing land + property title records (deeds, mortgages, liens, easements, plats, recording history) from county recorder databases
2. **Mint** a DTC (Digital Title Certificate) per parcel — tamper-evident, hash-anchored, on-chain (Polygon roadmap; cryptographic audit trail today)
3. **Maintain** a per-parcel logbook capturing every recorded event from ingestion forward
4. **Serve** a holder portal where every property owner can view their parcel's chain, history, and current status
5. **Enable** owner-side actions: tax payments, transfer initiation, encumbrance verification, plat lookups
6. **Provide** a county-administrator dashboard for monitoring health, audit trail integrity, regulator-facing reports
7. **Generate** regulator-facing defensibility reports under state recording laws

---

## Why TitleApp AI is positioned to win this

- **13-patent-pending IP** covering audit-trail ledger, RAAS multi-gate enforcement, jurisdiction-scoped rules
- **Audit-trail substrate already live** — DTC chain anchor (CODEX 50.13 Step 6 Crossmint), hash anchor (Step 3), version pinning (Step 4)
- **Cryptographic audit trail today; on-chain anchoring on Polygon roadmap** — counties can pilot the cryptographic version immediately while we finalize the Polygon path
- **Five Pillars architecture** (Vault, RAAS, Alex, Document Control, Build Without Code) directly serve the county use case: county = tenant; parcels = vault entries; recording rules = RAAS modules; owners = end users with limited-scope access; county admins = full-scope administrators
- **Audit-anchored compliance** is the SINGLE BIGGEST CONCERN of county recorders adopting blockchain — and we built for it from day one
- **User-counsel attestation pattern** (locked 2026-05-08) — counties attest to their counsel; we're not the legal authority. Aligns with how counties already operate.

---

## Architecture (uses existing substrate; new orchestration)

### Existing substrate (already shipped, no new build)

| Component | Provided by | What it does for RES-004 |
|---|---|---|
| DTC chain anchor | CODEX 50.13 Step 6 (Crossmint) | Mints + anchors a DTC per parcel |
| Hash anchor service | CODEX 50.13 Step 3 | Records every event with tamper-evident hash |
| Audit-layer version pinning | CODEX 50.13 Step 4 | Ties every DTC to the rule version that was active at the time |
| Per-tenant Vault | Pillar 1 | Holds all county data, scoped + isolated |
| Constraint RAAS engine | CODEX 50.17 | Loads state-specific recording rules per parcel/event |
| Multi-persona contacts (spine_v2.1) | CODEX 50.18 | County recorder, owner, lender, title agent — all distinct personas on same contact |
| Document Control | Pillar 4 (CODEX 34.10-T2) | Versioning + acknowledgment for deeds/recordings |
| Scoped share-links | CODEX 50.15 P0-14 | Lender / title agent gets read access to specific parcel chain |

### New orchestration to build

| Component | Purpose | Effort |
|---|---|---|
| **County records ingest service** | Bulk import from county recorder APIs or CSV dumps. Schema normalization across counties. | 1 week |
| **Per-parcel DTC mint pipeline** | For each parcel record: mint DTC + anchor hash + write to Vault | 0.5 week |
| **Per-parcel logbook UI** | Owner-facing timeline of conveyances, liens, encumbrances. Reads from existing logbookEntries collection. | 0.5 week |
| **Holder portal** | Owner login scoped to their parcel(s). Limited UI surface (no admin features). | 1 week |
| **Tax payment integration** | Stripe Connect to county-controlled account. Audit-anchored payment receipts. | 0.5 week |
| **Transfer initiation flow** | Owner-initiated transfer → notify county recorder → recorder confirms → DTC updated | 1 week |
| **County admin dashboard** | Recorder + auditor views. Health metrics, audit-trail integrity, exception queue. | 1 week |
| **State-specific RAAS modules** | Per-state recording rules. Start with 1 state (TBD — Sean's call) for reference impl, expand later. | 0.5 week per state |
| **Regulator-facing reports** | State recording-law defensibility report. Tamper-evidence attestation. | 0.5 week |

Total focused build: ~6 weeks.

**Accelerated path (Sean's call):** condense to 3-4 weeks of focused work. Key compressions:
- Reference state = 1 only (pick the easiest — Wyoming or Texas — single-county pilot)
- Manual CSV ingest for v1; live API integration deferred
- Stripe Connect tax payment scoped to single county account
- Admin dashboard MVP (lists + counts; full analytics later)

---

## Worker catalog entry (proposed)

```json
{
  "id": "RES-004",
  "name": "County Land Title On-Chain",
  "slug": "county-land-title",
  "suite": "Sales",
  "phase": 1,
  "type": "enterprise",
  "pricing": {
    "monthly": 0,
    "_note": "Enterprise — county-level contract pricing. Custom per deployment."
  },
  "status": "draft",
  "capabilitySummary": "Helps counties and states move land + property title records on-chain. Per-parcel DTC mint, holder portal, owner-side actions (tax payments, transfer initiation), county-administrator dashboard, regulator-facing reports. Patent-pending audit-trail ledger + RAAS multi-gate enforcement. The founding TitleApp AI thesis productized.",
  "tags": ["land-title", "on-chain", "county", "government", "DTC", "recording", "audit-trail"],
  "valueBucket": ["compliance", "audit_trail", "verifiable_output"],
  "constraintRaasSources": [
    { "moduleId": "re_location_first_v1", "required": true, "load_when": "always" },
    { "moduleId": "county_recording_v1", "required": true, "load_when": "always", "_note": "TBD module — to be authored alongside this worker. Captures state-specific recording rules." }
  ],
  "alexRegistration": {
    "priority": "high",
    "acceptsTasks": true,
    "briefingContribution": "land_title_status"
  },
  "temporalType": "always_on",
  "_notes": "CODEX 50.19. Cross-registered in Government catalog under Recording Services suite. Enterprise pricing — not in the $0/$29/$49/$79 tier ladder."
}
```

Also cross-register in `government.json` under the existing "Recording Services" suite as `GOV-RECORD-002` (or similar — confirm with Government catalog conventions).

---

## State machine for a parcel DTC

```
ingested → minted → active ↔ encumbered → transferring → transferred → archived
                          ↓
                       disputed → resolved → active
```

Every transition is RAAS-checked + audit-anchored.

---

## Holder portal — UX outline

The owner sees:
- **Parcel location** (Google Maps link first, per `re_location_first_v1` rule)
- **Chain history** — every recorded event in plain language (e.g., "May 14 2024 — refinanced with Wells Fargo, $400K mortgage recorded")
- **Current status** — owner of record, encumbrances, tax status
- **Actions** — pay property tax, initiate transfer, view PDF deed, request title commitment, share parcel with lender/title agent
- **Audit trail** — link to view the cryptographic proof + version-pinned rule context

Mobile-first. Most owners access via phone.

---

## County admin dashboard — UX outline

The recorder/auditor sees:
- **Health metrics** — total parcels, % minted, recent ingest activity, anomaly count
- **Exception queue** — parcels needing manual recorder action (chain breaks, missing notary, lien disputes)
- **Audit trail browser** — search by parcel, event type, date range
- **Regulator reports** — generate state-recording-law defensibility report on demand
- **Owner support** — read-only access to any parcel for support inquiries

---

## State-specific RAAS — `county_recording_v1` module

New constraint RAAS module authored alongside the worker. Sections per state:
- Recording requirements (form, notary, indexing)
- Encumbrance handling (priority, release procedures)
- Plat / subdivision rules
- Easement + restriction handling
- Quiet title procedures
- Marketable title acts (in states that have them)
- Special homestead protections

Start with 1 state for reference impl. Each subsequent state = ~0.5 week of authoring.

---

## Go-to-market angle

Sean's strategic intent: this worker is the GOVERNMENT FOOT-IN-THE-DOOR.

- Get **one county pilot** in production by end of June 2026
- That county becomes the reference customer + the patent-pending IP made tangible
- TitleApp AI walks into the next 20 county RFPs with a real deployment to show
- Win 3-5 counties in Q3-Q4 2026
- Expand to state-level partnerships in 2027

This is also the EU DPP wedge — same substrate, different jurisdiction. Once we have the County On-Chain worker live, the DPP worker becomes a 2-3 week port (different RAAS modules, different ingest format, same DTC + chain + Vault).

---

## Schedule

| Date | Milestone |
|---|---|
| 2026-05-11 | This CODEX spec'd. **DONE.** |
| 2026-05-23 | Build kickoff. County records ingest service starts. |
| 2026-05-30 | DTC mint pipeline + per-parcel logbook UI |
| 2026-06-06 | Holder portal MVP + Stripe Connect tax payment |
| 2026-06-13 | County admin dashboard MVP + state-specific RAAS (1 state) |
| 2026-06-20 | Regulator-facing reports + reference implementation deploy |
| 2026-06-27 | Pilot county selected + onboarding starts |

**Reference implementation live by mid-June 2026.** Pilot county production by end of June.

---

## Dependencies / risks

- **Polygon mainnet on-chain anchoring** — currently roadmap, cryptographic audit trail today. Worker can ship without on-chain mainnet (the audit trail is provably tamper-evident either way), but the "on-chain" branding is more powerful with mainnet live.
- **Crossmint integration health** — used for DTC anchoring. Verify SLA + cost basis before county pilot scaling.
- **County data formats vary wildly** — every county recorder has different schema. v1 supports manual CSV; live API integration is post-pilot.
- **Counsel attestation pattern** — county counsel attests to using the worker; TitleApp AI is not the legal authority. Same pattern as Securities Compliance module.

---

## Pilot county selection

Sean to decide. Recommended evaluation criteria:
- Smaller county (<50K parcels) for v1 — easier to ingest fully
- State with permissive blockchain/digital-records legislation (Wyoming, Arizona, Florida, Texas, Nevada)
- Recorder office with appetite for innovation
- Existing TitleApp AI relationship (any Sean has from broker network?)

---

## Sean's open questions

1. **Pilot state preference?** Wyoming, Texas, Nevada, Florida, Arizona all permissive. Wyoming has the most blockchain-friendly framework.
2. **Pilot county relationship — do you have a warm intro?** If yes, that's the pilot. If not, we cold-pitch ~5 counties in the chosen state via the Government vertical Marketing worker.
3. **Pricing model for county contracts?** Per-parcel? Annual flat? Tiered by population? Recommend per-parcel ($0.05-0.50/parcel/year) — predictable for county budget, scales with adoption.
4. **Public messaging?** Press release when reference implementation lives? Or quiet pilot first, announce after 90 days of clean production data?
