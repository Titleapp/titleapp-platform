# The DPP Compliance Problem No One Has Solved for Small Manufacturers

*A brief for compliance officers, operations directors, and CEOs of manufacturers and importers selling into the EU*

---

## February 2027: What Changes

EU Battery Regulation 2023/1542 enters enforcement in February 2027. The requirement is specific: any battery or battery-containing product placed on the EU market must carry a Digital Product Passport — a machine-readable record accessible via QR code that documents the product's materials, manufacturing origin, compliance certifications, and end-of-life instructions.

This is not a proposal. It is not pending review. It is passed law. The enforcement date has been set and is not moving.

The regulation applies to any company selling into the EU — EU-based manufacturers, US importers, Asian OEMs with EU distribution, Shopify merchants with customers in Germany, France, or the Netherlands. If your product has a battery and it is sold in the EU after February 2027, it needs a DPP.

The penalties for non-compliance include product withdrawal from the EU market, fines levied by member-state regulatory authorities, and — critically — retailer refusal. Amazon EU, Zalando, and major brick-and-mortar retailers will not list products without a valid DPP. Customs authorities will stop shipments at the border.

This is a market access problem, not just a compliance problem.

---

## What the Regulation Actually Requires

The EU Battery Regulation DPP is not a PDF data sheet. The requirements are precise:

**Machine-readable format.** The DPP must be accessible via a QR code or equivalent data carrier that resolves to a structured, machine-readable record. A PDF does not qualify.

**Supply chain traceability.** The DPP must identify the manufacturer, the origin of critical raw materials, and the manufacturing facility. For lithium batteries specifically, this includes the sourcing of cobalt, lithium, and other regulated materials.

**Compliance documentation.** CE marking, safety certifications, and test reports must be linked to the product record. The DPP is the authoritative reference point for enforcement authorities.

**Carbon footprint declaration.** For industrial and EV batteries, a carbon footprint declaration is required. For lighter-duty batteries, declaration requirements phase in over the 2025–2030 timeframe.

**Repair and end-of-life information.** The DPP must include repairability instructions and end-of-life processing guidance. This is not optional — it is the environmental transparency rationale for the regulation.

**Persistence.** The DPP must remain accessible for ten years after the product is placed on the market. It must be maintained even if the manufacturer ceases operations.

---

## The SME Problem

Large manufacturers have compliance departments, SAP implementations, and legal teams that have been preparing for this regulation for three years. They will be ready.

The companies that are not ready — and will not be ready without a structural change — are the ones under €50M revenue. Shopify merchants selling into the EU. US medical device companies with EU distribution. Small electronics manufacturers. Importers of consumer products containing rechargeable batteries.

For these companies, the options currently available are bad.

**Custom development.** Building a DPP database from scratch costs €50,000 minimum and typically €100,000–€200,000 for a system that handles multiple SKUs, update workflows, and QR generation. It requires a development team, a hosting infrastructure, and ongoing maintenance. For a company with 200 SKUs, this is not viable.

**Consulting firms.** European compliance consultancies are building DPP systems as project work. Engagements run three to six months. Fees are in the €40,000–€80,000 range. The output is a bespoke system built to one client's specifications — not a platform that can be updated as the regulation evolves.

**The large platforms.** SAP and Oracle have DPP modules. They are built for enterprises with existing SAP/Oracle installations, compliance teams, and integration resources. Onboarding for a small manufacturer takes months. The per-SKU costs are prohibitive for companies with thin margins.

The result: most SMEs do not have a system. A significant fraction of them believe they have more time than they do.

---

## The SOCIII Approach

SOCIII is not a compliance consulting firm. It is not a custom development shop. It is a records infrastructure platform that provides the DPP substrate as a turnkey product.

### The Vault DTC Model

Every product in SOCIII gets a Digital Product Passport built on the Vault DTC (Digital Transaction Chain) model. Each DPP is an append-only record — a series of timestamped events documenting the product's history:

- Manufacturing event: origin, certifications, bill of materials
- Compliance events: CE marking, safety test results, import documentation
- Distribution events: customs clearance, retailer listing
- Repair events: service records, component replacements
- End-of-life event: disposal instructions, recycling facility

These events are written once and never overwritten. If information changes — a certification is renewed, a component is substituted — a new event is appended. The original record remains.

This is not a database design choice. It is a regulatory requirement. The EU Battery Regulation requires that DPP records reflect the product's full history, not just its current state. An append-only model is the correct substrate for a regulation that mandates traceability.

### QR-Accessible Public Record

Every SOCIII DPP generates a permanent, scannable QR code that resolves to the product's public compliance record. The record is machine-readable — structured JSON that meets the EU's format requirements — and human-readable, for customs inspectors and consumers.

The QR code goes on the product packaging. The record is hosted by SOCIII and remains accessible for the required ten-year period. No infrastructure for the manufacturer to maintain.

### Compliance Documentation Layer

SOCIII provides structured fields for all required DPP data elements: material declarations, carbon footprint, certifications, supply chain origin. Uploading a certification document creates a linked event in the product record. The document is stored in SOCIII's secure infrastructure and accessible via the QR link.

For companies that need to demonstrate compliance to customs authorities or retailers, SOCIII generates a structured compliance export — the machine-readable documentation that confirms the DPP exists and is complete.

### The Shopify Integration

For Shopify merchants selling into the EU, SOCIII connects directly to your product catalog. Products are linked to their DPP records automatically. When a product is updated in Shopify, the corresponding DPP record is updated. The QR code can be included in the product listing, the packing slip, or the product label.

---

## How It Works in Practice

A US medical device company sells battery-powered monitoring equipment into the EU through a German distributor. They have 47 SKUs. They need to be compliant by February 2027.

With SOCIII:

1. **Onboarding (week 1):** Import product catalog. Assign DPP template to product categories.
2. **Data entry (weeks 2–4):** Upload manufacturing certifications, bill of materials, carbon footprint data for each SKU. SOCIII structures and stores the data as DPP events.
3. **QR generation (week 5):** Each product receives a permanent QR code. The company adds it to product labeling.
4. **Ongoing compliance:** When a certification is renewed, upload the new document — the DPP record updates automatically with a new event. The original certification record remains.
5. **Retailer and customs documentation:** Generate a compliance export for the German distributor. The distributor forwards it to Amazon EU and Zalando for product listing approval.

Total time: five weeks. Total cost: $99/month.

---

## The ESPR Roadmap

The EU Battery Regulation is the first mandate. It will not be the last.

The Ecodesign for Sustainable Products Regulation (ESPR) establishes DPP requirements for a broad range of product categories. The timeline:

- **2024–2025:** Textiles and apparel (fast fashion is explicitly targeted)
- **2026:** Electronics and ICT equipment
- **2027:** Furniture and mattresses
- **2028–2030:** Remaining regulated categories (chemicals, construction materials, consumer goods)

ESPR applies the same model as the Battery Regulation: machine-readable DPP, QR code, supply chain traceability, ten-year record persistence.

Companies that build DPP infrastructure for battery compliance in 2026 will be ahead of the ESPR requirements for electronics and apparel. The record model is the same. The data fields differ by category. SOCIII's system is built to accommodate all regulated categories under one platform — one system of record, one QR infrastructure, one compliance workflow.

The companies that treat DPP compliance as a one-time project for batteries will build it again for electronics, and again for apparel. The companies that build it as infrastructure will be ready for each new mandate with minimal additional work.

---

## What This Is Not

SOCIII is not a sustainability certification. It does not audit your supply chain or verify your material declarations. It provides the infrastructure to record, store, and present the documentation you already have — in a format that meets regulatory requirements.

If your certifications are current and your supply chain data is accurate, SOCIII makes that documentation compliant and accessible. If your certifications are out of date or your supply chain data is incomplete, SOCIII makes that gap visible — which is the first step to closing it.

---

## Pricing

**$49/month** — one product category, up to 500 SKUs
**$99/month** — all product categories, unlimited SKUs

No setup fees. No per-SKU charges above the tier limit. No data export fees. QR code hosting included for the required ten-year period.

For enterprise accounts (5,000+ SKUs or multi-brand portfolios), contact compliance@sociii.ai for custom pricing.

---

## The Timeline You Actually Have

February 2027 is 18 months away as of this writing. That sounds like enough time. It is not.

The companies that will be ready in February 2027 will start building their DPP infrastructure in mid-2026 at the latest. Onboarding, data collection, labeling updates, distributor documentation — these take time even with a turnkey platform. Custom development or consulting takes six months minimum.

The companies that start in Q4 2026 will be scrambling. The companies that start in Q1 2027 will be pulling products from EU shelves.

Start now. The deadline is not moving.

---

*Begin your DPP assessment at **sociii.ai/dpp** or email **compliance@sociii.ai**.*

*SOCIII Inc. · Las Vegas, NV · ESPR-ready record infrastructure*
