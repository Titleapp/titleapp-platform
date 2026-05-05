# CODEX 50.13 — Drive / Vault / DTC / Logbook Integration (SPEC)

**Author:** T1 (codebase-validating engineer)
**Date drafted:** 2026-05-04
**Status:** Decisions locked. Ready to execute. Sequencing per cross-cutting brief — contact webhook fix ships first, DTC schema migration second, then the rest of this spec.
**Source memo:** [CODEX-50.13-Drive-Vault-DTC-Memo.docx](../../Downloads/CODEX-50.13-Drive-Vault-DTC-Memo.docx)
**Companion specs:** [CODEX-50.14 Chain & Hash Anchor](CODEX-50.14-Chain-Anchor-Hash-Anchor.md), [CODEX-50.11 Worker Improvement Loop](CODEX-50.11-Worker-Improvement-Loop.md)

---

## What we're doing

Five structural fixes to the platform foundation:

1. **Drive/Vault separation.** What is currently rendered as "Vault" reads from `storageObjects` and is functionally a Drive. Real Vault content (DTCs in the `dtcs` collection) is invisible — `/v1/dtc:list` exists at `index.js:13218` but no frontend caller exists. Split into two peer top-level nav items: **Drive** (renamed from current Vault) and **Vault** (new surface, reads `dtcs` via `/v1/dtc:list`, renders by asset class).

2. **DTC schema additions.** Six new fields the architectural principle requires — `version`, `parent_dtc_id`, `modification_authority`, `chain_anchor_status`, `chain`, `credentialing_projection_schema`. Plus `contentHash` from the companion 50.14 spec, written together as one migration. Existing DTCs (small population) get backfilled with defaults.

3. **Workspace scoping for Drive.** `storageObjects` schema already has `orgId` (`lib/storage/index.js:111`) but the list query (line 209) filters by `ownerUid` only. Switching workspaces does not change visible documents. Extend the query to filter by workspace context.

4. **Modification authority gates.** The `modification_authority` field on each DTC governs who can append Logbook entries. Three values for v1: `owner_only` (default for personal-context DTCs), `workspace_role:admin` (default for tenant-context DTCs), `workspace_role:member`. Enforced at the API layer in `/v1/logbook:append`.

5. **Contact webhook tenant filter.** Three inbound handlers query the `contacts` collection by email/phone with no `tenantId` filter — a privacy bug that crosses workspace boundaries. Add tenant resolution + filter to all three.

Logbook stays as flat-join `logbookEntries` collection for v1; the chained-DTC refactor explicitly defers to v1.1 with documentation. Drive→Vault promotion UI defers to v1.1. Contact tier metadata defers to v1.1. Dual-record / credentialing projection defers to v1.1. All v1.1 deferrals are documented in the ADR so future work knows where the foundation stops.

## Why we're doing it

The platform is architecturally dishonest until this lands. A worker activation phase that mints DTCs no user can see, stores Vault records under the same UI as Drive files, leaks contact data across workspaces, and has no role-gated authority on shared workspace assets builds on a foundation that gets retrofitted later. The fixes here are foundation; everything downstream (Phase 1 worker activation, regulated-industry workers, multi-tenant Creator workers) reads from these primitives.

Contact webhook tenant filter is the smallest privacy fix and ships first as a confidence-builder. DTC schema migration is the second-most foundational because the hash anchor (50.14), chain anchor (50.14), and Vault UI all read from the new fields.

## Decisions locked (Sean, 2026-05-04)

**Q-A — Asset-class taxonomy.** Six-class taxonomy mapped from current 3 DTC types (`vehicle`, `property`, `credential`) plus a documented future-types expansion path. Types added per-vertical at worker registration. The 26-asset-type allowlist referenced in the memo isn't in code — it lives in CODEX 50.2 documentation. We don't gate on it; we register types as workers ship them.

V1 taxonomy:

| Asset Class | Maps to current `type` value(s) | Future-types expansion |
|---|---|---|
| **Real Property** | `property` | `commercial_property`, `land`, `lease`, `easement` |
| **Vehicles** | `vehicle` | `aircraft`, `vessel`, `commercial_fleet` |
| **Personal Assets** | (none today) | `art`, `collectibles`, `jewelry`, `musical_instrument`, `firearm` |
| **Credentials** | `credential` | `professional_license`, `certification`, `medical_license`, `pilot_certificate` |
| **Business Records** | (none today) | `entity_formation`, `operating_agreement`, `cap_table`, `equity_grant`, `contract` |
| **Compliance** | (none today) | `inspection_report`, `audit_finding`, `permit`, `attestation` |

Each class is a Vault tab. New types from worker registration declare which class they belong to.

**Q-B — DTC schema migration.** Backfill all existing DTCs with the new field defaults. `contentHash` is left null and computed by the hash anchor service (CODEX 50.14) in a separate batch pass — cleaner separation: this migration just adds fields; hash service owns canonical serialization.

**Q-C — Modification authority defaults.** `owner_only` for personal-context DTCs (those where `tenantId === userId` or `tenantId` is the user's personal tenant). `workspace_role:admin` for tenant-context DTCs (where `tenantId` is a real workspace). Worker-level modification authority overrides (per-worker default that overrides per-DTC) is a v1.1 evolution path.

## How we're doing it

### Layer A — Schema migration (foundation)

Single migration script writes 7 new fields to all existing DTCs. Defaults:

| Field | Type | Default | Notes |
|---|---|---|---|
| `version` | int | `1` | sequence number for concurrent-write conflict detection |
| `parent_dtc_id` | string \| null | `null` | future chained-DTC architecture (v1.1 refactor) |
| `modification_authority` | string | `owner_only` if personal context, `workspace_role:admin` if tenant context | api-enforced at `/v1/logbook:append` |
| `chain_anchor_status` | string enum | `hash_only` | `hash_only` \| `chain_pending` \| `chain_confirmed` \| `chain_failed` |
| `chain` | string \| null | `null` | populated only when chain_anchor_status ≠ hash_only |
| `credentialing_projection_schema` | string \| null | `null` | references projection schema name when v1.1 dual-record lands |
| `contentHash` | string \| null | `null` | populated by hash anchor service in subsequent pass (50.14) |

**Script:** `scripts/migrateDtcSchemaV2.js`. Dry-run by default (`--apply` to write). Skips DTCs that already have all 7 fields. Sets `modification_authority` based on whether the DTC's `tenantId` looks like a personal tenant (matches the worker's `userId`) or a real workspace.

**Validation:** post-migration, every DTC has 7 new fields populated; `chain_anchor_status === "hash_only"` for all (until 50.14 ships); `contentHash === null` for all (until hash service runs).

### Layer B — Drive surface (rename + workspace scoping)

The current `VaultDocuments.jsx` becomes `DriveDocuments.jsx`. Component logic unchanged; renamed for clarity. The other current Vault* components either move with it or retire:

| Component | Disposition |
|---|---|
| `VaultDocuments` | **Rename to `DriveDocuments`.** Functionally a Drive surface. |
| `VaultAssets` | **Retire.** Placeholder showing asset categories with no live data. Replaced by the new Vault. |
| `VaultDeadlines` | **Move to Drive** for v1 (deadlines are document-attached metadata). v1.1 may resurface. |
| `VaultTools` | **Retire.** Placeholder. |
| `VaultDashboard` | **Retire.** Placeholder. |

Sidebar adds two top-level nav pins (parallel to "My Vault" / Marketplace from Phase 2):

```
> My Drive  ›
> My Vault  ›
> Marketplace  ›
> My Workspaces ...
```

**Workspace scoping** for Drive:

`functions/functions/lib/storage/index.js:209` — extend query:

```js
let q = db.collection("storageObjects").orderBy("createdAt", "desc")
const { uid, orgId } = ctx; // orgId is the active workspace tenant
if (orgId && orgId !== uid) {
  q = q.where("orgId", "==", orgId);
} else {
  q = q.where("ownerUid", "==", uid).where("orgId", "==", null);
}
```

Frontend hook `useDocuments` reads active workspace context from the persona switcher state (already in `WorkerStateContext`) and includes it on the request. Switching workspaces re-runs the query with the new `orgId`.

**Backfill:** existing `storageObjects` documents have `orgId === null` (user-scoped). They stay in the personal Drive. New uploads in a Business workspace context write `orgId === activeTenantId`.

### Layer C — Vault surface (new)

New component `apps/business/src/sections/VaultDTCs.jsx` reads from `dtcs` via `/v1/dtc:list`. The endpoint at `index.js:13218` already exists; this is the first frontend caller.

Render layout:

```
[VAULT — header with workspace context badge]
[Tab strip: Real Property | Vehicles | Personal Assets | Credentials | Business Records | Compliance]
[Card grid per asset class — DTC ID, type, primary metadata fields, chain_anchor_status badge, logbookCount]
[Click a card → DTC detail panel with full metadata + Logbook entries]
```

Asset-class mapping helper (client-side, derived from worker `vertical`/`type` registration):

```js
const ASSET_CLASS_OF = {
  vehicle: "Vehicles",
  property: "Real Property",
  credential: "Credentials",
  // future types declared at worker registration:
  // commercial_property: "Real Property", aircraft: "Vehicles", art: "Personal Assets", etc.
};
```

A new helper `useDtcCatalog()` hook (parallel to Phase 2's `useWorkerCatalog()`) subscribes to user/tenant DTCs and returns the normalized list. Reads `digitalWorkers/{slug}` rules for workspace context. Public read on `dtcs` is **NOT** opened — DTCs are user/tenant private; the existing Firestore rule (auth required, owner check) stays.

### Layer D — Modification authority gates

`/v1/logbook:append` (find at `index.js` near logbookEntries write at line 13537) reads the parent DTC's `modification_authority` field and gates accordingly:

```js
async function canAppend(uid, dtcDoc) {
  const auth = dtcDoc.data().modification_authority;
  if (auth === "owner_only") return uid === dtcDoc.data().userId;
  if (auth === "workspace_role:admin") return await hasRole(uid, dtcDoc.data().tenantId, "admin");
  if (auth === "workspace_role:member") return await hasRole(uid, dtcDoc.data().tenantId, ["admin", "member"]);
  return false; // unknown authority value, default deny
}
```

`hasRole` reuses the `enforceRoleGate` middleware already in place from CODEX 50.7. Firestore rules remain default-deny on `logbookEntries`; the API layer is the gate.

### Layer E — Contact webhook tenant filter

Three handlers, identical fix pattern:

**`functions/functions/communications/twilioInbound.js:27`** — currently:
```js
db.collection("contacts").where("phone", "==", from)
```
Fix: resolve workspace context from the inbound payload (Twilio messaging service ID maps to a workspace) and add `.where("tenantId", "==", resolvedTenantId)`. Where the payload has no resolvable workspace, log + skip.

**`functions/functions/communications/sendgridInbound.js:37-40`** — same pattern, resolve from SendGrid sender identity.

**`functions/functions/communications/sendgridWebhook.js:34-38`** — same pattern, resolve from event metadata.

A small helper `resolveInboundTenant(handler, payload)` shared across all three: returns `{ tenantId, source }` or `{ tenantId: null, reason }`. Tenant resolution lookup: `inboundChannelMap/{handlerKey}` Firestore collection mapping channel IDs to tenants. Misconfigured/legacy channels log and skip rather than updating arbitrary contacts.

## Open questions answered (T1 from code visibility)

| Memo Q | T1 answer |
|---|---|
| Sequencing relative to other in-flight work | Contact webhook fix first (~30 min, zero deps). DTC migration second (foundation). Then 50.14 hash anchor (reads `contentHash`). Then Drive/Vault UI. Then 50.14 Crossmint. Then 50.11 work. Detail in cross-cutting brief. |
| Component disposition for current Vault sections | See Layer B table — rename `VaultDocuments`, retire `VaultAssets`/`VaultTools`/`VaultDashboard`, move `VaultDeadlines` to Drive. |
| DTC schema migration path | Backfill (Q-B locked). |
| Asset-class taxonomy fit against 26 types | The 26-type list isn't in code. Six-class taxonomy stands; types added per-vertical at worker registration. Documented in the ADR. |
| Capability registry naming | Defer to 50.14 spec — that's where the chain-anchor capability lives. |
| Modification authority defaults | `owner_only` personal, `workspace_role:admin` tenant (Q-C locked). Worker-level override = v1.1. |

## Action sequencing within this spec

1. **Contact webhook tenant filter** (~30 min) — three handlers, single helper, log-and-skip on unresolvable. Ships first as standalone privacy fix.
2. **DTC schema migration script** (~1 hr) — write `migrateDtcSchemaV2.js`, dry-run, apply, validate. Touches small DTC population (count TBD; likely <100 today).
3. **Workspace scoping for Drive** (~1.5 hr) — `lib/storage/index.js` query update, frontend `useDocuments` hook update.
4. **Vault surface + asset-class rendering** (~3-4 hr) — new `VaultDTCs.jsx`, `useDtcCatalog()` hook, asset-class taxonomy helper, sidebar nav pin. First frontend caller of `/v1/dtc:list`.
5. **Drive rename + retire dead components** (~1 hr) — rename `VaultDocuments.jsx` → `DriveDocuments.jsx`, delete `VaultAssets`/`VaultTools`/`VaultDashboard`, move `VaultDeadlines`.
6. **Modification authority gates on `/v1/logbook:append`** (~1 hr) — read DTC's `modification_authority`, dispatch to `hasRole`.
7. **ADR addendum** — document the Logbook flat-join v1 implementation vs chained-DTC architectural principle, document v1.1 deferrals.

**Total: ~7-8 hr engineering-Claude shipping pace.**

## Out of scope (deferred to v1.1)

- **Chained-DTC Logbook refactor.** Logbook entries become DTCs themselves with `parent_dtc_id`. v1 ships flat-join; v1.1 refactor backfills `parent_dtc_id`.
- **Drive→Vault promotion UI.** Context-menu action on Drive documents to mint as DTC. Architecture supports it (capability is declared); UI surface is v1.1.
- **Contact tier metadata.** Personal/professional/confidential tiers on contacts plus role-based filtering. Greenfield; v1.1.
- **Dual-record / credentialing projection.** `credentialingProjections` collection with projection schema definitions per asset type. Atomic paired-write logic. Field `credentialing_projection_schema` ships in v1 schema; v1.1 wires the projection logic.
- **Worker-level modification authority override.** v1 has per-DTC authority; v1.1 adds a per-worker default that flows to new DTCs created by that worker.
- **Asset-class enforcement at write time.** v1 client-side mapping is informational; v1.1 server-side validates `type` against asset-class allowlist.

## Acceptance criteria

- All existing DTCs have the 7 new fields populated.
- `/v1/dtc:list` has at least one frontend caller (the new Vault surface).
- Switching workspaces in the persona switcher changes visible Drive documents.
- The three contact webhook handlers reject events with no resolvable `tenantId` (log + skip, no contact update).
- A user appending a Logbook entry to a tenant DTC where they are not an admin gets `403 Forbidden`.
- Sidebar shows "My Drive" and "My Vault" as parallel top-level nav pins.
- ADR documents Logbook v1 flat-join vs chained-DTC v1.1 plan, with the patent-claim rationale called out.

## Acceptance evidence (post-build)

- Migration script run output showing 100% DTCs touched, 0 errors.
- Smoke test: open Vault → see 6 asset class tabs → click Vehicles → see vehicle DTCs (or empty state if none yet).
- Smoke test: switch from Personal to Business workspace → Drive content changes.
- Smoke test: send inbound webhook event with no `tenantId` resolution → handler logs and skips, no contact mutation.

---

*End of spec. Execution begins with the contact webhook fix and proceeds through the seven-step sequence above.*
