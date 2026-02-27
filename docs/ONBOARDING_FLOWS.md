# Onboarding Flows Summary

## Overview

TitleApp AI now has comprehensive onboarding flows for both business and consumer accounts, with vertical-specific configuration and full liability protection.

## Flow Architecture

### Common: Terms & Conditions (MANDATORY)
**Step 1** for all users before account creation:
- Comprehensive release of liability
- No financial/legal/professional advice disclaimer
- User assumes all responsibility
- Must scroll to bottom and check agreement box
- Protects against:
  - Investment advice lawsuits
  - Aviation safety incidents
  - Copyright claims
  - Data loss / security breaches
  - Professional liability
  - Any other claims

**Key Protections:**
- No warranty (AS-IS service)
- Limitation of liability ($100 or fees paid, whichever is less)
- Indemnification clause
- Class action waiver
- Binding arbitration in Delaware

---

## Business Account Onboarding

**URL:** `titleapp.io/business` or `/business`

### Flow Steps:

1. **Terms & Conditions** ← NEW
   - Must scroll and agree before proceeding

2. **Welcome Screen**
   - Brand introduction
   - "Create Your Account" CTA

3. **Company Setup**
   - Company name *
   - Industry dropdown:
     - Automotive
     - Real Estate
     - Aviation
     - Marine
     - **Investment / PE** ← Triggers special flow
     - Other
   - State / Jurisdiction dropdown

4. **Investment Criteria** (Analyst vertical only) ← NEW
   - **Choice: Novice vs. Experienced**

   **Novice Path:**
   - "I'm new to investing"
   - Choose risk tolerance:
     - Conservative (20% IRR min)
     - Balanced (15% IRR min) ← Default
     - Aggressive (12% IRR min)
   - System sets sensible defaults:
     - Evidence-first analysis
     - Red flags for high-risk (crypto, pre-revenue)
     - 2x equity multiple minimum

   **Experienced Path:**
   - "I have a target box"
   - Define custom criteria:
     - Deal types (PE, CRE, refinance, etc.)
     - Min Net IRR (%)
     - Min Cash-on-Cash (%)
     - Min Equity Multiple (x)
     - Risk Tolerance
     - Deal Size Range ($)

   **Skip Option:**
   - "Configure later in Settings"

5. **Magic Moment** ← NEW
   - ✨ Bouncing emoji animation
   - "Welcome to TitleApp AI!"
   - "Your AI-powered business platform is ready"
   - Auto-redirects after 2.5 seconds

6. **Redirects to Dashboard**

### Data Stored:

```javascript
// In Firestore tenants/{tenantId}
{
  name: "Acme Capital",
  tenantType: "business",
  vertical: "analyst",
  jurisdiction: "GLOBAL",
  riskProfile: {
    target_asset_types: ["private_equity"],
    min_net_irr: 15,
    min_equity_multiple: 2.0,
    risk_tolerance: "medium",
    onboarding_preset: "experienced"
  },
  createdAt: "timestamp",
  createdBy: "uid"
}
```

### Digital Worker Integration:

When analyzing deals, backend:
1. Fetches `tenant.riskProfile` from Firestore
2. Injects criteria into AI prompt
3. Enforces hard stops (e.g., deal IRR < min_net_irr → automatic PASS with 💩)

---

## Consumer Account Onboarding

**URL:** `titleapp.io` or `titleapp.ai`

### Flow Steps:

1. **Terms & Conditions** ← NEW
   - Same comprehensive waiver as business

2. **Welcome Screen**
   - 🔐 Vault branding
   - "Get Started" CTA

3. **Personal Setup**
   - Your name *
   - "What you'll get" benefits list

4. **What to Add First?** ← NEW
   - **Option 1: Pilot Credentials**
     - ✈️ "Create Pilot DTC with certificates, ratings, and flight logbook"
     - Triggers Pilot Onboarding Step

   - **Option 2: Start Empty**
     - 📦 "I'll add items later (vehicles, property, documents, etc.)"
     - Skip to magic moment

5. **Pilot Onboarding** (if selected) ← NEW
   - **Quick Start** (default):
     - Full name *
     - FAA Certificate Number *
     - Creates basic Pilot DTC
     - Details added later

   - **Complete Setup**:
     - Certificates & ratings (checkboxes)
     - Type ratings (text)
     - Medical class & expiration
     - Total hours, PIC hours
     - Creates comprehensive Pilot DTC

6. **Magic Moment** ← NEW
   - 🎉 Bouncing emoji
   - "Welcome, {Name}!"
   - "Your personal vault is ready"

7. **Redirects to Dashboard**

### Data Stored:

```javascript
// In Firestore tenants/{tenantId}
{
  name: "John Smith",
  tenantType: "personal",
  vertical: "GLOBAL",
  jurisdiction: "GLOBAL",
  createdAt: "timestamp"
}

// Optional: Pilot onboarding data (stored in localStorage until DTC created)
{
  pilot_name: "John Smith",
  certificate_number: "1234567",
  certificates_held: ["private", "instrument_airplane"],
  type_ratings: ["B-737"],
  medical_class: "first",
  total_hours: 2500,
  pic_hours: 1800,
  setup_mode: "full"
}
```

---

## Aviation Digital Worker Structure (NEW)

Created comprehensive Digital Worker rules for pilot credentials:

**Location:** `/raas/aviation/GLOBAL/`

### Onboarding Questionnaire

**File:** `onboarding/pilot_credentials_questions_v0.json`

Collects:
- Pilot name & FAA certificate number (required)
- Certificates & ratings (multi-select)
- Type ratings (text array)
- Medical class & expiration (select + date)
- Total hours, PIC, instrument, multi-engine, turbine
- Logbook upload (PDF/CSV from ForeFlight)
- Certificate scans (PDF/JPG)
- PRIA records request (boolean)
- API integrations: ForeFlight, Garmin Pilot, FltPlan Go

### Pilot DTC Template

**File:** `templates/pilot_dtc_v0.json`

Structure:
```javascript
{
  metadata: {
    type: "pilot_credentials",
    dtcType: "credential",
    issuer: "faa"
  },
  pilot: {
    name, certificateNumber, email, phone
  },
  certificates: [
    { type, issueDate, limitations }
  ],
  ratings: {
    instrument, multiEngine, typeRatings[]
  },
  medical: {
    class, issueDate, expirationDate, restrictions
  },
  totals: {
    totalTime, picTime, sicTime, crossCountry, night,
    instrumentActual, multiEngine, turbine, jet, etc.
  },
  currency: {
    day: { current, lastFlight, expiresOn },
    night: { current, lastFlight, expiresOn },
    ifr: { current, lastApproach, expiresOn },
    biennial_flight_review: { current, lastCompleted, expiresOn }
  },
  training: [],
  checkrides: [],
  priaRecords: {},
  blockchainProof: {
    hash, network, timestamp, verificationUrl
  },
  verifications: {
    faaRegistry: { verified, verifiedAt, status }
  }
}
```

### Flight Log Entry Template

**File:** `templates/flight_log_entry_v0.json`

Structure:
```javascript
{
  metadata: {
    entryType: "flight",
    source: "manual|foreflight|garmin",
    dtcId: "linked-pilot-dtc"
  },
  flight: {
    date,
    aircraft: { registration, type, category, class, powerplant },
    route: { from, to, via[] },
    times: {
      totalTime, picTime, sicTime, dualReceived, dualGiven,
      crossCountry, night, instrumentActual, instrumentSimulated
    },
    conditions: { day, night, ifr, vfr },
    operations: {
      dayTakeoffs, dayLandings, nightTakeoffs, nightLandings,
      instrumentApproaches, holds
    },
    crew: { pic, sic, instructor, examiner },
    flightType: "training|cross_country|check_ride|etc",
    remarks: "string",
    endorsements: []
  },
  sync: {
    source: "foreflight|garmin|manual",
    sourceId: "external-id",
    syncedAt: "timestamp"
  }
}
```

### Calculations

Each flight log entry triggers:
- ✅ Recalculate 90-day currency
- ✅ Recalculate IFR currency (6 approaches in 6 months)
- ✅ Update total hours in DTC
- ✅ Check BFR expiration (24 calendar months)
- ✅ Check medical expiration

### API Integrations (Planned)

**ForeFlight:**
- OAuth connection
- Automatic sync of flight logs
- Two-way: read logs from ForeFlight, write to ForeFlight

**Jeppesen:**
- Similar OAuth integration
- Logbook sync

**Garmin Pilot:**
- Flight plan and logbook sync

**FAA Airmen Registry:**
- Verify certificate number
- Check for revocations/suspensions
- Pull official records

---

## Testing Checklist

### Business Onboarding

- [ ] Terms show first, must scroll to bottom
- [ ] Agreement checkbox only enabled after scrolling
- [ ] Decline returns to login
- [ ] Accept proceeds to welcome screen
- [ ] Welcome → Company setup works
- [ ] Selecting "Investment / PE" triggers investment criteria step
- [ ] Novice path sets default risk profile
- [ ] Experienced path allows custom criteria
- [ ] Skip option bypasses criteria
- [ ] Magic moment animates correctly
- [ ] Redirects to dashboard with tenant set
- [ ] Risk profile stored in Firestore
- [ ] Analyst section uses risk profile in analysis

### Consumer Onboarding

- [ ] Terms show first
- [ ] Accept → Welcome → Personal setup
- [ ] Create vault → "What to add?" step
- [ ] Select "Pilot Credentials" → Pilot onboarding
- [ ] Quick start mode collects name + cert number
- [ ] Complete setup mode shows all fields
- [ ] Skip returns to "What to add?"
- [ ] Start empty vault skips to magic moment
- [ ] Pilot data stored in localStorage
- [ ] Redirects to dashboard

### Digital Worker Verification

- [ ] `/raas/aviation/` directory created
- [ ] Onboarding questionnaire JSON is valid
- [ ] Pilot DTC template is complete
- [ ] Flight log entry template is complete
- [ ] README.md explains architecture

---

## Deployment URLs

**Production:**
- Business: `https://titleapp.io/business`
- Consumer: `https://titleapp.io` or `https://titleapp.ai`

**Local Testing:**
- Business: `http://localhost:5174`
- Consumer: `http://localhost:5173`

**To Test Fresh Onboarding:**
```javascript
// In browser console:
localStorage.clear();
// Then refresh page
```

---

## Legal Protection Summary

The terms cover:
- ✅ No financial/investment advice
- ✅ No legal/professional advice
- ✅ No aviation safety responsibility
- ✅ No warranty (AS-IS)
- ✅ User assumes all risk
- ✅ Release of liability for all claims
- ✅ Limitation of damages ($100 max)
- ✅ Indemnification by user
- ✅ Copyright/IP disclaimers
- ✅ Class action waiver
- ✅ Binding arbitration in Delaware

**Critical:** User must:
1. Scroll to bottom of terms
2. Check agreement box
3. Click "I Agree"

Cannot proceed without acceptance.

---

## Next Steps (Future)

### Pilot DTC Creation Backend

Need to build endpoint:
```
POST /v1/dtc:create
{
  type: "pilot_credentials",
  pilotData: { ... from onboarding },
  autoVerify: true  // Calls FAA Registry API
}
```

Creates:
1. Pilot DTC in `dtcs` collection
2. Initial logbook entry in `logbookEntries`
3. Blockchain anchor (Polygon)
4. FAA verification record

### ForeFlight Integration

Need to build:
```
POST /v1/integrations:foreflight:connect
GET  /v1/integrations:foreflight:sync
```

OAuth flow → automatic logbook sync

### Currency Tracking

Daily cron job:
- Check all pilot DTCs
- Calculate currency based on recent flights
- Update `currency` fields
- Send notifications if expiring soon

---

## Files Modified/Created

**New Files:**
- `/apps/business/src/components/TermsAndConditions.tsx`
- `/apps/business/src/components/InvestmentCriteriaStep.tsx`
- `/apps/admin/src/components/TermsAndConditions.tsx`
- `/apps/admin/src/components/PilotOnboardingStep.tsx`
- `/raas/aviation/README.md`
- `/raas/aviation/GLOBAL/onboarding/pilot_credentials_questions_v0.json`
- `/raas/aviation/GLOBAL/templates/pilot_dtc_v0.json`
- `/raas/aviation/GLOBAL/templates/flight_log_entry_v0.json`
- `/docs/VERTICAL_ONBOARDING.md`
- `/docs/ONBOARDING_FLOWS.md` (this file)

**Modified Files:**
- `/apps/business/src/components/Onboarding.tsx` - Added terms + investment criteria
- `/apps/admin/src/components/Onboarding.tsx` - Added terms + pilot onboarding
- `/functions/functions/index.js`:
  - Line 372-428: Updated `/onboarding:claimTenant` to accept `riskProfile`
  - Line 2137-2402: Updated `/analyst:analyze` to use tenant's `riskProfile`

---

## Demo Script

**For Investors (Monday Demo):**

1. "Let's onboard a new investment firm"
2. Show terms → scroll → agree
3. Welcome screen
4. Company: "Kent Capital Partners"
5. Industry: "Investment / PE"
6. Jurisdiction: "IL"
7. → Investment criteria step appears
8. Choose "I have a target box"
9. Set: 18% min IRR, 2.5x equity multiple
10. ✨ Magic moment
11. Dashboard loads
12. Go to Analyst section
13. Analyze a deal:
    - Good deal (meets criteria) → 💎 45/100
    - Bad deal (below 18% IRR) → 💩 85/100 "Below your minimum return target"

**For Pilots:**

1. "Let's set up a pilot vault"
2. Terms → agree
3. Welcome
4. Name: "Sean Combs"
5. "What to add?" → Pilot Credentials
6. Quick start:
   - Name: Sean Combs
   - Cert: 1234567
7. → Creates Pilot DTC
8. ✨ Magic moment
9. Dashboard → My Stuff shows Pilot DTC
10. My Logbooks ready for flight entries

---

Ready to test!
