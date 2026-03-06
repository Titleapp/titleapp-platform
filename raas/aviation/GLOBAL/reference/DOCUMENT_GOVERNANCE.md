# Aviation Document Governance — Part 135 Operations

## Three-Tier Document Model

### Tier A — Platform Reference Templates (Read-Only)
Location: `raas/aviation/GLOBAL/reference/ops/`

White-labeled, FAA-structure-compliant templates derived from approved operational documents. These serve three purposes:
1. **Knowledge base** — workers understand what properly structured documents look like
2. **Starting templates** — operators without existing docs use these as drafts via AV-002 (GOM Authoring)
3. **Validation patterns** — workers can compare client documents against known-good structure

These templates cover:
- General Operations Manual (GOM)
- Standard Operating Procedures (SOP) — general and aircraft-specific
- Minimum Equipment List (MEL) — based on manufacturer MMEL
- Non-Essential Equipment Furnishings List (NEF) — based on manufacturer CDL
- General Maintenance Manual (GMM)
- Company Policies
- Base Operations Playbook
- Procedure-specific documents (fuel, oxygen, de-ice, instrument departures, etc.)

**Every template in this library is a white-label example document.** No template has been submitted to or approved by the FAA. Templates exist solely for training, familiarization, structural reference, and as starting points for operators drafting their own documents through AV-002.

Templates include three mission type sections:
- **Air Medical** — patient transport, medical equipment, HIPAA compliance
- **On-Demand Charter (Passenger)** — pax handling, briefings, catering, customs
- **On-Demand Cargo** — cargo acceptance, hazmat (49 CFR 175), securing, weight distribution

### Tier B — Client-Uploaded Approved Documents (Required for Operations)
Location: Client Vault at `tenants/{tenantId}/aviation/approved-docs/`

When an operator onboards, they MUST upload their own FAA-approved operational documents:

| Document | Required For | Regulatory Basis |
|----------|-------------|-----------------|
| Part 135 Certificate | All operations | 14 CFR 119 |
| Operations Specifications (OpSpecs) | All operations | 14 CFR 119.49 |
| General Operations Manual (GOM) | All operations | 14 CFR 135.21 |
| Standard Operating Procedures (SOP) | All operations | 14 CFR 135.21 (part of GOM or standalone) |
| Training Program | All operations | 14 CFR 135.341 |
| Minimum Equipment List (MEL) | Dispatch with inop items | 14 CFR 135.179 |
| Non-Essential Equipment Furnishings (NEF/CDL) | Dispatch with missing non-essential items | Per manufacturer CDL / OpSpecs |
| Maintenance Program | All operations | 14 CFR 135.411 |
| Aircraft-Specific POH/AFM | All flight operations | 14 CFR 91.9 |
| Drug & Alcohol Testing Program | All operations | 14 CFR Part 120 |
| Security Program | All operations | 49 CFR 1544 |
| Hazmat Training Program | Cargo operations | 49 CFR 175 |

**Workers are fully functional with platform reference templates**, but every worker output includes a persistent reminder when the operator has not uploaded their own approved documents. This is NOT a hard stop — operators can use the platform immediately — but the reminder is prominent and cannot be dismissed or silenced until documents are uploaded.

**Persistent Reminder (displayed on every worker output until docs uploaded):**
> CAUTION — REFERENCE MATERIAL ONLY. You are currently operating with platform reference templates (white-label GOM, SOP, MEL, NEF, POH/AFM, and flight operations documents), NOT your own FAA-approved documents. These templates are generic examples for training, familiarization, and document drafting purposes only. They have NOT been reviewed or approved by the FAA for your specific operation, aircraft, or equipment. They may contain procedures, limitations, or values that differ from your approved documents. Do not use these templates as the basis for operational decisions, dispatch, maintenance actions, or flight operations without first verifying against your own FAA-approved documents. Upload your own GOM, SOP, MEL, NEF, OpSpecs, and AFM/POH to ensure accuracy. Contact AV-001 (Certificate Assistant) or AV-002 (GOM Authoring) if you need help generating or submitting documents.

**Soft flag:** If an operator uploads documents but they appear outdated (revision date >12 months old), workers flag for review.

**Once uploaded**, workers automatically switch to referencing the CLIENT'S approved documents instead of platform templates. The platform templates continue to be used for:
- Structural validation (is the client GOM missing required sections?)
- New operator document generation
- Gap analysis

### Tier C — Document Generation Path (New Operators)
For operators who do not yet have FAA-approved documents:

```
Operator Onboarding (no existing docs)
    │
    ├─→ AV-001 (Cert Assistant)
    │     Guides through 5-phase certification process
    │     Tracks all required documents, deadlines, FSDO correspondence
    │     Prepares application package (FAA Form 8400-6)
    │
    ├─→ AV-002 (GOM Authoring)
    │     Generates GOM draft from platform templates
    │     Customizes for operator's specific operations
    │     Manages revision through internal approval chain
    │     Prepares POI submission package
    │
    ├─→ AV-030 (FAR Compliance)
    │     Validates all documents against 14 CFR requirements
    │     Cross-references OpSpec paragraphs
    │     Identifies gaps before FSDO submission
    │
    └─→ Operator submits to FSDO → POI review → Approval
          │
          └─→ Operator uploads FAA-signed documents to Vault
                │
                └─→ Workers switch from templates to approved docs
```

## Onboarding Decision Gate

When an aviation operator first activates workers, the onboarding flow presents a decision:

### Path 1: "I have an existing Part 135 certificate and approved documents"
- Upload: Certificate, OpSpecs, GOM, MEL, Training Program, Maintenance Program
- Workers validate document structure and recency
- Persistent document reminder is removed once core docs are uploaded
- AV-002 and AV-001 shift to maintenance/amendment mode

### Path 2: "I'm seeking a new Part 135 certificate" or "I don't have approved documents yet"
- ALL workers are immediately usable with platform reference templates
- Persistent reminder appears on every worker output: "Operating with reference templates — upload your approved documents for accuracy"
- AV-001 activates in certification mode (5-phase process) to help obtain certification
- AV-002 activates in initial authoring mode (templates as starting point) to help draft GOM
- Reminder persists until operator uploads their FAA-approved documents
- The reminder cannot be dismissed, muted, or hidden — it is a Tier 0 safety obligation

### Path 3: "I operate under Part 91 only"
- Part 91 operations do not require a GOM, MEL, or OpSpecs
- Workers operate in Part 91 mode with manufacturer documents (POH/AFM) as reference
- AV-P01 through AV-P06 (Pilot Suite) work regardless of certification status
- Persistent reminder still appears until the pilot uploads their aircraft-specific POH/AFM:
  > CAUTION — REFERENCE MATERIAL ONLY. You are using platform reference POH/AFM data, not your own aircraft-specific documents. Reference data is based on manufacturer type data and may not reflect your aircraft's actual equipment, weight and balance, limitations, or supplements. Verify all speeds, weights, and procedures against the POH/AFM in your aircraft before flight. Upload your aircraft-specific POH/AFM for accurate data.

### Onboarding Acknowledgment — Assumption of Risk
During onboarding, the operator MUST acknowledge (cannot skip, cannot proceed without acceptance):

> **ASSUMPTION OF RISK AND DOCUMENT RESPONSIBILITY ACKNOWLEDGMENT**
>
> By proceeding, I acknowledge and accept the following:
>
> 1. All platform-provided documents — including white-label GOM, SOP, MEL, NEF, AFM/POH extracts, flight operations procedures, checklists, and any other reference materials — are GENERIC EXAMPLES provided for training, familiarization, and document drafting purposes ONLY.
>
> 2. These documents have NOT been reviewed, approved, or accepted by the FAA, any foreign civil aviation authority, or any other regulatory body for my specific operation, aircraft fleet, personnel, or equipment.
>
> 3. These documents may contain procedures, limitations, weight and balance values, performance data, MEL items, or operational guidance that DIFFER from what is approved for my specific aircraft and operation. Using unapproved procedures or data in flight operations can result in regulatory violations, unsafe conditions, injury, or death.
>
> 4. I am solely responsible for ensuring that all documents used in my operation are my own FAA-approved, current, and aircraft-specific versions. This includes but is not limited to: General Operations Manual (GOM), Standard Operating Procedures (SOP), Minimum Equipment List (MEL), Non-Essential Equipment Furnishings list (NEF), Pilot Operating Handbook / Airplane Flight Manual (POH/AFM), Operations Specifications (OpSpecs), Training Program, and Maintenance Program.
>
> 5. Until I upload my own FAA-approved documents, every worker output will include a persistent disclaimer that I am operating with reference templates. I understand this disclaimer cannot be dismissed, hidden, or muted.
>
> 6. TitleApp provides document templates and AI-assisted tools as aids. TitleApp does not certify, warrant, or guarantee the accuracy, completeness, or regulatory compliance of any platform-provided reference material for any specific operation.
>
> 7. I accept full responsibility for verifying all data, procedures, and limitations against my own approved documents before using any platform output for operational decisions, dispatch, training, maintenance, or flight operations.

This acknowledgment is logged as an immutable Vault event with timestamp, user identity, IP address, and the version of the acknowledgment text accepted. The acknowledgment version is tracked — if the text is updated, operators are re-prompted on next login.

## Document Validation Rules

When a client uploads a document, workers verify:

1. **Structural completeness** — required sections present per 14 CFR 135.23
2. **Currency** — revision date within acceptable range
3. **Consistency** — OpSpec paragraphs match the operations the client configures
4. **Cross-reference integrity** — GOM references align with MEL, training program, etc.

Validation failures produce soft flags (recommendations) not hard stops, because the FAA has already approved the document. The exception: if a document appears to be for a different operator (company name mismatch), that is a hard stop.

## Reference Template Usage by Worker

| Worker | Uses Templates For | Uses Client Docs For |
|--------|-------------------|---------------------|
| AV-001 | Certification checklist structure | Client's actual OpSpecs, certificate status |
| AV-002 | GOM drafting starting point | Client's current GOM for revisions |
| AV-004 | MEL structure validation | Client's approved MEL for dispatch decisions |
| AV-009 | Duty time rule reference | Client's GOM duty time policies (if more restrictive) |
| AV-013 | Mission planning procedure reference | Client's GOM dispatch procedures |
| AV-029 | General aviation knowledge | Client's complete document set for briefings |
| AV-030 | Compliance checklist templates | Client's documents for compliance audit |
| AV-032 | Scheduling rule reference | Client's GOM crew scheduling policies |
