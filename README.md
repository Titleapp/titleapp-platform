# Title App – Backend Architecture (Canonical)

_Last updated: 2026-02-07_

This document describes the **current, working backend architecture** for Title App.
It is the single source of truth to prevent routing, auth, and infrastructure confusion.

---

## ✅ MVP Status (LOCKED)

As of 2026-02-07, the following is **verified working end-to-end**:

**Admin UI → Cloudflare Frontdoor → Firebase Functions (Cloud Run) → Admin UI**

### Verified workflow call (Admin UI “Load workflows”)
- Frontdoor request:
  - `POST https://titleapp-frontdoor.titleapp-core.workers.dev/api?path=/v1/raas:workflows`
- Response:
  - `200 OK` JSON (stub payload currently)

**Important note (recent fix):**
- Backend routing now supports Frontdoor’s **generic passthrough** format:
  - `/api?path=/v1/...`
- Previously, requests to `/api?path=...` could 404 because the backend only parsed pathname routing.

---

## 🧠 High-level Overview

Title App uses a **three-layer architecture**:

1. **Frontend (Admin / UI)**
2. **Edge Router (Cloudflare Worker – “Frontdoor”)**
3. **Backend API (Firebase Functions → Cloud Run)**

Authentication is handled via **Firebase ID Tokens**, verified at the backend.

---

## 🧩 Components

### 1. Frontend (Admin UI)

- Location: `apps/admin`
- Runs locally via Vite (`localhost:5173`)
- Uses Firebase Auth (email/password)
- Retrieves a **Firebase ID Token** via:
  ```ts
  auth.currentUser.getIdToken()
Sends requests to Cloudflare with:

Authorization: Bearer <FIREBASE_ID_TOKEN>

2. Cloudflare Worker (Frontdoor)

Base URL

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

Important

/api REQUIRES a path query param

Example:

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

https://api-feyfibglbq-uc.a.run.app


Single entrypoint

exports.api = onRequest(...)


Routing
Cloudflare forwards requests with:

/api?path=/v1/...


Backend routing behavior:

Supports both:

Firebase rewrite style: /api/<route>

Frontdoor passthrough style: /api?path=/v1/<route>

Backend strips /v1 internally and routes by path.

🔐 Authentication (CRITICAL)

All protected endpoints require:

Authorization: Bearer <Firebase ID Token>


Token is verified server-side using:

admin.auth().verifyIdToken(token)


Expected token claims:

iss = https://securetoken.google.com/title-app-alpha

aud = title-app-alpha

If these do not match, the request will return:

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

POST /workflows
↓
Cloudflare → /v1/raas:workflows
↓
Backend handler


(Alternate equivalent, currently used by Admin UI in MVP):

POST /api?path=/v1/raas:workflows

🧱 Design Principles

Cloudflare = routing + CORS only

Backend = source of truth

Firebase Auth = identity

One canonical backend project: title-app-alpha

Do NOT create duplicate GCP projects without a migration plan

🛑 Known Non-goals

TitleApp_Core GCP project is NOT canonical

GitHub auto-deploy is NOT set up yet

Production / multi-tenant hardening comes later


---

## 📤 Admin Upload (CSV Ingestion) – Status

Deployed admin ingestion surface:

- URL: `https://title-app-alpha.web.app/admin-upload/`
- Current behavior:
  - UI renders and attempts upload via `POST /v1/admin/import`
  - Backend responds `401 Unauthorized` with reason `"Invalid token"` (auth not yet wired to current Firebase session/token flow)

Purpose (MVP + near-term):
- Bulk import/supplement content for:
  - sales scoring
  - screening
  - marketing enrichment
  - closing workflows
- This ingestion lane is complementary to RaaS libraries in `/raas/**` (curated + versioned rules), and is intended for operational/batch data.

Next steps:
1) Re-enable uploader by attaching a **fresh Firebase ID token** to upload requests (or proxy through Frontdoor).
2) Expand beyond CSV (PDF/images/etc.) once the auth contract is stable.
