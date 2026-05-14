# CODEX 50.18 — Contacts Spine v2.1 Multi-Persona

**Status:** In progress · 2026-05-09
**Owner:** Sean (review) · Claude (implementation)
**Approved:** 2026-05-09 by Sean (audit at `docs/audit-contacts-multi-persona.md`)
**Punch list ref:** Item #1 of `project_pre_launch_punch_list.md` — soft-launch critical
**Predecessor:** CODEX 50.15 P0-1 (Contacts spine_v2 migration, shipped)

---

## Why this exists

A contact in `spine_v2` has singular `type`, `contact_tier`, and `lifecycle_stage`. Sean's example — *friend + client + collaborator on same person* — cannot be expressed without overloading `segments[]` as a tag-list workaround, which breaks query semantics for Marketing campaigns and worker routing.

Per Sean's call: blocking soft launch. First user importing a contact list hits this immediately.

## What this CODEX delivers

`spine_v2.1` schema:
- `personas[]` array — first-class. Each persona carries `{ id, role_label, type, tier, lifecycle_stage, lead_score, tags[], notes, owner, project_bindings[], created_at, last_interaction_at }`.
- `primary_persona_id` — pointer for back-compat top-level mirroring.
- `tiers_index[]` — flat array of persona tiers, enables Firestore `array-contains-any` cross-persona queries.
- Top-level `type`/`contact_tier`/`lifecycle_stage`/`lead_score` stay populated (mirror primary persona) so existing read paths keep working without refactor.
- `engagement` subcollection gains optional `personaId` so Marketing addresses engagement to the right persona.

## Scope

**In scope:**
- Backend route changes: `api/routes/contacts.js` POST/PUT/GET, `api/routes/segments.js` query builder
- Apollo mapper + dedupe behavior: `services/marketingService/apollo.js`, `index.js` apollo:search
- Migration script: `scripts/migrateContactsToSpineV2_1.js` — idempotent backfill
- Smoke test against the 7 acceptance criteria from the audit
- Deploy to api function

**Out of scope (separate work):**
- Frontend UX for multi-persona display (chip row, scope-toggle) — defer until backend ships, Sean reviews UX
- `seedDemoData.js` and `admin/generateDailyDigest.js` `spine_v1` references — pre-existing tech debt
- Customer-of-a-company persona (punch list #12) — orthogonal, addressed via scoped share-link tokens
- Workspace-scoped persona overrides — possible v2.2 if needed
- Hard-deprecating singular-field writes (60-day phase-out per audit)

## Schema (canonical for v2.1)

```js
{
  // Identity (unchanged)
  tenantId, name, identity_id, workspaces[], email, phone, notes, segments[],
  source, enrichment, added_by, created_at, updated_at,

  // VERSION
  schema_version: "spine_v2.1",

  // NEW — multi-persona
  personas: [
    {
      id: "p_001",
      role_label: "client",                     // free-text human label
      type: "customer",                          // VALID_TYPES
      tier: "customer",                          // VALID_TIERS
      lifecycle_stage: "converted",              // VALID_LIFECYCLE
      lead_score: 75,                            // 0..100
      tags: ["fundraise-2026", "deal-x"],
      notes: "context specific to this persona",
      owner: "userId or workerId",
      project_bindings: ["projectId"],           // optional
      created_at: ts,
      last_interaction_at: ts | null,
    },
    // 0..N more personas
  ],
  primary_persona_id: "p_001",

  // FLAT INDEX for Firestore cross-persona queries
  tiers_index: ["customer", "personal", "partner"],   // = personas.map(p => p.tier)

  // BACK-COMPAT MIRRORS — re-derived on every write
  type, contact_tier, lifecycle_stage, lead_score,    // = primary persona's

  // SUBCOLLECTION (existing) — gains optional personaId
  contacts/{id}/engagement[] : {
    type, channel, campaignId, payload, timestamp,
    personaId?: string,                                // NEW: optional
  }
}
```

## Sequencing

| Pass | What | File(s) | Est |
|---|---|---|---|
| 1 | Routes — `routes/contacts.js` POST/PUT/GET accept personas[], synthesize from singular when absent, mirror primary, populate tiers_index, add `?persona_tier`/`?persona_type` filters | `api/routes/contacts.js` | 60 min |
| 2 | Apollo mapper emits personas[]; apollo:search adds persona to existing instead of skip | `services/marketingService/apollo.js`, `index.js` | 30 min |
| 3 | Migration script — idempotent v2 → v2.1 backfill | `scripts/migrateContactsToSpineV2_1.js` (new) | 30 min |
| 4 | Segments query + engagement personaId | `api/routes/segments.js`, `api/routes/contacts.js` | 30 min |
| 5 | Smoke test + deploy | curl scripts + Sean verifies | 30 min |

Total: ~3 hours focused work.

## Acceptance criteria (from audit, restated)

1. POST contact with no `personas[]` → server synthesizes single persona from singular fields → reads return both top-level mirrors AND `personas: [{...}]` ✓
2. POST contact with three personas (friend + client + collaborator) → all three persisted → `tiers_index` contains 3 entries → primary mirrors top-level ✓
3. GET `?persona_tier=customer` returns multi-persona contacts where ANY persona has tier=customer ✓
4. PUT body `{ personas: [{ id: "p_002", lifecycle_stage: "converted" }] }` → patches that persona only, rebuilds tiers_index, no other personas affected ✓
5. Apollo search → existing contact (deduped by `apollo_person_id`) → adds a "prospect" persona to existing personas[] instead of silently skipping ✓
6. Backfill script run idempotently twice → second run is a no-op ✓
7. Daily digest query for `spine_v1` (separate cleanup) still works without crashing ✓

## Risk

- **Drift between `tiers_index` and `personas`** — mitigated by single helper `derivePersonaIndex(personas)` called on every POST + PUT.
- **Singular top-level mirror staleness** — re-derived on every write from primary persona.
- **Apollo silently adding unwanted personas** — gated by existing `write_to_contacts: true` flag (no behavior change).
- **Backfill over-write** — idempotent skip on `schema_version == "spine_v2.1"`.

## Helpers (canonical)

- `synthesizePersonasFromSingular(body)` — used in POST when body has singular fields but no personas[].
- `mergePersonaPatch(existingPersonas, patchArray)` — used in PUT to apply partial persona patches.
- `derivePrimaryMirrors(personas, primaryId)` — recomputes top-level `{type, contact_tier, lifecycle_stage, lead_score}`.
- `derivePersonaIndex(personas)` — `personas.map(p => p.tier)` deduped.
- `addPersonaToExisting(existingDoc, newPersona)` — used by Apollo when contact already exists.

These helpers live in a new `api/routes/_contactsHelpers.js` so routes/contacts.js, routes/segments.js, and the migration script all import from one source.

## Test plan (manual)

After deploy, Sean runs the 7-step curl sequence (will provide). Tests v2.1-aware writes, back-compat reads, persona-filter queries, Apollo enrichment of existing contact, and migration idempotency.

## Notes for the next session

If frontend work picks up before this CODEX is closed: the contacts list view should render persona chips per row. The detail view gets an "Add persona" button. The scope toggle (filter by persona) is the most-used interaction. Ship UI to dogfood with Sean's own contacts before exposing to public users.
