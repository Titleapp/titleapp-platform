# Analyst Workflows — GLOBAL

This file lists the available Analyst workflows.

The API reads this file to populate:
GET /v1/raas:workflows?vertical=analyst&jurisdiction=GLOBAL

Do not add workflows here unless they are deterministic
and backed by a ruleset and templates.

---

## Machine-readable workflows (GLOBAL)

```json
{
  "vertical": "analyst",
  "jurisdiction": "GLOBAL",
  "workflows": [
    {
      "id": "an_cre_deal_screen_v0",
      "name": "Commercial Real Estate — Deal Screen (v0)",
      "domain": "commercial-real-estate",
      "description": "Evidence-first screening for CRE acquisitions. Applies tenant risk profile and produces IC memo lite + risk summary.",
      "rulesetRef": "rulesets/cre_deal_screen_v0.json",
      "templates": [
        "templates/ic_memo_lite_v0.json",
        "templates/risk_summary_v0.json",
        "templates/assumptions_register_v0.json",
        "templates/evidence_table_v0.json"
      ]
    },
    {
      "id": "an_pe_deal_screen_v0",
      "name": "Private Equity — Deal Screen (v0)",
      "domain": "private-equity",
      "description": "Evidence-first screening for PE opportunities. Enforces benchmark guardrails and produces IC memo lite + risk summary.",
      "rulesetRef": "rulesets/pe_deal_screen_v0.json",
      "templates": [
        "templates/ic_memo_lite_v0.json",
        "templates/risk_summary_v0.json",
        "templates/assumptions_register_v0.json",
        "templates/evidence_table_v0.json"
      ]
    },
    {
      "id": "an_entitlement_screen_v0",
      "name": "Entitlement — Deal Screen (v0)",
      "domain": "entitlement",
      "description": "Screen entitlement deals with deterministic uncertainty and missing-doc rules. Produces IC memo lite + risk summary.",
      "rulesetRef": "rulesets/entitlement_screen_v0.json",
      "templates": [
        "templates/ic_memo_lite_v0.json",
        "templates/risk_summary_v0.json",
        "templates/assumptions_register_v0.json",
        "templates/evidence_table_v0.json"
      ]
    },
    {
      "id": "an_refinance_screen_v0",
      "name": "Refinance — Package Screen (v0)",
      "domain": "refinance",
      "description": "Screen refinance packages: DSCR/LTV constraints, maturity flags, and missing-doc hard stops. Produces IC memo lite + risk summary.",
      "rulesetRef": "rulesets/refinance_screen_v0.json",
      "templates": [
        "templates/ic_memo_lite_v0.json",
        "templates/risk_summary_v0.json",
        "templates/assumptions_register_v0.json",
        "templates/evidence_table_v0.json"
      ]
    },
    {
      "id": "an_conversion_screen_v0",
      "name": "Conversion — Deal Screen (v0)",
      "domain": "conversion",
      "description": "Screen conversion deals with scope/budget requirements and permit uncertainty flags. Produces IC memo lite + risk summary.",
      "rulesetRef": "rulesets/conversion_screen_v0.json",
      "templates": [
        "templates/ic_memo_lite_v0.json",
        "templates/risk_summary_v0.json",
        "templates/assumptions_register_v0.json",
        "templates/evidence_table_v0.json"
      ]
    },
    {
      "id": "an_debt_acquisition_screen_v0",
      "name": "Debt Acquisition — Deal Screen (v0)",
      "domain": "debt-acquisition",
      "description": "Screen debt acquisition with lien position and collateral clarity requirements. Produces IC memo lite + risk summary.",
      "rulesetRef": "rulesets/debt_acquisition_screen_v0.json",
      "templates": [
        "templates/ic_memo_lite_v0.json",
        "templates/risk_summary_v0.json",
        "templates/assumptions_register_v0.json",
        "templates/evidence_table_v0.json"
      ]
    }
  ]
}
