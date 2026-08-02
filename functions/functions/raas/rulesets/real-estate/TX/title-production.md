# Texas Title Production Rules
# Jurisdiction: TX | Vertical: real-estate | Suite: title-production
# Authority: Texas Department of Insurance; Texas Title Insurance Basic Manual (TIRBM)
# Owner: SOCIII Inc — not modifiable by opco tenant admins (see TX-T-011)
# Version: 1.0 | Created: 2026-08-01 | lastVerifiedDate: 2026-08-01

TX-T-001: PROMULGATED RATES
Title insurance premiums must be calculated per the current TDI rate schedule (TIRBM
Procedural Rule P-1). No deviation, discount, or negotiation is permitted. The rate
schedule is embedded in raas/rulesets/real-estate/TX/tdi-rate-schedule.json.

Rate table file must carry a top-level `lastVerifiedDate` field (ISO date string).
RAAS emits a WARN (Operating Feed, not page) if `lastVerifiedDate` is > 365 days old.
Freshness owner: Sean (or designated title counsel). Review cadence: annually and
whenever TDI issues a TIRBM amendment. TDI rate change notices are at tdi.texas.gov.

Code-level enforcement: premium calculation must be deterministic arithmetic in
raasEngine.validate(), not a prompt constraint. Gate: |calculated - expected| <= $0.01.

TX-T-002: COMMITMENT FORM
All title commitments must use TDI-promulgated form T-7. No custom commitment language.
Schedules A, B-1, and B-2 must conform to TIRBM requirements.

TX-T-003: POLICY FORMS
Owner's policy: T-1. Lender's policy: T-2. Lender's reissue: T-2R. Other forms as
promulgated by TDI. No custom policy language.

TX-T-004: SEARCH REQUIREMENT
Title search must cover a minimum of 25 years from the effective date, or back to a
prior title insurance policy of sufficient coverage, per standard underwriter guidelines.
For agricultural or rural property with complex history, 40 years minimum.

TX-T-005: WET CLOSE
Texas default is wet close (funds received before recording). Dry close requires written
authorization from all parties including the lender. The system must not emit
title.closing_recorded before title.funds_received total equals required-to-close amount,
unless an explicit dry_close_authorization event has been recorded.

Code-level enforcement: sum all title.funds_received amounts for the order, compare to
requiredToCloseCents on the order document. Hard-block title.closing_recorded write if
short and no dry_close_authorization event exists. Deterministic Firestore query in
raasEngine.validate() — not a prompt guard.

TX-T-006: HOMESTEAD
Texas Constitution Art. 16 §50: homestead property has specific protections. A
refinance of a Texas homestead may only be a rate/term refi or a home equity loan under
§50(a)(6) — which carries the 80% LTV cap, 12-day cooling-off period, and other
requirements. Flag when the property type is homestead and the transaction is a refi.

TX-T-007: COMMUNITY PROPERTY
Texas is a community property state. Both spouses must join in any conveyance or
encumbrance of community property homestead. Flag when vesting shows a married individual
without spouse joinder on a homestead property.

TX-T-008: ATTORNEY EXCEPTION
A Texas licensed attorney may perform title and escrow functions without a title
insurance agent license, subject to Texas Insurance Code §2651.054. The system must
accept attorney-role users as authorized to perform escrow officer functions if they
are a licensed Texas attorney (role: attorney_escrow).

TX-T-009: ESCROW OFFICER LICENSURE
Non-attorney escrow officers must hold a Texas title agent license (individual) or act
under the supervision of a licensed title company. Verify license status via TDI lookup
before enabling escrow disbursement functions.

TX-T-010: AFFILIATED BUSINESS DISCLOSURE
If the title company, real estate broker, and/or lender have common ownership or a
referral arrangement, RESPA §8(c)(4) requires an Affiliated Business Arrangement
Disclosure Statement delivered at or before settlement service referral. Canonical source
of truth: affiliatedOpco flag on the tenant configuration document. Both the RE Advocate
and the Mortgage Advocate read from this same flag — no independent order-level detection.

TX-T-011: PLATFORM RULESET OWNERSHIP
This ruleset is owned and versioned by SOCIII Inc. Opco tenant admin accounts do not
have write access to this ruleset. Any change requires a SOCIII platform deploy. This
prevents ordinary commercial pressure from quietly loosening these regulatory constraints.

---

## RAAS Gate Definitions

### title_commitment_ready
Pre-issuance gate. All conditions must pass:
1. title.search_complete event exists for this order
2. No P0 defects open (all title.defect_logged P0 events have title.defect_cleared)
3. No P1 defects open (all title.defect_logged P1 events have title.defect_cleared)
4. Schedule A vesting matches the current chain owner (last title.ownership_found event)
5. Policy amount >= sale price (owner's) or loan amount (lender's)
6. Commitment not issued after search expiry (TDI: 90 days from effective date)

### title_defects_cleared
Pre-underwriting gate:
- All P0 and P1 defects must be in cleared status
- P2 defects may be accepted as B-2 exceptions with underwriter sign-off

### title_policy_issuance
Hardest gate in the platform. All seven must pass — implemented as deterministic
Firestore queries in raasEngine.validate(), not prompt guards:
1. title.search_complete event exists
2. No open P0 or P1 defects
3. title.commitment_issued exists and commitment has not expired (<=90 days)
4. title.funds_received total >= required-to-close amount
5. title.closing_recorded event exists
6. Premium calculated per current TDI rate table — no deviation
7. Licensed underwriter (verified role on tenant) has provided sign-off
Any failure = hard block. No exceptions.

### escrow_balanced_before_close
Total disbursements <= total receipts at close (hard block).

### wet_close_funding_required
title.closing_recorded cannot emit until receipts = required-to-close (see TX-T-005).

### dual_approval_over_threshold
Disbursements >= $50,000 require two approvers from the tenant.

### no_commission_before_funding
Real estate commission disbursement cannot precede lender wire receipt.

### re_advocate_affiliated_opco_disclosure
If affiliatedOpco: true on tenant config, RE Advocate must surface affiliated business
disclosure before any title-related guidance. Disclosure is a durable append-only event,
not a session flag: title.disclosure_acknowledged written to titleOrders/{orderId}/events/
or disclosures/{uid}_{sessionId}. Hash-chained with the rest of the order events.

### chain_data_must_have_source
Raw-fact chain events (title.lien_found, title.ownership_found, title.judgment_found,
title.tax_status_found) must be written programmatically by the data-ingestion pipeline
at the moment the ATTOM or DataTree API response returns. The AI has no code path to
emit these events. sourceRef is populated by the ingestion pipeline with the actual API
response ID before the AI sees the data. If the API call fails, no event is written.
title.defect_logged is a deliberate carve-out: the AI may author defect classifications,
but every fact cited must already exist as a prior pipeline-written chain event.

---

## Disclosure Language Templates

### Affiliated Opco Disclosure (TX-T-010 / RESPA §8)
"SOCIII holds an ownership interest in the title company handling this transaction.
That means SOCIII benefits financially if this closing completes with this title company.
You are not required to use this title company. This tool still works for you regardless
of which title company you choose."

### Mineral Severance Disclosure (B-2 Exception)
"Minerals and mineral rights, including but not limited to oil, gas and other minerals,
as reserved in [instrument reference]. Surface rights only conveyed."

### Homestead Refi Warning (TX-T-006)
"This property has an active homestead designation. Texas Constitution Art. 16 §50
restricts refinancing of homestead property. A home equity loan under §50(a)(6) requires
an 80% LTV cap, a 12-day cooling-off period, and other requirements. Review with
licensed Texas title counsel before proceeding."
