# CODEX 50.7 — Workspace Onboarding & Member Invites

**Status:** Spec draft — pending implementation
**Depends on:** CODEX 49.32 (tenant-scoped subscriptions, role gates, credit pools)
**Blocks:** none — independent of 50.6 (Creator dashboard)
**Author:** Sean + Alex
**Date:** 2026-05-04

---

## Why

The backend for multi-tenant collaboration shipped in CODEX 49.32 (tenant Stripe customer, tenant credit pool, `enforceRoleGate`, `resolveSubscription`). What's missing is the user-facing flow for an individual user to **create a workspace** and **invite teammates** to collaborate.

This is what unblocks Sean from running TitleApp itself on TitleApp — bringing Kent (CFO) and future hires into a shared workspace. It's also what unblocks any prospective customer team from doing the same.

---

## Pricing model (locked)

Usage-based, no per-seat charge. The workspace as a whole subscribes to workers. Individuals can also subscribe personally. Credits deduct from whichever scope the user is acting in.

| Workspace state | Billing |
|---|---|
| 1–3 members, free tier | Free. No minimum. Subscribe to paid workers à la carte. |
| 4+ members | $10/month minimum data usage. Implemented via auto-recharge floor (Option A): when workspace exceeds 3 members, auto-recharge is required with a $10 minimum monthly threshold. If credits run dry, Stripe charges a $10 credit pack automatically. |
| Worker subscriptions | Charged to the workspace's Stripe customer. Available to all members (subject to RAAS rules per worker). |

**Why Option A (auto-recharge floor) over Option B (end-of-cycle filler):** more honest "pay for what you use," no separate billing surface, naturally self-enforces once the workspace is active enough to consume credits.

---

## In scope

### 1. Create Workspace flow

**Frontend**
- New page or modal: "Create Workspace"
- Fields: workspace name (required), logo upload (optional), description (optional)
- Submit → calls `POST /v1/workspace:create`
- On success: auto-switch user into the new workspace context (sets `TENANT_ID` in localStorage, fires `ta:workspace-changed`)

**Backend**
- `POST /v1/workspace:create` — body: `{ name, description?, logoUrl? }`
- Creates `tenants/{tenantId}` doc with `name`, `createdBy`, `createdAt`, `memberCount: 1`
- Creates `memberships/{id}` row: `{ userId, tenantId, role: "admin", status: "active" }`
- Returns `{ ok: true, tenantId, workspaceName }`

### 2. Invite teammate flow

**Frontend (admin-only)**
- Settings → Team page → "Invite member" button
- Form: email (required), phone (optional, for SMS OTP path), role dropdown (default: `member`)
- Submit → calls `POST /v1/workspace:invite`
- Toast confirmation: "Invite sent to {email}"
- Pending invites list shows below, with "Revoke" button

**Backend**
- `POST /v1/workspace:invite` — body: `{ email, phone?, role }`
- Auth: must be `admin` of the tenant in `ctx.tenantId`
- Free-tier gate: if `tenant.memberCount >= 3` AND tenant has no auto-recharge configured → reject with `requires_billing_setup` error code
- Generate token (32-byte hex, 7-day expiry)
- Create `invites/{token}` doc with `{ tenantId, email, phone, role, invitedBy, status: "pending", expiresAt, createdAt }`
- Send email via SendGrid: subject "Sean invited you to TitleApp HQ on TitleApp"; body has accept link `https://app.titleapp.ai/invite/{token}`
- If `phone` provided: also send SMS via Twilio: "Sean invited you to TitleApp HQ on TitleApp. Accept: {short-link}"
- Email AND SMS variants both supported (Sean's choice — covers both literate and phone-first users)

### 3. Accept invite flow

**Route:** `/invite/:token` (frontend page)

**Signed-out path**
- Show: "You've been invited to {workspace} as {role} by {inviter}. Sign in or create an account to accept."
- Embed sign-in / create-account form
- After auth, automatically call accept endpoint with token

**Signed-in path**
- Show: "You're joining {workspace} as {role}. Accept?" + Accept button
- Email mismatch warning if signed-in email ≠ invite email (allow proceed but flag)

**Backend**
- `POST /v1/workspace:accept-invite` — body: `{ token }`
- Validates token: not expired, status `pending`
- Creates `memberships/{id}` row with role from invite
- Updates invite status to `accepted`, sets `acceptedAt`, `acceptedByUid`
- Increments `tenants/{tenantId}.memberCount`
- If new memberCount > 3 AND tenant has no auto-recharge → flag tenant doc with `billingSetupRequired: true` and notify admin (in-app + email)
- Returns `{ ok: true, tenantId, workspaceName, role }`

### 4. Team management page (Settings → Team, admin-only)

**Frontend**
- List members with: avatar, name, email, role, status, joined date
- Pending invites section: email, role, sent date, "Revoke" button
- Per-member actions (admin only):
  - Change role (dropdown: admin / member / viewer)
  - Remove member (with confirm modal; safeguard: cannot remove last admin)
- "Invite member" button (links to flow #2)

**Backend**
- `GET /v1/workspace:members` — returns `{ members: [...], pendingInvites: [...] }`
- `POST /v1/workspace:update-member` — body: `{ membershipId, role }`
- `POST /v1/workspace:remove-member` — body: `{ membershipId }`
  - Decrements `tenants/{tenantId}.memberCount`
  - If post-removal memberCount ≤ 3, clear `billingSetupRequired` flag
- `POST /v1/workspace:revoke-invite` — body: `{ inviteToken }`

### 5. Workspace switcher (global)

**Frontend**
- New component in Sidebar header (replaces / extends current scope toggle)
- Dropdown lists: "Personal Vault" + each workspace user is a member of
- Click to switch context: updates `TENANT_ID` in localStorage, fires `ta:workspace-changed` event (already wired, BillingPage listens)
- Current workspace name shown in header at all times for context awareness

**Backend**
- `GET /v1/workspace:list` — returns all workspaces user is a member of, with their role per workspace

### 6. Billing setup gate (auto-recharge floor)

**Trigger:** when 4th member joins a free-tier workspace.

**Frontend**
- Banner on dashboard for admin: "Your workspace has 4 members. Set up auto-recharge to keep going. Minimum $10/month."
- Click → opens auto-recharge config modal
- Modal: top-up amount ($10 / $25 / $50 / custom), threshold trigger (auto when balance < X credits)
- Saves to `tenants/{id}.autoRecharge: { enabled, amount, thresholdCredits }`

**Backend**
- `POST /v1/workspace:setup-recharge` — body: `{ amount, thresholdCredits }`
- Stores config on tenant doc
- Triggers immediate $10 charge to verify Stripe customer is valid + load initial floor
- Clears `billingSetupRequired` flag once verified

**Cron (separate function, runs hourly)**
- For each tenant with `autoRecharge.enabled === true`:
  - If `prepaidCredits < autoRecharge.thresholdCredits`:
    - Charge `autoRecharge.amount` via Stripe to tenant customer
    - Increment `prepaidCredits` on success
    - Log to `tenantBillingLog/`

### 7. Email + SMS templates

**Invite email** (SendGrid)
```
Subject: {inviterName} invited you to {workspaceName} on TitleApp

{inviterName} added you to {workspaceName} on TitleApp as {role}.

TitleApp is the platform for running your business with Digital Workers
— accounting, marketing, HR, and more, all in one place.

[Accept invite] → https://app.titleapp.ai/invite/{token}

This invite expires in 7 days. If you don't recognize the sender,
ignore this email — no account is created until you accept.

— Alex, Chief of Staff
alex@titleapp.io
```

**Invite SMS** (Twilio)
```
{inviterName} invited you to {workspaceName} on TitleApp. Accept: {short-link} (expires 7d)
```

---

## Out of scope (deferred)

- SSO (Google Workspace, Microsoft, Okta) — future CODEX
- Domain-based auto-join (anyone with @titleapp.ai email auto-joins workspace)
- Workspace billing transfer (migrate subscription from one tenant to another)
- Workspace deletion / archive
- Cross-workspace data sharing
- Per-worker access controls within a workspace (everyone in workspace can use any subscribed worker today; granular ACLs deferred)
- Member-level usage analytics ("Kent used 50 credits, Sean used 200 credits this month")

---

## Backend status

Already exists from CODEX 49.32:
- ✅ `tenants/{id}` model
- ✅ `memberships/{id}` collection with `userId`, `tenantId`, `role`, `status`
- ✅ `enforceRoleGate(uid, tenantId, requiredRole)` — admin > member > viewer
- ✅ `resolveSubscription(uid, tenantId, workerSlug)` — tenant-first lookup
- ✅ Tenant Stripe customer creation in `purchaseCreditPack.js`
- ✅ Tenant pool credit deduction in `checkAndDeductCredits()`

Need to add for 50.7:
- ⚠️ `invites/{token}` collection model
- ⚠️ `POST /v1/workspace:create`
- ⚠️ `POST /v1/workspace:invite` (email + SMS dual delivery)
- ⚠️ `POST /v1/workspace:accept-invite`
- ⚠️ `GET /v1/workspace:list`
- ⚠️ `GET /v1/workspace:members`
- ⚠️ `POST /v1/workspace:update-member`
- ⚠️ `POST /v1/workspace:remove-member`
- ⚠️ `POST /v1/workspace:revoke-invite`
- ⚠️ `POST /v1/workspace:setup-recharge`
- ⚠️ `tenantAutoRechargeCron` — hourly scheduled function

Frontend new components:
- `apps/business/src/sections/CreateWorkspace.jsx`
- `apps/business/src/sections/TeamSettings.jsx` (under Settings)
- `apps/business/src/pages/InviteAccept.jsx` (route `/invite/:token`)
- `apps/business/src/components/WorkspaceSwitcher.jsx` (Sidebar header)
- Modal: auto-recharge setup

---

## Validation (post-implementation)

1. **Create workspace** — Sean creates "TitleApp HQ" → tenant doc + admin membership exist → auto-switch lands him in workspace context.
2. **Invite Kent** — Sean adds kent@titleapp.ai as admin → email arrives → Kent clicks link → signs in / creates account → membership row exists with role=admin.
3. **Workspace credit deduction** — Kent runs a chat in workspace context → credits deduct from `tenants/{id}.prepaidCredits`, NOT his user pool.
4. **Personal scope still works** — Sean toggles to Personal Vault → his AV-P01 logbook still loads from his personal data.
5. **Free tier cap** — Sean tries to invite a 4th member → blocked with `requires_billing_setup` until auto-recharge is configured.
6. **Auto-recharge floor** — workspace with 4+ members, balance drops below threshold → cron fires $10 charge → credits land.
7. **Role gate enforcement** — Kent (admin) can invite, change roles, remove members. Demote him to member → those actions fail with 403.
8. **Last admin safeguard** — try to remove the only admin → rejected.
9. **Invite expiry** — invite older than 7 days → accept fails with `expired` error.
10. **Personal subscription coexistence** — Sean has a personal Marketing & Content subscription. Workspace also subscribes. Both invoices fire monthly on different Stripe customers. Personal scope deducts from user pool; workspace scope deducts from tenant pool.

---

## Open implementation decisions

- **Invite token format** — 32-byte hex (~64 chars in URL) or shorter base32 for readability? *Recommendation: 32-byte hex, no readability concern since users click through.*
- **Email vs SMS gating** — admin always provides email; SMS is optional second channel. Or treat SMS-only as valid (e.g., for invitees without email)? *Recommendation: email required, SMS optional secondary; invitee account must have an email anyway.*
- **Workspace name uniqueness** — globally unique or scoped to creator? *Recommendation: not globally unique (companies can share names). Use tenantId as canonical reference; `name` is display-only.*
- **Auto-recharge initial charge** — when admin first sets up auto-recharge for a 4-member workspace, charge $10 immediately to verify card and seed the floor, or wait until balance drops below threshold? *Recommendation: immediate $10 charge — confirms card works, immediately puts the workspace in a "paid" state, no awkward "I set it up but nothing happened" feeling.*

---

## Sign-off deliverables

- All 10 validation scenarios above pass
- Sean creates real `TitleApp HQ` workspace and invites Kent
- Kent successfully accepts and runs a chat in workspace context
- Auto-recharge fires correctly when 4th member joins (test by adding test users)
- CODEX 50.7 unblocks: any prospective TitleApp customer team can self-onboard
