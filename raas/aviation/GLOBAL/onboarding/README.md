# Aviation — Onboarding (GLOBAL)

This folder contains onboarding questionnaires for pilots to create Pilot DTCs and initialize flight logbooks.

## What Onboarding Captures

**File:** `pilot_credentials_questions_v0.json`

**Required:**
- Pilot name (as appears on certificate)
- FAA certificate number (7-10 digits)
- Certificates & ratings held (multi-select)
- Medical certificate class

**Optional:**
- Type ratings (aircraft requiring specific endorsement)
- Medical expiration date
- Hour totals (total, PIC, instrument, multi-engine, turbine)
- Logbook upload (PDF/CSV from ForeFlight, Garmin, Jeppesen)
- Certificate scans (PDF/JPG)
- PRIA records request (FAA employment history)
- API integrations (ForeFlight, Garmin Pilot, FltPlan Go)

## Two Onboarding Paths

### Quick Start (Default)
User provides:
- Name
- Certificate number

System creates:
- Basic Pilot DTC with minimal data
- Empty flight logbook ready for entries
- FAA verification pending

User can add details later in Settings.

### Complete Setup
User provides all fields above.

System creates:
- Comprehensive Pilot DTC
- Pre-populated totals
- FAA verification initiated
- Currency calculations initialized

## What Gets Created

### 1. Pilot DTC

Stored in `dtcs` collection with `type: "pilot_credentials"`:

```javascript
{
  id: "dtc-pilot-123",
  userId: "uid-user",
  type: "pilot_credentials",
  metadata: {
    dtcType: "credential",
    credentialSubtype: "aviation_pilot",
    issuer: "faa",
    jurisdiction: "US"
  },
  pilot: {
    name: "Sean Combs",
    certificateNumber: "1234567",
    email: "sean@example.com"
  },
  certificates: [
    { type: "private", issueDate: "2020-03-15" },
    { type: "instrument_airplane", issueDate: "2021-06-20" },
    { type: "commercial_airplane", issueDate: "2022-09-10" }
  ],
  ratings: {
    instrument: ["airplane"],
    multiEngine: true,
    typeRatings: ["B-737"]
  },
  medical: {
    class: "first",
    issueDate: "2025-12-01",
    expirationDate: "2026-12-31"
  },
  totals: {
    totalTime: 2500,
    picTime: 1800,
    // ... other hour categories
    lastUpdated: "timestamp"
  },
  currency: {
    day: { current: true, expiresOn: "2026-05-15" },
    night: { current: true, expiresOn: "2026-05-15" },
    ifr: { current: true, expiresOn: "2026-08-01" },
    biennial_flight_review: { current: true, expiresOn: "2028-01-15" }
  },
  blockchainProof: {
    hash: "0x1234...",
    network: "polygon",
    timestamp: "2026-02-15T..."
  },
  verifications: {
    faaRegistry: {
      verified: true,
      verifiedAt: "2026-02-15T...",
      status: "active"
    }
  },
  createdAt: "2026-02-15T..."
}
```

### 2. Flight Logbook

Empty collection ready for entries via:
- Manual entry in "My Logbooks" section
- ForeFlight sync (OAuth)
- Garmin Pilot sync
- Jeppesen sync
- CSV import

Each flight entry appends to `logbookEntries` collection with `dtcId` linking back to Pilot DTC.

## Frontend Integration

Consumer app onboarding shows:

**After creating personal vault:**
"What would you like to add first?"
- ✈️ Pilot Credentials
- 📦 Start with empty vault

**If user selects Pilot Credentials:**
→ Shows `PilotOnboardingStep.tsx`
→ Quick Start or Complete Setup paths
→ Stores pilot data in localStorage
→ Magic moment celebration
→ Redirects to dashboard

**On dashboard load:**
- Check for `localStorage.getItem("PILOT_ONBOARDING_DATA")`
- If exists: call `POST /v1/dtc:create` with pilot data
- Create Pilot DTC + initialize logbook
- Clear localStorage flag
- Show success toast: "Pilot DTC created! ✅"

## Backend Workflow

**Endpoint:** `POST /v1/dtc:create`

```javascript
{
  type: "pilot_credentials",
  pilotData: {
    pilot_name: "Sean Combs",
    certificate_number: "1234567",
    certificates_held: ["private", "instrument_airplane"],
    medical_class: "first",
    total_hours: 2500,
    pic_hours: 1800,
    setup_mode: "full"
  },
  autoVerify: true  // Call FAA Registry API
}
```

**Steps:**
1. Validate certificate number format
2. Call FAA Airmen Registry API to verify:
   - Certificate is valid
   - No revocations/suspensions
   - Matches provided name
3. Create DTC document in Firestore
4. Generate blockchain anchor (Polygon)
5. Store blockchain proof in DTC
6. Initialize currency calculations
7. Return DTC ID

**If autoVerify fails:**
- Still create DTC but mark `verifications.faaRegistry.verified: false`
- Allow manual verification later
- Flag for review

## FAA Airmen Registry Integration

**API:** `https://amsws.faa.gov/`

**Endpoints:**
- `/api/airmen/certificate/{certNumber}` - Verify cert exists
- `/api/airmen/search` - Search by name
- `/api/airmen/medical/{certNumber}` - Medical certificate status

**Verification Logic:**
```javascript
async function verifyFAACertificate(certificateNumber, pilotName) {
  try {
    const response = await fetch(
      `https://amsws.faa.gov/api/airmen/certificate/${certificateNumber}`
    );
    const data = await response.json();

    if (!data.found) {
      return { verified: false, reason: "Certificate not found in FAA database" };
    }

    if (data.status === "revoked" || data.status === "suspended") {
      return { verified: false, reason: `Certificate ${data.status}` };
    }

    // Name matching logic (fuzzy)
    const nameMatch = data.name.toLowerCase().includes(pilotName.toLowerCase().split(' ')[1]);

    return {
      verified: nameMatch,
      reason: nameMatch ? "Verified with FAA" : "Name mismatch",
      faaData: data
    };
  } catch (err) {
    return { verified: false, reason: "FAA API unavailable" };
  }
}
```

## Currency Calculations

**Daily Cron Job** (Cloud Scheduler → Cloud Function):

For each Pilot DTC:
1. Query recent flights from `logbookEntries` where `dtcId === pilotDtcId`
2. Calculate:
   - **90-day currency** (day): 3 takeoffs/landings in last 90 days
   - **90-day currency** (night): 3 night takeoffs/landings in last 90 days
   - **IFR currency**: 6 approaches + holds + intercepting/tracking in last 6 months
   - **BFR expiry**: Every 24 calendar months
   - **Medical expiry**: Based on age and certificate class
3. Update `currency` object in DTC
4. If expiring within 30 days: send notification email

**Notification Example:**
```
Subject: ⚠️ IFR Currency Expiring Soon

Your IFR currency expires on March 15, 2026 (14 days).

To remain current, you need:
- 2 more approaches in actual or simulated IMC
- 1 more hold
- Last approach: Jan 10, 2026

Log flights in TitleApp AI or sync from ForeFlight.
```

## ForeFlight Integration (Planned)

**OAuth Flow:**

1. User clicks "Connect ForeFlight" in Settings
2. OAuth redirect to ForeFlight
3. User authorizes TitleApp AI
4. Receive access token
5. Store in `apiIntegrations` collection:

```javascript
{
  userId: "uid",
  dtcId: "dtc-pilot-123",
  provider: "foreflight",
  accessToken: "encrypted",
  refreshToken: "encrypted",
  lastSync: "timestamp",
  syncEnabled: true
}
```

**Sync Workflow:**

Every 6 hours (or on-demand):
1. Fetch flights from ForeFlight API since `lastSync`
2. For each flight:
   - Create `logbookEntry` in Firestore
   - Link to Pilot DTC via `dtcId`
   - Set `source: "foreflight"`
   - Store `sourceId` for deduplication
3. Trigger currency recalculation
4. Update `lastSync` timestamp

**Deduplication:**
- Check `logbookEntries` for existing `sourceId`
- If exists: skip or update
- If new: create entry

## Logbook Import

**CSV/PDF Upload:**

User uploads logbook export (ForeFlight CSV, MyFlightBook, LogTen Pro).

**Parser:**
```javascript
function parseLogbookCSV(csvContent) {
  const rows = csvContent.split('\n');
  const headers = rows[0].split(',');

  // Map headers to our schema
  const fieldMap = {
    'Date': 'date',
    'Aircraft Make/Model': 'aircraft.type',
    'Aircraft ID': 'aircraft.registration',
    'Route': 'route.from',  // Parse "KORD-KMDW"
    'Total Time': 'times.totalTime',
    'PIC': 'times.picTime',
    'Night': 'times.night',
    // ... more mappings
  };

  const flights = rows.slice(1).map(row => {
    const values = row.split(',');
    const flight = {};

    headers.forEach((header, i) => {
      const field = fieldMap[header];
      if (field) {
        // Set nested field
        setNestedValue(flight, field, values[i]);
      }
    });

    return flight;
  });

  return flights;
}
```

**Validation:**
- Check required fields (date, aircraft, totalTime)
- Validate date formats
- Ensure hours are numeric
- Flag invalid entries for manual review

## Security & Privacy

**Sensitive Data:**
- Certificate numbers
- Medical certificates
- Flight logs (may reveal travel patterns)

**Protection:**
- Firestore security rules: only owner can read/write
- Blockchain proof: only hash stored on-chain, not full data
- FAA verification: minimal data exchanged
- API tokens: encrypted at rest

**Sharing:**
- User can generate "verification link" for employers
- Link includes: name, cert number, totals, currency status
- Does NOT include: detailed logbook, SSN, DOB
- Link expires after 30 days or manual revocation

## Related Files

- `/apps/admin/src/components/PilotOnboardingStep.tsx` - Frontend UI
- `/apps/admin/src/components/Onboarding.tsx` - Integration point
- `/raas/aviation/GLOBAL/templates/pilot_dtc_v0.json` - DTC structure
- `/raas/aviation/GLOBAL/templates/flight_log_entry_v0.json` - Logbook entry structure
- `/docs/ONBOARDING_FLOWS.md` - Full onboarding documentation
