# Tech Debt — Session 42 Fix List

Each item has a specific issue code for tracking. These implement the Platform Architecture v1.0 specification.

---

## VERTICAL-001: Create single vertical registry

**Priority:** P0
**File:** `/functions/functions/config/verticals.js`
**Status:** Created in 41.1

The single source of truth for all verticals. All files that currently define verticals inline must be updated to import from this file instead.

**Files that need migration:**
- `apps/business/src/components/Sidebar.jsx` — hardcoded `normalizeVertical()` with inline prefix checks
- `apps/business/src/pages/WorkerMarketplace.jsx` — `WORKER_ROUTES` with inline suite/vertical mapping
- `functions/functions/services/workerSchema.js` — `VALID_VERTICALS` array
- `functions/functions/services/workerSync.js` — hardcoded catalog file paths
- `functions/functions/services/alex/catalogs/loader.js` — hardcoded catalog file list

---

## SUBSCRIPTION-001: Normalize subscription documents

**Priority:** P0
**Files:** Firestore `subscriptions/` collection, backend query helpers

Two incompatible subscription formats exist:
- Old format uses `status` field with values like `active`, `trialing`
- New format uses `trialStatus` field with values `trial_active`, `subscribed`, `trial_expired`, `cancelled`

**Fix:**
1. Run migration script to normalize all docs to canonical format (see `/functions/functions/config/subscriptionStatus.js`)
2. Remove `status` field from all documents
3. Update all queries to use `trialStatus` exclusively
4. Update `getUserWorkspaces()` in `helpers/workspaces.js` to filter on `trialStatus`

---

## USER-001: Normalize user documents

**Priority:** P1
**Files:** Firestore `users/` collection, auth handlers

Two user creation paths produce different document shapes:
- Magic link auth creates: `{ email, createdAt }`
- Chat/Google auth creates: `{ email, displayName, photoURL, createdAt, ... }`

**Fix:**
1. Add `firstName`, `avatarInitials`, `activeProfileId` to all user documents
2. Auto-compute `avatarInitials` from `displayName` (e.g. 'Sean Combs' → 'SC')
3. Create `users/{uid}/profiles` subcollection
4. Migrate existing workspaces to profiles (default profile = 'Personal')
5. Maximum 5 profiles per account

---

## AVATAR-001: Add persistent avatar component

**Priority:** P1
**Files:** New component, integrated into app shell

A persistent avatar/initials circle must appear in the top right corner of every screen.

**Requirements:**
- Shows user initials by default (computed from `displayName`)
- Shows uploaded photo if available (`avatarUrl` from Firestore)
- Click reveals dropdown: My Account, My Profiles, Billing, Settings, Sign Out
- Avatar image stored in Firestore — never localStorage
- Must be visible on every route, including sandbox and worker sessions

---

## WORKSPACE-001: Replace workspace picker with profile switcher

**Priority:** P1
**Files:** `Sidebar.jsx`, `App.jsx`, `WorkerHome.jsx`

The current workspace picker / "Switch Workspace" / "Add a Team" UI must be replaced with profile switching via the avatar dropdown.

**Fix:**
1. Remove workspace picker from sidebar
2. Remove "Add a Team" button from home screen
3. Profile switching moves to Avatar → My Profiles
4. Home screen shows subscribed workers grouped by vertical — no workspace cards

---

## STATUS-001: Subscription status constants

**Priority:** P0
**File:** `/functions/functions/config/subscriptionStatus.js`
**Status:** Created in 41.1

Canonical subscription status values so `trial_active` is never hardcoded as a string literal again. All backend code must import from this file.

**Files that need migration:**
- `functions/functions/services/workerTrial.js` — hardcoded status strings
- `functions/functions/services/workerShare.js` — status checks
- `functions/functions/helpers/workspaces.js` — subscription filtering
- `functions/functions/index.js` — inline status checks in subscription routes
- `apps/business/src/components/Sidebar.jsx` — frontend status filtering
- `apps/business/src/sections/WorkerHome.jsx` — frontend status filtering

---

## Summary

| Code | Issue | Priority | Status |
|------|-------|----------|--------|
| VERTICAL-001 | Single vertical registry | P0 | Config created, migration pending |
| SUBSCRIPTION-001 | Normalize subscription docs | P0 | Constants created, migration pending |
| USER-001 | Normalize user docs | P1 | Not started |
| AVATAR-001 | Persistent avatar component | P1 | Not started |
| WORKSPACE-001 | Replace workspace picker | P1 | Not started |
| STATUS-001 | Subscription status constants | P0 | Config created, migration pending |

---

*Reference: [PLATFORM_ARCHITECTURE_v1.0.md](PLATFORM_ARCHITECTURE_v1.0.md) — Implementation Roadmap, Session 42*
