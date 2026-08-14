# February 2027 Is Not a Suggestion

The EU Battery Regulation Digital Product Passport requirement takes effect February 18, 2027. There is no opt-out. There is no grace period for companies that started late. Every battery-containing product placed on the EU market must carry a machine-readable DPP with traceable supply chain data, verified carbon footprint attestations, and lifecycle documentation. Noncompliant products cannot be sold.

The three options in front of most compliance teams right now: (1) engage a Big Four firm — 18-month timeline, $5–15M total cost, deadline likely missed; (2) build it internally — 6–12 months minimum, requires 3–5 compliance engineers the market does not have available; (3) SOCIII.

---

## The Wave

The EU Battery Regulation is the first in a wave of mandatory DPP frameworks. Ecodesign for Sustainable Products Regulation follows, extending requirements to textiles, electronics, and construction products through 2030. The enforcement mechanism is import control — noncompliant products do not clear customs. There is no warning letter, no cure period, no negotiation. The window for orderly implementation is closing now. Companies that have structured data work underway by Q3 2026 can meet the deadline. Companies that begin in Q4 cannot.

---

## What SOCIII Does

- **Is being built to build and maintain the DPP record for each product in the catalog.** The Passport & Registry Manager worker is designed to map supply chain data, carbon footprint attestations, and lifecycle documentation to the regulation's schema.
- **Is being built to monitor every product's compliance status against tightening regulatory thresholds** — flagging when an attestation is approaching its validity window or when a regulatory update affects an existing record.
- **Is architected around an append-only audit trail.** The design principle: a carbon footprint attestation written in 2025 cannot be retroactively changed when the regulation tightens in 2027. Base-blockchain anchoring is live elsewhere on the SOCIII platform (Vault records) — **confirmed via code check that it is not yet wired to DPP records specifically.** Do not imply blockchain anchoring is live for DPP in this pager or any conversation until it's actually built for this vertical.
- **Is designed to handle supply chain tracing and registry management in one connected workflow** — the Supply Chain Tracer and Passport & Registry Manager are built to share data automatically rather than require manual handoff between tools.

---

## What You Are Paying Now vs. SOCIII

| What you pay now | SOCIII |
|---|---|
| McKinsey/Big Four assessment: $2,000,000–5,000,000 | $200–900/month all-in |
| Implementation engagement: $3,000,000–10,000,000 | Included |
| Internal compliance engineering team (3–5 FTEs): $300,000–500,000/year | Same 2-person team, same output |
| Timeline to compliance: 12–18 months (deadline risk high) | On-track for February 2027 if started now |

---

## Force Multiplier

**Before:** A 2-person compliance team manually building and maintaining DPP records for a 50-SKU catalog. One tool for supply chain data. Another for carbon calculations. A third for registry submission. Assembly is manual, auditable only to the extent of what was saved.

**After:** Same 2-person team. The Passport & Registry Manager worker is built to handle the catalog end to end, with Alex monitoring all deadlines and the audit trail designed to stay current and tamper-evident.

---

## Workers in This Deployment

| Worker | Record Type |
|---|---|
| DPP Compliance Tracker | `dpp-compliance-report/v1` |
| Passport & Registry Manager | `dpp-passport/v1`, `registry-record/v1`, `lifecycle-alert/v1` |
| Supply Chain Tracer | `supply-chain-bundle/v1` |
| Alex — Chief of Staff | Deadline monitor, compliance tracker |

Shopify app and API connector: Q3 2026 roadmap.

---

## Just Talk to It

"I manufacture lithium batteries and I need to know which products need a DPP before February."

Alex reviews the catalog against the regulation's scope criteria — battery capacity, chemistry type, application category — and returns a compliance checklist ranked by urgency. Before you have opened a spreadsheet, you know which products are in scope, which are borderline, and what documentation work is required for each.

---

## Next Step

Active pilot with Volta Advisory — a medical supplies company building EU Battery Regulation compliance for portable medical device batteries, addressing MDR and EU Battery Regulation requirements simultaneously. If your catalog includes battery-containing products sold in the EU and you need to be compliant by February 2027, the scoping conversation takes 30 minutes.

**sean@sociii.ai**

---

*Patent pending (USPTO filings May 2026) · sean@sociii.ai · sociii.ai*
