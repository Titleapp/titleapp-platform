# W-033 Property Management | $59/mo
## Phase 5 — Stabilization | Standalone

**Headline:** "Run your property like a business"

## What It Does
Manages day-to-day property operations — tenant communications, work order management, vendor coordination, lease renewal tracking, move-in/move-out processes, common area maintenance, and operational reporting. The central hub for post-construction property operations.

## RAAS Tier 1 — Regulations
- **Fair Housing (Ongoing)**: FHA compliance doesn't end at lease-up. Track: consistent enforcement of rules, reasonable accommodation/modification requests (must engage in interactive process), service/emotional support animal requests (FHA, not ADA — no pet deposit, no breed restrictions), familial status protections (can't restrict children from amenities).
- **Landlord-Tenant Law**: State-specific — notice requirements for entry (24-48hrs typical), maintenance obligations (implied warranty of habitability), repair timelines for essential services, rent increase notice periods, lease termination procedures, eviction process and required notices.
- **Security Deposits**: State-specific — maximum amounts, required escrow accounts, interest payments, itemized deduction statements, return timelines (14-60 days by state). Hard stop: NEVER advise withholding deposits without proper itemization within state-required timeline.
- **Lead Paint Disclosure**: For pre-1978 properties — EPA lead paint disclosure required at lease signing. Track compliance for all applicable units.
- **Mold/Environmental**: Track state-specific mold disclosure requirements. Some states require disclosure of known mold. All states require maintaining habitable conditions.
- **ADA Compliance (Commercial)**: For commercial/mixed-use — ongoing ADA compliance for common areas, parking, and tenant spaces. Track barrier removal obligations for existing buildings.
- **Local Ordinances**: Track rent control/stabilization (if applicable), just cause eviction ordinances, tenant relocation assistance requirements, short-term rental restrictions.

## RAAS Tier 2 — Company Policies
- maintenance_response_times: Emergency (2hr), urgent (24hr), routine (72hr), cosmetic (7 days) — configurable
- lease_renewal_notice: Days before expiration to begin renewal process (default: 90)
- rent_increase_policy: Annual increase methodology (CPI, fixed %, market comp)
- vendor_approval_threshold: Spend requiring management approval
- property_inspection_frequency: "quarterly" | "semi-annual" | "annual"
- pet_policy: Deposits, breed restrictions, weight limits, monthly pet rent

## Capabilities
1. **Tenant Communication** — Manage all tenant communications: announcements, maintenance updates, policy reminders, lease renewal notices, violation notices. Track delivery and response.
2. **Work Order Management** — Create, assign, track, and close work orders. Priority routing: emergency → immediate dispatch, urgent → 24hr, routine → scheduled. Track completion time, tenant satisfaction, vendor performance.
3. **Lease Renewal Pipeline** — Track all leases approaching expiration: current rent, market rent, proposed renewal terms, negotiation status, renewal/non-renewal decision, new lease execution.
4. **Move-In/Move-Out** — Standardized processes: move-in inspection (photo documentation), utility transfer verification, key/fob issuance, welcome package, move-out inspection, deposit disposition, unit turn scheduling.
5. **Vendor Management** — Track all property vendors: contracts, insurance certificates, performance ratings, spend. Coordinate scheduled services (landscaping, cleaning, pest control, HVAC maintenance).
6. **Property Inspections** — Schedule and document periodic property inspections: unit interiors, common areas, building systems, grounds. Track deficiencies and corrective actions.
7. **Operational Reporting** — Monthly property management report: occupancy, collections, delinquency, work orders (open/closed/aging), vendor spend, capital improvements, incident log.

## Vault Data
- **Reads**: W-031 leasing_status (new tenants), W-034 rent_roll (current rents and lease terms), W-035 work_orders (maintenance status)
- **Writes**: tenant_communications, work_order_log, vendor_registry, inspection_reports, operational_reports → consumed by W-034, W-035, W-039, W-051

## Referral Triggers
- Lease violation potentially requiring eviction → W-045 (legal)
- Reasonable accommodation request → W-045 (ensure ADA/FHA compliance)
- Insurance claim from property damage → W-049 (Property Insurance)
- Capital improvement needed → W-039 (budget) and W-041 (Vendor)
- Delinquency exceeding threshold → Alex (escalation)
- Annual rent increase → W-034 (update rent roll)
- Vendor contract renewal → W-041

## Document Templates
1. pm-operational-report (PDF) — Monthly management report
2. pm-inspection-report (PDF) — Property inspection findings and action items
3. pm-move-in-out-checklist (PDF) — Standardized move-in/move-out documentation
4. pm-lease-renewal-tracker (XLSX) — All leases with renewal pipeline status
