# Vertical-Specific Onboarding Architecture

This document explains how TitleApp AI uses vertical-specific onboarding to configure RAAS (Rules as a Service) for personalized analysis.

## Overview

Each vertical (Analyst, Auto, Real Estate, etc.) can have its own onboarding questionnaire that collects parameters RAAS uses to enforce tenant-specific rules. This ensures the AI analysis is personalized to each business's criteria.

## Current Implementation

### Analyst Vertical (Investment/PE)

**Onboarding Flow:**
1. User creates business account and selects "Investment / PE" industry
2. System detects analyst vertical and shows investment criteria step
3. User chooses experience level:
   - **Novice**: Guided setup with sensible defaults (15% IRR, 2x equity multiple, evidence-first analysis)
   - **Experienced**: Define custom target box (IRR, equity multiple, deal size, risk tolerance)
   - **Skip**: Can configure later in Settings

**Parameters Collected:**
- `target_asset_types`: Deal types to screen (PE, CRE, refinance, etc.)
- `min_net_irr`: Minimum net IRR target (%)
- `min_cash_on_cash`: Minimum cash-on-cash return (%)
- `min_equity_multiple`: Minimum equity multiple (e.g., 2.0x)
- `risk_tolerance`: Conservative / Balanced / Aggressive
- `deal_size_min` / `deal_size_max`: Deal size range in USD

**Storage:**
```javascript
// In Firestore tenants/{tenantId}
{
  name: "Acme Capital",
  vertical: "analyst",
  jurisdiction: "GLOBAL",
  riskProfile: {
    target_asset_types: ["private_equity"],
    min_net_irr: 15,
    min_equity_multiple: 2.0,
    risk_tolerance: "medium",
    onboarding_preset: "experienced"
  }
}
```

**RAAS Integration:**
When analyzing deals, the backend:
1. Fetches tenant's `riskProfile` from Firestore
2. Injects criteria into AI prompt as "Investor's Target Box"
3. Enforces hard stops (e.g., if deal IRR < min_net_irr → automatic PASS with 💩 emoji)
4. Uses risk tolerance to adjust evidence requirements

**Example Analysis Prompt:**
```
**Investor's Target Box (YOUR CRITERIA):**
- Minimum Net IRR: 15%
- Minimum Equity Multiple: 2.0x
- Risk Tolerance: medium
- Deal Size Range: $500,000 - $10,000,000

**CRITICAL**: If this deal does NOT meet the investor's minimum return targets,
it is an automatic PASS. Mark it with 💩 emoji and high risk score (80+).
```

### Other Verticals

**Auto Dealers:**
- Currently: Simple setup (company name, jurisdiction)
- Future: Could add brands sold, new/used focus, service capabilities

**Real Estate:**
- Currently: Simple setup (company name, jurisdiction)
- Future: Property types, transaction types, geographic markets, price ranges

**Aviation, Marine, etc.:**
- Currently: Simple setup
- Future: Vertical-specific parameters as needed

## RAAS Source Files

Onboarding questionnaires are defined in `/raas/{vertical}/{jurisdiction}/onboarding/`:

- **`onboarding_questionnaire_v0.json`** - Top-level onboarding flow
- **`risk_profile_questions_v0.json`** - Risk/return parameters
- **`data_access_questions_v0.json`** - API integration preferences
- **`model_intake_questions_v0.json`** - Custom model upload

Example: `/raas/analyst/GLOBAL/onboarding/risk_profile_questions_v0.json`

These JSON files are machine-readable and version-controlled, allowing:
- Frontend to dynamically render forms from RAAS definitions
- Backend to validate parameters against schema
- Versioned rollout of new parameters (v0 → v1)

## Implementation Details

### Backend Endpoint

**`POST /v1/onboarding:claimTenant`**
```javascript
{
  tenantName: "Acme Capital",
  tenantType: "business",
  vertical: "analyst",
  jurisdiction: "GLOBAL",
  riskProfile: {
    target_asset_types: ["private_equity"],
    min_net_irr: 15,
    min_equity_multiple: 2.0,
    risk_tolerance: "medium"
  }
}
```

Stores `riskProfile` in tenant document for later use.

### Analysis Endpoint

**`POST /v1/analyst:analyze`**
```javascript
// In /functions/functions/index.js
const tenantDoc = await db.collection("tenants").doc(ctx.tenantId).get();
const riskProfile = tenantDoc.data()?.riskProfile || {};

// Inject into AI prompt
const analysisPrompt = `
  **Investor's Target Box:**
  - Minimum Net IRR: ${riskProfile.min_net_irr}%
  ...
`;
```

### Frontend Components

**`/apps/business/src/components/Onboarding.tsx`**
- Main onboarding flow
- Detects vertical and conditionally shows investment criteria step

**`/apps/business/src/components/InvestmentCriteriaStep.tsx`**
- Novice mode: Preset configurations with guidance
- Experienced mode: Custom parameter entry
- Skip option: Configure later in Settings

## Design Principles

### 1. Quick Start, Deep Later
- Onboarding collects MINIMUM viable parameters
- Users can refine in Settings after getting started
- Novice users get sensible defaults immediately

### 2. Evidence-First
- All parameters are optional except risk tolerance
- Missing parameters don't block analysis
- RAAS uses provided parameters as gates, not requirements

### 3. Versioned Evolution
- Onboarding questionnaires are versioned (v0, v1, etc.)
- New parameters can be added without breaking existing tenants
- Backend checks `onboarding_preset` to understand tenant's configuration depth

### 4. Multi-Vertical Ready
- Architecture supports any vertical having custom onboarding
- Each vertical's parameters are isolated in `riskProfile` or `verticalConfig`
- RAAS rules reference tenant parameters via dot notation (e.g., `tenant.min_net_irr`)

## Future Enhancements

### Near-Term
1. **Settings UI**: Allow users to edit risk profile after onboarding
2. **Benchmark Upload**: Let experienced investors upload example approved deals
3. **Multi-Model Comparison**: Show how deal scores under different criteria

### Long-Term
1. **Auto Vertical Onboarding**:
   - Brands sold (new/used)
   - Service capabilities
   - Inventory management preferences
   - F&I products offered

2. **Real Estate Onboarding**:
   - Property types (residential, commercial, industrial)
   - Transaction types (sales, leases, property management)
   - Geographic markets
   - Price/cap rate ranges

3. **Dynamic Questionnaire Rendering**:
   - Frontend reads RAAS JSON files directly
   - Automatically renders forms from schema
   - No hard-coded questions in UI

4. **Tenant Model Upload**:
   - Upload Excel underwriting models
   - System extracts assumptions and formulas
   - Uses tenant's model as baseline for analysis

## Testing

**Test Analyst Onboarding:**
1. Clear localStorage and logout
2. Sign up with new email
3. Choose "Investment / PE" as industry
4. Select "I'm new to investing" → Verify defaults (15% IRR, 2x multiple)
5. Or select "I have a target box" → Enter custom criteria
6. Submit deal for analysis
7. Verify analysis respects your criteria (auto-PASS if below minimums)

**Verify Backend Integration:**
```bash
# Check tenant document in Firestore
firebase firestore get tenants/{tenantId}

# Should see riskProfile field with your parameters
```

## Related Files

- `/raas/analyst/GLOBAL/onboarding/*.json` - Onboarding questionnaires
- `/raas/analyst/GLOBAL/rulesets/pe_deal_screen_v0.json` - PE screening rules
- `/functions/functions/index.js` - Backend endpoints (lines 372-428, 2137-2402)
- `/apps/business/src/components/Onboarding.tsx` - Frontend onboarding
- `/apps/business/src/components/InvestmentCriteriaStep.tsx` - Investment criteria form

## Key Invariant

**RAAS rules use tenant parameters, NOT hard-coded assumptions.**

Example from `pe_deal_screen_v0.json`:
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

This ensures every tenant gets personalized analysis based on THEIR criteria, not generic rules.
