# Testing Guide - TitleApp AI

## Local Development Setup

### 1. Start Backend (Firebase Emulators)

```bash
cd functions
firebase emulators:start
```

**Expected Output:**
```
✔  functions: Emulator started at http://127.0.0.1:5001
✔  firestore: Emulator started at http://127.0.0.1:8080
✔  auth: Emulator started at http://127.0.0.1:9099
```

**Emulator UI:** http://localhost:4000

### 2. Start Admin App (My Vault)

```bash
cd apps/admin
npm run dev
```

**URL:** http://localhost:5173

### 3. Start Business App

```bash
cd apps/business
npm run dev
```

**URL:** http://localhost:5174

---

## Test Scenarios

### Consumer App (My Vault) - Complete Flow

#### Test 1: Authentication
**Magic Link (Primary Method)**
1. Open http://localhost:5173
2. Enter email: `test@example.com`
3. Click "Send Magic Link"
4. Check Firebase Auth Emulator (http://localhost:4000)
5. Find the magic link in logs
6. Click link or paste back into app
7. **Expected:** Dashboard loads

**Email/Password (Secondary)**
1. Click "Use Password Instead"
2. Enter email: `test@example.com`, password: `password123`
3. Click "Create Account" or "Sign In"
4. **Expected:** Dashboard loads

#### Test 2: Dashboard - Real Data
1. **Expected KPIs:** All show "$0" and "0" initially
2. Navigate to "My Stuff"
3. Create a vehicle DTC
4. Return to Dashboard
5. **Expected:** "My DTCs" shows "1", "Total Assets" updates

#### Test 3: Create Vehicle DTC
1. Navigate to "My Stuff"
2. Click "+ Create DTC"
3. Fill form:
   - Type: Vehicle
   - Title: "2022 Honda Civic"
   - VIN: "1HGCM82633A123456"
   - Value: 28500
4. Click "Create"
5. **Expected:** DTC card appears with purple logo

#### Test 4: Refresh Asset Value (NEW!)
1. Find the vehicle DTC card
2. Click purple "Refresh Value" button
3. **Expected:**
   - Alert shows old/new value with change %
   - Value updates (simulates 1-3% depreciation)
   - Logbook entry created automatically

#### Test 5: Add Logbook Entry
1. Navigate to "My Logbooks"
2. Click "+ Add Entry"
3. Fill form:
   - Select DTC: "2022 Honda Civic"
   - Entry Type: "maintenance"
   - Description: "Oil change at 35,000 miles"
4. Click "Add"
5. **Expected:** Entry appears in timeline

#### Test 6: Student Records
1. Navigate to "Student & Professional"
2. Click "+ Add Credential"
3. Fill form:
   - Type: Education
   - Title: "Bachelor of Science"
   - Institution: "UIUC"
   - Field: "Computer Science"
   - Date: "2020-05-15"
4. Click "Add"
5. **Expected:** Credential appears in list

#### Test 7: Create GPT
1. Navigate to "My GPTs"
2. Click "+ Create GPT"
3. Fill form:
   - Name: "Auto Advisor"
   - Description: "Vehicle maintenance assistant"
   - System Prompt: "You are an expert mechanic..."
   - Capabilities: Check "web_search"
4. Click "Create"
5. **Expected:** GPT appears in list

#### Test 8: Escrow with AI Analysis
1. Navigate to "Escrow"
2. Click "+ Create Escrow"
3. Fill form:
   - Title: "Vehicle Sale - 2022 Honda Civic"
   - Counterparty: "John Smith"
   - Terms: "Vehicle transfer for $28,500"
   - Amount: "$28,500"
4. Click "Create"
5. Click "View AI Analysis"
6. **Expected:** Claude Opus generates risk analysis

#### Test 9: Create Token (Memecoin)
1. Navigate to "Wallet" → "Tokens" tab
2. Click "+ Create Token"
3. Fill form:
   - Name: "Family Coin"
   - Symbol: "FAM"
   - Supply: "1000000"
   - Network: "Polygon"
4. Click "Create"
5. **Expected:** Token appears in list

#### Test 10: Create Cap Table
1. Navigate to "Wallet" → "Cap Tables" tab
2. Click "+ Create Cap Table"
3. Fill form:
   - Company: "Smith Family LLC"
   - Total Shares: 10000
   - Add Shareholders:
     - John Smith: 5000 shares (50%)
     - Jane Smith: 3000 shares (30%)
     - Mike Smith: 2000 shares (20%)
4. Click "Create"
5. **Expected:** Cap table appears

---

### Business App - Complete Flow

#### Test 1: Authentication
1. Open http://localhost:5174
2. Sign in with email/password
3. **Expected:** Business dashboard loads

#### Test 2: Dashboard - Real Business Metrics
1. **Expected KPIs:** All show "0" initially
2. Add inventory item
3. Return to Dashboard
4. **Expected:** "Available Units" increments

#### Test 3: Add Inventory Item
1. Navigate to "Services & Inventory"
2. Click "+ Add Item"
3. Fill form:
   - Type: Vehicle
   - Make: Toyota
   - Model: Camry
   - Year: 2024
   - VIN: "5YFBURHE0LP123456"
   - Price: 32000
   - Cost: 28000
   - Status: Available
4. Click "Add"
5. **Expected:** Item appears in table

#### Test 4: Create Customer
1. Navigate to "Customers"
2. Click "+ Add Customer"
3. Fill form:
   - First Name: John
   - Last Name: Smith
   - Email: john.smith@example.com
   - Phone: +1-555-0100
   - Tags: "hot-lead"
4. Click "Add"
5. **Expected:** Customer appears in table

#### Test 5: Schedule Appointment
1. Navigate to "Appointments"
2. Click "+ Schedule"
3. Fill form:
   - Customer: Select "John Smith"
   - Date/Time: Future date
   - Type: Service
   - Duration: 60 minutes
4. Click "Schedule"
5. **Expected:** Appointment appears in calendar

#### Test 6: Add Staff Member
1. Navigate to "Staff"
2. Click "+ Add Staff"
3. Fill form:
   - Name: Jane Technician
   - Email: jane@dealer.com
   - Role: Service Tech
   - Permissions: Check "customers.read", "appointments.write"
4. Click "Add"
5. **Expected:** Staff member appears

#### Test 7: AI Activity Log
1. Navigate to "AI, GPTs & Chats"
2. Click "Activity" tab
3. **Expected:** Shows RAAS workflow executions
4. Click "Conversations" tab
5. **Expected:** Shows conversation history with message counts

#### Test 8: Connect Integration
1. Navigate to "Data & APIs"
2. Click "+ Add Integration"
3. Select "Salesforce CRM"
4. Enter mock credentials:
   - API Key: "test_key_123"
5. Click "Connect"
6. **Expected:** Integration shows "connected" status

#### Test 9: Sync Integration
1. Find connected integration
2. Click "Sync Now" button
3. **Expected:** "Last Sync" timestamp updates

#### Test 10: Business Settings
1. Navigate to "Settings"
2. Find "Blockchain Verification" section
3. Toggle ON
4. **Expected:** Warning shows "$700/mo cost, requires 30+ clients"
5. Toggle back OFF

---

## Backend API Testing (curl)

### Test DTC Creation
```bash
# Get ID token from Firebase Auth Emulator
TOKEN="your-id-token-here"

# Create DTC
curl -X POST http://localhost:5001/titleapp-platform/us-central1/api/v1/dtc:create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Vertical: auto" \
  -H "X-Jurisdiction: IL" \
  -d '{
    "type": "vehicle",
    "metadata": {
      "title": "2022 Honda Civic",
      "vin": "1HGCM82633A123456",
      "value": 28500
    }
  }'
```

### Test DTC List
```bash
curl http://localhost:5001/titleapp-platform/us-central1/api/v1/dtc:list \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Vertical: auto" \
  -H "X-Jurisdiction: IL"
```

### Test Refresh Value
```bash
curl -X POST http://localhost:5001/titleapp-platform/us-central1/api/v1/dtc:refresh-value \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Vertical: auto" \
  -H "X-Jurisdiction: IL" \
  -d '{"dtcId": "your-dtc-id-here"}'
```

---

## Firestore Data Verification

### Check Collections in Emulator UI
1. Open http://localhost:4000
2. Click "Firestore" tab
3. Verify collections exist:
   - `dtcs` - Digital Title Certificates
   - `logbookEntries` - Activity logs
   - `credentials` - Student/professional records
   - `gpts` - Custom AI assistants
   - `escrows` - Escrow transactions
   - `tokens` - Memecoins/tokens
   - `capTables` - Cap table structures
   - `inventory` - Business inventory
   - `customers` - CRM data
   - `appointments` - Scheduled appointments
   - `staff` - Team members
   - `integrations` - Third-party connections

### Verify Multi-Tenant Isolation
1. Create DTC as User A
2. Sign in as User B
3. Navigate to "My Stuff"
4. **Expected:** User B sees ZERO DTCs (isolation working)

---

## Error Testing

### Test 1: Missing Auth Token
```bash
curl http://localhost:5001/titleapp-platform/us-central1/api/v1/dtc:list \
  -H "X-Vertical: auto" \
  -H "X-Jurisdiction: IL"
```
**Expected:** 401 Unauthorized

### Test 2: Invalid DTC ID
```bash
curl -X POST http://localhost:5001/titleapp-platform/us-central1/api/v1/dtc:refresh-value \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Vertical: auto" \
  -H "X-Jurisdiction: IL" \
  -d '{"dtcId": "fake-id-12345"}'
```
**Expected:** 403 Forbidden or 404 Not Found

### Test 3: Refresh Value on Non-Vehicle DTC
Create a credential DTC, then try to refresh its value.
**Expected:** 400 Bad Request - "Asset type does not support automatic valuation"

---

## Performance Testing

### Dashboard Load Time
1. Create 50 DTCs
2. Create 100 logbook entries
3. Navigate to Dashboard
4. **Expected:** Loads in < 2 seconds

### Large List Rendering
1. Create 100+ inventory items
2. Navigate to Inventory table
3. **Expected:** Table renders smoothly without lag

---

## Voice Activation Testing (Future)

Once FloatingChat GPT integration is complete:

**Test Phrase:** "Update my car value"
**Expected Flow:**
1. GPT parses intent → identifies DTC by VIN
2. Calls `POST /v1/dtc:refresh-value`
3. Returns conversational response:
   > "Your 2022 Honda Civic value has been updated from $28,500 to $27,800 (-$700, -2.5%). I've added this to your logbook."

---

## Regression Testing Checklist

After any code changes, verify:
- [ ] Logo displays (not broken image)
- [ ] Magic Link email sends
- [ ] Dashboard KPIs update with real data
- [ ] Creating DTCs writes to Firestore
- [ ] Refresh Value creates logbook entry
- [ ] Multi-tenant isolation prevents data leaks
- [ ] All navigation sections load without errors
- [ ] FloatingChat component appears
- [ ] Mobile responsive layout works
- [ ] Profile/Settings save changes

---

## Common Issues & Solutions

### "Missing ID_TOKEN"
**Solution:** Sign out and sign in again

### "Missing VITE_API_BASE"
**Solution:** Create `.env` file in app directory:
```
VITE_API_BASE=http://localhost:5001/titleapp-platform/us-central1
```

### Logo shows broken image
**Solution:** Verify `/apps/admin/public/logo.png` exists

### "Permission Denied" in Firestore
**Solution:** Update Firestore security rules to allow authenticated writes

### Functions won't deploy
**Solution:** Check Node version (should be 20):
```bash
node --version  # Should show v20.x.x
nvm use 20      # If using nvm
```

---

## Production Testing (After Deployment)

### Health Check
```bash
curl https://us-central1-titleapp-platform.cloudfunctions.net/api/v1/health
```

### Create DTC in Production
Use same curl commands as local testing, but replace:
```
http://localhost:5001/titleapp-platform/us-central1/api
```
with:
```
https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=
```

---

## Performance Benchmarks

**Acceptable Thresholds:**
- Dashboard load: < 2s
- DTC creation: < 1s
- API response time: < 500ms
- Firestore write: < 300ms
- Refresh value: < 2s (includes AI simulation)

**Monitor with:**
```bash
firebase functions:log --only api
```

---

**Happy Testing!** Report any bugs to the development team.
