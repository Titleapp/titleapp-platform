# Real Estate Workflows — California (CA)

These workflows are the “front door” for the Real Estate vertical in California.  
They are written to be chat-friendly and map to a simple pattern:

- **Collect required inputs**
- **Run compliance checks (jurisdiction-aware)**
- **Produce a packet / record anchor / next action**

---

## Machine-readable workflows (CA)

> The API reads this list to populate `/v1/raas:workflows?vertical=real-estate&jurisdiction=CA`

```json
{
  "vertical": "real-estate",
  "jurisdiction": "CA",
  "workflows": [
    {
      "id": "re_inquiry_basic",
      "name": "Property Inquiry (Basic)",
      "description": "Collect address/APN + user intent and return a basic public-info summary + recommended next step (prelim/full/lease/HOA).",
      "requiredInputs": ["property.address_or_apn", "user.intent"],
      "optionalInputs": ["user.role", "property.county", "property.owner_name_if_known"],
      "suggestedNextActions": [
        { "action": "re:order_preliminary_report", "label": "Order Preliminary Report" },
        { "action": "re:order_full_report", "label": "Order Full Blockchain Report" },
        { "action": "re:start_residential_lease", "label": "Start Residential Lease" },
        { "action": "re:start_hoa_request", "label": "HOA Request" }
      ]
    },
    {
      "id": "re_preliminary_title_report",
      "name": "Preliminary Title Report (CA)",
      "description": "Start a preliminary title workflow: ownership snapshot, liens/encumbrances, vesting, and flags. Produces a prelim report artifact.",
      "requiredInputs": ["property.address_or_apn", "user.role"],
      "optionalInputs": ["transaction.type", "transaction.close_date_target", "property.county"],
      "suggestedNextActions": [
        { "action": "re:review_flags", "label": "Review Title Flags" },
        { "action": "re:upgrade_full_report", "label": "Upgrade to Full Report" }
      ]
    },
    {
      "id": "re_full_blockchain_report",
      "name": "Full Blockchain Report (CA)",
      "description": "Start a full report workflow: deeper chain review, exceptions, risk notes, and a record-anchor plan (db + optional blockchain notary).",
      "requiredInputs": ["property.address_or_apn", "user.role"],
      "optionalInputs": ["transaction.type", "transaction.close_date_target", "property.county"],
      "suggestedNextActions": [
        { "action": "re:create_record_anchor", "label": "Create Record Anchor" },
        { "action": "re:open_escrow_locker", "label": "Open Escrow Locker" }
      ]
    },
    {
      "id": "re_purchase_sale_transaction",
      "name": "Purchase & Sale Transaction (CA)",
      "description": "Guided transaction checklist for purchase/sale: parties, escrow, disclosures, contingencies, signing, and closeout steps.",
      "requiredInputs": ["transaction.type", "property.address_or_apn", "parties.buyer", "parties.seller"],
      "optionalInputs": ["parties.agent_buyer", "parties.agent_seller", "escrow.provider", "financing.type"],
      "suggestedNextActions": [
        { "action": "re:generate_psa_packet", "label": "Generate PSA Packet" },
        { "action": "re:request_disclosures", "label": "Request Disclosures" },
        { "action": "re:route_for_signature", "label": "Send for eSign" }
      ]
    },
    {
      "id": "re_listing_onboarding",
      "name": "Listing Onboarding (CA)",
      "description": "Set up a listing workflow: property facts, seller packet, required disclosures checklist, and marketing-ready summary.",
      "requiredInputs": ["property.address_or_apn", "parties.seller", "listing.type"],
      "optionalInputs": ["parties.agent", "listing.target_date"],
      "suggestedNextActions": [
        { "action": "re:generate_listing_packet", "label": "Generate Listing Packet" },
        { "action": "re:order_preliminary_report", "label": "Order Preliminary Report" }
      ]
    },
    {
      "id": "re_residential_lease_new",
      "name": "Residential Lease — New (CA)",
      "description": "Create a residential lease workflow: tenant screening inputs, lease terms, required CA disclosures checklist, signing, and move-in checklist.",
      "requiredInputs": ["property.address", "parties.landlord", "parties.tenant", "lease.start_date", "lease.rent_amount"],
      "optionalInputs": ["lease.deposit_amount", "lease.term_months", "lease.pets", "lease.utilities", "lease.parking"],
      "suggestedNextActions": [
        { "action": "re:generate_residential_lease_packet", "label": "Generate Lease Packet" },
        { "action": "re:route_for_signature", "label": "Send for eSign" },
        { "action": "re:create_tenant_record_anchor", "label": "Create Tenant Record Anchor" }
      ]
    },
    {
      "id": "re_commercial_lease_new",
      "name": "Commercial Lease — New (CA)",
      "description": "Create a commercial lease workflow: parties, premises, term, rent/escalations, CAM/NNN, insurance, signing, and possession checklist.",
      "requiredInputs": ["property.address", "parties.landlord", "parties.tenant", "lease.start_date", "lease.term_months"],
      "optionalInputs": ["lease.base_rent", "lease.cpi_escalation", "lease.cam_terms", "lease.nnn_terms", "lease.use_clause"],
      "suggestedNextActions": [
        { "action": "re:generate_commercial_lease_packet", "label": "Generate Commercial Lease Packet" },
        { "action": "re:route_for_signature", "label": "Send for eSign" }
      ]
    },
    {
      "id": "re_hoa_resale_request",
      "name": "HOA Resale Package / Documents (CA)",
      "description": "Request and track HOA docs for a resale: CC&Rs, bylaws, budget, reserve study, minutes, fee schedule, estoppel, transfer fees.",
      "requiredInputs": ["property.address_or_apn", "hoa.name_or_mgmt_company", "request.type"],
      "optionalInputs": ["transaction.close_date_target", "hoa.contact_email"],
      "suggestedNextActions": [
        { "action": "re:generate_hoa_request_letter", "label": "Generate HOA Request Letter" },
        { "action": "re:track_hoa_status", "label": "Track HOA Status" }
      ]
    },
    {
      "id": "re_hoa_management_ops",
      "name": "HOA Operations (CA)",
      "description": "Operational HOA workflow: dues, violations, architectural requests, meeting notices, vendor work orders, and member communications.",
      "requiredInputs": ["hoa.name_or_mgmt_company", "request.type"],
      "optionalInputs": ["member.name", "unit.identifier", "violation.type", "dues.amount"],
      "suggestedNextActions": [
        { "action": "re:issue_violation_notice", "label": "Issue Violation Notice" },
        { "action": "re:create_work_order", "label": "Create Vendor Work Order" },
        { "action": "re:send_member_notice", "label": "Send Member Notice" }
      ]
    },
    {
      "id": "re_record_anchor_property",
      "name": "Create Property Record Anchor (CA)",
      "description": "Create a record anchor for the property and transaction artifacts: database record + optional digital notary / blockchain proof for escrow locker continuity.",
      "requiredInputs": ["property.address_or_apn", "anchor.purpose"],
      "optionalInputs": ["transaction.type", "escrow.provider", "notary.required"],
      "suggestedNextActions": [
        { "action": "re:open_escrow_locker", "label": "Open Escrow Locker" },
        { "action": "re:attach_documents", "label": "Attach Documents" }
      ]
    }
  ]
}
