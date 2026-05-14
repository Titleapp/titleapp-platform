/**
 * CODEX 50.17 P0-4 — Compose securities_compliance_v1 constraint RAAS module.
 *
 * Reads existing investor RAAS substrate (1,414 lines) + 3 orphan rulesets
 * (310 lines) and composes them into the new constraintRaasModules schema.
 * Adds 5 additive sections (anti-fraud, FINRA 2111, B-D Section 15(a),
 * IAA 202(a)(11), blue sky 50-state metadata) with [COUNSEL REVIEW NEEDED]
 * markers for items needing securities-counsel sign-off.
 *
 * Status saved as `draft`. After counsel review, Sean transitions to `live`
 * via /v1/admin:raas:module:transition.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/composeSecuritiesComplianceV1.js          (dry-run, default)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/composeSecuritiesComplianceV1.js --apply  (write)
 */

const path = require("path");
const fs = require("fs");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });

const cm = require(path.join(__dirname, "..", "functions", "functions", "services", "raas", "constraintModules"));

const DRY = !process.argv.includes("--apply");
const MODULE_ID = "securities_compliance_v1";

// ═══════════════════════════════════════════════════════════════
//  SECTION DEFINITIONS — composed from existing substrate
// ═══════════════════════════════════════════════════════════════

// --- From ir_compliance_v0.json hard_stops ---
const HARD_STOP_SECTIONS = [
  {
    sectionId: "regd-506c-all-accredited",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Reg D 506(c): all investors must be accredited",
    body_markdown:
      "Under Rule 506(c), every investor in the offering must be a verified accredited investor. There are no exceptions. Self-attestation is NOT sufficient — third-party verification (CPA, attorney, broker-dealer letter, or registered investment adviser) within 90 days is required.\n\nIf any investor is not accredited, the offering loses its 506(c) safe harbor. General solicitation is permitted under 506(c) ONLY because of the verification gate.\n\nDISPOSITION: block_with_explanation if proposed offering language references 506(c) but verification is not in place.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "hard_stops.unaccredited_506c" }],
  },
  {
    sectionId: "regd-506b-max-35-nonaccredited",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Reg D 506(b): max 35 non-accredited investors per offering",
    body_markdown:
      "Under Rule 506(b), no more than 35 non-accredited investors may participate in the offering. Non-accredited investors must be sophisticated (alone or with their purchaser representative) and must receive specified disclosure (audited financials in many cases).\n\nGeneral solicitation is PROHIBITED under 506(b). Rely on pre-existing substantive relationships.\n\nDISPOSITION: block_with_explanation if non-accredited count exceeds 35 OR if marketing language constitutes general solicitation.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "hard_stops.exceed_nonaccredited_506b" }],
  },
  {
    sectionId: "reg-cf-5m-cap",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Regulation Crowdfunding: $5M raise cap per 12-month period",
    body_markdown:
      "Regulation Crowdfunding (Reg CF) limits the issuer to $5,000,000 raised per rolling 12-month period. The offering must be conducted through a registered funding portal or broker-dealer.\n\nDISPOSITION: block_with_explanation if total raised in the trailing 12 months exceeds $5M.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "hard_stops.exceed_reg_cf_limit" }],
  },
  {
    sectionId: "reg-a-tier1-20m-cap",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Reg A Tier 1: $20M raise cap per 12-month period",
    body_markdown:
      "Regulation A Tier 1 limits the issuer to $20M raised per 12-month period. State registration ('blue sky') applies — Tier 1 does NOT preempt state registration.\n\nDISPOSITION: block_with_explanation if total raised in the trailing 12 months exceeds $20M.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "hard_stops.exceed_reg_a_tier1" }],
  },
  {
    sectionId: "reg-a-tier2-75m-cap",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Reg A+ Tier 2: $75M raise cap per 12-month period",
    body_markdown:
      "Regulation A+ Tier 2 limits the issuer to $75M raised per 12-month period. Tier 2 PREEMPTS state registration but requires audited financials, ongoing reporting, and investor investment limits (10% of greater of net worth or income for non-accredited investors).\n\nDISPOSITION: block_with_explanation if total raised in the trailing 12 months exceeds $75M.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "hard_stops.exceed_reg_a_tier2" }],
  },
  {
    sectionId: "kyc-required-pre-investment",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "KYC verification required before any investment is accepted",
    body_markdown:
      "Every investor must complete identity verification (KYC) before the issuer accepts their investment. KYC includes: government ID verification, address verification, sanctions screening (OFAC SDN list — call /v1/ofac:screen), and politically-exposed-person (PEP) screening for institutional investors.\n\nDISPOSITION: block_with_explanation if investor.kycVerified is false.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "hard_stops.missing_kyc" }],
  },
  // --- From ir_fund_v0.json hard_stops ---
  {
    sectionId: "fund-formation-lpa-required",
    priority: "high",
    section_type: "hard_stop_rule",
    title: "Fund formation: Limited Partnership Agreement required",
    body_markdown:
      "A fund formation cannot proceed without a Limited Partnership Agreement (LPA) (or Operating Agreement for LLCs structured as funds). The LPA defines GP authority, fee structures, distribution waterfall, GP commitment, fund life, and investor rights.\n\nDISPOSITION: block_with_explanation if docs.lpa is missing.",
    source_refs: [{ docId: "ir_fund_v0.json", section: "hard_stops.missing_lpa" }],
  },
  {
    sectionId: "fund-gp-commit-min",
    priority: "high",
    section_type: "hard_stop_rule",
    title: "Fund formation: GP commitment must meet tenant-configured minimum",
    body_markdown:
      "If the tenant has configured a minimum GP commitment percentage (`tenant.min_gp_commit_pct`), the GP commitment must meet or exceed it. GP skin-in-the-game is a key alignment indicator for LPs.\n\nDISPOSITION: block_with_explanation if `tenant.min_gp_commit_pct` is configured and `metrics.gpCommitPct` < threshold.",
    source_refs: [{ docId: "ir_fund_v0.json", section: "hard_stops.gp_commit_below_min" }],
  },
  {
    sectionId: "fund-mgmt-fee-cap",
    priority: "high",
    section_type: "hard_stop_rule",
    title: "Fund formation: management fee must not exceed tenant-configured maximum",
    body_markdown:
      "If the tenant has configured a maximum management fee (`tenant.max_mgmt_fee`), the management fee must not exceed it. Management fees above market norms (>2% annually) materially impact LP net returns.\n\nDISPOSITION: block_with_explanation if `tenant.max_mgmt_fee` is configured and `metrics.managementFee` > threshold.",
    source_refs: [{ docId: "ir_fund_v0.json", section: "hard_stops.mgmt_fee_above_max" }],
  },
  // --- From ir_syndication_v0.json hard_stops ---
  {
    sectionId: "syndication-rent-roll-required",
    priority: "high",
    section_type: "hard_stop_rule",
    title: "CRE syndication: rent roll required for underwriting",
    body_markdown:
      "A commercial real estate syndication cannot be underwritten without a rent roll. The rent roll establishes current revenue, tenant credit quality, lease maturities, and concentration risk.\n\nDISPOSITION: block_with_explanation if docs.rentRoll is missing.",
    source_refs: [{ docId: "ir_syndication_v0.json", section: "hard_stops.missing_rent_roll" }],
  },
];

// --- Soft flags (compliance-relevant warnings) ---
const SOFT_FLAG_SECTIONS = [
  {
    sectionId: "concentration-risk-25pct",
    priority: "standard",
    section_type: "soft_flag",
    title: "Single investor > 25% of total raise — concentration risk",
    body_markdown:
      "A single investor committing more than 25% of the total raise creates concentration risk. If that investor exits or fails to fund, the deal is materially impaired. Document the relationship and the contingency.\n\nDISPOSITION: flag_for_review.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "soft_flags.large_single_investor" }],
  },
  {
    sectionId: "missing-ppm",
    priority: "high",
    section_type: "soft_flag",
    title: "Reg D offering without Private Placement Memorandum",
    body_markdown:
      "Reg D offerings should provide a Private Placement Memorandum (PPM) to investors describing the offering, risks, terms, and use of proceeds. While not strictly required for 506(b) sales to all-accredited investors, the PPM is the primary anti-fraud disclosure document — its absence increases Rule 10b-5 exposure.\n\nDISPOSITION: flag_for_review.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "soft_flags.missing_ppm" }],
  },
  {
    sectionId: "missing-subscription-agreement",
    priority: "standard",
    section_type: "soft_flag",
    title: "Reg D offering without subscription agreement template",
    body_markdown:
      "Every Reg D offering should have a subscription agreement template that captures investor representations (accreditation status, suitability, anti-money-laundering acknowledgments) and the issuer's representations to the investor. Absence creates execution risk.\n\nDISPOSITION: flag_for_review.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "soft_flags.missing_subscription_agreement" }],
  },
  {
    sectionId: "approaching-506b-limit",
    priority: "standard",
    section_type: "soft_flag",
    title: "Approaching Reg D 506(b) non-accredited investor limit (28+/35)",
    body_markdown:
      "When non-accredited investor count reaches 80% of the 506(b) limit (28+ of 35), proactively manage further inquiries. Decline additional non-accredited subscriptions or pivot to 506(c) for marketing-driven inflow (with attendant verification requirements).\n\nDISPOSITION: flag_for_review.",
    source_refs: [{ docId: "ir_compliance_v0.json", section: "soft_flags.approaching_investor_limit" }],
  },
  {
    sectionId: "fund-high-carry-no-hurdle",
    priority: "standard",
    section_type: "soft_flag",
    title: "Fund: carry > 20% with no hurdle rate (misaligned incentives)",
    body_markdown:
      "Carried interest above 20% without a hurdle rate represents misaligned incentives. The standard 2/20 structure with an 8% preferred return (hurdle) ensures LPs receive return-of-capital + minimum return before GP earns carry.\n\nDISPOSITION: flag_for_review.",
    source_refs: [{ docId: "ir_fund_v0.json", section: "soft_flags.high_carry_no_hurdle" }],
  },
  {
    sectionId: "fund-no-clawback",
    priority: "high",
    section_type: "soft_flag",
    title: "Fund: no GP clawback provision (LP downside risk)",
    body_markdown:
      "A clawback provision requires the GP to return distributions if subsequent fund performance shows the GP took carry on profits that did not materialize over the fund's life. Absence increases LP downside risk and is a significant negative signal.\n\nDISPOSITION: flag_for_review.",
    source_refs: [{ docId: "ir_fund_v0.json", section: "soft_flags.no_clawback" }],
  },
];

// --- SOPs from existing markdown ---
const SOP_SECTIONS = [
  {
    sectionId: "accreditation-three-methods",
    priority: "high",
    section_type: "sop",
    title: "Accreditation verification — three permitted methods",
    body_markdown:
      "Three methods of investor accreditation, each with its own status and validity:\n\n1. **Self-Attestation** (506(b) only): Investor attests that they meet income ($200K+/$300K+ joint) or net worth ($1M+ excluding primary residence) thresholds, OR holds Series 7/65/82 license. Status: `self_attested`. Admin reviews within 5 business days.\n\n2. **Third-Party Verification** (REQUIRED for 506(c)): Letter from CPA, attorney, broker-dealer, or registered investment adviser dated within the last 90 days. Status: `verified`. Valid 90 days from letter date.\n\n3. **Entity Verification**: For investing entities, verify entity has $5M+ in assets OR all owners are individually accredited (look-through). Status: `entity_verified`.\n\nStatus lifecycle: unverified → self_attested → verified → expired → re_verification_required.",
    source_refs: [{ docId: "raas/investor/GLOBAL/sops/accreditation_sop_v0.md" }],
  },
  {
    sectionId: "waterfall-four-tier-standard",
    priority: "standard",
    section_type: "sop",
    title: "Waterfall distribution — standard four-tier structure",
    body_markdown:
      "The standard four-tier waterfall (configurable per fund/deal):\n\n1. **Tier 1 — Return of Capital**: 100% to investors until all contributed capital is returned (pro-rata by commitment percentage).\n2. **Tier 2 — Preferred Return**: Cumulative preferred return (typically 8% annual, 100% to LPs).\n3. **Tier 3 — GP Catch-Up**: 100% to GP until GP receives target carry % of total profits (typically 20%).\n4. **Tier 4 — Carried Interest Split**: Remaining proceeds split per deal terms (typically 80/20 LP/GP).\n\nAllocation formula: `investor_distribution = lp_distribution_from_waterfall × (investor_commitment / total_commitments)`.",
    source_refs: [{ docId: "raas/investor/GLOBAL/sops/distribution_sop_v0.md" }],
  },
  {
    sectionId: "tax-character-tracking",
    priority: "standard",
    section_type: "sop",
    title: "Distribution tax character — track per-distribution",
    body_markdown:
      "Each distribution has a tax character that flows through to investor K-1s:\n- Return of capital (non-taxable; reduces basis)\n- Ordinary income (operating cash distributions in excess of basis)\n- Capital gain (gains on disposition events)\n- Section 1231 gain (real estate disposition gains)\n\nMis-classification creates K-1 errors that require amended returns and damage GP-LP trust. Coordinate with CPA before issuing K-1s.",
    source_refs: [{ docId: "raas/investor/GLOBAL/prompts/investor-reporting-distributions-system-prompt.md" }],
  },
];

// --- 5 additive sections (gaps identified in CODEX 50.17 spec) ---
const ADDITIVE_SECTIONS = [
  {
    sectionId: "antifraud-rule-10b-5-broad",
    priority: "critical",
    section_type: "guidance",
    title: "Anti-fraud framework — Rule 10b-5 and beyond",
    body_markdown:
      "Rule 10b-5 prohibits any material misstatement or omission in connection with the purchase or sale of any security. The rule applies regardless of registration exemption or offering size — there is no de minimis carve-out.\n\nMaterial means a reasonable investor would consider it important in deciding to invest. Examples of material facts that must NOT be misstated and must NOT be omitted:\n- Use of proceeds (where the money goes)\n- Background of management (litigation, bankruptcy, regulatory actions)\n- Conflicts of interest (related-party transactions, GP/LP conflicts)\n- Financial condition (audited where applicable, otherwise reviewed)\n- Risk factors (specific to the offering)\n- Track record (past fund performance, with caveats)\n\nGUARANTEE LANGUAGE IS PROHIBITED. \"Guaranteed return,\" \"risk-free,\" \"can't lose,\" \"sure thing\" — never use these. Always frame returns as targets with risk disclosure.\n\n[COUNSEL REVIEW NEEDED] — expand with specific common violations counsel sees in early-stage fundraising.",
    source_refs: [{ docId: "additive", section: "anti-fraud" }],
  },
  {
    sectionId: "finra-2111-suitability",
    priority: "high",
    section_type: "guidance",
    title: "FINRA Rule 2111 — suitability obligation (when broker-dealer involved)",
    body_markdown:
      "When a registered broker-dealer participates in the offering (placement agent, selling group member), FINRA Rule 2111 imposes a suitability obligation. The broker-dealer must have reasonable grounds to believe the security is suitable for the customer based on:\n\n- Customer profile (age, net worth, income, investment objectives, risk tolerance, tax status, investment experience, liquidity needs)\n- Quantitative suitability (overall portfolio composition)\n- Customer-specific suitability (this particular security for this particular customer)\n\nThis obligation is on the broker-dealer, but the issuer must support the broker-dealer's suitability analysis with accurate offering disclosure.\n\n[COUNSEL REVIEW NEEDED] — confirm whether issuer has any direct obligations under 2111 versus only via the broker-dealer.",
    source_refs: [{ docId: "additive", section: "finra-2111" }],
  },
  {
    sectionId: "broker-dealer-section-15a-triggers",
    priority: "critical",
    section_type: "guidance",
    title: "Broker-dealer registration triggers — Section 15(a) of the Exchange Act",
    body_markdown:
      "Section 15(a) of the Securities Exchange Act of 1934 requires registration as a broker-dealer for any person 'engaged in the business of effecting transactions in securities for the account of others.' For issuer fundraises, registration is typically NOT required IF:\n\n- The issuer (or the issuer's officers/directors/employees with no transaction-based compensation) effects the sales\n- No transaction-based compensation is paid to the salesperson\n- The salesperson has not been a broker-dealer in the past 12 months\n- Safe harbor: Rule 3a4-1 specifies conditions for officer/employee involvement\n\nRED FLAGS — likely require broker-dealer registration:\n- Paying placement agent or finder fees calculated as % of capital raised\n- Engaging a third party to solicit investors with success-based comp\n- Hiring 'IR consultants' compensated based on raises closed\n\n[COUNSEL REVIEW NEEDED] — confirm safe harbors and current SEC enforcement positions on finder fees and placement-agent arrangements.",
    source_refs: [{ docId: "additive", section: "broker-dealer-15a" }],
  },
  {
    sectionId: "ia-section-202-a-11-triggers",
    priority: "critical",
    section_type: "guidance",
    title: "Investment-adviser registration triggers — Section 202(a)(11) of the Advisers Act",
    body_markdown:
      "Section 202(a)(11) of the Investment Advisers Act of 1940 defines an 'investment adviser' as 'any person who, for compensation, engages in the business of advising others ... as to the value of securities or as to the advisability of investing in, purchasing, or selling securities.'\n\nThree elements: (1) compensation, (2) business of advising, (3) advice as to securities.\n\nManager of a private fund typically is an investment adviser. Common federal registration thresholds:\n- $100M+ AUM: SEC registration required\n- $25-100M AUM: state registration generally; SEC if multiple states\n- Private Fund Adviser exemption (3 (m)): adviser solely to private funds with <$150M US AUM may rely on exempt reporting adviser (ERA) status — limited reporting, no full registration\n- Venture Capital Fund Adviser exemption (3(l)): adviser solely to venture capital funds may be exempt\n- Family Office exception: certain family offices excluded entirely\n\nState-level: most states require IA registration for advisers with <$100M AUM and even smaller thresholds.\n\n[COUNSEL REVIEW NEEDED] — pin down the right exemption pathway for the user's specific structure (Fundraise users will have varied AUM and structure profiles).",
    source_refs: [{ docId: "additive", section: "iaa-202" }],
  },
];

// --- Blue sky 50-state metadata (per D-12) ---
// Template: { state, code, notice_filing_required, form, fee_min, fee_max, deadline_days, notes }
// Counsel reviews and corrects state-by-state. This is best-effort from public knowledge as of 2024-2025.
const BLUE_SKY_50_STATES = [
  // Northeast
  { state: "Connecticut", code: "CT", notice_filing_required: true, form: "Form D copy + CT Form NF", fee_min: 150, fee_max: 150, deadline_days: 15, notes: "Fee paid via check or IARD" },
  { state: "Maine", code: "ME", notice_filing_required: true, form: "Form D copy + ME-specific NF", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "Massachusetts", code: "MA", notice_filing_required: true, form: "Form D copy via IARD", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "Filed via NASAA Electronic Filing Depository (EFD)" },
  { state: "New Hampshire", code: "NH", notice_filing_required: true, form: "Form D copy + NH NF", fee_min: 500, fee_max: 500, deadline_days: 15, notes: "" },
  { state: "New Jersey", code: "NJ", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "New York", code: "NY", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 300, fee_max: 1200, deadline_days: 15, notes: "Fee scales with offering size; 506 offerings now use Form D, post-2020 Martin Act reform" },
  { state: "Pennsylvania", code: "PA", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 525, fee_max: 525, deadline_days: 15, notes: "" },
  { state: "Rhode Island", code: "RI", notice_filing_required: true, form: "Form D copy + RI NF", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "Vermont", code: "VT", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 600, fee_max: 600, deadline_days: 15, notes: "" },
  // Mid-Atlantic / South
  { state: "Delaware", code: "DE", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  { state: "Florida", code: "FL", notice_filing_required: true, form: "Form D copy + FL NF", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  { state: "Georgia", code: "GA", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "Maryland", code: "MD", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "North Carolina", code: "NC", notice_filing_required: true, form: "Form D copy + NC NF", fee_min: 350, fee_max: 350, deadline_days: 15, notes: "" },
  { state: "South Carolina", code: "SC", notice_filing_required: true, form: "Form D copy + SC NF", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "Virginia", code: "VA", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "West Virginia", code: "WV", notice_filing_required: true, form: "Form D copy + WV NF", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "District of Columbia", code: "DC", notice_filing_required: true, form: "Form D copy + DC NF", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  // Midwest
  { state: "Illinois", code: "IL", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  { state: "Indiana", code: "IN", notice_filing_required: true, form: "Form D copy + IN U-2 (consent to service)", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  { state: "Iowa", code: "IA", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 100, fee_max: 100, deadline_days: 15, notes: "" },
  { state: "Kansas", code: "KS", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "Kentucky", code: "KY", notice_filing_required: true, form: "Form D copy + KY U-2", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "Michigan", code: "MI", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 100, fee_max: 100, deadline_days: 15, notes: "" },
  { state: "Minnesota", code: "MN", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 100, fee_max: 100, deadline_days: 15, notes: "" },
  { state: "Missouri", code: "MO", notice_filing_required: true, form: "Form D copy + MO NF", fee_min: 100, fee_max: 100, deadline_days: 15, notes: "" },
  { state: "Nebraska", code: "NE", notice_filing_required: true, form: "Form D copy + NE NF", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  { state: "North Dakota", code: "ND", notice_filing_required: true, form: "Form D copy + ND NF", fee_min: 100, fee_max: 100, deadline_days: 15, notes: "" },
  { state: "Ohio", code: "OH", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 100, fee_max: 100, deadline_days: 15, notes: "" },
  { state: "South Dakota", code: "SD", notice_filing_required: true, form: "Form D copy + SD NF", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "Wisconsin", code: "WI", notice_filing_required: true, form: "Form D copy + WI NF", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  // South Central
  { state: "Alabama", code: "AL", notice_filing_required: true, form: "Form D copy + AL U-2", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "Arkansas", code: "AR", notice_filing_required: true, form: "Form D copy + AR NF", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "Louisiana", code: "LA", notice_filing_required: true, form: "Form D copy + LA NF", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "Mississippi", code: "MS", notice_filing_required: true, form: "Form D copy + MS U-2", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
  { state: "Oklahoma", code: "OK", notice_filing_required: true, form: "Form D copy + OK NF", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "Tennessee", code: "TN", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 500, fee_max: 500, deadline_days: 15, notes: "" },
  { state: "Texas", code: "TX", notice_filing_required: true, form: "Form D copy + TX NF", fee_min: 500, fee_max: 500, deadline_days: 15, notes: "Texas State Securities Board" },
  // Mountain
  { state: "Arizona", code: "AZ", notice_filing_required: true, form: "Form D copy + AZ NF", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "" },
  { state: "Colorado", code: "CO", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 75, fee_max: 75, deadline_days: 15, notes: "" },
  { state: "Idaho", code: "ID", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 80, fee_max: 80, deadline_days: 15, notes: "" },
  { state: "Montana", code: "MT", notice_filing_required: true, form: "Form D copy + MT NF", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  { state: "Nevada", code: "NV", notice_filing_required: true, form: "Form D copy + NV NF", fee_min: 350, fee_max: 350, deadline_days: 15, notes: "" },
  { state: "New Mexico", code: "NM", notice_filing_required: true, form: "Form D copy + NM NF", fee_min: 350, fee_max: 350, deadline_days: 15, notes: "" },
  { state: "Utah", code: "UT", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 60, fee_max: 60, deadline_days: 15, notes: "" },
  { state: "Wyoming", code: "WY", notice_filing_required: true, form: "Form D copy + WY NF", fee_min: 200, fee_max: 200, deadline_days: 15, notes: "" },
  // Pacific
  { state: "Alaska", code: "AK", notice_filing_required: true, form: "Form D copy + AK NF", fee_min: 600, fee_max: 600, deadline_days: 15, notes: "" },
  { state: "California", code: "CA", notice_filing_required: true, form: "Form D copy + CA Form 25102(f)", fee_min: 25, fee_max: 300, deadline_days: 15, notes: "Fee scales with offering size; CA DFPI" },
  { state: "Hawaii", code: "HI", notice_filing_required: true, form: "Form D copy + HI NF", fee_min: 250, fee_max: 250, deadline_days: 15, notes: "Sean's home state" },
  { state: "Oregon", code: "OR", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 225, fee_max: 225, deadline_days: 15, notes: "" },
  { state: "Washington", code: "WA", notice_filing_required: true, form: "Form D copy via EFD", fee_min: 300, fee_max: 300, deadline_days: 15, notes: "" },
];

function blueSkyMarkdown() {
  const rows = BLUE_SKY_50_STATES.map(s =>
    `| ${s.code} | ${s.state} | ${s.notice_filing_required ? "Yes" : "No"} | $${s.fee_min}${s.fee_min !== s.fee_max ? `–$${s.fee_max}` : ""} | ${s.deadline_days}d | ${s.form}${s.notes ? " — " + s.notes : ""} |`
  ).join("\n");
  return `Reg D 506 offerings are NSMIA-preempted from state registration but most states still require a notice filing — typically a copy of Form D plus a state-specific notice form, filed within 15 days of the first sale in the state, with a per-state filing fee.\n\n[COUNSEL REVIEW NEEDED] — verify each state's current fee, form, and deadline; counsel may have a preferred filing service (e.g., NASAA EFD covers most but not all states).\n\n| Code | State | Filing Required | Fee | Deadline | Form / Notes |\n|---|---|---|---|---|---|\n${rows}\n\nFOR COMPREHENSIVE OFFERINGS (Reg A Tier 1, Reg CF, intrastate exemptions): per-state registration analysis required — this table covers Reg D 506 only.`;
}

// ═══════════════════════════════════════════════════════════════
//  EXECUTION
// ═══════════════════════════════════════════════════════════════

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Composing securities_compliance_v1\n`);

  const allSections = [
    ...HARD_STOP_SECTIONS,
    ...SOFT_FLAG_SECTIONS,
    ...SOP_SECTIONS,
    ...ADDITIVE_SECTIONS,
    {
      sectionId: "blue-sky-50-state-table",
      priority: "high",
      section_type: "filing_requirement",
      title: "Blue sky filings — 50 states + DC (Reg D 506)",
      body_markdown: blueSkyMarkdown(),
      source_refs: [{ docId: "additive", section: "blue-sky-50-state" }],
    },
  ];

  console.log(`Composed ${allSections.length} sections:`);
  console.log(`  - ${HARD_STOP_SECTIONS.length} hard-stop rules`);
  console.log(`  - ${SOFT_FLAG_SECTIONS.length} soft flags`);
  console.log(`  - ${SOP_SECTIONS.length} SOPs`);
  console.log(`  - ${ADDITIVE_SECTIONS.length} additive (anti-fraud, FINRA 2111, B-D 15(a), IA 202(a)(11))`);
  console.log(`  - 1 blue-sky 50-state table`);

  const totalEstimate = allSections.reduce((sum, s) => sum + Math.ceil((s.body_markdown || "").length / 4), 0);
  console.log(`Total token estimate: ~${totalEstimate}`);

  if (DRY) {
    console.log("\nFirst section preview:");
    console.log("  id:", allSections[0].sectionId);
    console.log("  priority:", allSections[0].priority);
    console.log("  type:", allSections[0].section_type);
    console.log("  title:", allSections[0].title);
    console.log("  body length:", allSections[0].body_markdown.length, "chars");
    console.log("\nDRY RUN — no writes. Run with --apply to create the module.\n");
    process.exit(0);
  }

  // Create the module
  try {
    await cm.createModule({
      moduleId: MODULE_ID,
      name: "Securities Compliance",
      description: "Reg D / Reg A / Reg CF mechanics, accreditation verification, anti-fraud, FINRA 2111, broker-dealer triggers, IA registration triggers, blue sky 50-state notice filings.",
      domain: "securities",
      jurisdiction_scope: ["US-federal", ...BLUE_SKY_50_STATES.map(s => `US-state-${s.code}`)],
      disposition_default: "block_with_explanation",
    });
    console.log(`✅ Module created: ${MODULE_ID}`);
  } catch (e) {
    if (/already exists/.test(e.message)) {
      console.log(`⚠️  Module ${MODULE_ID} exists — adding any missing sections only.`);
    } else {
      throw e;
    }
  }

  // Add sections
  let order = 0;
  let added = 0;
  let skipped = 0;
  for (const s of allSections) {
    try {
      await cm.addSection({ moduleId: MODULE_ID, ...s, order: order++ });
      added++;
    } catch (e) {
      if (/already exists/.test(e.message)) {
        skipped++;
        continue;
      }
      console.error(`❌ Failed to add section ${s.sectionId}:`, e.message);
    }
  }
  console.log(`\n✅ Sections added: ${added}, skipped (already existed): ${skipped}`);
  console.log(`\nModule status: draft. To promote:`);
  console.log(`  1. Review via GET /v1/admin:raas:module:get?moduleId=${MODULE_ID}&includeSections=1`);
  console.log(`  2. Counsel reviews + revises sections via /v1/admin:raas:module:section:update`);
  console.log(`  3. POST /v1/admin:raas:module:counsel { moduleId, reviewer, approval_notes }`);
  console.log(`  4. POST /v1/admin:raas:module:transition { moduleId, status: "live" }`);
  console.log(`  5. Wire constraintRaasSources: [{moduleId: "${MODULE_ID}", required: true, load_when: "always"}] onto Fundraise + Marketing worker docs.\n`);

  process.exit(0);
})().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
