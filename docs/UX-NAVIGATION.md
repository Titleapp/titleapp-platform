# UX & Navigation Reference

Canonical reference for how the SOCIII UI is laid out, what each surface is for,
and how data flows between them. **Source of truth for Alex's prompt** — when
Alex needs to explain Drive, Vault, Logbook, personas, or the sidebar, the answer
must come from here. Do not let Alex hallucinate alternative models.

Last updated: CODEX S51.43.8 (2026-05-30) — brand cutover SOCIII canonical;
HR Schedule moved inside the worker canvas (no sidebar sub-nav); workers-
are-self-contained principle codified.

---

## Sidebar pin order (top to bottom)

When no worker is selected, the sidebar shows:

1. **Workspace header** — current workspace name, persona switcher trigger.
2. **My Drive ›** — routes to `vault-documents` view (storage objects, raw files).
3. **My Vault ›** — routes to `vault-dtcs` view (Digital Title Certificates).
4. **Marketplace ›** — routes to `raas-store` view (browse / subscribe).
5. **My Workspaces** (collapsible) — every workspace the user has membership in.
6. **My Workers** (collapsible) — active worker subscriptions, grouped by vertical.
7. **My Games** (collapsible) — game workers if any.

All four primary pins (Drive, Vault, Marketplace, Workspaces) are visible on
**both** business and personal personas. Earlier builds gated Drive/Vault
behind `!isPersonal` — that was wrong. A personal Vault holds personal DTCs
(car titles, IDs, professional credentials), and a personal Drive holds
personal files. Same architecture, different scope.

---

## Drive vs Vault vs Logbook — three distinct concepts

These names get conflated. They are not the same.

### My Drive (`storageObjects` collection)
- **What it is**: raw files. PDFs, images, spreadsheets, Word docs.
- **Think of it as**: Google Drive. You upload, download, organize.
- **Taxonomy**: mime-class — Documents, Spreadsheets, Images, Presentations, Other.
- **Backing endpoint**: `/v1/storage:list`, `/v1/storage:upload`, `/v1/storage:download`, `/v1/storage:delete`.
- **Frontend**: `apps/business/src/sections/VaultDocuments.jsx` (named for legacy reasons; this is the Drive surface).
- **Hook**: `apps/business/src/hooks/useDocuments.js`.
- **Scope**: workspace-scoped via `TENANT_ID` header. Switching personas refetches.

### My Vault (`dtcs` collection)
- **What it is**: Digital Title Certificates. Tamper-evident records of things
  the user owns or is responsible for.
- **Think of it as**: a registry of titles. Each DTC is an immutable identity
  for one asset, with a hash anchor and (optionally) a chain anchor.
- **Taxonomy**: asset-class — Real Property, Vehicles, Personal Assets,
  Credentials, Business Records, Compliance.
- **Backing endpoint**: `/v1/dtc:list`, `/v1/dtc:get`, `/v1/dtc:mint`, `/v1/dtc:verify`.
- **Frontend**: `apps/business/src/sections/VaultDTCs.jsx`.
- **Hook**: `apps/business/src/data/useDtcCatalog.js`.
- **Scope**: workspace-scoped via `TENANT_ID` header. Switching personas refetches.

### Logbook (`logbookEntries` collection, per-DTC)
- **What it is**: an append-only chain of events scoped to a single DTC.
- **Who writes**: workers. When a worker acts on a DTC (registration, lien
  added, lien cleared, transfer, status change, inspection, etc.), it appends
  a logbook entry.
- **What's in an entry**: `entryType`, `data`, `createdByWorker`, `createdAt`,
  `dtcId`, `userId`. Optional file attachments.
- **Backing endpoint**: `/v1/logbook:list?dtcId=xxx`, `/v1/logbook:append`.
- **Frontend**: detail modal inside `VaultDTCs.jsx` — opens on DTC card click.
- **Append form**: v1.1 (currently viewer only).

The logbook is **the audit trail**. It is append-only — entries cannot be
edited or deleted. Verify endpoint exposes the hash chain for any DTC.

---

## Where DTCs come from

DTCs are minted by workers, not by users directly. Examples:
- Auto Dealer worker mints a vehicle DTC on inventory intake.
- Title & Search worker mints a property DTC on commitment.
- Pilot Suite mints a credential DTC for medical certs / type ratings.

A user with an empty Vault has not yet had any worker mint a record for them.
This is normal for new accounts and workspaces. **Empty Vault is not an error.**

The /v1/dtc:list endpoint hardens against missing composite indexes — it falls
back to a query without `orderBy` and sorts in JS. The composite index
`(userId ASC, tenantId ASC, createdAt DESC)` is in `firestore.indexes.json`.

---

## Persona switcher / workspace scoping

The persona switcher in the sidebar header sets `TENANT_ID` in localStorage and
fires the `ta:workspace-changed` event. Surfaces that should refetch on persona
change:

- `useDtcCatalog` — listens, refetches Vault.
- `VaultDocuments.jsx` — listens, refetches Drive.
- `Sidebar.jsx` — listens, refetches workspace role.

When adding a new workspace-scoped surface, **subscribe to `ta:workspace-changed`**
and re-run the fetch. Without this, the surface keeps showing the prior
persona's data even though `TENANT_ID` has changed.

A user typically has at least two personas:
- **Personal Vault** (`vertical=consumer`) — their own files, their own DTCs.
- **Business workspace(s)** — the organization's files, the organization's DTCs.

Both surface Drive and Vault pins. The data is workspace-scoped on the server
via `userId == ctx.userId AND tenantId == ctx.tenantId` filters.

---

## Routes and route → surface map

`onNavigate(routeId)` is the dispatcher. Key routes:

| Route ID            | Surface                                    |
|---------------------|--------------------------------------------|
| `dashboard`         | Workspace home                             |
| `vault-documents`   | My Drive (storageObjects)                  |
| `vault-dtcs`        | My Vault (DTCs)                            |
| `raas-store`        | Marketplace browse                         |
| `worker-home`       | Selected worker's home (chat + canvas)     |
| `settings`          | User / workspace settings                  |

Worker selection dispatches `ta:select-worker` with the worker slug; deselection
fires the same event with `null` and routes back to `dashboard`.

---

## What Alex must know (for prompt embedding)

When users ask Alex about Drive, Vault, or Logbook, Alex must:

1. Distinguish Drive (files) from Vault (DTCs) from Logbook (per-DTC events).
2. Never tell users to "upload a DTC" — DTCs are minted by workers, not uploaded.
3. Never tell users their empty Vault is broken — it just means no worker has
   minted a record for them yet.
4. Explain that switching personas re-scopes both Drive and Vault.
5. Explain that the Logbook for a DTC is opened by clicking the DTC in the Vault.
6. Use the asset-class names (Real Property, Vehicles, Personal Assets,
   Credentials, Business Records, Compliance) for Vault.
7. Use the mime-class names (Documents, Spreadsheets, Images, Presentations,
   Other) for Drive.
8. Never refer to the legacy "three column" model (My Stuff / My Workers /
   My Logbooks). That model predates 50.13 and is no longer accurate.

The condensed version of this knowledge lives in
`functions/functions/services/alex/prompts/core.js` under `DATA LAYER`.

---

## Workers are self-contained (2026-05-30)

When a worker has a feature, that feature lives **inside the worker's canvas**, not
in the sidebar. The sidebar names workers; the worker's canvas tabs do everything
else. Specifically:

- **HR Schedule lives inside the HR & People worker canvas** as the Schedule tab.
  There is no longer a sidebar "Scheduling" sub-nav. The Schedule tab renders the
  live `HRSchedulePanel` (team-member CRUD, time-off chips, IRS form links,
  Policies & Procedures doc) when the user is the tenant admin.
- The signal collision between HR canvas tabs (all six share signal
  `card:work-product`) is disambiguated by `payload.title` — for HR, when the
  canvas payload title is "Coverage", `<HRSchedulePanel />` is rendered instead
  of the generic sample card.
- The dead `case "scheduling"` route in `App.jsx` and the orphan
  `SPINE_NAV_CANVAS_MAP["scheduling"]` entry in `Sidebar.jsx` were removed in
  CODEX S51.43.8.

Why: clean UX (no disconnected nav), faster onboarding (everything for a worker
is reachable from one place), and prepares the marketplace pattern where a
listed worker has full UI sovereignty inside its canvas.

---

## Open SDK / Closed Platform pattern (decided 2026-05-30)

The codebase has two halves:

- **Open** (Apache 2.0, github.com/sociii) — `creators/`, `packages/sdk/`,
  `apps/business/src/components/canvas/`, worker authoring docs (`docs/CREATOR-
  ONBOARDING.md`, `docs/CREATOR-WORKER-BUILD.md`). Devs fork freely and build.
- **Closed** (proprietary, runs only on app.sociii.ai) — `functions/functions/`
  (API + audit + payments + identity), `raas/` (rules engine — patented),
  `contracts/capabilities.json` (capability registry — patented), marketplace
  infrastructure.

Creators authoring workers in `creators/<their-handle>/<worker-slug>/` follow the
template at `creators/_template/` (planned). Ruthie Clearwater's
`creators/ruthie/nursing-education-001/` is the first reference creator worker.

---

## Spine workers (5, every workspace)

All spine workers get a sidebar pin under MY WORKERS. The worker's home renders
inside the right panel via `WorkerHomeRenderer` (App.jsx). Canvas tabs come from
the worker's `canvasTabs[]` field.

| Slug                         | Sidebar label    | Has bespoke UI section? |
|------------------------------|------------------|-------------------------|
| `platform-accounting`        | Accounting       | Yes — `<Accounting />`           |
| `platform-hr`                | HR & People      | Yes — Schedule tab → `<HRSchedulePanel />` |
| `platform-marketing-content` | Marketing & Content | Generic canvas      |
| `platform-contacts`          | Contacts         | Yes — `<Contacts />` |
| `platform-control-center-pro`| Control Center Pro | Yes — `<CommandCenter />` |

When adding bespoke UI for a spine worker, branch in `WorkerHomeRenderer` (App.jsx)
by `worker?.slug` — that's the established pattern.

---

## Current platform truth (digest)

See `functions/functions/services/alex/knowledge/sociii-platform-context.md` for
the full reference — company status, governance, spine worker details, IR worker
state, identity + audit infrastructure, patent family, business model, current
creator work, and design discipline. The digest is embedded in
`functions/functions/services/alex/prompts/core.js` under `CURRENT PLATFORM STATE`.
