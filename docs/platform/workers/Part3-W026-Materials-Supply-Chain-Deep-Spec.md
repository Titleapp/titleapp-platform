# W-026 Materials & Supply Chain | $49/mo
## Phase 4 — Construction | Standalone

**Headline:** "No material delays. No surprise costs."

## What It Does
Tracks material procurement, delivery schedules, long-lead items, stored materials, price escalation, substitution requests, and supply chain risk. Coordinates with construction schedule to ensure materials arrive when needed and are properly documented for draw requests.

## RAAS Tier 1 — Regulations
- **Buy America / Buy American**: For federally funded projects — iron, steel, and manufactured products must be produced in the US (Buy American Act, BABA in Infrastructure Act). Track domestic content requirements. Hard stop: flag non-compliant materials on covered projects.
- **Tariff Tracking**: Track active tariffs affecting construction materials (steel, aluminum, lumber, mechanical equipment). Model cost impact on budget.
- **Specification Compliance**: Materials must meet project specifications. Track spec section, product data submittal, approval status. Substitution requests require architect approval and may trigger code review.
- **Lead Paint / Asbestos**: For renovation projects — track lead paint (EPA RRP Rule) and asbestos (NESHAP) requirements for demolition and material handling. Certified contractors required.
- **Fire Rating**: Track fire-rated assemblies and materials — UL listings, fire-rated doors/frames/hardware, firestopping materials, rated glazing. Materials must match tested assembly.
- **Stored Materials**: Lenders require documentation for stored materials included in draw requests — paid invoices, bills of lading, stored materials insurance, on-site or bonded warehouse verification.

## RAAS Tier 2 — Company Policies
- long_lead_threshold: Weeks lead time that triggers "long-lead" designation (default: 12)
- price_escalation_alert: % increase from budget that triggers alert (default: 10%)
- substitution_approval: "architect_only" | "architect_and_owner" | "gc_discretion"
- preferred_suppliers: Preferred material suppliers with pricing agreements
- stored_materials_insurance: Required insurance for off-site stored materials

## Capabilities
1. **Procurement Schedule** — From construction schedule and specs, generate material procurement timeline showing order dates, lead times, delivery dates, and installation dates. Flag long-lead items.
2. **Long-Lead Item Tracking** — Track items with >12 week lead times: structural steel, elevators, switchgear, generators, custom curtainwall, specialty mechanical equipment. These drive project schedule.
3. **Price Tracking** — Track material prices against budget estimates. Alert when prices exceed threshold. Model cost escalation impact on total budget.
4. **Delivery Tracking** — Track orders: PO issued, acknowledged, in production, shipped, delivered, inspected/accepted. Flag late deliveries against schedule need dates.
5. **Stored Materials Documentation** — For materials stored on or off site, generate documentation package for draw requests: paid invoices, delivery receipts, photos, insurance certificates, storage location verification.
6. **Substitution Management** — Track substitution requests: original specified product, proposed substitute, reason, cost impact, code implications, architect review status, approval/rejection.

## Vault Data
- **Reads**: W-021 construction_schedule (need dates), W-022 bid_results (material allowances in subcontracts), W-029 mep_submittals (equipment procurement)
- **Writes**: procurement_schedule, delivery_status, stored_materials_docs, price_tracking → consumed by W-021, W-023, W-016

## Referral Triggers
- Late delivery impacts schedule → W-021
- Price escalation impacts budget → W-021 and W-016
- Stored materials need insurance → W-025
- Stored materials for draw request → W-023
- Substitution requires code review → W-027
- Buy America compliance issue → W-047

## Document Templates
1. msc-procurement-schedule (XLSX) — All materials with order/delivery timeline
2. msc-long-lead-tracker (XLSX) — Long-lead items with status and risk assessment
3. msc-stored-materials-package (PDF) — Draw-ready documentation for stored materials
4. msc-price-escalation-report (PDF) — Budget vs actual material costs with projections
