# Pilot Records Upload and Generation Test Plan

## Test File
- **Location:** `/Users/seancombs/Downloads/Test files/Pilot test/pilot_records_kowalski.xlsx`
- **Required Sheets:**
  - ✅ Pilot Profile (contains personal info, certificates, ratings)
  - ✅ Flight Log (contains detailed flight entries)

## Test Environment
- **Admin App URL:** http://localhost:5173
- **Section:** Pilot Records (navigate after login)
- **Vertical:** aviation
- **Jurisdiction:** IL (or any)

## Test Steps

### 1. Upload Pilot Records File
1. Navigate to http://localhost:5173
2. Sign in with test credentials
3. Click on "Pilot Records" in the navigation
4. Click the file upload input
5. Select `/Users/seancombs/Downloads/Test files/Pilot test/pilot_records_kowalski.xlsx`
6. Wait for upload and parsing to complete

**Expected Results:**
- File uploads successfully to Cloud Storage
- Backend receives fileId and initiates parsing
- "Uploading file..." message appears
- "Parsing pilot records and creating DTCs/logbooks..." message appears

### 2. Verify Parse Results

**Expected Output in Parse Results Card:**
- **Certificates Created:** 2 (FAA Certificate + Student ID)
- **Logbook Entries:** [Number of flight log rows from Excel]
- **Total Flight Time:** [Sum of all Total Time values]

**Pilot Profile Display:**
- Name: [Value from "Full Legal Name" field]
- Certificate Number: [Value from "FAA Certificate Number" field]
- Certificate Type: [Value from "Certificate Type" field]

**Certificates Created:**
- ✓ FAA Certificate (with DTC ID)
- ✓ Student ID (with DTC ID)

### 3. Verify FAA Form 8710-1 Experience

Click "Download FAA 8710" button to get JSON file with:

```json
{
  "form": "FAA Form 8710-1",
  "generatedAt": "[ISO timestamp]",
  "experience": {
    "Total Flight Time": "[decimal hours]",
    "Pilot in Command (PIC)": "[decimal hours]",
    "Second in Command (SIC)": "[decimal hours]",
    "Dual Received": "[decimal hours]",
    "Solo": "[decimal hours]",
    "Cross-Country": "[decimal hours]",
    "Night": "[decimal hours]",
    "Actual Instrument": "[decimal hours]",
    "Simulated Instrument": "[decimal hours]",
    "Day Landings": "[integer]",
    "Night Landings": "[integer]"
  }
}
```

**Verify:**
- All time values match sum of Flight Log entries
- Decimal precision is 1 place (.toFixed(1))
- Landing counts are integers

### 4. Verify ICAO License Application Experience

Click "Download ICAO" button to get JSON file with:

```json
{
  "form": "ICAO License Application - Experience Summary",
  "generatedAt": "[ISO timestamp]",
  "totalFlightTime": {
    "hours": "[integer]",
    "minutes": "[integer 0-59]"
  },
  "commandTime": {
    "hours": "[integer]",
    "minutes": "[integer 0-59]"
  },
  "secondInCommandTime": {
    "hours": "[integer]",
    "minutes": "[integer 0-59]"
  },
  "crossCountryTime": {
    "hours": "[integer]",
    "minutes": "[integer 0-59]"
  },
  "nightTime": {
    "hours": "[integer]",
    "minutes": "[integer 0-59]"
  },
  "instrumentTime": {
    "hours": "[integer]",
    "minutes": "[integer 0-59]"
  },
  "totalLandings": "[integer]"
}
```

**Verify:**
- Hours/minutes conversion is correct (hours = floor, minutes = (decimal % 1) * 60)
- Instrument time = Actual Instrument + Simulated Instrument
- Total landings = Day Landings + Night Landings

### 5. Verify Data Extraction and Formatting

**Check Firestore Collections:**

1. **files collection:**
   - Document created with fileId
   - Contains storagePath, contentType, sizeBytes
   - purpose = "pilot_records"

2. **dtc collection:**
   - 2 documents created (FAA Certificate + Student ID)
   - Each has:
     - userId (auth.user.uid)
     - tenantId (from context)
     - type = "credential"
     - metadata with proper fields
     - fileIds array containing upload fileId
     - createdAt/updatedAt timestamps

3. **logbook collection:**
   - One document per Flight Log row
   - Each has:
     - userId (auth.user.uid)
     - tenantId (from context)
     - dtcId = null (general logbook)
     - entryType = "flight"
     - data object with all flight details:
       - date, aircraft, tailNumber, route, remarks
       - totalTime, pic, sic, dualReceived, solo
       - crossCountry, night, actualInstrument, simulatedInstrument
       - dayLandings, nightLandings, simulator, runningTotal
     - createdAt/updatedAt timestamps

## Backend API Endpoints Used

### POST /v1/files:sign
- Request upload URL
- Returns: { uploadUrl, fileId, storagePath }

### POST /v1/files:finalize
- Finalize upload after Cloud Storage PUT
- Marks file as ready for processing

### POST /v1/pilot:parse
- Parse Excel file into DTCs and logbooks
- Body: { fileId }
- Returns: { pilotProfile, certificates, logbookEntriesCreated, experienceTotals }

### GET /v1/pilot:experience-summary
- Generate FAA 8710 and ICAO forms
- Returns: { faa8710, icao, totalEntries }

## Known Issues / Missing Functionality

### To Document During Testing:
- [ ] Any parsing errors or missing data
- [ ] Incorrect time calculations
- [ ] Missing fields in DTCs
- [ ] UI display issues
- [ ] Download functionality issues
- [ ] Performance with large flight logs

## Success Criteria

✅ All test steps complete without errors
✅ DTCs created in Firestore with correct metadata
✅ Logbook entries created for all flight log rows
✅ FAA 8710 form generates with accurate totals
✅ ICAO form generates with correct hours/minutes conversion
✅ Both JSON files download successfully
✅ Experience summary displays correctly in UI
