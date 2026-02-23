# Universal Onboarding Flow

## Overview

Six-step onboarding that works across all verticals. Goal: deliver first value within 2 minutes.

## Paths

| Path | Steps | Verticals |
|------|-------|-----------|
| Business | 6 (0-5) | Auto, Real Estate, Analyst |
| AI Service | -- | Coming soon |
| Vault (Personal) | 4 (skips 1,2) | Consumer |

## Steps

### Step 0 -- Choose Your Path
User selects Business, AI Service (disabled), or Personal Vault. Business reveals vertical picker (Auto, Real Estate, Investment). Terms accepted via inline checkbox.

AI chat behavior: Greet user, explain paths briefly.

### Step 1 -- Business Basics
Conversational form, one question at a time. Collects business name, tagline, jurisdiction.

Vertical extras:
- Auto: franchise / independent / BHPH
- Real Estate: sales / property management / both
- Analyst: strategy (PE, RE Investment, VC, Hedge, Family Office)

Vault: skipped.

AI chat behavior: Explain why jurisdiction matters for compliance.

### Step 2 -- Integrations Discovery
Card grid of tools per vertical. User toggles "I use this" on each. All marked "Coming Soon" -- passive recording only.

Vault: skipped.

AI chat behavior: Explain that connectors will auto-import data when ready.

### Step 3 -- Data Import / Sample Data
Two choices:
- Upload files (CSV, XLSX, PDF) -- creates tenant first, then uploads
- Explore with sample data -- staggered loading animation, then creates tenant
- Skip for now -- creates tenant with dataSource: "none"

AI chat behavior: Explain both options, recommend sample data for first-timers.

### Step 4 -- First Value Moment
AI insight card showing 3 findings from sample data, color-coded by urgency. Skipped when dataSource is "none".

AI chat behavior: Walk through each insight, explain what the AI found.

### Step 5 -- Magic / Completion
Animated welcome screen with progress bar. Calls claimTenant API with full payload. Sets localStorage keys and transitions to workspace hub.

## Onboarding State Schema

Stored in localStorage as `ONBOARDING_STATE` (JSON):

```json
{
  "path": "business",
  "vertical": "auto",
  "dataSource": "sample",
  "completedAt": "2026-02-23T..."
}
```

Also sent to backend in `onboardingState` field of claimTenant payload.

## API Payload

POST `/v1/onboarding:claimTenant`

```json
{
  "tenantName": "Demo Motors",
  "tenantType": "business",
  "vertical": "auto",
  "jurisdiction": "IL",
  "tagline": "Your trusted dealer since 1998",
  "integrations": ["cdk", "vauto", "autotrader"],
  "verticalConfig": { "dealerType": "franchise" },
  "onboardingState": { "path": "business", "vertical": "auto", "dataSource": "sample" }
}
```
