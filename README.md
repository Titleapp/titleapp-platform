# SOCIII Platform

**Collaborative Intelligence · Participation**

SOCIII is a platform where people create, share, and earn from AI workers — software agents governed by structured rule sets, with every action auditable on an immutable blockchain-anchored record.

This repository contains the SOCIII platform implementation: web application, backend services, smart contracts, SDK, and supporting documentation.

> Note: This repository was previously known as `titleapp-platform`. Active development continues under SOCIII Inc., the Delaware C-corporation that succeeded TitleApp LLC in May 2026. Portions of the codebase still reference the legacy brand during the cutover.

---

## Architecture

```
[Web App (apps/business/) — React 19 + Vite]
        │
        ▼
[Cloudflare Worker — Frontdoor / Edge Router]
        │
        ▼
[Firebase Cloud Functions — single onRequest handler → Cloud Run]
        │
        ▼
[Firestore — append-only event store]
        │
        ▼
[Public Blockchain Audit Anchor (Base / Ethereum / Polygon / Solana — chain-agnostic)]
```

The architecture is intentionally simple and replaceable at every layer except the canonical record model and the rule engine.

---

## Core Architectural Invariants (Non-Negotiable)

SOCIII is not a traditional SaaS application. It is an event-sourced governance system operated by AI agents under rule constraints. These invariants define the platform and are not violated under any deployment.

### 1. Append-Only Record Model

Canonical records (Digital Title Certificates, logbook entries, transfers, escrow completions, governance events) are **never overwritten**. All state changes append new events. "Current state" is a computed projection of event history. Historical state remains recoverable in full. No direct mutation of canonical ownership or history is permitted.

### 2. Blockchain as Notary Layer (Optional but Foundational)

Blockchain is used to anchor cryptographic hashes of events, not to replace the operational database. On-chain records provide tamper-evidence; the full event payload is retained off-chain for confidentiality and audit. Firestore behaves as the append-only event store even when blockchain minting is disabled. Blockchain enhances verifiability without replacing operational logic.

### 3. AI Agents Are Stateless Executors

AI agents (Digital Workers) never directly mutate canonical state. Workers propose actions; the RAAS rule engine validates; events append. Agents are **model-agnostic** — OpenAI, Anthropic, Google Gemini, and other providers are interchangeable through a worker abstraction layer. AI is an operator, not a source of truth.

### 4. RAAS Is the Constraint Engine

Business logic lives in versioned, composable rule definitions, not in prompts. Rules layer additively across five tiers — platform safety, platform operations, vertical baselines, workspace overlays, per-transaction rules — with conflict resolution prioritizing the most-restrictive rule. The composed rule-set version is pinned at every governance event. Transfers, escrow execution, content publication, and attestations are rule-validated before persistence. Rules govern agents, not the other way around.

### 5. User Data Portability

Users can export their DTCs, logbooks, attestations, and transaction history. Tenant membership does not override user ownership of records. Records remain portable across tenants and across future systems. SOCIII is not a data silo.

---

## Repository Layout

| Path | Contents |
|------|----------|
| `apps/business/` | React 19 + Vite web application (the user-facing platform) |
| `apps/admin/` | Admin console (separate Vite app) |
| `functions/functions/` | Firebase Cloud Functions — all backend API routes in `index.js` |
| `contracts/` | Capability contract registry (`capabilities.json` — source of truth for executable actions) |
| `packages/sdk/` | Public SDK (`@titleapp/sdk`, ESM + CJS + TypeScript) |
| `raas/` | RAAS rule definitions by vertical and jurisdiction |
| `docs/specs/` | Architecture specs, CODEX records, shipped-state documentation |
| `docs/patents/` | Patent filing drafts and IP family overview |
| `marketing/` | Marketing campaign materials |

---

## Backend API

Single Firebase Function `exports.api` in `functions/functions/index.js`, deployed as a Cloud Run service. All routing handled manually inside that handler via `getRoute(req)`, which normalizes both direct calls (`/v1/...`) and Cloudflare Frontdoor passthrough (`/api?path=/v1/...`).

**Service URL:** `https://api-feyfibglbq-uc.a.run.app`
**Frontdoor URL:** `https://titleapp-frontdoor.titleapp-core.workers.dev` (to be migrated to a SOCIII-branded Worker)

Authentication is handled via Firebase ID Tokens, verified server-side using `admin.auth().verifyIdToken()`. Bearer tokens are passed unmodified through the Frontdoor.

---

## RAAS Architecture

RAAS (Rules and AI-as-a-Service) is the internal architecture name. User-facing language is **Digital Workers**.

Rule composition operates across five tiers:

- **Tier 0 — Platform Safety:** Immutable invariants (no professional impersonation, append-only audit trail, no PII exposure, AI-generation disclosure)
- **Tier 1 — Platform Operations:** Subscription enforcement, role-based access, capability gating, usage limits
- **Tier 2 — Vertical Baselines:** Per-industry rule sets (real estate by jurisdiction, securities, healthcare, aviation, automotive, etc.)
- **Tier 3 — Workspace Overlays:** Per-tenant customizations
- **Tier 4 — Per-Transaction Rules:** Transaction-specific rules layered onto the above

Conflict resolution prioritizes the most-restrictive rule. The composed rule-set version is pinned at every governance event for retrospective audit.

Detailed architecture is documented in `docs/patents/2026-05-24/Filing-C-RAAS-Multi-Tier-Composable-Rules-Provisional.md`.

---

## Current Verticals

The platform ships catalog workers across multiple verticals (counts as of 2026-05):

- Real Estate (Development + Operations + Title & Escrow): ~80 workers
- Aviation (Part 91 / 135 + Pilot Suite): 56 workers including 11 live CoPilots, PC12-NG reference implementation
- Auto Dealer: 29 workers
- Health and EMS: 42 workers (in development)
- Web3 Projects: 13 workers
- Government: 40 workers
- Real Estate Professional (Title & Escrow): 12 workers
- Platform (Business in a Box): 5 spine workers — Accounting, HR, Contacts, Marketing & Content, Control Center Pro
- Plus solar, education, and additional verticals in development

Total: 1,000+ workers across the catalog (creator-published workers added daily).

---

## Quick Start

**Web App:**
```bash
cd apps/business
npm install
npm run dev   # localhost:5173
```

**Admin App:**
```bash
cd apps/admin
npm install
npm run dev   # localhost:5174
```

**Firebase Functions (local emulator):**
```bash
cd functions
firebase emulators:start
```

**Firebase Functions (deploy):**
```bash
firebase deploy --only functions
```

**Frontend deploy (Firebase Hosting):**
```bash
cd apps/business && npm run build
firebase deploy --only hosting
```

Each sub-project is managed independently. There is no root-level build orchestration.

---

## Tech Stack

- **Frontend:** React 19, Vite, Firebase SDK 12, Tailwind utilities, custom design system
- **Backend:** Firebase Functions v2, Node.js 20, Firebase Admin SDK, Anthropic + OpenAI SDKs, Stripe SDK
- **Database:** Firestore (append-only event store)
- **Storage:** Firebase Cloud Storage
- **Auth:** Firebase Authentication + Stripe Identity (KYC/AML)
- **Edge:** Cloudflare Workers
- **Blockchain:** Chain-agnostic; preferred embodiment Base (formerly Crossmint integration)
- **Node version:** 20 (enforced via `.nvmrc`)

---

## IP and Licensing

The SOCIII platform implements patent-pending architecture in several areas. Foundational components were disclosed in:

- **U.S. Patent Application No. 18/398,973** (Combs, December 2023; abandoned in prosecution; published as prior art June 2025) — parent-child Digital Title Certificate architecture, multi-signature escrow
- **December 2024 Blockchain Logbook System filing** (Combs) — parent-child architecture extended to dynamic logbook records

Three new provisional patent applications targeted for filing May 2026 cover system-level composition of those foundations with AI-governed workers, multi-tier composable rule architecture, real-time underwriting, and hash-anchored audit chains. See `docs/patents/2026-05-24/` for the filing drafts.

**Licensing strategy:** SOCIII's worker runtime and SDK are anticipated to ship under an open-source license (Apache 2.0 with conditional patent grant under evaluation). The hosted trust layer — identity verification, rule registry, pre-publish constraint check, audit chain anchor, regulatory ingestion — remains a hosted service. This combination provides the adoption flywheel of open source with the moat of proprietary trust infrastructure. License selection and OSS release timing are determined by SOCIII Inc. leadership; no public license is committed in this repository at this time.

---

## Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Architecture conventions for AI-assisted contributors |
| `CONTRIBUTING.md` | Contribution guidelines |
| `LAUNCH_STATUS.md` | Current launch readiness |
| `DEPLOYMENT_CHECKLIST.md` | Pre-deploy verification |
| `docs/specs/` | CODEX records — shipped state and design decisions |
| `docs/patents/2026-05-24/` | Patent filings and IP family overview |
| `docs/specs/CODEX-51.3-SOCIII-Inc-Setup-and-Status.md` | SOCIII Inc. formation and corporate setup state |
| `docs/specs/CODEX-51.4-Knowledge-Capture-Pipeline-Spec.md` | Knowledge capture architecture |

---

## Project Status

**Active development.** Pre-launch. Sole-founder development (Sean Lee Combs).

**Soft launch target:** Wed 2026-05-27 (investor + warm-network tease).
**Public launch target:** Thu 2026-05-28 (consumer/creator audience).

**Active entity:** SOCIII Inc., a Delaware C-corporation formed May 2026.
**Legacy entity:** TitleApp LLC (in wind-down).

**Founder and Inventor:** Sean Lee Combs.

---

*SOCIII is the successor to TitleApp. The brand cutover from "TitleApp" to "SOCIII" is in progress; portions of the codebase, Firestore collection names, and API endpoint paths intentionally retain the legacy `titleapp` and `raas` identifiers to avoid breaking existing data and integrations.*
