# TitleApp — Universal RAAS Scaffold
## Part 1 of 5 | Session 23a
### Every Digital Worker inherits this foundation from Worker #1

---

## 1.1 — Four-Tier RAAS Compliance Architecture

Every worker operates under four mandatory compliance tiers. Tiers cascade — a higher tier cannot override a lower tier. When building workers in Claude Code terminals (not the dev workspace in titleapp.ai), each worker MUST conform to this scaffold before deployment.

### Tier 0 — Platform Safety (Immutable, set by TitleApp)
- No worker may generate content that causes legal, financial, or physical harm
- No worker may impersonate a licensed professional (lawyer, CPA, engineer, broker) — workers ADVISE and ANALYZE, they do not practice
- No worker may execute transactions — workers RECOMMEND actions, humans APPROVE and EXECUTE
- All outputs include appropriate disclaimers based on worker domain
- All data stays within the user's Vault scope (Org, Personal, or Shared)
- PII handling follows platform encryption and access control standards
- No worker may access another user's Vault without explicit Shared workspace invitation

### Tier 1 — Industry Regulations (Set per industry suite, enforced platform-wide)
- Real Estate: Fair Housing Act, RESPA, TILA, Dodd-Frank, state-specific licensing disclosures
- Construction: OSHA standards, ICC building codes, ADA/FHA accessibility, prevailing wage (Davis-Bacon where applicable)
- Finance: SEC regulations (Reg D, Reg A+, Reg CF), FINRA rules, state Blue Sky laws, accredited investor verification requirements
- Environmental: NEPA, state CEQA equivalents, ESA, Clean Water Act, NHPA Section 106
- Insurance: State DOI regulations, surplus lines requirements, NAIC standards
- Each worker's Tier 1 rules are defined in its RAAS config and cannot be overridden by company or user preferences

### Tier 2 — Company Policies (Set by organization admin)
- Investment thesis and criteria (e.g., Scott's: 7%+ cap rate, value-add multifamily, Southeast US)
- Approval workflows and signing authority thresholds
- Preferred vendors, lenders, contractors
- Internal reporting templates and naming conventions
- Risk tolerance parameters
- Required document formats and branding

### Tier 3 — User Preferences (Set by individual user)
- Communication style (detailed vs. summary, formal vs. casual)
- Default output formats (PDF, Excel, PowerPoint)
- Notification preferences and frequency
- Dashboard layout and default views
- Units and currency formatting
- Language preferences

---

## 1.2 — Universal Worker Schema

Every worker, regardless of domain, follows this schema:

```yaml
worker:
  id: "W-XXX"
  name: "Display Name"
  slug: "url-slug"                    # titleapp.ai/workers/{slug}
  suite: "suite-name"                 # Which industry suite
  phase: "Phase X — Phase Name"       # Lifecycle phase
  type: "standalone|pipeline|composite|copilot"
  pricing:
    monthly: XX
    annual_discount: 20%              # Standard across platform
  status: "live|development|waitlist"

  raas:
    tier_0: "inherited"               # All workers inherit platform safety
    tier_1: []                        # Industry-specific regulations
    tier_2_schema: []                 # What org admins CAN configure
    tier_3_schema: []                 # What users CAN configure

  capabilities:
    inputs: []                        # What this worker accepts
    outputs: []                       # What this worker produces
    documents: []                     # Document templates via Document Engine
    analyzes: []                      # What it evaluates/scores

  vault:
    reads_from: []                    # Data from other workers
    writes_to: []                     # Data for other workers
    triggers: []                      # What activates this worker

  referrals:
    receives_from: []                 # Workers that send work here
    sends_to: []                      # Workers this sends work to
    trigger_conditions: []            # Data conditions for referrals

  alex_registration:
    capabilities_summary: ""          # One-line for Alex routing
    accepts_tasks_from_alex: true|false
    priority_level: "critical|high|normal|low"
    notification_triggers: []
    daily_briefing_contribution: ""

  landing:
    headline: ""                      # iPod test — outcome, not feature
    subhead: ""
    value_props: []                   # Max 4: make money, save money, save time, stay compliant
    cta: "Start Free | Join Waitlist"
```

---

## 1.3 — Document Engine Integration

Every worker generates documents through the shared Document Engine (Tier 0 infrastructure). Workers don't build their own generators — they pass structured data to the Document Engine with a template ID.

```yaml
document_request:
  template_id: "template-name"
  worker_id: "W-XXX"
  output_format: "pdf|xlsx|pptx|docx"
  data: {}                            # Worker-specific structured data
  branding:
    source: "org|platform"            # Org branding from Tier 2, or TitleApp default
  compliance:
    disclaimers: []                   # Auto-injected from worker's Tier 1
    generated_by: "Worker Name"
    timestamp: "ISO-8601"
    version: "1.0"
```

---

## 1.4 — Alex (Chief of Staff) Integration

Every worker registers with Alex for orchestration. Free with 3+ worker subscriptions.

```yaml
alex_registration:
  worker_id: "W-XXX"
  capabilities_summary: ""            # One-line for routing
  accepts_tasks_from_alex: true|false
  priority_level: "critical|high|normal|low"
  notification_triggers: []           # When Alex alerts user
  daily_briefing_contribution: ""     # Morning briefing line item
```

---

## 1.5 — Universal Disclaimers by Domain

Auto-appended to every worker output:

| Domain | Disclaimer |
|--------|-----------:|
| Financial Analysis | "For informational purposes only. Not investment advice. Consult a licensed financial advisor." |
| Legal / Contracts | "For informational purposes only. Not legal advice. Consult a licensed attorney." |
| Tax / Accounting | "For informational purposes only. Not tax advice. Consult a licensed CPA." |
| Construction / Engineering | "Does not replace licensed professional engineering review." |
| Environmental | "Preliminary review only. Does not replace formal environmental assessment." |
| Insurance | "For informational purposes only. Consult a licensed insurance professional." |
| Real Estate Brokerage | "Not a broker opinion of value. Consult a licensed real estate professional." |
| Appraisal | "Not a certified appraisal. Obtain a certified appraisal for lending/legal purposes." |

---

## 1.6 — Worker Build Checklist (Gate Before Deploy)

- [ ] Worker ID assigned and unique
- [ ] Slug registered in URL architecture
- [ ] RAAS Tier 0 inherited (confirmed)
- [ ] RAAS Tier 1 regulations defined
- [ ] RAAS Tier 2 schema defined (org config options)
- [ ] RAAS Tier 3 schema defined (user config options)
- [ ] Input schema defined
- [ ] Output schema defined
- [ ] Document templates registered with Document Engine
- [ ] Vault read/write contracts defined
- [ ] Referral triggers mapped (receives_from / sends_to)
- [ ] Alex registration complete
- [ ] Landing page copy written (iPod test passed)
- [ ] Waitlist page live at titleapp.ai/workers/{slug}
- [ ] Disclaimer auto-injection confirmed
- [ ] Tested with at least one real-world scenario

---

## Catalog Numbering Note

W-030 was missing in the original catalog — now assigned to **Appraisal & Valuation Review**. New workers W-049 through W-052 fill identified gaps. Total catalog: ~52 workers.

**New additions:**
- W-030 Appraisal & Valuation Review (Phase 0/3 horizontal, $59/mo)
- W-049 Property Insurance & Risk (Phase 5-6, $49/mo)
- W-050 Disposition Marketing & Data Room (Phase 7, $59/mo)
- W-051 Investor Reporting & Distributions (Phase 6, $79/mo)
- W-052 Debt Service & Loan Compliance (Phase 6, $49/mo)
