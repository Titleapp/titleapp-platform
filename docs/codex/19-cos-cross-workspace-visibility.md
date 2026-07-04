# CODEX Surface 19 — COS Cross-Workspace Visibility (Alex as the Sun)

**Status:** 🔴 architect now · **Owner:** Sean · **Created:** 2026-07-03 · **Red-teamed:** 2026-07-03 (3 external agents: security, architecture, product)
**Bar:** Alex knows everything Sean owns, across every persona. Switching personas never blinds her.

---

## The problem in one sentence

COS (Alex) queries data by `tenantId` — one workspace at a time. A user with 3 personas has 3 blind Alex instances instead of one Alex who knows all 3.

## Why this matters now

Sean's investor contacts (1,443) live under workspace `ws_1779846027006_hc71aw`. His current session runs under a different workspace. Alex told him "0 contacts, no campaigns" — blocking investor outreach management. The `source_member_uid` fallback deployed 2026-07-03 is a bridge. This is the real fix.

This is not Sean-specific. Power users — the ones who pay, who scale, who bring other users — are exactly the ones with multiple personas: personal + business + client-facing. If Alex goes blind when they switch personas, they stop trusting her.

---

## The model: two keys, two scopes

Every user-generated record should carry two keys:
- `ownerUid` — who owns this (Firebase Auth uid). User-level. Never changes.
- `tenantId` — which workspace created it. Workspace-level. Changes per persona.

**Alex (COS)** queries by `ownerUid` → sees across all `cosVisible` personas.
**Domain workers** (Marketing, Contacts, IR, Accounting) query by `tenantId` → stay silo-scoped.

**Pull-not-push (RT8 resolution):** Alex never proactively volunteers data from a different persona. Cross-workspace lookup only fires when the user explicitly asks about contacts, campaigns, or cross-persona state. Alex doesn't say "I see you also know Marcus from your Personal Space" unprompted — that feels like a privacy violation, not a superpower.

**Opt-out per workspace (RT9 resolution):** Each workspace has a `cosVisible: boolean` field (default `true`). Users can flip a workspace to `cosVisible: false` from Settings → that workspace is excluded from Alex's fan-out entirely. This is the escape hatch for users who want hard persona separation.

**Education hard-silo (RT10 resolution):** Workspaces with `vertical: "education"` tag are excluded from COS fan-out by default — `cosVisible` defaults to `false` and cannot be flipped via the standard Settings toggle (requires support). FERPA prohibits disclosure of student education records to other systems without institutional authorization. This is not a UX preference; it is regulatory. A nursing instructor's school workspace never bleeds into her personal COS view.

---

## What is "user-generated CRM data" vs. "workspace data"?

**User-level (Alex sees across all `cosVisible` personas):**
- `contacts` — the personal/business CRM
- `emailCampaignProposals` — investor / outreach batches. ✓ already has `ownerUid`
- `emailCampaignSends` — individual send records. ✓ already has `ownerUid`
- `alex_notes` — memory. ✓ already has `ownerUid`
- `alertFeed/{uid}/items` — operating feed (codex 18). ✓ uid-scoped from the start

**Workspace-level (workers see only their silo — intentionally):**
- `transactions` / `coaAccounts` — accounting is per-business
- `employees` / `staff_credentials` — HR is per-business
- `socialPosts` / `campaigns` — marketing content is per-brand
- `raasCatalog` / `raasPackages` — worker rules/execution are per-workspace
- `files` / `imports` — data room is per-workspace

**COS shows both:** Alex presents workspace-level KPIs per persona as separate cards ("Your SOCIII Inc. accounting shows X; your Personal Space shows Y") — never summed across personas (RT11 resolution). User-level CRM is queried without persona filter.

---

## Data model change

### New fields on all user-level collections

```js
ownerUid: ctx.userId,  // Firebase Auth uid — set server-side at write time, never mutated
tenantId: ctx.tenantId, // workspace — set server-side at write time, never mutated
```

Both fields are immutable after creation (append-only invariant). `ownerUid` is NEVER accepted from client input.

### Workspace field: `cosVisible`

```js
// users/{uid}/workspaces/{tenantId}
cosVisible: true,        // default — Alex fans out to this workspace
// vertical: "education" workspaces are locked to cosVisible: false
```

### Query patterns

| Caller | Collection | Query |
|---|---|---|
| COS (Alex) | contacts | `where("ownerUid", "==", uid)` — then dedup by email |
| COS (Alex) | emailCampaignProposals | `where("ownerUid", "==", uid)` ✓ (already) |
| COS (Alex) | alex_notes | `where("ownerUid", "==", uid)` ✓ (already) |
| Contacts worker | contacts | `where("tenantId", "==", tenantId)` |
| Marketing worker | contacts | `where("tenantId", "==", tenantId)` |
| COS sibling state | all workspace KPIs | fan-out across uid's `cosVisible` workspaces (see below) |

---

## COS sibling state: persona fan-out

Currently `buildSiblingStatePrompt` queries one workspace. It should query ALL `cosVisible` workspaces.

```
user → users/{uid}/workspaces/ → filter cosVisible:true → [tenantId1, tenantId2]
         ↓
buildSiblingStatePrompt fans out in parallel:
  Persona A (SOCIII Inc.) → accounting KPIs, HR, workers [capped: 400 tokens]
  Persona B (Personal Space) → vault, personal items [capped: 400 tokens]
         ↓
Alex gets per-persona KPI cards, labeled explicitly — never summed
```

**Implementation:**
1. `users/{uid}/workspaces/` subcollection already exists
2. Read all workspace docs at COS context-build time; filter `cosVisible !== false` and `vertical !== "education"`
3. Derive workspace list from `memberships/` collection at query time — do NOT rely solely on the subcollection (which can be stale after a removal). Cross-reference: if `memberships/{tenantId}` for uid is inactive/deleted, exclude that workspace even if it's in the subcollection
4. Fan out `buildTenantLiveSnapshot` per workspace in parallel (cap: 8 workspaces)
5. **Token budget per workspace:** each workspace's KPI block is truncated to ~400 tokens. If a workspace has 2,000 contacts, Alex sees the KPI summary ("1,443 contacts, 3 segments") — not a full dump
6. Never aggregate numeric KPIs across personas (pipeline value, contact count, revenue) — present as separate cards

---

## Contact dedup: full specification (RT12 resolution)

Firestore has no GROUP BY. Dedup happens in application memory after the ownerUid fan-out fetch.

Algorithm:
1. Fetch all contacts where `ownerUid == uid` (single ownerUid query, post-backfill)
2. Normalize email: `email.trim().toLowerCase()`
3. Group by normalized email
4. **Winner selection:** most recently updated record (`updated_at` DESC, or `created_at` if no `updated_at`)
5. Contacts with no email: treated as unique, never deduped (include all)
6. Return deduped set; include `tenantId` label on each contact so Alex can say "from SOCIII Inc."

At current scale (~5,000 contacts, one user), in-memory dedup is fine. At 50k+ contacts per user, a `users/{uid}/contactIndex` write-time registry is the right path — but that's a Phase 2 optimization, not Phase 1 scope.

---

## Firestore indexes needed

New composite indexes:
- `contacts`: `ownerUid` (ASCENDING) + `segments` (CONTAINS)
- `contacts`: `ownerUid` (ASCENDING) + `created_at` (DESCENDING)
- `contacts`: `ownerUid` (ASCENDING) + `email` (ASCENDING)

Indexes must be created and verified at deploy time. If a query fails because an index is missing, it must fail closed (return empty + log) — NOT fall back to a wider ownerUid-only query that could expose cross-tenant data (RT13 resolution — see alex_notes fallback bug below in security issues).

---

## Migration: backfill `ownerUid` on existing contacts

Three-phase online migration (no downtime):

**Phase 1 — Write path (immediate):** Add `ownerUid: ctx.userId` to all new contact writes (`contacts:add`, `contacts:bulkImport`, `contacts:upsert`). Deploy today.

**Phase 1.5 — Bridge read (during backfill window):** COS uses dual-read: query by `ownerUid` first; if result count < expected, also query by `source_member_uid` as supplemental. This ensures contacts created before Phase 1 are still visible while backfill runs. The bridge is explicit, not silent fallback — log when it fires.

**Phase 2 — Backfill (script):** Read all contacts where `ownerUid` is missing. For each:
- If `source_member_uid` is set: `ownerUid = source_member_uid`
- If `source_member_uid` is null: log the doc ID and skip (do NOT guess) — investigate manually
- Batch-write 500/min; emit count of skipped docs in the final report
- **Multi-member caveat:** contacts created by a team member (not the workspace owner) will get the creator's uid as ownerUid, not the workspace owner's. This means a business partner's imported contacts don't show up in the owner's COS. This is correct behavior — ownerUid tracks who personally imported/created the record. Document this explicitly.

**Phase 3 — Query migration:** Switch COS `query_contacts`, `propose_email_campaign`, and `buildTenantLiveSnapshot` to query by `ownerUid` as primary. Remove Phase 1.5 dual-read bridge.

---

## Build tasks

- [ ] **C1** — Add `ownerUid` field to all contact write paths (add, bulkImport, upsert, Apollo enrichment)
- [ ] **C2** — Backfill script: `contacts` where `ownerUid` missing → set from `source_member_uid`; log skipped docs
- [ ] **C3** — Add `ownerUid` Firestore indexes (segments, created_at, email composites); verify before Phase 3
- [ ] **C4** — Switch `query_contacts` COS tool to primary `ownerUid` query (Phase 1.5 bridge, then Phase 3 remove)
- [ ] **C5** — Switch `propose_email_campaign` to primary `ownerUid` query
- [ ] **C6** — Persona fan-out in `buildSiblingStatePrompt`: read `cosVisible` workspaces, cross-ref memberships/, aggregate KPIs per persona with 400-token cap
- [ ] **C7** — Firestore security rules: allow `ownerUid == request.auth.uid` reads on contacts
- [ ] **C8** — Add `cosVisible` field to workspace docs; Settings UI toggle (exclude `vertical: "education"` from toggle)
- [ ] **C9** — Contact dedup: in-memory, case-normalized email, most-recent wins
- [ ] **C10** — Cross-workspace reads are pull-only: disable proactive cross-persona data surfacing in Alex system prompt
- [ ] **C11** — Test: 2-persona account confirms Alex sees contacts from both workspaces (explicit query)
- [ ] **C12** — Test: domain worker (Contacts worker) still only sees its own workspace contacts (silo preserved)
- [ ] **C13** — Test: education-tagged workspace excluded from fan-out even with same ownerUid

---

## What does NOT change

- Workers stay workspace-scoped. A Marketing worker in Persona A never sees Persona B's contacts.
- `tenantId` stays on every record — workspace-scoped queries still work.
- The append-only invariant holds — backfill adds the field, never modifies existing fields.
- Tenant isolation for multi-tenant customers (enterprise, education) is untouched.
- June 24 locked model: data NEVER crosses silos without explicit consent. COS cross-workspace is admin-self-access, not cross-user sharing. Workers still isolated.

---

## RED TEAM (2026-07-03 — 3 external agents)

### Security agent

**RT1 — ownerUid spoofing**
`ownerUid` set by client → spoof to read others' contacts.
**Mitigation:** `ownerUid` always set server-side from `ctx.userId`. Client never sends it. Firestore rules enforce `ownerUid == request.auth.uid`.

**RT2 — Cross-persona contamination**
Alex seeing all contacts could pollute domain workers.
**Mitigation:** Strict query separation. COS path uses `ownerUid`. Worker path uses `tenantId`. Worker system prompts never receive COS context.

**RT3 — Persona fan-out cost**
10 workspaces × 5 Firestore queries × every message = expensive.
**Mitigation:** Persona list cached at session start. 400-token cap per workspace. `buildSiblingStatePrompt` runs at context-build time, not per turn.

**RT4 — Enterprise customer, multiple client workspaces**
Agency runs multiple client workspaces; COS cross-workspace leaks Client A to Client B.
**Mitigation:** `ownerUid` is per-user. Client A and Client B are different users with different uids. No cross-customer leakage.

**RT5 — Stale workspace list**
User removed from a workspace; their ownerUid contacts still visible.
**Mitigation:** Contacts they personally imported stay theirs (ownerUid = creator). Removal doesn't revoke authorship. Cross-ref `memberships/` at fan-out time to exclude workspaces where active membership has been revoked.

**RT6 — Contact duplication across workspaces**
Same investor list imported into 3 workspaces → 3× contacts.
**Mitigation:** See full dedup spec above. Case-normalized email, most-recent wins, in-memory after ownerUid fetch.

**RT7 — Personas model contradiction**
June 24 locked model: data never crosses silos.
**Mitigation:** COS is the orchestration layer, not a worker. This is admin-self-access. Vault is the bridge for user-to-user sharing; this is cross-persona self-access.

**RT8 — `_cosTenantId` is client-supplied; no membership check on COS grounding block** ⚠️ NEW
The COS grounding block reads workspace data using a tenantId from the client request body/header without verifying that the requesting uid is a member of that workspace. A user can supply any `ws_XXXX` tenantId and receive that workspace's brief, worker catalog, and sibling state.
**Resolution (C14 — separate security fix):** Add `requireMembershipIfNeeded` check before injecting any tenant-scoped data in the COS grounding block. This is a pre-existing bug, not introduced by this codex.

**RT9 — `config/investorDocs` global singleton injected into every COS session** ⚠️ NEW
`db.doc("config/investorDocs")` has no uid or tenantId scope. Its file list (investor data room GCS paths) is injected into every COS user's system prompt.
**Resolution (C15 — separate security fix):** Move investor docs to a tenant-scoped path. Never inject singleton admin config documents into per-user AI sessions.

**RT10 — Prompt injection via contact fields** ⚠️ NEW
`query_contacts` formats contact `name`, `email`, `company` fields directly into the tool result string fed back to the model. A contact with a crafted name injects into the AI context. COS has Gmail and Firestore write access — high-impact capability escalation.
**Resolution (C16 — separate security fix):** Truncate contact fields to 100 chars each. Consider structured JSON response format so the model processes it as data, not as instructions.

**RT11 — alex_notes index fallback widens scope** ⚠️ NEW
If the ownerUid+createdAt composite index is missing, the catch block falls back to ownerUid-only query. Without the index, Firestore may return docs from other workspaces that happen to match ownerUid but not the intended tenantId filter. The code's intent is correct; the fallback behavior is not.
**Resolution:** Indexes created and verified at deploy time. If index missing: fail closed (return empty, log alert). See C3.

### Architecture agent

**RT12 — Migration window creates silent partial data** ⚠️ NEW
Between Phase 1 deploy and Phase 2 backfill completion, ownerUid exists only on new contacts. COS returns a partial set with no error — Alex confidently answers with incomplete data. `source_member_uid` can be null on some records, silently skipping them in backfill.
**Resolution:** Phase 1.5 dual-read bridge (see migration plan). Backfill script logs skipped docs. Completeness check: after backfill, assert 0 contacts with missing ownerUid.

**RT13 — ownerUid attribution wrong for shared/team workspaces**
Contacts created by a team member (not the workspace owner) get the creator's uid as ownerUid. The workspace owner's COS won't see them.
**Resolution:** This is the correct behavior — ownerUid tracks the creator, not the workspace owner. Team-shared contact visibility is a future feature (workspace-level contact pool, separate from per-user ownerUid). Document the limitation explicitly; don't paper over it.

**RT14 — Fan-out token budget unbounded**
Cap at 10 workspaces is a workspace count limit, not a token limit. One enterprise workspace with 2,000 contacts contributes 10× the tokens of a sparse personal workspace.
**Resolution:** 400-token cap per workspace KPI block (see fan-out spec above). Truncate with "X more not shown" summary. Cap is on tokens, not workspace count.

**RT15 — KPI merge conflicts**
Summing pipeline value across a real-estate persona ($500K deals) and a freelance persona ($5K deals) produces meaningless aggregates.
**Resolution:** Never sum KPIs across personas. Present per-persona KPI cards with explicit labels. See "What does NOT change."

**RT16 — Workspace membership consistency**
`users/{uid}/workspaces/` subcollection can be stale after workspace removal. Fan-out from stale subcollection reads revoked workspace data.
**Resolution:** Derive workspace list from `memberships/` collection at query time (see C6). Subcollection is a UI hint, not the authoritative access list.

### Product agent

**RT17 — "Alex is the sun" inverts user mental model** ⚠️ NEW
Users consciously separate personas. Alex proactively surfacing data from a different persona feels like a breach, not a superpower. "I see you also know Marcus from your Personal Space" — unprompted — is alarming.
**Resolution:** Pull-not-push (see model description above). Cross-workspace lookup fires only on explicit user query. Alex presents cross-persona data when asked, not as ambient awareness. See C10.

**RT18 — No opt-out UI** ⚠️ NEW
Users who want a persona truly dark to Alex have no recourse. This is onboarding friction and a trust blocker.
**Resolution:** `cosVisible` toggle in Settings per workspace. See C8.

**RT19 — FERPA violation: education vertical** ⚠️ NEW
A nursing instructor's school workspace contains student education records. FERPA prohibits disclosure to other systems without institutional authorization. Under uid-based querying, those student contacts appear in her personal COS view.
**Resolution:** Education workspaces (`vertical: "education"`) hard-siloed by default — excluded from COS fan-out regardless of `cosVisible`. Not a UX toggle; requires support to change. See C13.

**RT20 — Shared-account scenarios collapse the model**
A VA or bookkeeper using the owner's login credentials sees all cross-persona contacts under the owner's uid.
**Resolution (documented limitation):** This codex governs single-user access. Shared credentials are a platform security problem, not solvable here. The path is multi-user workspace access with per-member permissions — a separate roadmap item. Document the limitation.

**RT21 — "Workers siloed, COS not" won't hold architecturally**
Workers already call COS functions. Over time, workers will request cross-workspace context through COS, collapsing the boundary.
**Resolution:** Permission boundary is enforced at the query layer, not on caller identity. Workers make `tenantId`-scoped queries regardless of what COS context they have access to. The boundary is in the code path, not in trust claims.

---

## Separate security fixes (pre-existing bugs — file as GitHub issues)

These were found during the red team but are NOT introduced by this codex. They exist in the current codebase and should be fixed independently:

| Issue | Severity | Location | Fix |
|---|---|---|---|
| Auto-repair membership escalation | CRITICAL | `requireMembershipIfNeeded` | Before auto-creating membership, verify workspace `ownerUid` or `createdBy` matches the requesting uid. Remove auto-repair entirely — require explicit provisioning. |
| Cloud Storage not user-scoped | CRITICAL | COS file context injection | Enforce `chat-uploads/{uid}/` path prefix at both write and read time. Storage rules: `request.auth.uid` must match first path segment. |
| `_cosTenantId` client-supplied, no membership gate | HIGH | COS grounding block ~line 5355 | Run membership check before injecting any tenant-scoped data. |
| `config/investorDocs` global singleton | HIGH | COS system prompt build | Move to tenant-scoped path. Never inject admin config docs into per-user AI sessions. |
| Prompt injection via contact fields | MEDIUM | `query_contacts` tool result | Truncate name/email/company to 100 chars each before injecting into tool result. |
| alex_notes index fallback widens scope | MEDIUM | alex_notes query catch block | Fail closed (return empty, log) if index missing — do not fall back to wider query. |

---

## Sign-off gate

- [ ] Alex correctly reports total contacts across all `cosVisible` personas (explicit user query)
- [ ] Alex does NOT proactively surface cross-persona contacts unprompted
- [ ] Switching personas doesn't change what Alex knows about contacts
- [ ] Contacts worker in Persona A cannot see Persona B's contacts (silo preserved)
- [ ] New contacts imported in any workspace are visible to Alex within one session
- [ ] Backfill confirmed: 0 contacts with `ownerUid` missing (excluding intentionally-skipped nulls)
- [ ] Security: Firestore rules reject reads where `ownerUid != request.auth.uid`
- [ ] No duplicate contacts shown when same email exists in multiple workspaces
- [ ] Education-tagged workspace excluded from fan-out even with same ownerUid
- [ ] `cosVisible: false` workspace excluded from Alex's view
- [ ] Pre-existing security bugs filed as GitHub issues (auto-repair, storage scoping, tenantId gate, investorDocs, prompt injection, notes fallback)
