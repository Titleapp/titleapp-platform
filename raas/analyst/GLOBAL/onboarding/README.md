# Analyst — Onboarding (GLOBAL)

This folder contains machine-consumable question sets used to initialize a tenant
so Analyst workflows can run deterministically.

## What Onboarding Captures

**1. Risk/Return Profile** (`risk_profile_questions_v0.json`):
- Target deal types (PE, CRE, refinance, etc.)
- Minimum return thresholds (IRR, cash-on-cash, equity multiple)
- Debt constraints (LTV, DSCR)
- Risk tolerance (low/medium/high)
- Deal size range

**2. Data Access** (`data_access_questions_v0.json`):
- API subscriptions (PitchBook, CB Insights, etc.)
- Third-party integrations (Salesforce, Airtable)
- Data room access preferences

**3. Model Intake** (`model_intake_questions_v0.json`):
- Custom Excel underwriting models
- Proprietary scoring algorithms
- Tenant-specific formulas

**4. Benchmark Anchoring** (optional):
- Upload 1-3 example approved deals
- System calibrates analysis to match tenant's historical decisions
- Not prescriptive - used as reference only

## Integration with Analysis

When analyzing deals, Digital Worker rules reference tenant parameters:

**Example from `pe_deal_screen_v0.json`:**
```json
{
  "hard_stops": [
    {
      "id": "returns_below_target",
      "logic": "if tenant.min_net_irr provided AND deal.net_irr < tenant.min_net_irr"
    }
  ]
}
```

**This means:**
- If tenant set `min_net_irr: 15%` during onboarding
- AND deal projects 12% IRR
- → Automatic PASS with 💩 emoji and 80+ risk score

## Onboarding Presets

**Novice** (`onboarding_preset: "novice"`):
- System-defined defaults
- Conservative parameters (15-20% IRR min)
- Evidence-first enforcement
- Red flags for high-risk sectors

**Experienced** (`onboarding_preset: "experienced"`):
- User-defined custom criteria
- Flexible parameter ranges
- Optional benchmarking
- Advanced multi-angle analysis

## Frontend Integration

Business app onboarding detects `vertical === "analyst"` and shows:

**Path 1: "I'm new to investing"**
- Guided setup with education
- Choose risk tolerance only
- System sets all other defaults

**Path 2: "I have a target box"**
- Custom parameter entry
- Define exact criteria
- Optional: skip for now, configure in Settings later

## Data Storage

Parameters stored in Firestore `tenants/{tenantId}`:

```javascript
{
  name: "Acme Capital",
  vertical: "analyst",
  jurisdiction: "GLOBAL",
  riskProfile: {
    target_asset_types: ["private_equity"],
    min_net_irr: 15,
    min_cash_on_cash: 8,
    min_equity_multiple: 2.0,
    risk_tolerance: "medium",
    deal_size_min: 500000,
    deal_size_max: 10000000,
    onboarding_preset: "experienced"
  }
}
```

## Workflow Trigger

When user submits onboarding:
1. Frontend calls `POST /v1/onboarding:claimTenant` with `riskProfile`
2. Backend stores in tenant document
3. Future `POST /v1/analyst:analyze` calls fetch `riskProfile`
4. AI prompt injection: "Investor's Target Box: Min IRR 15%..."
5. Hard stops enforced: deals below criteria auto-rejected

## Versioning

- Current: `v0`
- Future: `v1` may add:
  - Sector preferences (SaaS, Healthcare, etc.)
  - Geography restrictions
  - ESG criteria
  - Co-investment requirements
  - Exit timeline preferences

Add-only versioning: never modify `v0`, create `v1` instead.

## Related Files

- `/apps/business/src/components/InvestmentCriteriaStep.tsx` - Frontend UI
- `/apps/business/src/components/Onboarding.tsx` - Integration point
- `/functions/functions/index.js` (line 372-428) - Backend storage
- `/functions/functions/index.js` (line 2137-2402) - Analysis integration
- `/docs/VERTICAL_ONBOARDING.md` - Architecture overview
