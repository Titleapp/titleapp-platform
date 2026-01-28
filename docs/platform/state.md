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

## 7. Rules-as-a-Service (RaaS) Layer (Locked)

### Location
- Lives in GitHub
- Versioned, reviewable, auditable

### Purpose
RaaS defines:
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
- RaaS layer
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
   - Which layer you’re working on (UI / API / RaaS / GPT)
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
