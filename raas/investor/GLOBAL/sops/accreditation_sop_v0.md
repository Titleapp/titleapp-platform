# SOP: Accredited Investor Verification

**Version:** v0
**Domain:** Investor Relations
**Last Updated:** 2026-03-01

## Purpose

Establish a consistent process for verifying investor accreditation status in compliance with SEC Regulation D, Rules 506(b) and 506(c).

## Applicability

Required for all 506(c) offerings (mandatory third-party verification). Recommended for 506(b) offerings (self-certification with reasonable belief standard).

## Verification Methods

### Method 1: Self-Attestation (506(b) only)

1. Investor completes accreditation questionnaire
2. Investor selects qualifying criteria:
   - Income: $200K+ individual / $300K+ joint for past 2 years with expectation of same
   - Net worth: $1M+ excluding primary residence
   - Professional certifications: Series 7, 65, or 82
   - Entity: All equity owners are accredited
   - Knowledgeable employee of fund
3. System records attestation with timestamp and IP address
4. Status set to `self_attested`
5. Review by fund administrator within 5 business days

### Method 2: Third-Party Verification (506(c) required)

1. Investor directed to verification provider
2. Acceptable verification methods:
   - CPA/attorney/broker-dealer letter (within 90 days)
   - Tax return review (prior 2 years)
   - Financial statement review
   - W-2/1099 review with written confirmation
3. Verification letter uploaded to data room
4. Administrator reviews and approves
5. Status set to `verified`
6. Verification valid for 90 days (re-verification required for subsequent investments after 90 days)

### Method 3: Entity Verification

1. Entity type documented (LLC, LP, trust, corporation)
2. For look-through entities: verify each equity owner individually
3. For entities with $5M+ in assets: verify total assets
4. Formation documents uploaded
5. Status set to `entity_verified`

## Status Lifecycle

```
unverified → self_attested → verified → expired
                                ↓
                          re_verification_required
```

## Audit Trail Requirements

Every verification event must record:
- Investor ID and name
- Verification method used
- Qualifying criteria selected
- Timestamp and IP address
- Reviewing administrator (if applicable)
- Expiration date

## Escalation

- Incomplete documentation: request additional materials within 3 business days
- Conflicting information: escalate to compliance officer
- Expired verification: notify investor 30 days before expiration
