# Deployment Checklist - TitleApp AI

## Pre-Deployment Setup

### 1. Environment Variables

**Admin App** (`apps/admin/.env`):
```bash
VITE_API_BASE=https://titleapp-frontdoor.titleapp-core.workers.dev
# OR for local testing:
# VITE_API_BASE=http://localhost:5001/titleapp-platform/us-central1
```

**Business App** (`apps/business/.env`):
```bash
VITE_API_BASE=https://titleapp-frontdoor.titleapp-core.workers.dev
# OR for local testing:
# VITE_API_BASE=http://localhost:5001/titleapp-platform/us-central1
```

**Firebase Functions** (`functions/.env`):
```bash
ANTHROPIC_API_KEY=sk-ant-...your-key...
KBB_API_KEY=...when-ready...
ATTOM_API_KEY=...when-ready...
```

### 2. Firebase Configuration

Check `firebase.json` hosting rewrites:
```json
{
  "hosting": [
    {
      "target": "admin",
      "public": "apps/admin/dist",
      "rewrites": [
        { "source": "**", "destination": "/index.html" }
      ]
    },
    {
      "target": "business",
      "public": "apps/business/dist",
      "rewrites": [
        { "source": "**", "destination": "/index.html" }
      ]
    }
  ]
}
```

### 3. Firestore Indexes

Required composite indexes for queries:
```bash
# DTCs by user and type
userId, type, createdAt DESC

# Logbooks by DTC
dtcId, createdAt DESC

# Inventory by tenant and status
tenantId, status, createdAt DESC

# Appointments by tenant and date
tenantId, datetime ASC

# AI Activity by tenant
tenantId, conversationId, createdAt DESC
```

Create indexes:
```bash
firebase deploy --only firestore:indexes
```

## Local Testing

### Step 1: Start Firebase Emulators
```bash
cd functions
firebase emulators:start
```

This starts:
- Functions: `http://localhost:5001`
- Firestore: `http://localhost:8080`
- Auth: `http://localhost:9099`
- UI: `http://localhost:4000`

### Step 2: Run Admin App
```bash
cd apps/admin
npm run dev
```
Open: `http://localhost:5173`

### Step 3: Run Business App
```bash
cd apps/business
npm run dev
```
Open: `http://localhost:5174`

### Step 4: Test Core Flows

**Consumer (My Vault):**
1. Sign up with Magic Link
2. Create a Vehicle DTC with value
3. Click "Refresh Value" - verify logbook entry created
4. Add a logbook entry manually
5. Check Dashboard shows updated totals

**Business:**
1. Sign in with credentials
2. Add inventory item
3. Create customer
4. Schedule appointment
5. Check Dashboard aggregates correctly

## Production Deployment

### Step 1: Deploy Backend
```bash
cd functions
npm run build  # If using TypeScript
firebase deploy --only functions
```

Verify deployed:
```bash
curl https://us-central1-titleapp-platform.cloudfunctions.net/api/v1/health
```

### Step 2: Build Frontend Apps
```bash
# Admin app
cd apps/admin
npm run build
# Output: apps/admin/dist/

# Business app
cd apps/business
npm run build
# Output: apps/business/dist/
```

### Step 3: Deploy Hosting
```bash
firebase deploy --only hosting
```

### Step 4: Verify Live Apps

**Admin (My Vault):**
- URL: `https://admin.titleapp.ai` (or your configured domain)
- Test Magic Link flow
- Verify Firestore writes

**Business:**
- URL: `https://business.titleapp.ai`
- Test inventory creation
- Verify AI activity tracking

## Post-Deployment Verification

### Backend Health Check
```bash
# Test health endpoint
curl https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=/v1/health

# Test DTC list (requires auth)
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
     -H "X-Vertical: auto" \
     -H "X-Jurisdiction: IL" \
     https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=/v1/dtc:list
```

### Frontend Checks
- [ ] Logo displays correctly (not broken image)
- [ ] Magic Link email sends
- [ ] Dashboard loads without errors
- [ ] Creating DTCs writes to Firestore
- [ ] Refresh Value updates DTC and creates logbook entry
- [ ] All navigation sections load
- [ ] FloatingChat component appears

### Database Checks (Firestore Console)
- [ ] `dtcs` collection has records
- [ ] `logbookEntries` collection populated
- [ ] `tenants` collection exists
- [ ] Multi-tenant isolation working (userId/tenantId filters)

## Troubleshooting

### "Missing ID_TOKEN" Error
**Cause:** User not signed in or token expired
**Fix:** Clear localStorage and sign in again

### "Missing VITE_API_BASE" Error
**Cause:** Environment variable not set
**Fix:** Create `.env` file in app directory with API base URL

### Logo Shows Broken Image
**Cause:** Logo not in public directory
**Fix:** Verify `/apps/{admin,business}/public/logo.png` exists

### API Returns 404
**Cause:** Route not matching backend handler
**Fix:** Check `/functions/functions/index.js` route definitions

### CORS Errors
**Cause:** Cloudflare Frontdoor not allowing origin
**Fix:** Update Frontdoor CORS settings (see `docs/STATE.md`)

### Firestore Permission Denied
**Cause:** Security rules too restrictive
**Fix:** Update Firestore rules to allow authenticated writes:
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    match /dtcs/{dtcId} {
      allow read, write: if request.auth != null;
    }
    // Repeat for other collections
  }
}
```

## Performance Optimization

### Before Launch
1. **Enable Firestore caching** in API client
2. **Add loading skeletons** to all sections
3. **Implement pagination** for large lists (>100 items)
4. **Optimize images** - compress logo to <50KB
5. **Enable gzip compression** in hosting config

### Monitoring
```bash
# Watch function logs
firebase functions:log --only api

# Monitor Firestore usage
# Check Firebase Console > Firestore > Usage tab
```

## Cost Monitoring

### Current Free Tier Limits
- **Firebase Functions:** 2M invocations/month
- **Firestore:** 50K reads, 20K writes, 20K deletes per day
- **Hosting:** 10GB storage, 360MB/day transfer
- **Auth:** Unlimited (email/password)

### When to Upgrade
- **Valuation APIs:** $150/mo (KBB + ATTOM)
- **VENLY Blockchain:** $700/mo (when toggled ON)
- **Firebase Blaze Plan:** Pay-as-you-go (enable when traffic increases)

## Security Checklist

- [ ] Firestore rules enforce userId/tenantId isolation
- [ ] API endpoints require Bearer token authentication
- [ ] Sensitive data (credentials, API keys) in environment variables
- [ ] CORS restricted to known domains
- [ ] Rate limiting enabled on functions (future)
- [ ] Audit logging for critical operations (future)

## Rollback Plan

If deployment fails:
```bash
# Revert functions
firebase functions:delete api
firebase deploy --only functions  # Redeploy previous version

# Revert hosting
# Download previous dist/ from backup
firebase deploy --only hosting
```

---

**Quick Start Commands:**
```bash
# Local development
firebase emulators:start &
cd apps/admin && npm run dev &
cd apps/business && npm run dev &

# Production deployment
cd functions && firebase deploy --only functions
cd apps/admin && npm run build && cd ../..
cd apps/business && npm run build && cd ../..
firebase deploy --only hosting
```

**Status URLs:**
- Admin App: https://admin.titleapp.ai
- Business App: https://business.titleapp.ai
- Frontdoor: https://titleapp-frontdoor.titleapp-core.workers.dev
- Firebase Console: https://console.firebase.google.com
