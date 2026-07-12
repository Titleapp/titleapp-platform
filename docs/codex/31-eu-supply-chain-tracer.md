# CODEX 31 — EU Supply Chain Tracer: Supplier Data Network

**Status:** SPEC — Phase 2 (after Compliance Auditor reaches scale with multiple clients)  
**Suite:** EU DPP · Worker 3 of 5  
**Slug:** `eu-supply-chain-tracer-001`  
**Regulation anchor:** EU Battery Regulation 2023/1542, Articles 52–54 (supply chain due diligence); EU Conflict Minerals Regulation 2017/821  
**Hard deadline:** 18 Feb 2027 (Clusters 4+5 required for full passport)

---

## 1. What This Worker Does

Clusters 4 (supply chain due diligence) and 5 (battery materials & composition) are the hardest to collect manually — they require data from cell manufacturers, materials suppliers, and certification bodies, not from the battery manufacturer itself.

The Supply Chain Tracer builds and manages the **Supplier Data Network**: a shared data layer where a supplier submits sourcing declarations and materials data once, and that data automatically flows to every client using that supplier across the entire advisor's practice. One supplier, one submission, many passports satisfied simultaneously.

**Strategic moat:** Once the network has 10+ suppliers, each new client comes partially pre-filled. The data moat compounds with scale and makes the platform defensible against solo advisory competition.

---

## 2. Worker Identity

| Field | Value |
|-------|-------|
| Slug | `eu-supply-chain-tracer-001` |
| Worker name | Supply Chain Tracer |
| Vertical | `unassigned` |
| Suite | `EU DPP` |
| Persona name | Elara |
| Anchor | Supplier relationship (one supplier = one shared data node) |
| Catalog listing | "Automates Clusters 4+5 data collection by connecting directly to cell manufacturers and materials suppliers. Supplier submits once — data flows to every passport using their components." |

---

## 3. Canvas Tabs

### Tab 1 — Supplier Network
- Map/list of all suppliers in the network
- Per supplier: materials covered, clients served, last update date, verification status
- "Invite Supplier" button → sends onboarding link to cell manufacturer
- Network coverage: % of Cluster 4+5 attributes covered across all active clients

### Tab 2 — Supplier Portal (Operator view)
- Per supplier: data submissions received, verification status, outstanding gaps
- Attribute-level audit trail (who submitted what, when, which certificate)
- Flag unverified submissions for manual review before accepting

### Tab 3 — Platform Connectors
- **Catena-X**: EU automotive supply chain data exchange — connect to pull sourcing declarations automatically
- **GBA Battery Passport framework**: Global Battery Alliance standard data exchange
- **SCIP Database**: EU hazardous substances registry (ECHA) — automatic pulls for restricted material compliance
- **IEC/CE certification bodies** (TÜV, Bureau Veritas, SGS): API connections for certificate verification
- Status per connector: Connected / Configured / Coming Soon

### Tab 4 — Coverage Gap Analysis
- For each active client: which Cluster 4+5 attributes are still manual vs. network-covered
- Recommended actions: invite missing suppliers, activate missing connectors

---

## 4. Access Model

Three-tier access (enforced server-side via Firebase custom claims, never prompt-level):

| Tier | Who | What they see |
|------|-----|---------------|
| **Operator** | Volta Advisory | Full network, all suppliers, all clients, verification controls |
| **Client** | Voltara etc. | Only their own suppliers and the data that flows to their passports |
| **Supplier** | Cell manufacturer | Only the specific attributes they are responsible for submitting; cannot see other clients' data |

**Supplier fan-out write:** When a supplier submits a declaration, it is written once to the supplier node and then a compliance event is appended to every passport (across all clients) that uses that supplier's components. **Data model clarification:** supplier attribute values are **snapshotted into each passport record at the time they are applied** — not held by live reference. This is required to satisfy CODEX 30's immutability invariant: a passport registered with the EU registry cannot be retroactively altered if the supplier later updates their data. The snapshot approach accepts controlled duplication in exchange for correct immutability semantics. Firestore security rules should be written against the snapshot model, not the reference model.

---

## 5. RAAS Rules

1. **Supplier data stays unverified until operator confirms** — client uploads land as "In Review" not "Collected" until the advisor validates
2. **No cross-client data leakage** — supplier data is readable only by clients who use that supplier, enforced at the Firestore rules level
3. **Certificate expiry alert** — RAAS fires an alert when a supplier certificate (LCA, conflict minerals, REACH) is within 90 days of expiry
4. **Catena-X pull integrity** — data pulled from Catena-X carries a "Platform connector" source tag; manually uploaded data carries "Manual upload"; they are never conflated

---

## 6. Build Prerequisites

- Supplier Portal authentication (Firebase custom claims for supplier tier)
- **EU data residency (Firestore EU-region)** — required before any EU supplier or client data is stored at scale; applies to all supplier nodes and the fan-out compliance events
- Catena-X connector (connector kit available: catena-x.net/en/offers/connector-kit)
- GBA Battery Passport API credentials
- SCIP Database API (ECHA) — publicly available REST API
- Firestore security rules update: supplier can only write their own node; snapshot writes to client passport records are operator-scoped only (supplier cannot write to passport directly)

---

## 7. Build Steps

1. Add `supplier` Firebase custom claim tier
2. Build supplier onboarding flow (invite link → supplier creates account → limited portal access)
3. Implement supplier fan-out write: on supplier submission, find all passports using that supplier and append compliance events
4. Build Supplier Network tab (operator view of all suppliers in network)
5. Stub Catena-X connector (configure credentials → poll API → map to Cluster 4+5 attributes)
6. Build Coverage Gap Analysis tab
7. Wire RAAS certificate expiry alerts
