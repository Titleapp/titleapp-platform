# Title App Platform — System State & Architecture

Last updated: 2026-01-28  
Owner: Sean Lee Combs  
Status: Core backend architecture is real, deployed, and non-trivial. UI is modular.

---

## 1. Executive Summary (Locked Reality)

Title App is **not a CRUD app** and **not a widget collection**.

It is a:
- Multi-tenant
- Multi-customer
- Rules-driven
- AI-augmented
- Blockchain-connected
platform for **regulated asset records** (real estate, auto, valuables, etc.).

The system already includes:
- A hardened backend
- Two production front doors
- A Rules-as-a-Service layer
- Working blockchain minting flows
- Payment + ID + data provider integrations

UI friction has obscured this, but the backend is robust.

---

## 2. Two Front Doors (Locked)

### Door 1 — Web 2.0 + GPT
- Admin dashboards
- Uploads (CSV / APIs)
- Filing-cabinet style UI
- GPT embedded as an assistant

### Door 2 — GPT-Only
- No traditional UI required
- GPT calls the same backend APIs
- Same auth, same rules, same audit trail

**Both doors talk to the same backend. No special cases.**

---

## 3. Front Door Infrastructure (Locked)

### Cloudflare Worker (Primary Entry)
- Cloudflare Worker is deployed and locked
- Acts as the **canonical edge gateway**
- Handles:
  - Request normalization
  - Auth forwarding
  - GPT → backend calls
  - UI → backend calls
- This is **not optional** and should not be bypassed long-term

### Why this matters
- GPT, browser, and future mobile apps all converge here
- Prevents UI-specific security logic
- Keeps AI as a client, not an authority

---

## 4. Backend Location & Stack (Locked)

### Google Cloud / Firebase
- Firebase Authentication (email/password today)
- Firestore (multi-tenant data store)
- Firebase Hosting (static admin UI)
- Cloud Functions Gen 2 / Cloud Run (API + workers)
- Pub/Sub (async jobs)

### Deployed Services
- `api` (Cloud Run / Functions Gen 2)
- `reportWorker` (Pub/Sub-triggered background processing)

Billing is enabled and services are live.

---

## 5. Authentication & Authorization (Locked)

### Authentication
- Firebase Authentication
- Clients obtain **Firebase ID tokens**
- Tokens are short-lived and renewable

### Authorization (Critical)
- No implicit access
- Every request is validated against **membership records**

### Membership Model (Firestore)
Each user → tenant relationship is explicit:

- `userId`
- `tenantId`
- `role` (admin / editor / viewer)
- `status` (active / disabled)

**Tenant ID is never trusted from the client alone.**

---

## 6. Multi-Tenant Data Model (Locked)

All primary entities are tenant-scoped:

- Tenants
- Memberships
- Customers
- Products
- Appointments
- Imports
- Assets
- Logbooks
- Escrows
- Payments

There are:
- No cross-tenant queries
- No shared mutable state
- No UI-only enforcement

---

## 7. Digital Worker Layer (powered by RAAS -- Rules + AI-as-a-Service) (Locked)

### Location
- Lives in GitHub
- Versioned, reviewable, auditable

### Purpose
The Digital Worker platform defines:
- What actions are allowed
- Under what conditions
- For which roles
- For which asset classes
- With which compliance constraints

### Examples
- Who can import customer data
- Whether a DTC can be minted
- When escrow actions are permitted
- What disclosures are required per vertical

**This is the real product moat.**

---

## 8. CSV / Database Import (Correct Framing)

CSV import is **not** a feature — it is a *proof of system capability*.

It validates:
- Tenant isolation
- Permission enforcement
- Auditability
- Bulk ingestion
- Future API-based ingestion

The same pipeline supports:
- CSV
- Excel
- Google Sheets
- External APIs (ATTOM, FirstAm, VIN, etc.)

UI is disposable. Contract is not.

---

## 9. Sales Demo Code (Existing & Reused)

A working **Sales Demo** exists and has already informed:
- UI patterns
- GPT interaction flows
- Backend expectations

This code has been reused and adapted to:
- Validate end-to-end flows
- Shape admin UX
- Test GPT → API interactions

---

## 10. Consumer “Filing Cabinet” App (70% Complete)

A **separate Firebase app** exists that implemented:

- Consumer asset vault
- Digital filing cabinet UX
- Wallet-like navigation
- Asset grouping
- Media + metadata display

Status:
- ~70% operational
- Not yet wired to the unified backend
- Core patterns are reusable

This is *not throwaway work*.

---

## 11. Blockchain & Asset Infrastructure (Completed Work)

The following systems are **already built and tested**:

### Digital Title Certificates (DTCs)
- Minting flows completed
- Asset-backed NFTs
- Used across verticals

### Logbooks
- Logbook creation
- Logbook entries
- Linked to DTCs

### Escrow Locker
- Escrow-style asset holding
- Rule-gated actions
- Multi-party logic

---

## 12. Payments & Identity (Completed)

### Stripe
- Payments integrated
- ID verification flows implemented
- Ready for tenant-level configuration

### Identity
- Stripe ID checks
- User verification workflows
- Compliance-aware design

---

## 13. External Data Integrations (Completed)

- ATTOM (property data)
- First American (title reports)
- VIN title search (automotive)

These integrations are **done**, not hypothetical.

---

## 14. What Is Replaceable vs Locked

### Locked (Do Not Rebuild)
- Cloudflare Worker gateway
- Firebase Auth + Firestore tenancy model
- Digital Worker layer
- API contracts
- Blockchain / DTC / Logbook logic
- Payment & identity flows

### Replaceable
- CSV upload UI
- Admin dashboard UI
- Calendar widgets
- Frontend framework choice

---

## 15. Near-Term Product Targets

### David (Auto)
- Customers
- Vehicles
- Appointments
- Payments
- Imports

### Christina (Real Estate)
- Clients
- Properties
- Title reports
- Appointments
- Document ingestion

Same backend. Same rules. Different schemas.

---

## 16. How to Start Any New Chat (Mandatory)

1. Paste this file.
2. State:
   - Which layer you’re working on (UI / API / Digital Workers / GPT)
   - Which tenant scenario
   - Which entity type

This prevents regression and hallucination.

---

## 17. Guiding Principle (Final)

We are **composing a regulated operating system**, not shipping features.

If something feels “too hard,” it is usually because:
- It must work across tenants
- It must work across verticals
- It must work with AI as a client
- It must be auditable and compliant

That complexity is the point.

ADDENDUM — GPT FRONT DOOR & CSV INGESTION (LOCKED)

Date: 2026-01-28
Status: Production-verified

18. GPT Front Door (Door 2) — Now Real, Not Conceptual

A dedicated GPT-only front door has been implemented and partially locked.

This GPT (working name: Title App Alpha GPT) operates as a first-class client of the platform — not a wrapper, demo, or proxy UI.

GPT Capabilities (Current)

The GPT is configured with exactly three actions:

getWorkflows — GET /workflows

chatMessage — POST /chat

getReportStatus — GET /reportStatus

These actions:

Route through the Cloudflare Worker front door

Call the same backend APIs as Web UI

Obey the same auth, rules, and audit constraints

There is no GPT-only logic in the backend.

19. GPT Execution Contract (Locked)

The GPT operates under strict execution rules, now documented and enforced at the prompt + schema layer:

Execution Rules

One action call per user turn

Never call the same action twice in a turn

Polling only allowed if the user explicitly asks after a jobId exists

Required Query Parameters (Every Call)

vertical (auto | real_estate)

jurisdiction (IL | CA)

sessionId (stable across the conversation)

Routing Rules

Workflow listing → getWorkflows

Conversational progression → chatMessage

Job status → getReportStatus

UX Constraints

Present API responses verbatim

Show suggestedActions as explicit choices

Ask only one question at a time

Never invent workflows, job states, or data

This effectively makes the GPT a deterministic client, not an agent that can hallucinate system behavior.

20. GPT + Web UI Parity (Critical Lock)

The GPT and Web UI now share:

The same ingestion contracts

The same backend endpoints

The same auth model

The same audit trail

There is no “GPT path” vs “UI path”.

CSV ingestion was the proof point.

21. CSV / Bulk Ingestion — Fully Locked

The CSV ingestion pipeline is now production-verified end-to-end.

What Is Locked

/v1/admin/import rewrite → api function

Firebase ID token authentication

Membership enforcement

Tenant isolation

Firestore writes

Audit records

Why This Matters

This proves the system can safely support:

CSV

Excel

Google Sheets

External APIs

GPT-initiated bulk ingestion

The UI is optional.
The contract is not.

22. What the GPT Work Actually Achieved (Clarification)

The GPT effort was not “prompting”.

It achieved:

A second production front door

Deterministic AI behavior

Shared backend contracts

Elimination of UI-specific logic

A scalable pattern for:

Consumer chat

Admin chat

Partner chat

Government chat

This validates the “AI as a client” architecture.

23. What Is Now Officially Locked
Newly Locked (as of this update)

GPT action schema

GPT execution rules

GPT ↔ backend parity

CSV ingestion pipeline

/v1 rewrite + route normalization

Firebase Auth → membership enforcement (proven live)

Still Replaceable

Admin upload UI

Consumer UI framework

Styling, layout, components

24. NEXT TASK — UI Wire-Up (Recommended)

The next highest-leverage task is UI wiring, not new backend work.

Objective

Make the Web UI mirror what was sold in the Title App Sales Demo and align with the Consumer “Filing Cabinet” mental model.

Recommended Scope

Wire UI to existing endpoints only

No new backend features

No refactors

No new auth logic

Specific Targets

Admin Filing Cabinet

Customers

Assets

Imports

Jobs / status

Consumer Filing Cabinet

Asset-centric navigation

DTC + Logbook views

Read-only initially

GPT Embedded Assist

Same GPT as Door 2

Embedded, not duplicated

Non-Goals

New data models

New permissions

New workflows

The backend is ready.
The UI now needs to stop hiding it.

25. Strategic Note (Why This Order Matters)

At this point:

Backend risk is low

Architecture risk is low

UX clarity is the bottleneck

Wiring UI → existing contracts:

De-risks demos

De-risks partners

De-risks fundraising

Makes the system legible
