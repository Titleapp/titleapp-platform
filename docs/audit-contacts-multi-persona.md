# Audit — Contacts schema multi-persona support

**Date:** 2026-05-09
**Owner:** Sean (review) · Claude (audit + propose)
**Status:** Audit complete · proposal pending Sean approval · NOT yet implemented
**Punch list ref:** Item #1 of `project_pre_launch_punch_list.md`

---

## TL;DR (read this first)

The current `spine_v2` schema **does not support multi-persona contacts**. A contact is forced into one `type`, one `contact_tier`, one `lifecycle_stage`. Sean's example — *friend + client + collaborator on same person* — cannot be expressed without overloading the `segments[]` array as a workaround.

**Recommended fix:** introduce `personas[]` as a first-class array on each contact, where each entry carries its own `{ tier, type, lifecycle_stage, lead_score, tags, notes, owner, created_at }`. Keep singular top-level fields populated from a "primary persona" pointer for read-path backwards compatibility. Bump schema to `spine_v2.1`.

**Effort:** ~1 day (4 hours code + 2 hours migration + 2 hours testing). **Risk:** low. **Blocks:** any real user importing a contact list. **Should ship before soft launch.**

---

## Current state — `spine_v2` (CODEX 50.15 P0-1, shipped)

Full schema as written by `api/routes/contacts.js`:

```js
{
  // Identity
  tenantId: string,                    // workspace ownership
  schema_version: "spine_v2",
  name: string,
  identity_id: string | null,          // KYC verification link
  workspaces: [string],                // ALREADY plural — multi-workspace works

  // SINGULAR role/state — THIS IS THE GAP
  type: enum,                          // customer | vendor | investor | tenant | employee | patient | student | contractor | personal
  contact_tier: enum,                  // personal | professional | confidential | investor | customer | prospect | partner | vendor
  lifecycle_stage: enum,               // cold | warm | engaged | converted | churned | lost
  lead_score: 0-100,                   // single score, scope unclear

  // Singular last-touch context
  source: { primary, sub, captured_at, apollo_person_id? },
  enrichment: { company, role, seniority, industry, social, ... },
  notes: string | null,

  // Already plural / fine as-is
  segments: [string],                  // arbitrary tag array — gets overloaded as a multi-persona hack today
  email: string | null,
  phone: string | null,

  // Audit
  added_by, created_at, updated_at,

  // Subcollection
  contacts/{id}/engagement[] : { type, channel, campaignId, payload, timestamp }
}
```

**Validators (from `routes/contacts.js`):**
- `VALID_TYPES = [customer, vendor, investor, tenant, employee, patient, student, contractor, personal]`
- `VALID_TIERS = [personal, professional, confidential, investor, customer, prospect, partner, vendor]`
- `VALID_LIFECYCLE = [cold, warm, engaged, converted, churned, lost]`

**Writers across codebase:**
- `api/routes/contacts.js` — POST/PUT (canonical, validates)
- `services/marketingService/apollo.js:apolloPersonToContact()` — Apollo→contact mapper, hardcodes `type:"customer"`, sets `contact_tier` from provenance
- `index.js:9645–9657` — `apollo:search` route, dedupes by `apollo_person_id` (does NOT update existing)
- `scripts/seedDemoData.js` — STILL writes `schema_version: "spine_v1"` (stale, separate cleanup)
- `admin/generateDailyDigest.js:472` — still queries `spine_v1` (also stale)

---

## The gap — Sean's example

> "My friend could also be a client of mine and a collaborator on an app/project."

Today, picking a single value for each singular field fails:

| Persona | type | contact_tier | lifecycle_stage |
|---|---|---|---|
| Friend | personal | personal | engaged |
| Client | customer | customer | converted |
| Collaborator | contractor | partner | engaged |

You can pick ONE row. Whatever you pick, the other two contexts are inaccessible to:
- Marketing campaign segmentation (filter by `contact_tier`)
- Lifecycle queries (filter by `lifecycle_stage`)
- Worker routing logic that branches on `type`

The `segments[]` array can be hacked into carrying `["personal-friend","client","collaborator-projX"]` as tags — but Firestore can only `array-contains-any` against this; it can't combine "all my professional contacts whose lifecycle is converted" with "scoped to friends" because lifecycle and tier are still singular.

**Real-world implication:** the moment a real user imports a contact list (Sean's, Kent's, anyone's), they hit this. The first time someone tries to address a contact who's both "investor in my Fundraise" AND "buyer of my Real Estate worker output" we either lose data or the user manually duplicates the contact (which then breaks dedupe).

---

## Proposed extension — `spine_v2.1`

### Schema change

Add a `personas[]` array. Each persona carries the role + state fields that were previously singular:

```js
{
  // ... existing identity fields stay ...

  schema_version: "spine_v2.1",         // bumped

  personas: [
    {
      id: "p_001",                       // stable per-persona ID for engagement logging
      role_label: "client",              // free-text human label ("close friend", "co-founder", "lender")
      type: "customer",                  // from VALID_TYPES
      tier: "customer",                  // from VALID_TIERS
      lifecycle_stage: "converted",
      lead_score: 75,
      tags: ["fundraise-2026", "deal-x"],
      notes: "context specific to this persona",
      owner: "userId or workerId responsible for this persona",
      project_bindings: ["projectId", "fundraiseId"],   // optional, for collaborator/investor personas
      created_at: ts,
      last_interaction_at: ts,
    },
    // ... 0..N more personas ...
  ],
  primary_persona_id: "p_001",            // pointer for back-compat top-level mirroring

  // Top-level mirrors of primary persona — kept populated for read back-compat
  // until all consumers migrate to personas-aware reads:
  type, contact_tier, lifecycle_stage, lead_score,    // = personas[primary].*

  // Cross-persona indexed flat array for Firestore query (array-contains-any works):
  tiers_index: ["customer", "personal", "partner"],   // = personas.map(p => p.tier)

  // Keep existing fields:
  source, enrichment, segments, email, phone, notes,
  workspaces, identity_id, ...
}
```

### Why this design

1. **Back-compat for reads.** Top-level `type`/`contact_tier`/`lifecycle_stage` stay populated (mirroring `primary_persona`). Old code keeps working without touching anything.

2. **Firestore-friendly cross-persona queries.** `tiers_index[]` lets you query `where("tiers_index", "array-contains", "customer")` — finds all contacts where ANY persona is a customer. No new index types needed.

3. **Per-persona engagement.** The `engagement` subcollection gains an optional `personaId` field, so Marketing can address engagement to the "client" persona of a multi-persona contact without polluting the "friend" view.

4. **Per-persona ownership.** Different personas can be owned by different workers/users. The Marketing worker owns the "prospect" persona; the user themselves owns the "personal" persona; the Fundraise worker owns the "investor" persona. Clean responsibility split.

5. **Minimal new vocabulary.** Reuses `VALID_TYPES`, `VALID_TIERS`, `VALID_LIFECYCLE`. No new enums.

### What changes in code

| File | Change |
|---|---|
| `api/routes/contacts.js` POST | Accept `personas[]` in body. If absent, synthesize a single-persona array from singular fields. Always write top-level mirrors + tiers_index. |
| `api/routes/contacts.js` PUT | Accept persona-level updates: `body.personas[i]` patches. Re-derive top-level mirrors + tiers_index on write. |
| `api/routes/contacts.js` GET | Accept `?persona_tier=` and `?persona_type=` filters using `tiers_index`. Existing singular filters still work. |
| `api/routes/segments.js` | Update query builder to support persona-aware filters. |
| `services/marketingService/apollo.js:apolloPersonToContact()` | Output a `personas: [{...}]` array with the prospect persona pre-populated. |
| `index.js` apollo:search | When existing contact found, ADD the new persona to `personas[]` instead of skipping. (Fixes a separate pre-existing bug — Apollo currently doesn't enrich existing contacts.) |
| `scripts/migrateContactsToSpineV2_1.js` (new) | One-shot backfill: lift singular fields → `personas[0]`, set `primary_persona_id`, populate `tiers_index`, bump `schema_version`. |

### Migration plan

1. **Phase 0 — Code lands.** Routes accept both old singular-only writes (synthesize personas[] on the fly) AND new personas[]-aware writes. Reads return both top-level mirrors and `personas[]`. Schema version stays `spine_v2` for old writes, `spine_v2.1` for new.

2. **Phase 1 — Backfill script.** Iterate every contact with `schema_version == "spine_v2"`. Build `personas: [{ id: "p_001", type, tier, lifecycle_stage, lead_score, tags: [], owner: added_by, ... }]` from existing singular fields. Set `primary_persona_id: "p_001"`. Populate `tiers_index: [tier]`. Bump to `spine_v2.1`. Idempotent (skip if already v2.1).

3. **Phase 2 — Frontend opt-in.** Contacts list UI gains a "personas" pill row per contact (chip per persona, click to scope filters). Detail view gains "Add persona" button. No forced migration — UI gracefully degrades for v2 contacts (which by Phase 1 should be empty).

4. **Phase 3 — Deprecate singular write paths.** After 30 days of clean v2.1 reads/writes, log warnings on POST that omits `personas[]`. After 60 days, hard-require `personas[]` for new contacts. Top-level mirrors stay forever for read back-compat.

### Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Backfill script over-writes a partially-migrated record | Low | Idempotent check on `schema_version == "spine_v2.1"` skip. |
| `tiers_index` drifts from `personas` (forgot to update on write) | Med | Single helper `derivePersonaIndex(personas)` called in POST + PUT. Unit-test it. Add Firestore audit job to recompute and warn on drift. |
| Apollo writes a 2nd persona to a contact that doesn't want it | Low | Apollo enrichment requires explicit user action (subscribe or `write_to_contacts: true` flag). Existing flag respected. |
| Top-level singular fields get out of sync with `personas[primary]` | Low | Re-derived on every write. Read paths consult top-level (cheap path); persona-aware paths consult `personas[]`. |
| Existing engagement events don't have `personaId` (orphan engagement) | None | Optional field. Engagement still attaches to the contact as a whole. |
| Frontend rendering of multi-persona contacts is confusing | Med | Defer until UI work — chip row plus "scope to persona" toggle is the design. Sean reviews UX before Phase 2. |

### Acceptance criteria

A contact CRUD round-trip:

1. POST a contact with no `personas[]` → server synthesizes one persona from singular fields → reads return both top-level mirrors AND `personas: [{...}]` ✓
2. POST a contact with three personas (friend + client + collaborator) → all three persisted → `tiers_index` contains 3 entries → primary persona's fields mirror to top-level ✓
3. GET `?persona_tier=customer` returns multi-persona contacts where ANY persona has tier=customer ✓
4. PUT body `{ personas: [{ id: "p_002", lifecycle_stage: "converted" }] }` → patches that persona only, rebuilds tiers_index, no other personas affected ✓
5. Apollo search → existing contact (deduped by `apollo_person_id`) → adds a "prospect" persona to existing `personas[]` instead of silently skipping ✓
6. Backfill script run idempotently twice → second run is a no-op ✓
7. Daily digest query for `spine_v1` (separate cleanup later) still works without crashing — schema_version drift surfaces as a warning, not an error ✓

---

## Out of scope for this audit

- Frontend UX for multi-persona display — UI work deferred until backend ships
- `seedDemoData.js` and `admin/generateDailyDigest.js` use of `spine_v1` — pre-existing tech debt, separate cleanup
- Customer-of-a-company persona (item #12 of punch list) — orthogonal concern, addressed via scoped share-link tokens, not via personas[]
- Workspace-scoped persona overrides (e.g., this contact is a "client" in workspace A but a "prospect" in workspace B) — possible v2.2 extension if needed; current model treats personas as global per contact

---

## Recommended next step

1. Sean reviews this proposal (5 min read)
2. If approved, implementation lands as a single CODEX (~4–6 hours of code + migration + tests)
3. After implementation: rerun the Fundraise dogfood test (Option B from this hour's prompt) — Kent's investor list will now import cleanly with the right persona mix

If anything in the proposed extension feels off or under-specified, flag it before implementation and I'll revise. The whole point of an audit memo is to surface design errors before code goes in.
