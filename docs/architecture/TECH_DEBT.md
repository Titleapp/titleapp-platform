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
**Status:** Resolved in 44.7

All subscription writes now use `trialStatus` exclusively (no more `status` field written). All Firestore queries filter on `trialStatus`. `normalizeLegacyStatus()` handles existing documents with only `status` set. `status` field removal from existing documents pending — all reads migrated, field cleanup in future session.

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
**Status:** Resolved in 44.7

All backend files now import from `config/subscriptionStatus.js`: index.js, stripeWebhook.js, workspaces.js, workerTrial.js, workerShare.js, subscriptionCheck.js, fix-subscription-status.js. Frontend files (Sidebar.jsx, WorkerHome.jsx) only call the API — no subscription status logic to migrate.

---

## Summary

| Code | Issue | Priority | Status |
|------|-------|----------|--------|
| VERTICAL-001 | Single vertical registry | P0 | Config created, migration pending |
| SUBSCRIPTION-001 | Normalize subscription docs | P0 | Resolved in 44.7 — all writes use trialStatus, all queries filter on trialStatus |
| USER-001 | Normalize user docs | P1 | Not started |
| AVATAR-001 | Persistent avatar component | P1 | Not started |
| WORKSPACE-001 | Replace workspace picker | P1 | Not started |
| STATUS-001 | Subscription status constants | P0 | Resolved in 44.7 — all backend code imports from config/subscriptionStatus.js |

---

*Reference: [PLATFORM_ARCHITECTURE_v1.0.md](PLATFORM_ARCHITECTURE_v1.0.md) — Implementation Roadmap, Session 42*
