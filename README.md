# Title App – Backend Architecture (Canonical)

_Last updated: 2026-02-12_

This document describes the **current, working backend architecture** for Title App.
It is the single source of truth to prevent routing, auth, infrastructure, and architectural drift.

---

## ✅ MVP Status (LOCKED)

As of 2026-02-12, the following is **verified working end-to-end**:

**Admin UI → Cloudflare Frontdoor → Firebase Functions (Cloud Run) → Admin UI**

### Verified workflow call (Admin UI “Load workflows”)
- Frontdoor request:
  - `POST https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=/v1/raas:workflows`
- Response:
  - `200 OK` JSON

**Important note:**
- Backend routing supports Frontdoor’s generic passthrough format:
  - `/api?path=/v1/...`
- Backend strips `/v1` internally and routes by path.

---

## 🧠 High-level Overview

Title App uses a **three-layer architecture**:

1. **Frontend (Admin / Title Vault UI)**
2. **Edge Router (Cloudflare Worker – “Frontdoor”)**
3. **Backend API (Firebase Functions → Cloud Run)**

Authentication is handled via **Firebase ID Tokens**, verified at the backend.

---

## 🧩 Components

### 1. Frontend (Admin UI / Title Vault)

- Location: `apps/admin`
- Runs locally via Vite (`localhost:5173`)
- Uses Firebase Auth (email/password)
- Retrieves a **Firebase ID Token** via:

```ts
auth.currentUser.getIdToken()
Sends requests to Cloudflare with:

makefile
Copy code
Authorization: Bearer <FIREBASE_ID_TOKEN>
2. Cloudflare Worker (Frontdoor)
Base URL

arduino
Copy code
https://titleapp-frontdoor.titleapp-core.workers.dev
Purpose

Public entry point

CORS enforcement

Routing normalization

Token passthrough

Proxies requests to backend

Supported routes

/workflows

/chat

/reportStatus

/api?path=... (generic passthrough)

Important:

/api REQUIRES a path query param

Example:

bash
Copy code
/api?path=/v1/health
What it does:

Accepts frontend request

Forwards request to backend with:

Authorization header preserved

X-Vertical / X-Jurisdiction forwarded

Does NOT terminate auth (except /chat)

3. Backend API (Firebase Functions / Cloud Run)
Canonical project

Firebase / GCP Project: title-app-alpha

Runtime

Firebase Functions v2

Deployed as Cloud Run service

Primary service URL

arduino
Copy code
https://api-feyfibglbq-uc.a.run.app
Single entrypoint

ini
Copy code
exports.api = onRequest(...)
🔐 Authentication (CRITICAL)
All protected endpoints require:

makefile
Copy code
Authorization: Bearer <Firebase ID Token>
Token is verified server-side using:

scss
Copy code
admin.auth().verifyIdToken(token)
Expected token claims:

iss = https://securetoken.google.com/title-app-alpha

aud = title-app-alpha

If these do not match:

Copy code
401 Unauthorized
🔁 Request Flow (Example: Workflows)
Admin UI
↓
Cloudflare Worker
↓
Firebase Functions (Cloud Run)
↓
Firestore / Logic

Concrete example:

bash
Copy code
POST /workflows
↓
Cloudflare → /v1/raas:workflows
↓
Backend handler
(Alternate currently used by Admin UI in MVP):

bash
Copy code
POST /api?path=/v1/raas:workflows
🧱 Core Architecture & Record Principles (Non-Negotiable)
Title App is not a traditional SaaS system.
It is an event-sourced ownership ledger operated by AI agents under rule constraints.

These invariants define the platform and must not be violated.

1️⃣ Append-Only Record Model
Canonical records (DTCs, Logbook entries, Transfers, Escrow completions) are never overwritten.

All state changes append new events.

“Current state” is a computed projection of event history.

Historical state must always remain recoverable.

No direct mutation of canonical ownership or history is permitted.

2️⃣ Blockchain as Notary Layer (Optional but Foundational)
Blockchain is used to anchor events, not replace the operational database.

On-chain records provide immutability guarantees.

Firestore must behave as an append-only event store even when minting is disabled.

Blockchain enhances verifiability but does not replace operational logic.

3️⃣ AI Agents Are Stateless Executors
AI agents never directly mutate canonical state.

Agents propose actions.

RAAS validates actions.

Validated actions append new events.

Agents remain model-agnostic and replaceable (OpenAI, Claude, Gemini, etc.).

AI is an operator, not a source of truth.

4️⃣ RAAS Is the Constraint Engine
Rules are structured and deterministic.

Business logic must not live solely in prompts.

Transfers, escrow, valuation updates, and attestations are rule-validated before persistence.

Rule definitions are portable and tenant-configurable.

Rules govern agents — not the other way around.

5️⃣ User Data Portability
Users can export their DTCs, logbooks, attestations, and transaction history.

Tenant membership does not override user ownership of records.

Records must remain portable across tenants and future systems.

Title App must not become a data silo.

Strategic Direction
Title App is evolving toward:

AI-native execution

RAAS-based governance

Multi-tenant distribution (B2C, B2B, B2G)

Optional blockchain notarization

Event-sourced truth

The defensible IP of the platform is:

The append-only record model

The rule engine (RAAS)

The ownership and transfer semantics

The tenant isolation model

Not the UI.
Not the model provider.
Not the cloud vendor.

These principles ensure long-term durability beyond SaaS-era constraints.

END OF CANONICAL BACKEND ARCHITECTURE
