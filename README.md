# Title App – Backend Architecture (Canonical)

_Last updated: 2026-02-03_

This document describes the **current, working backend architecture** for Title App.
It is the single source of truth to prevent routing, auth, and infrastructure confusion.

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

makefile
Copy code
Authorization: Bearer <FIREBASE_ID_TOKEN>
2. Cloudflare Worker (Frontdoor)
Purpose

Public entry point

CORS enforcement

Routing normalization

Token passthrough

Proxies requests to backend

Base URL

arduino
Copy code
https://titleapp-frontdoor.titleapp-core.workers.dev
Supported routes

/workflows

/chat

/reportStatus

/api?path=... (generic passthrough)

Important

/api REQUIRES a path query param
Example:

bash
Copy code
/api?path=/v1/health
What it does

Accepts frontend request

Forwards request to backend with:

Authorization header preserved

X-Vertical / X-Jurisdiction forwarded

Does NOT terminate auth (except /chat)

3. Backend API (Firebase Functions / Cloud Run)
Canonical project

yaml
Copy code
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
Routing

Cloudflare forwards requests with:

bash
Copy code
/api?path=/v1/...
Backend strips /v1 internally and routes by path

🔐 Authentication (CRITICAL)
All protected endpoints require:

makefile
Copy code
Authorization: Bearer <Firebase ID Token>
Token is verified server-side using:

js
Copy code
admin.auth().verifyIdToken(token)
Expected token claims:

iss = https://securetoken.google.com/title-app-alpha

aud = title-app-alpha

If these do not match, the request will return:

Copy code
401 Unauthorized
🔁 Request Flow (Example: Workflows)
pgsql
Copy code
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

✅ Status
Backend deployed

Auth verified

Routing understood

Architecture locked