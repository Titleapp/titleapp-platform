# CODEX 51.43.6 — Entitled Workspace Onboarding (Trust Modal + Advisor/Investor/Creator Home)

**Status:** Spec'd 2026-05-30, ready to execute  
**Predecessor:** S51.43.5 (cold-invite minting + magic-link, shipped)  
**Sean's framing:** "Take me to the workspace, ADD SOCIII, Inc. to the left-hand nav (ask if I recognize SOCIII), then as part of my onboarding for SOCIII, Inc. start the advisor (or investor or creator) flow."

---

## Problem (from dogfood 2026-05-30, TC-043 to be added)

Cold-invite magic link delivers user to AuthMagic → claims pendingInvite → redirects to `/?worker=hr-people&invite=...`. But:

1. **No entitlement created** — only investor flow creates `users/{uid}/entitlements/{...}` and only at post-signing. Advisor + creator paths never create one. Magic-link claim doesn't either.
2. **Entitlements are synthetic workers, not workspaces** — `installInvestorWorkerEntitlement` shapes the record so it appears under MY WORKERS, not under MY WORKSPACES. Sean's mental model is the latter: SOCIII, Inc. should appear as a *workspace* the advisor has joined.
3. **No trust step** — recipient is dropped into a tenant they may not recognize. Phishing vector.
4. **No guided sequence** — `WorkspaceObligationsBanner` exists (Phase 2.C) but renders as a horizontal bar above existing UI, not as the primary workspace home for the advisor/investor/creator.
5. **Wrong worker default** — magic-link redirects to `hr-people` worker which is the FOUNDER tenant's worker, not the entitled user's onboarding view.

## Target end state

Cold invite → click magic link → AuthMagic verifies + claims pendingInvite → **lands on `/?tenant=sociii-platform&entitled=true&inviteId=...`** → React Router renders:

1. **Trust modal** (first-load only, dismissed-once persisted): "SOCIII, Inc. invited you as an advisor. Recognize this invite? [Yes, accept] [No, decline]"
2. On Accept → `POST /v1/entitlements:accept` creates `users/{uid}/entitlements/{ent}` with `kind: "workspace"` + `workspaceLabel: "SOCIII, Inc."` + `workspaceSubtitle: "Advisor"` + obligation references
3. Sidebar's `MY WORKSPACES` section refetches `/v1/user:entitlements:list` and shows SOCIII, Inc. as a workspace entry alongside the user's own workspaces
4. Active workspace switches to SOCIII, Inc.
5. Workspace home renders **EntitledHomeCanvas** with obligation cards in step order:
   - **Step 1: Review materials** — link to pre-made personalized deck + whitepaper + data room (read-only, watermarked)
   - **Step 2: Verify identity** — Stripe Identity (collects name, address, phone, LI optionally)
   - **Step 3: Sign agreement** — DBX Sign packet (unlocked only when `kyc_status === "approved"`)
6. After all three complete → workspace home transitions to **Advisor Steady-State** canvas (same canvas tabs as the founder's HR view, but role-adaptive payloads per worker-001 pattern).

## Role variants

Same shell, different obligation set + agreement template:

| Role | Materials | KYC | Agreement template | Post-completion canvas |
|---|---|---|---|---|
| `advisor` | Whitepaper + advisor deck | Stripe Identity | `advisor_agreement` (HOMMIE Warrant) | Advisor home: deck access, advisor materials, quarterly updates |
| `investor` | Whitepaper + investor deck + data room | Stripe Identity + accreditation | `safe` (Post-Money SAFE) | Investor home: position, votes, notices, materials |
| `creator` | Creator overview + worker examples | Stripe Identity ($2 fee waived for FIRST100) | Creator agreement (click-through, no DBX) | Creator home: my workers, earnings, marketplace tools |
| `warrant_holder` | Whitepaper + HOMMIE explainer | Stripe Identity | HOMMIE Warrant only (no SAFE) | Warrant holder home: warrant terms, vesting, cap table snapshot |

## Implementation plan (5 phases, ~4-5 hr total)

### Phase A — Backend: entitlement-as-workspace (~60 min)

1. **Generalize `installInvestorWorkerEntitlement`** in `investorFlow.js` → extract to `services/entitlements/installEntitlement.js`
2. Accept `kind: "workspace" | "worker"` param. For workspace mode the entitlement carries:
   - `workspaceLabel` (e.g. "SOCIII, Inc.")
   - `workspaceSubtitle` (role label: "Advisor", "Investor", "Creator")
   - `workspaceIcon` (single-letter mark or logo URL)
   - `tenantId` (e.g. "sociii-platform")
   - `role`, `entityId` (advisorId/investorId/creatorId)
   - `pendingObligations[]` (mirrors the pendingInvite's obligation list — Phase 2.A shipped this)
   - `status: "pending_acceptance"` until trust modal accept
3. **Mirror functions** for advisor + creator + warrant_holder
4. **New endpoint:** `POST /v1/entitlements:accept` — moves entitlement from `pending_acceptance` → `active`, returns the entitlement record
5. **New endpoint:** `POST /v1/entitlements:decline` — marks entitlement `declined`, optionally deletes pendingInvite
6. **magic-link verify hook:** when claiming a pendingInvite (advisor/investor/creator), call `installEntitlement` server-side with `kind: "workspace"` + `status: "pending_acceptance"` — this is what fixes the dogfood gap
7. **Extend `/v1/user:entitlements:list`** to return workspace-kind entitlements separately (so the sidebar can render them in MY WORKSPACES section, not MY WORKERS grid)

### Phase B — Frontend: Sidebar workspace render (~30 min)

1. `Sidebar.jsx` line 1791 `MY WORKSPACES` block: fetch entitlements via `/v1/user:entitlements:list?kind=workspace`
2. Render each as a workspace row with the workspaceIcon + workspaceLabel + workspaceSubtitle. Active state highlights when `TENANT_ID === entitlement.tenantId && WORKSPACE_KIND === "entitled"`
3. Click handler: setLocalStorage `TENANT_ID=<entitlement.tenantId>`, `WORKSPACE_KIND=entitled`, `ENTITLEMENT_ID=<id>`, then dispatch a workspace-switch event (existing pattern used by tenant-membership workspaces)

### Phase C — Frontend: Trust modal (~45 min)

1. New component: `components/EntitledWorkspaceTrustModal.jsx`
2. Renders when `?workspace_just_added=true&entitlementId=...` query param present AND entitlement.status === "pending_acceptance"
3. Content: company name, who invited (sentByEmail from pendingInvite), what they're inviting you as (role), and "If you don't recognize this, decline."
4. Buttons: Accept → `POST /v1/entitlements:accept` → close modal, fall through to home canvas. Decline → `POST /v1/entitlements:decline` → redirect to `/` (their own workspace)
5. Trust state persists on entitlement doc; modal never reshows after acceptance/decline

### Phase D — Frontend: EntitledHomeCanvas (~90 min)

1. New component: `components/EntitledHomeCanvas.jsx`
2. Renders when active workspace is an entitled workspace (detect via TENANT_ID + WORKSPACE_KIND localStorage)
3. Reads entitlement.pendingObligations from `/v1/entitlements:get?id=...`
4. Renders three (or two for creator) obligation cards in step order. Card styles match Phase 2.C obligation card.
5. Card states:
   - **active** (current step): big purple CTA button "Review materials" / "Verify identity" / "Sign agreement"
   - **complete**: green checkmark, timestamp
   - **locked** (depends on prior step): grayed out, lock icon
6. CTA wires to existing endpoints — `/v1/ir:advisor:step` / `/v1/ir:investor:step` / `/v1/creator:step` (already shipped)
7. KYC-approved hook: when polling detects `kyc_status === "approved"`, unlock Step 3 card

### Phase E — Role-adaptive steady state (~45 min)

1. After all obligations complete, EntitledHomeCanvas swaps to **Advisor Steady-State / Investor Steady-State / Creator Steady-State** view
2. Steady-state is the same canvas tabs as the founder's view (e.g. for advisor: People / Onboarding / Schedule / Compliance / Documents / Notices), but liveData builders branch by role:
   - `role === "advisor"`: Documents tab shows their signed advisor agreement, Notices tab shows updates from SOCIII (read-only), other tabs show role-appropriate empty states
   - `role === "investor"`: Position / Documents / Notices / Materials / Vote tabs
   - `role === "creator"`: My Workers, Earnings, Marketplace tabs
3. Per worker-001 memory: the liveData builders accept a `role` param and branch by it.

---

## Out of scope (defer to later spec)

- Personalized deck generation — Sean confirmed decks are pre-made for current cohort
- Multi-tenant DBX Sign FROM identity — separate piece (TC-035)
- Multi-tenant SendGrid FROM — separate piece
- Entitled-user chat permission (chat denies entitled users today) — TC-028, separate piece

## QA-001 assertions to add (TC-043 + family)

- TC-043 P0: Magic-link claim creates entitlement doc with `status: "pending_acceptance"`
- TC-044 P0: Sidebar renders entitled tenant in MY WORKSPACES (not MY WORKERS)
- TC-045 P0: Trust modal renders on first arrival, persists dismissal
- TC-046 P0: EntitledHomeCanvas renders three cards in order, locks Step 3 until Step 2 complete
- TC-047 P0: After all obligations complete, canvas transitions to role-adaptive steady state
- TC-048 P1: Decline → entitlement marked declined, sidebar doesn't show SOCIII

## Test cases (dogfood)

1. Sean sends cold advisor invite to `dev@homdao.io` (his test account)
2. Clicks magic link in different browser / incognito
3. Lands on `/auth/magic?token=...` → AuthMagic verifies → redirect to `/?workspace_just_added=true&entitlementId=ent_adv_...`
4. **Trust modal appears**: "Sean Combs invited you to advise SOCIII, Inc. Recognize?"
5. Accept → sidebar refreshes → **SOCIII, Inc. appears in MY WORKSPACES** with "Advisor" subtitle
6. Active workspace switches to SOCIII → home renders EntitledHomeCanvas
7. Card 1 (Review materials) — click → opens deck/whitepaper in new tab, marks step complete on close
8. Card 2 (Verify identity) — click → Stripe Identity session opens → completes → step turns green, Card 3 unlocks
9. Card 3 (Sign agreement) — click → DBX Sign packet sent → embedded signing inline → step turns green
10. All three complete → canvas transitions to Advisor Steady-State (deck access + notices + documents tabs)

## File touch list

- `functions/functions/services/entitlements/installEntitlement.js` — NEW
- `functions/functions/services/ir/advisorFlow.js` — add installAdvisorWorkerEntitlement
- `functions/functions/services/ir/investorFlow.js` — refactor existing into shared helper
- `functions/functions/services/creator/creatorFlow.js` — add install function
- `functions/functions/services/magicLink.js` — call installEntitlement on claim
- `functions/functions/index.js` — `/v1/entitlements:accept`, `:decline`, extend `:list`
- `apps/business/src/components/Sidebar.jsx` — render workspace-kind entitlements in MY WORKSPACES
- `apps/business/src/components/EntitledWorkspaceTrustModal.jsx` — NEW
- `apps/business/src/components/EntitledHomeCanvas.jsx` — NEW
- `apps/business/src/App.jsx` — route to EntitledHomeCanvas when active workspace is entitled
- `apps/business/src/pages/AuthMagic.jsx` — redirect with `workspace_just_added=true` when entitlement was created
