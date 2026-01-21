# California Real Estate — Workflows

This file defines workflow IDs the API can list via:
GET `/v1/raas:workflows&vertical=real-estate&jurisdiction=CA`

> Format: JSON block with `workflows: []`.

```json
{
  "workflows": [
    {
      "id": "lease_residential_new",
      "name": "Residential Lease — New",
      "description": "Create a new residential lease package (CA). Collect parties, property, term, rent, deposits, disclosures, signatures, and move-in checklist."
    },
    {
      "id": "lease_residential_renewal",
      "name": "Residential Lease — Renewal",
      "description": "Renew an existing lease. Collect updated term/rent, updated notices/disclosures, signatures, and deliver renewal packet."
    },
    {
      "id": "lease_residential_notice_rent_increase",
      "name": "Residential Lease — Rent Increase Notice",
      "description": "Prepare and deliver a rent increase notice. Determines required notice period and required content based on jurisdiction rules (client config / RAAS)."
    },
    {
      "id": "lease_residential_notice_terminate",
      "name": "Residential Lease — Termination Notice",
      "description": "Prepare a termination notice (tenant/landlord). Collect basis, dates, service method, and generate compliant notice packet."
    },
    {
      "id": "lease_move_in",
      "name": "Lease — Move-In (Condition + Keys + Utilities)",
      "description": "Move-in workflow: condition report, photo log, keys/garage/openers, utilities handoff, tenant acknowledgements."
    },
    {
      "id": "lease_move_out",
      "name": "Lease — Move-Out (Inspection + Deposit Accounting)",
      "description": "Move-out workflow: inspection scheduling, condition/photos, itemized deposit accounting, vendor work orders, and tenant delivery."
    },
    {
      "id": "hoa_onboarding_unit",
      "name": "HOA — Onboard New Unit Owner/Tenant",
      "description": "Onboard a new resident: rules acknowledgement, HOA docs delivery, contact info, vehicle info, parking, and portal access."
    },
    {
      "id": "hoa_violation_notice",
      "name": "HOA — Violation Notice",
      "description": "Issue HOA violation notice: evidence, violation type, cure period, hearing (if applicable), delivery, and tracking."
    },
    {
      "id": "hoa_arch_request",
      "name": "HOA — Architectural Request (ARC)",
      "description": "Submit and route an architectural request: scope, drawings/photos, contractor/license/insurance, review steps, decision letter."
    },
    {
      "id": "hoa_assessment_collection",
      "name": "HOA — Assessment Collection (Friendly → Formal)",
      "description": "Collection workflow: reminders, late fees (if applicable), payment plan offer, escalation steps, and recordkeeping."
    },
    {
      "id": "purchase_sale_intake",
      "name": "Purchase/Sale — Deal Intake (Buyer/Seller/Agent)",
      "description": "Collect transaction basics (property, parties, escrow/title, dates). Build a task plan for disclosures, signatures, and closing checklist."
    },
    {
      "id": "purchase_sale_disclosures_packet",
      "name": "Purchase/Sale — Disclosures Packet",
      "description": "Generate a disclosures checklist and packet for signatures. Track completion and delivery confirmations."
    },
    {
      "id": "closing_coordination",
      "name": "Closing — Coordination & Checklist",
      "description": "Coordinate title/escrow, payoff, prorations, keys/possession, final walk-through, and closing deliverables."
    }
  ]
}
