# CODEX 50.17 — Regulatory Compliance Architecture (Cross-Domain Constraint RAAS Pattern)

Status: SPEC (T1 implementation spec, derived from T1 memo `CODEX 50.17 — T1 ARCHITECTURE MEMO`)
Date: 2026-05-05
Companion specs: CODEX 50.10 (Foundation Phase 1), CODEX 50.11 (Worker Improvement Loop), CODEX 50.13 (Drive/Vault/DTC/Logbook), CODEX 50.14 (Chain Anchor + Hash Anchor), CODEX 50.15 (Spine + Banking/Finance Launch Readiness)
Supersedes: the "Securities Compliance worker" concept that was being drafted into CODEX 50.15 v3 (per Sean's correction — securities compliance lives at the RAAS layer, not as a separate worker).

---

## What we're doing

Build a cross-domain regulatory compliance layer — Constraint RAAS — that plugs into the existing RAAS engine without disturbing it. Two RAAS classes coexist:

- **Job RAAS** — what a worker does (substantive knowledge for its job). Owner-authored. Attached to one worker. Updated when owner pushes changes. This is what `raas/` already is today.
- **Constraint RAAS** — regulatory constraints that govern how multiple workers operate (securities law, HIPAA, FAA Part 91/135/121, State Bar rules, GDPR, etc.). Platform-authored. Attached to many workers via configuration. Updated automatically when source regulations change.

Constraint modules are loaded into the worker's prompt at generation time so the worker self-edits while writing (the way regulatory expertise actually works in practice). A secondary post-generation pattern-matching pass catches violations the model misses. Violations write to the audit trail with full version pinning, integrating with the DTC + Logbook moat from 50.13 / 50.14.

v1 ships **one** module operational: `securities_compliance_v1`. HIPAA, FAA, GDPR, State Bar are scoped at the architecture level but not built (each follows when its vertical activates).

Four runtime components, all extending existing infrastructure:

1. **Regulatory ingestion service** — extends `services/vault/driveImport.js` pipeline pattern. Scheduled jobs fetch from external sources (SEC EDGAR, FINRA, CFPB, state regulators). Source-adapter pattern. Writes to a new `regulatoryDocuments/{docId}` collection.
2. **Constraint RAAS module assembly** — new `constraintRaasModules/{moduleId}` collection. Each module aggregates regulatory documents + curated SOPs into a coherent rule set. Versioned. Update propagation via the `onContentSync.js` cascade pattern.
3. **Multi-source RAAS loader** — extends `services/alex/promptBuilder.js::assemblePrompt()` from Alex-only to ordinary workers. Worker config gets `constraintRaasSources: ["securities_compliance_v1", ...]`. Static at v1; dynamic per-context loading deferred to v1.1.
4. **Pre-publish constraint check service** — primary enforcement at generation time (rules in prompt context); secondary post-generation pattern matching. Hooks at chat completion + the `worker1:prePublish` step (`functions/functions/index.js:8877-9007`) + the social posting `saveDraft`/`approveDraft` gate (`services/socialService/index.js:81-176`). Writes results to `alexAuditLog` (extended) per `services/alex/auditLog.js:74`.

Cross-cutting: a content classification primitive (jurisdiction / audience tier / message type / compliance domains), an audit trail extension (`raas_sources_applied`, `constraint_check_results`, `content_classification`, version_resolution), and a RAAS update notification cascade.

---

## Why we're doing it

Kent's email surfacing securities compliance as launch-blocking is the immediate trigger. The architectural answer is broader: the same pattern that prevents a Fundraise worker from generating an unlawful investment solicitation also prevents a future Health Education worker from generating HIPAA-violating patient communications, prevents an Aviation MX worker from generating FAA-noncompliant maintenance documentation, prevents a future Legal worker from generating jurisdiction-inappropriate legal advice. Designing this once, generically, is an order of magnitude better than redesigning per domain.

The TitleApp moat is provenance and compliance as platform infrastructure. Every regulated industry the platform targets has compliance burden that small teams cannot afford manually. A platform that handles compliance as an automatically-loaded, automatically-updated, automatically-applied platform-level primitive solves a pain point no general-purpose AI tool addresses. This is the moat — make it real at v1.

T2 research (`Downloads/codex_50_16_banking_finance_raas.md`) frames the situation precisely: the platform has built read-and-aggregate primitives but has not yet built **write-time** compliance constraint application. Substantial regulatory content already exists, scattered across workers, never centralized. The missing piece is the runtime layer.

---

## Decisions locked (Sean, 2026-05-05)

**D-1 — Cross-domain pattern.** Securities, HIPAA, FAA, GDPR, State Bar all plug into the same architecture as constraint modules. Each domain ships when its vertical activates.

**D-2 — Job vs Constraint RAAS distinction.** Job = worker's substantive knowledge, owner-authored. Constraint = regulatory, platform-authored, auto-updated.

**D-3 — Four runtime components.** Regulatory ingestion (extends `driveImport.js`); constraint module assembly (new `constraintRaasModules` collection); multi-source loader (extends `assemblePrompt()`); pre-publish constraint check (extends Worker #1 prePublish + social draft/approve).

**D-4 — v1 ships one module operational.** Securities Compliance only. HIPAA / FAA / GDPR scoped, not built.

**D-5 — Static configuration at v1.** Worker declares `constraintRaasSources` array. Dynamic per-context loading via classification deferred to v1.1.

**D-6 — Pre-publish enforcement strategy.** Primary at generation time (rules in prompt context). Secondary post-generation pattern matching pass. High-stakes violations default to block-with-explanation; moderate-risk defaults to flag-for-human-review. Worker self-corrects on first attempt transparently; surfaces explicit blocks to user only when self-correction fails.

**D-7 — Module curation governance.** Compose from existing content first, counsel reviews before live, iterate as ingestion brings new content. Sean engages counsel separately.

**D-8 — Studio Locker is sandbox-only.** Constraint modules live in a NEW `constraintRaasModules` collection, separate from Studio Locker. Confirmed in Investigation #3 below.

**D-9 — Cross-worker tool-use is NOT a dependency.** Constraint RAAS uses runtime configuration, not invocation. Other 50.15 cross-worker patterns ship under their own initiative (or defer).

**D-10 — Securities Compliance v1 module composition.** Compose from existing investor RAAS substrate (1,414 lines actual — see Discrepancy #1), three orphan rulesets (`ir_compliance_v0`, `ir_fund_v0`, `ir_syndication_v0`), and the AD-013 lending content where it overlaps. Counsel reviews the composed module before activation.

**D-11 — Counsel relationship confirmed (Sean, 2026-05-05).** Sean has an existing securities-counsel relationship. Counsel will review the Securities Compliance v1 module before activation per D-7. Counsel review is pre-flip-to-live, not pre-spec.

**D-12 — Blue sky scope = ALL 50 STATES (Sean, 2026-05-05).** Original spec proposed minimum HI/CA/NY/TX/FL. Sean expanded to all 50 states + DC. Mechanics: per-state metadata schema (filing fee, form type, deadline, examiner contact, notice-filing-required-flag, intrastate-exemption-shape) keyed by state code in the `securities_compliance_v1` module. NSMIA preempts state registration for Reg D 506(b)/506(c) but most states still require notice filings. Per-state authoring is template-driven, not 50× linear. Estimate revision: P0-4 module composition increases from 16 hours to ~32 hours engineering + extended counsel review window.

**D-13 — Apollo configured (Sean, 2026-05-05).** APOLLO_API_KEY in Firebase secrets, header-auth, 4,020 credits/month at v1. Burn-rate alerting threshold accepted at 75% mid-month soft-alert. See `reference_apollo_api.md` in user memory.

**D-14 — Cross-worker tool-use deferral confirmed (Sean, 2026-05-05).** Spec defers cross-worker invocation per D-9. CODEX 50.15's Marketing-invokes-Landing-Page and Fundraise-invokes-Prospecting patterns re-architect as in-worker primitive function calls (not worker-to-worker invocation). No P0 capability lost; small refactor to 50.15 P0-10 (Marketing → Astro publish path becomes direct in-worker GitHub API call) and 50.15 P0-13 (Fundraise → Apollo prospecting becomes direct in-worker Apollo client call).

---

## Investigations 1-11 (T1 from code visibility)

### Investigation #1 — AD-013 deprecation status

**File**: `functions/functions/raas/rulesets/ad_013_fi_compliance_v1.deprecated.json` (92 lines, intact content).

**Disposition**: Deprecated as part of CODEX 50.10 Phase 1 orphan-cluster sweep, NOT a stalled migration. Per `scripts/deprecateOrphanRulesets.js:2-17, 25-52`, the file was renamed to `.deprecated.json` because RULESET_MAP did not reference it (auto-dealer workers source rules from `suiteDefaults/auto_dealer.js`, not individual ad_* rulesets). Cluster A of 18 auto-dealer mid/late v1 rulesets all received the same treatment.

**Content quality**: This is the most comprehensive lending compliance content in the codebase. 11 hard stops covering TILA APR within 1/8th of 1%, OFAC clearance, MLA Military Lending Act status, ECOA Reg B adverse action timing (30-day rule), Red Flags Rule (16 CFR 681), ECOA disparate pricing, FCRA permissible purpose, FTC CARS Rule. 4 soft flags covering equal-treatment statistical disparity, adverse action approaching deadline, deal jacket aging, compliance training overdue. The deprecation was a registry hygiene action — the content is salvageable.

**Resolution for 50.17**: AD-013 content gets adopted into a future `lending_compliance_v1` module (post-launch, when Lending Origination worker activates). Not v1 launch-blocking. The Securities Compliance v1 module does NOT need AD-013 directly; the OFAC hard-stop pattern from AD-013 informs the OFAC integration line item below (P0-3) but is not itself imported.

### Investigation #2 — OFAC operational integration

Searched: `OFAC`, `SDN`, `sanctions`, `castellum`, `complyadvantage`, `trulioo`. No hits for vendor SDKs (castellum/complyadvantage/trulioo). No hits for `sdn.xml` or Treasury sanctions list fetch implementations.

**What exists** (all aspirational rule references, no operational integration):
- `raas/rulesets/ad_013_fi_compliance_v1.deprecated.json:30-31` — `ofac_not_cleared` hard stop (rule asserts customer.ofacCleared boolean; no service computes it).
- `raas/rulesets/esc_001_escrow_locker_v0.json:20` — "OFAC hit = immediate freeze" (escrow locker assumes the boolean is set externally).
- `raas/rulesets/esc_002_wire_fraud_prevention_v0.json:47` — international wire flag for OFAC screening.
- `raas/auto-dealer/GLOBAL/AD-012-fi-menu-rules.md:21,139` — F&I Menu reads compliance_flags from AD-013, doesn't compute.
- 13 other auto-dealer rule files referencing P0.8 OFAC awareness — all consume, none compute.
- `services/alex/catalogs/auto-dealer.json:24,333,342` — AD-011 "OFAC & Red Flags Screening" worker described as "Screens every customer against OFAC, Red Flags Rule, military lending" — but no implementation file exists.
- `vault/titleapp-core/workerCodex/ESC-001-codex.md:30,57` — codex documents the rule, no fetcher.

**Conclusion**: OFAC integration is fully aspirational. No SDN list ingestion, no name-matching service, no API call to Treasury or vendor.

**v1 path recommendation**: Direct OFAC SDN XML feed integration via Treasury (https://www.treasury.gov/ofac/downloads/sdn.xml). Why: free, authoritative, no vendor lock-in, fits the regulatory ingestion service pattern (P0-1 below). Daily fetch via `onSchedule` (pattern at `index.js:19566`). Name-match service is an additive 8-12 hours: load SDN entries into Firestore, fuzzy-match incoming names with Levenshtein distance + alias expansion. Vendor (ComplyAdvantage / Castellum) is post-launch optimization once volume justifies the cost.

**Sequencing**: OFAC integration is P0-3 below. Required for Fundraise KYC (50.15 P0-15) to be defensible. ~16 hours total (8 ingestion + 8 name-match service + tests).

### Investigation #3 — Studio Locker production integration

**File**: `functions/functions/services/sandbox/studioLocker.js:1-22` header explicitly states "knowledge ingestion for the Worker Sandbox. CODEX 47.4 Phase A (T1)." Persistence path is `studioLockers/{userId}/workers/{workerId}/documents/{docId}`. Tier system (1=Platform / 2=Professional Library / 3=Worker-Specific) is sandbox-only.

Searched for production callers:
- `functions/functions/index.js:8052` — single sandbox-route comment reference. No production prompt-assembly path imports `studioLocker`.
- `services/alex/promptBuilder.js` — does NOT import or reference `studioLocker`. The Alex prompt assembly does not consume Studio Locker content.
- All other hits are within `services/sandbox/` itself.

**Conclusion**: Studio Locker is sandbox-only. Confirms decision D-8. Constraint RAAS modules live in a separate, platform-level `constraintRaasModules/{moduleId}` collection with different governance (platform-curated, version-controlled, broadcast to many workers).

### Investigation #4 — alexAuditLog violations array shape

**File**: `services/alex/auditLog.js:7-97`. Collection path: `alexAuditLog/{userId}/{sessionId}/{messageId}` (append-only, never modified).

Schema (line 57-82):
```
{
  userId, sessionId, messageId, timestamp,
  mode, activeVertical, activeTeamId, rulePackVersion,
  input: { raw, handoffTriggered, handoffTarget, hardStopTriggered },
  output: {
    response,
    violations: [],          // <-- exists, populated by alexOutputFilter
    regenerationCount,
    approved
  },
  layer2Snapshot: { subscribedWorkers, activeTeamId }
}
```

The `violations` array is populated. `services/alex/alexOutputFilter.js:60-142` produces violation entries with shape `{ ruleId, layer, message }`. Three layers checked:
- Layer 1: hard stops (banned phrases, non-existent UI, wrong pricing) — `alexOutputFilter.js:57-71`.
- Layer 2: data violations — `alexOutputFilter.js:79-100` (shape includes `field`, `value`, `expected`).
- Layer 3: vertical-specific cannot-say items — `alexOutputFilter.js:108-142`.

**Conclusion**: The infrastructure exists, populated, working. 50.17 extends the violation entry shape to include constraint-RAAS-specific fields (see Audit Trail Extension below):
```
{ ruleId, layer, message, source: "constraint_check", moduleId, moduleVersion, severity, disposition }
```

The collection only logs Alex interactions today. Constraint check on ordinary workers writes to a sibling collection `workerAuditLog/{userId}/{sessionId}/{messageId}` (same shape). Recommendation: rename current `alexAuditLog` -> a top-level `aiAuditLog` doc with `agentType: "alex"|"worker"` field, OR add the parallel `workerAuditLog` collection. Path of least disruption: parallel collection, both feed into the same audit query layer post-launch. Documented in P0-7 below.

### Investigation #5 — `driveImport.js` shape

**File**: `services/vault/driveImport.js` (493 lines). Header at lines 1-16 documents the pipeline.

Pipeline (per file, in `processImportJob` at lines 143-350):
1. Check existing version via `driveFileId` query (line 156-167). If found, increment version + call `supersedeDocument` (line 96-127).
2. Stream Drive file -> Firebase Storage (line 169-173, function at line 55-90; Google Docs export as DOCX, others stream raw).
3. Download buffer from Storage for text extraction (line 177-178).
4. Extract text via `extractText` (line 33-49; pdf-parse, mammoth for docx, UTF-8 fallback).
5. SHA-256 hash (line 184).
6. Chunk text via `chunkText` from `services/vault/textChunker.js` (line 188).
7. Generate embeddings via `generateEmbeddings` from `services/vault/embeddingService.js` (line 191-201, OpenAI text-embedding-3-small).
8. Store document metadata at `vaultDocuments/{userId}/docs/{docId}` (line 204-233).
9. Store chunks at `vaultDocuments/{userId}/docs/{docId}/chunks/{chunk_NNNNN}` (line 236-263, 450-batch limit).
10. Mirror to `vaultDocs/{userId}/private/{docId}` for legacy documentResolver (line 266-283).
11. Mirror to `documentControl/{userId}/documents/{dcDocId}` (line 286-320, 34.10-T2 doc control infra).
12. Update job status (line 322-326).

Version chaining via `supersedeDocument` (line 96-127): marks parent + all chunks as `superseded: true` rather than deleting.

**Reuse for regulatory ingestion**: All steps 1-9 reuse cleanly. Steps 10-11 are user-vault specific and skip. Source becomes a public URL fetcher (no Drive auth, no per-user paths). Storage path becomes `regulatory/{source_id}/{docId}/`. Firestore target becomes `regulatoryDocuments/{docId}` + `regulatoryDocuments/{docId}/chunks/{chunk_NNNNN}`. Version chaining preserves regulatory revision history (critical for re-auditing past generations against historical rules).

### Investigation #6 — `onContentSync.js` shape

**File**: `functions/functions/onContentSync.js` (263 lines). Firestore trigger fires on `platform/contentSync/events/{eventId}` onCreate.

Cascade pattern (per event at line 24-61):
- `worker_approved`: updateHomepageCounter → rebuildVerticalCache → updateAlexKnowledge → updateChatContext → updateMarketplaceStats.
- `worker_deprecated`: same cascade with removeFromAlexKnowledge.
- `counters_rebuild`: subset (homepage + marketplace).

Each step writes to a downstream cache:
- `platform/homepageCache` (line 67-77).
- `platform/verticalCache/{vertical}` (line 98-128).
- `alex/knowledge/workers/{worker_id}` (line 134-156).
- `platform/chatContext/{vertical}` (line 167-182).
- `platform/marketplaceStats` (line 192-251).

**Reuse for RAAS update notification**: Same trigger pattern. Add new event type `regulatory_module_updated` that fan-outs to:
- `constraintRaasModules/{moduleId}` (mark new version current, prior version superseded but readable).
- `notifications/regulatory/{updateId}` (briefing artifact for subscribed workers).
- `messageQueue/{docId}` (email/SMS to operators of affected workers via the campaign engine; pattern at `campaigns/messageProcessor.js`).
- Worker prompt cache invalidation (forces next chat to re-resolve module version).

### Investigation #7 — Alex `assemblePrompt()` shape

**File**: `services/alex/promptBuilder.js` (289 lines). Function at lines 51-169.

Multi-source composition:
- Core prompt (line 68, single source of truth from `prompts/core.js`).
- Surface overlay (line 71-73 for non-business surfaces; line 80-83 for chief-of-staff).
- Static modules (rules, communication, routing, intake, onboarding) — line 86-104.
- Dynamic catalog routing index (line 107-121, reads from `services/alex/catalogs/loader.js`).
- Dynamic registry context (line 124-129, async, pricing/promos/guarantees).
- Dynamic active worker details (line 132-137).
- Dynamic user profile, projects, vault summary, lifecycle, alerts (line 140-166).

Token budgeting:
- `MAX_TOKEN_BUDGET = 10000` (line 32).
- `estimateTokens(text)` ≈ chars / 4 (line 28-30).
- `enforceTokenBudget(sections)` at line 245-282: truncation order is VAULT SUMMARY → ACTIVE PROJECTS → LIFECYCLE POSITIONS → WORKER CATALOG. Identity, rules, communication, routing, alerts, active worker details are protected (never truncated).

**Extension for ordinary workers**: New `assembleWorkerPrompt(options)` function in a new file `services/raas/workerPromptBuilder.js`. Composition order:
1. Worker Job RAAS (existing, from `raas.store.js`).
2. Constraint RAAS modules (NEW, from `constraintRaasModules/{moduleId}` per `worker.constraintRaasSources` array).
3. Worker-scoped Drive/Vault context (existing, from `services/vault/`).
4. Conversation context (existing).

Token budget enforcement per worker config — recommend `MAX_WORKER_TOKEN_BUDGET = 12000` to accommodate constraint modules. Truncation order: worker-scoped vault → conversation context → constraint modules (less-critical sections only) → Job RAAS (never truncated). Constraint modules carry per-section priority tags (`critical | important | reference`) so truncation preserves hard-stop content.

### Investigation #8 — `auditTrailService` schema

**File**: `services/auditTrailService.js` (115 lines). Header lines 1-9 describe blockchain audit trail fee tracking ($0.005 per record, ~$0.001 gas, simulated at v1, real Polygon at v2).

`writeAuditRecord` at line 50-97 schema (writes to `auditRecords` collection, append-only):
```
{
  event_id, worker_id, user_id, org_id,
  execution_type,
  txHash, chain: "polygon",
  gas_cost_actual, fee_charged, net_margin,
  _mintMethod: "stub", _written_at
}
```

This is the **fee-tracking** audit (revenue line 3 — $0.005 markup over $0.001 gas). Distinct from `alexAuditLog` (which is the **content** audit — what was generated, what violations).

`auditRecords` is the moat record (immutable, hashed, blockchain-anchored). 50.17 extends this schema with constraint-specific fields:
```
{
  ...existing,
  raas_sources_applied: [{ moduleId, version, source: "job"|"constraint" }],
  constraint_check_results: [{ ruleId, severity, disposition, autoCorrected: boolean }],
  content_classification: { jurisdiction, audienceTier, messageType, complianceDomains: [] },
  version_resolution: { resolvedAt: timestamp, modulesResolved: [{ moduleId, version }] }
}
```

Anchored via existing Polygon write (50.14 chain anchor). Re-auditable: each record's version_resolution lets a regulator re-test a generation against the rules that applied at the time, not current rules. This is the audit-defensibility primitive for regulatory inquiries.

### Investigation #9 — Worker #1 prePublish step

**Route**: `POST /v1/worker1:prePublish` at `functions/functions/index.js:8877-9007`.

Pattern: 8-point acceptance check (extended to 10 with conditional checks). Each check has shape `{ id, name, status: "pass"|"warning"|"fail", details }`.

Existing checks:
1. `regulatory_completeness` (line 8895) — counts tier1 rules.
2. `showstopper_screening` (line 8905) — placeholder pass; comment "v1: basic check — enhanced with AI in future".
3. `best_practices_baseline` (line 8911) — counts tier2 rules.
4. `harm_surface_scan` (line 8919) — placeholder pass; comment "v1: passes by default — AI scan in future".
5. `disclosure_requirements` (line 8925) — regex check for disclosure language.
6. `data_handling` (line 8933) — regex check for PII language.
7. `audit_trail` (line 8941) — auto-pass (Tier 0 enforces).
8. `credit_cost` (line 8947) — credit cost tier required.
9. `document_control` (line 8956-8969, conditional) — operator doc requirements.
10. `game_preflight_accuracy` (line 8971-8981, conditional) — game worker preflight.

Result aggregation (line 8983-9002): `score`, `passed` (failCount === 0), `prePublishCheck` written to worker doc.

**Extension for constraint check**: Replace placeholder `showstopper_screening` and `harm_surface_scan` with real AI-moderation pass + pattern matching pass against constraint modules declared on the worker. New check `constraint_module_validation` verifies declared `constraintRaasSources` resolve to live, current-version modules. The pattern matching pass uses violation patterns from each module (regex + AI moderation prompt). High-stakes fail = block publish.

### Investigation #10 — Social posting draft/approve

**File**: `services/socialService/index.js` (206 lines).

Workflow gate:
- `saveDraft(userId, opts)` at line 81-101 — writes to `marketingDrafts/{id}` with `status: "draft"`. Fields: userId, tenantId, content, title, platforms, status, createdAt, updatedAt, postResult.
- `listDrafts(userId, opts)` at line 109-131 — list with optional status filter.
- `approveDraft(userId, draftId)` at line 139-176 — flips to `status: "approved"`, then if platforms specified auto-posts via `postViaUnified` and flips to `status: "posted"`.
- `rejectDraft(userId, draftId, reason)` at line 185-203 — flips to `status: "rejected"` with reason.

**Hook for constraint check**: Insert constraint check inside `saveDraft` before write, so a draft that fails constraint check is saved with `status: "draft_blocked"` carrying violation details. UI surfaces the block-with-explanation. User edits and re-saves (re-runs check). On `approveDraft`, re-run constraint check against the final content (defense-in-depth against post-draft edits). High-stakes violation auto-rejects with explanation; moderate-risk flags for human review (status `draft_review_required`).

### Investigation #11 — Existing Securities Compliance substrate

The memo claimed "approximately 698 lines of investor RAAS." **Actual: 1,414 lines** across `raas/investor/` (see Discrepancy #1).

Files (with line counts):
- `raas/investor/investor-rules.md` — 413 lines.
- `raas/investor/company-knowledge.md` — 217 lines.
- `raas/investor/GLOBAL/prompts/investor-relations-system-prompt.md` — 159 lines.
- `raas/investor/GLOBAL/prompts/investor-reporting-distributions-system-prompt.md` — 367 lines.
- `raas/investor/GLOBAL/sops/accreditation_sop_v0.md` — 73 lines.
- `raas/investor/GLOBAL/sops/distribution_sop_v0.md` — 99 lines.
- `raas/investor/GLOBAL/templates/capital_call_notice_v0.json` — 18 lines.
- `raas/investor/GLOBAL/templates/quarterly_report_v0.json` — 19 lines.
- `raas/investor/GLOBAL/templates/waterfall_report_v0.json` — 18 lines.
- `raas/investor/GLOBAL/workflows/README.md` — 31 lines.
- **Total: 1,414 lines.**

Three orphan rulesets (in `functions/functions/raas/rulesets/`):
- `ir_compliance_v0.json` — 118 lines. Hard stops: `unaccredited_506c`, `exceed_nonaccredited_506b` (35 limit), `exceed_reg_cf_limit` ($5M/12mo), `exceed_reg_a_tier1` ($20M), `exceed_reg_a_tier2` ($75M), `missing_kyc`. Soft flags: large single investor (>25%), missing PPM, missing subscription agreement, approaching investor limit (28/35).
- `ir_fund_v0.json` — 91 lines. Hard stops: gp_commit_below_min, mgmt_fee_above_max, missing_lpa. Soft flags: high_carry_no_hurdle, short_fund_life, low_gp_commit, high_mgmt_fee, no_clawback.
- `ir_syndication_v0.json` — 101 lines. Hard stops: cap_rate_below_min, ltv_above_max, dscr_below_min, missing_rent_roll. Soft flags: single_tenant_risk, short_hold, high_vacancy, low_dscr_warning, high_leverage.

**Substrate quality**: Strong on Reg D 506(b)/506(c), Reg A Tier 1/Tier 2, Reg CF, accreditation verification. Strong on fund formation thresholds and CRE syndication underwriting. **Gaps** (additive, not blocking):
- Anti-fraud beyond Rule 10b-5 (no 17 CFR 240.10b-5 enumerated patterns; no Rule 506(d) bad-actor check).
- Blue sky state-by-state (no per-state notice filings, fees, deadlines for HI/CA/NY/TX/FL).
- FINRA suitability (Rule 2111) — no mention.
- Broker-dealer registration triggers (Section 15(a)) — no analysis logic.
- Investment adviser registration analysis (Advisers Act Section 202(a)(11)) — no analysis logic.
- General solicitation pattern detection for 506(b) — content rules exist in prose but no regex pattern set.

---

## Discrepancies between memo and code state

### Discrepancy #1 — Investor RAAS line count

**Memo claim** (memo line 31): "Approximately 698 lines of investor RAAS plus three orphan rulesets."

**Actual** (Investigation #11): 1,414 lines across `raas/investor/` + 310 lines across the three orphan rulesets = 1,724 lines total.

**Resolution**: Use the actual 1,414 + 310 = 1,724 lines as the substrate for the Securities Compliance v1 module. The memo undercount does not change scope; it expands the substrate. Counsel review of more content takes more time but the engineering work is unchanged.

### Discrepancy #2 — AD-013 deprecation framing

**Memo claim** (memo line 33-35): "AD-013 F&I Compliance Monitor as lending compliance goldmine. Currently marked v1.deprecated, but the most comprehensive lending regulation content in the codebase. ... The deprecation marker needs investigation — T1 confirms whether it indicates active replacement work in progress or a stalled migration."

**Actual** (Investigation #1): Neither stalled migration nor active replacement. Deprecated as part of CODEX 50.10 Phase 1 orphan-cluster sweep (`scripts/deprecateOrphanRulesets.js:25-52`). The content is salvageable for a future Lending Origination worker but not immediately needed for v1.

**Resolution**: AD-013 content adopted into a future `lending_compliance_v1` module post-launch. Not blocking 50.17 v1.

### Discrepancy #3 — OFAC integration assumption

**Memo claim** (memo line 121-124): "whether OFAC screening hard-stop rules are aspirational pending external SDN integration or whether some integration exists in a separate service was not visible."

**Actual** (Investigation #2): Fully aspirational. 16+ rule references; zero implementation files. No SDN list ingestion, no name-match service.

**Resolution**: OFAC integration is P0-3 below (~16 hours total). Required for Fundraise KYC (50.15 P0-15) to be defensible to Kent. Direct OFAC SDN XML feed via Treasury, daily fetch, fuzzy-match service.

### Discrepancy #4 — Studio Locker scope

**Memo claim** (memo line 109): "whether the Studio Locker is integrated into the production prompt assembly or is sandbox-only is unclear; the audit suggests sandbox-only."

**Actual** (Investigation #3): Confirmed sandbox-only. No production caller in `index.js` or `services/alex/promptBuilder.js`. Header at `services/sandbox/studioLocker.js:1-22` declares "knowledge ingestion for the Worker Sandbox. CODEX 47.4 Phase A."

**Resolution**: Constraint modules live in NEW `constraintRaasModules` collection. Studio Locker remains untouched.

### Discrepancy #5 — Existing audit log shape

**Memo claim** (memo deliverable line ~120): "investigates and reports on... the alexAuditLog violations array shape."

**Actual** (Investigation #4): `violations` array exists at `services/alex/auditLog.js:74` with shape `{ ruleId, layer, message }` populated from `services/alex/alexOutputFilter.js:60-142`. Three layers: hard stops, data violations, vertical cannot-say items.

**Resolution**: Extend the violation entry shape with constraint-specific fields. Add a parallel `workerAuditLog/{userId}/{sessionId}/{messageId}` collection for ordinary workers (Alex's `alexAuditLog` stays Alex-specific). Both collections feed the same query layer.

### Discrepancy #6 — `raas_sources_applied` does not exist yet

**Memo claim** (memo line 78-79): "The audit trail captures: raas_sources_applied (which modules were loaded), constraint_check_results, content_classification, version_resolution."

**Actual**: None of these fields exist anywhere in the codebase today. Confirmed via grep across `functions/functions/`.

**Resolution**: All four fields are NEW additions to `auditRecords` (chain-anchored) AND to the new `workerAuditLog`. P0-7 below.

### Discrepancy #7 — `constraintRaasSources` does not exist on worker config

**Memo implication**: Worker config gets a `constraintRaasSources` array.

**Actual**: No such field on `workers/{id}`, `raasCatalog/{id}`, or `digitalWorkers/{slug}`. New schema field. Update `helpers/workerSchema.js` + `helpers/workerSync.js` + worker JSON catalogs.

**Resolution**: P0-5 below adds the field with default `[]`. Workers that need constraint modules declare them explicitly. Validation in `validateWorkerRecord` confirms declared module IDs resolve.

---

## Phased plan

P0 = launch-blocking (required for Fundraise + Marketing to ship safely). P1 = launch-adjacent (within 2 weeks of launch). P2 = post-launch.

Estimates are honest wall-clock at engineering-Claude shipping pace.

### P0 — launch-blocking

| ID | Item | Hours | Depends on |
|----|------|-------|------------|
| P0-1 | Regulatory ingestion service v1 — fork `driveImport.js` pipeline; SEC EDGAR adapter (rule changes via RSS), Federal Register adapter (RSS), CFPB adapter (RSS or scrape), source-adapter pattern, scheduled `onSchedule` daily fetch, `regulatoryDocuments/{docId}` schema, version chaining via supersession | 18 | none |
| P0-2 | OFAC SDN feed integration — direct Treasury XML fetch via `onSchedule`, parse SDN entries into `regulatoryDocuments/sdn/`, name-match service with fuzzy matching, expose `services/compliance/ofacScreen.js::screen(name)` API | 16 | P0-1 (reuses ingestion pattern) |
| P0-3 | `constraintRaasModules/{moduleId}` collection schema + CRUD + version management — write through `services/raas/constraintModules.js`; module composition spec (sections with priority tags); update propagation via onContentSync extension | 10 | P0-1 |
| P0-4 | Securities Compliance v1 module composition — compose from `raas/investor/` (1,414 lines), `ir_compliance_v0`/`ir_fund_v0`/`ir_syndication_v0` rulesets (310 lines), plus 5 additive sections (anti-fraud beyond Rule 10b-5, **blue sky for ALL 50 STATES + DC per D-12** — template-driven per-state metadata, FINRA Rule 2111 suitability, broker-dealer registration triggers Section 15(a), investment-adviser-registration triggers Advisers Act 202(a)(11)). Counsel reviews before activation. | 32 (engineering, +16 from base estimate due to 50-state expansion) + counsel review out-of-band |
| P0-5 | Worker schema extension — add `constraintRaasSources: []` to `helpers/workerSchema.js`, `helpers/workerSync.js` autoFix + validate, `workers/{id}` + `raasCatalog/{id}` + `digitalWorkers/{slug}` migrations | 6 | P0-3 |
| P0-6 | Multi-source RAAS loader — new `services/raas/workerPromptBuilder.js::assembleWorkerPrompt(options)` extending `assemblePrompt` patterns; resolves `constraintRaasSources` to current module versions; token budgeting (12K budget; section priority tags drive truncation order); wires into chat completion at `index.js` chat handler | 14 | P0-3, P0-5 |
| P0-7 | Audit trail extension — add `raas_sources_applied`, `constraint_check_results`, `content_classification`, `version_resolution` to `auditRecords` (chain-anchored, `auditTrailService.js`) AND to new `workerAuditLog/{userId}/{sessionId}/{messageId}`. DTC + Logbook integration (50.13) — compliance-significant generation writes Logbook entry referencing the relevant DTC | 12 | P0-6 |
| P0-8 | Pre-publish constraint check service — `services/raas/constraintCheck.js`: AI-moderation pass (Claude 4 with module-specific prompt) + pattern-matching pass (regex from module). Hooks: chat completion (post-generation), `worker1:prePublish` (replaces showstopper_screening + harm_surface_scan placeholders at `index.js:8905, 8919`), `socialService::saveDraft`/`approveDraft` (`services/socialService/index.js:81, 139`). Disposition: block / flag / allow. Worker self-corrects on first attempt; surfaces explicit block on second-pass failure. | 20 | P0-4, P0-6, P0-7 |
| P0-9 | Content classification primitive (minimum viable for v1) — taxonomy + classifier function. v1: classifier is rule-based (keyword + regex), no AI call. Output: `{ jurisdiction, audienceTier, messageType, complianceDomains: [] }`. Captured in audit trail (P0-7). Deferred: dynamic constraint loading based on classification (v1.1). | 8 | P0-7 |
| P0-10 | Wire Fundraise (`BANK-FUND-001` from 50.15 P0-12) to `constraintRaasSources: ["securities_compliance_v1"]` and validate end-to-end: a Fundraise generation that includes general-solicitation language for a 506(b) raise gets blocked-with-explanation; a properly-scoped 506(c) generation passes | 6 | P0-4, P0-5, P0-6, P0-8, 50.15 P0-12 |
| P0-11 | Wire Marketing & Content (PLAT-003) to constraint-module loading: when classification flags content as investment-adjacent, the multi-source loader prepends `securities_compliance_v1`. v1 ships static (always loads) or context-keyword-trigger (Marketing post mentioning "investment", "fundraise", "investor", "raise", "Reg D", etc., triggers load). Decision: keyword-trigger at v1 (token-cost-aware). | 6 | P0-6, P0-8, P0-9 |

**P0 total: ~132 hours** of engineering work (does not include counsel review time which is out-of-band).

**Sequencing gate**: 50.15 P0-12 (Fundraise worker registration) ships **before** 50.17 P0-10 (Fundraise constraint-wiring). 50.17 P0-1 through P0-9 ship **before** 50.17 P0-10 / P0-11. The ordering means 50.15 Fundraise worker registers in the catalog (visible, but constraint-protected) without going live to real investors until 50.17 P0-10 ships.

### P1 — launch-adjacent (within 2 weeks of launch)

| ID | Item | Hours |
|----|------|-------|
| P1-1 | RAAS update notification cascade — extend `onContentSync.js` with `regulatory_module_updated` event; fan-out via campaigns engine (email + SMS digest of changes; `ta:chatPrompt` Alex notifications); operator opt-in dashboard for review-before-update on high-impact changes | 8 |
| P1-2 | State Bar / general legal-advice constraint module — Marketing & Content + Fundraise both consume to prevent jurisdiction-inappropriate legal language | 14 (composition + activation) |
| P1-3 | Constraint module versioning UI — admin view of module version history, diff between versions, force-rollback if a regulatory update introduces incorrect rules | 10 |
| P1-4 | Constraint check observability — dashboard at `apps/admin/` showing block/flag/allow rates per module, common violation patterns, false-positive feedback loop tied into 50.11 worker improvement loop | 8 |
| P1-5 | Additional securities-compliance content additions post-launch — Rule 506(d) bad-actor check, Form D filing reminders, FINRA filing reminders for non-registered fund advisers. (Blue sky 50-state coverage moved to P0-4 per D-12.) | 6 |
| P1-6 | OFAC re-screening cron — re-screen all live investor records weekly against latest SDN; surface new hits as alerts | 4 |

**P1 total: ~56 hours.**

### P2 — post-launch

| ID | Item | Notes |
|----|------|-------|
| P2-1 | Lending Compliance v1 module — adopt + modernize AD-013 deprecated content (TILA, ECOA, FCRA, Red Flags, FTC CARS, MLA). Activates with Lending Origination worker | Memo + Investigation #1 |
| P2-2 | HIPAA Compliance v1 module — Privacy Rule, Security Rule, Breach Notification, Business Associate. Activates with Health Education vertical | Memo line 99-101 |
| P2-3 | FAA Compliance v1 module — Part 91/135/121 records, maintenance documentation, training requirements. Aviation V1 reference | Memo line 99-101 |
| P2-4 | EU GDPR/DPP module — data subject rights, lawful bases, breach notification, BCR templates. Activates with international expansion | Memo line 99-101 |
| P2-5 | Dynamic per-context constraint loading — classification-driven. Replaces P0-11 keyword-trigger. Worker requests modules at runtime based on what it's about to generate | Decision D-5 |
| P2-6 | Cross-worker tool-use (read + invoke). Read exists; invocation does not. Marketing invokes Landing Page worker; Fundraise invokes Prospecting | Memo line 116-118 |
| P2-7 | Vendor SDN integration (ComplyAdvantage / Castellum) — replaces Treasury XML once volume justifies cost | Investigation #2 |
| P2-8 | Module composition automation — agent that proposes module updates as new regulatory documents ingest, counsel reviews diffs | Future |
| P2-9 | Audit query layer — unified query API across `alexAuditLog` + `workerAuditLog` + `auditRecords` for regulatory inquiries | Investigation #4 |

---

## Per-component spec sections

### A — Regulatory ingestion service (P0-1)

**File location**: `functions/functions/services/regulatory/`
- `ingestion.js` — main pipeline (forks `services/vault/driveImport.js` shape).
- `adapters/secEdgar.js` — SEC EDGAR adapter (rule changes via RSS feed at https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=&dateb=&owner=include&count=40&action=getcompany; rule-filing RSS).
- `adapters/federalRegister.js` — Federal Register adapter (https://www.federalregister.gov/api/v1/documents.rss).
- `adapters/cfpb.js` — CFPB enforcement + guidance (https://www.consumerfinance.gov/about-us/newsroom/feed/).
- `adapters/finra.js` — FINRA notices (https://www.finra.org/rules-guidance/notices/feed).
- `adapters/treasuryOfac.js` — OFAC SDN (XML feed, daily; P0-2 builds this).
- `adapters/stateSecurities.js` — state regulator scrape (CA DFPI, NY DFS, TX SSB, HI DCCA, FL OFR — minimum 5 states for v1).
- `scheduledJobs.js` — `onSchedule` exports per source cadence (daily for SDN, hourly for SEC rule feeds, daily for Federal Register, weekly for state regulators).

**Sources at v1**:
- SEC EDGAR (rule changes via RSS) — securities.
- Federal Register (RSS) — cross-domain federal rules.
- FINRA Rule Filings RSS — securities self-regulatory.
- CFPB enforcement + guidance — lending (informs P2-1 Lending Compliance).
- Treasury OFAC SDN XML — sanctions screening (P0-2).
- State securities regulators (CA, NY, TX, HI, FL) — state-by-state blue-sky context.

**Source adapter pattern**:
```
async function fetch() -> [{ source_id, source_url, document_type, jurisdiction, fetchedAt, body }]
```
Adapter returns array of normalized document records. Pipeline at `ingestion.js` consumes:
1. Loop adapter outputs.
2. Hash body content; if hash matches existing live record, skip.
3. Otherwise: chunk → embed → write to `regulatoryDocuments/{docId}`, supersede prior version.
4. Fire `regulatoryUpdates/{updateId}` event (consumed by P0-3 module rebuild trigger).

**Fetch cadence**:
- SEC EDGAR: hourly (rule-filings move quickly during comment periods).
- Federal Register: daily.
- FINRA: daily.
- CFPB: daily.
- OFAC SDN: daily (Treasury publishes nightly).
- State regulators: weekly (lower-velocity sources).

**Parse / chunk / embed pipeline**: identical to `driveImport.js` step 4-9 (lines 181-263). Reuses `services/vault/textChunker.js` + `services/vault/embeddingService.js`. No re-implementation.

**Version chaining**: Same supersession pattern as `driveImport.js::supersedeDocument` (lines 96-127). Prior versions remain queryable; current version flagged `superseded: false`. Critical for re-auditing past generations.

**`regulatoryDocuments/{docId}` schema**:
```
{
  docId,
  source_id,                    // "sec_edgar" | "federal_register" | ...
  source_url,                   // link to original
  domain,                       // "securities" | "lending" | "healthcare" | "aviation" | ...
  jurisdiction,                 // "US-federal" | "US-CA" | ...
  document_type,                // "regulation" | "guidance" | "enforcement_action" | "rule_filing" | ...
  cite,                         // "17 CFR 230.506(c)" or similar canonical reference
  effective_date,
  fetched_at,
  body_text,                    // first 50K chars for legacy queries (mirrors driveImport.js line 271)
  body_text_length,
  chunk_count,
  embedding_model, embedding_dimensions,
  sha256hash,
  version,
  superseded: false,
  storage_path,
  // chunks at regulatoryDocuments/{docId}/chunks/{chunk_NNNNN}
}
```

### B — Constraint RAAS module assembly (P0-3)

**File location**: `functions/functions/services/raas/constraintModules.js` + `services/raas/constraintModules.test.js`.

**`constraintRaasModules/{moduleId}` schema**:
```
{
  moduleId,                     // "securities_compliance_v1"
  domain,                       // "securities" | "lending" | "healthcare" | ...
  version,                      // "1.0.0"
  status,                       // "draft" | "review" | "live" | "superseded"
  jurisdiction_scope: ["US-federal", "US-state-CA", ...],
  curated_by,                   // "platform" | uid
  reviewed_by,                  // counsel uid or null
  reviewed_at,                  // counsel sign-off timestamp
  composition: {
    sections: [
      {
        section_id,
        priority,                 // "critical" | "important" | "reference"
        title,
        body,                     // composed prose injected into prompt
        cites: [docId, ...],     // links to regulatoryDocuments
        violation_patterns: [    // for post-generation pattern-match pass
          { pattern_type: "regex"|"phrase", pattern, severity: "high"|"moderate"|"low", explanation }
        ],
        ai_moderation_prompt,    // optional Claude-prompt for AI moderation pass
      }
    ]
  },
  resolved_token_estimate,       // computed at module-build time
  prior_version_id,              // null if v1.0.0
  superseded_by,                 // moduleId of next version
  created_at, updated_at
}
```

**Version management**:
- New version is a separate doc with new moduleId variant: `securities_compliance_v1` -> `securities_compliance_v1_2026_05` (date-suffixed for unambiguous resolution).
- Worker config declares the canonical alias `securities_compliance_v1`. Resolution at chat time picks the current `live` version with that alias.
- Older versions remain queryable. Audit re-auditing uses the version pinned at generation time.

**Update propagation**: `constraintRaasModules/{moduleId}` write fires Firestore trigger handled by P1-1 (RAAS update notification cascade). The trigger:
1. Marks prior version `superseded`.
2. Invalidates worker prompt caches.
3. Writes `regulatoryUpdates/{updateId}` for downstream notification.
4. Calls `onContentSync` cascade with event_type `regulatory_module_updated`.

**Securities Compliance v1 module composition (P0-4)**:

Sections (priority / source / additive):
1. **Reg D 506(b) — non-public offering** (priority: critical) — composed from `ir_compliance_v0.json:11-27` (35 non-accredited limit) + `raas/investor/investor-rules.md` Reg D sections. Patterns: detect general-solicitation phrases ("invest in", "open to all", "join our investment", "passive income"). Disposition: block-with-explanation.
2. **Reg D 506(c) — public offering, accredited only** (priority: critical) — composed from `ir_compliance_v0.json:7-18` (`unaccredited_506c` hard stop). Patterns: detect "open to all investors" without accreditation language. Disposition: block.
3. **Reg A Tier 1 / Tier 2** (priority: important) — composed from `ir_compliance_v0.json:42-61` (raise caps $20M / $75M). Patterns: detect raise-amount claims that exceed tier limits. Disposition: flag.
4. **Reg CF** (priority: important) — composed from `ir_compliance_v0.json:30-39` ($5M/12mo cap). Patterns: detect crowdfunding language with non-CF intermediary. Disposition: flag.
5. **Accreditation verification** (priority: critical) — composed from `raas/investor/GLOBAL/sops/accreditation_sop_v0.md` (73 lines). Patterns: detect "accredited investor" claims without verification language. Disposition: flag.
6. **Anti-fraud — Rule 10b-5 patterns** (additive) — new section. Patterns: forward-looking statements without safe-harbor disclaimer; guarantee language ("guaranteed return", "risk-free", "cannot lose"); omission of material risk factors. Disposition: block.
7. **Blue sky — state-by-state notice filings** (additive) — new section. Covers HI, CA, NY, TX, FL minimum at v1. Patterns: detect state-specific solicitation without notice-filing reference. Disposition: flag.
8. **FINRA Rule 2111 — suitability** (additive) — new section. Patterns: detect suitability claims about specific investor profiles. Disposition: flag.
9. **Broker-dealer registration triggers** (additive) — new section. Patterns: detect transactional compensation language ("commission", "transaction-based fee", "success fee on placement"). Disposition: block.
10. **Investment adviser registration triggers** (additive) — new section. Patterns: detect ongoing-fee-for-advice language without RIA registration. Disposition: flag.
11. **Fund formation thresholds** (priority: important) — composed from `ir_fund_v0.json` + `raas/investor/GLOBAL/sops/distribution_sop_v0.md`. Patterns: tenant-config hard stops on management fee / GP commit / clawback. Disposition: flag.
12. **CRE syndication underwriting** (priority: important) — composed from `ir_syndication_v0.json`. Patterns: tenant-config hard stops on cap rate / LTV / DSCR. Disposition: flag.

Token estimate (composed): ~14K tokens at full module. Module loader truncates `priority: reference` first, then `important`, never `critical`. With aggressive truncation, module fits in 8K tokens minimum (critical-only).

### C — Multi-source RAAS loader (P0-6)

**File location**: `functions/functions/services/raas/workerPromptBuilder.js`.

**Shape**:
```
async function assembleWorkerPrompt(options) {
  const {
    workerId, tenantId, userId,
    workerConfig,                    // worker doc with constraintRaasSources
    conversationContext,
    classificationHint,              // optional, from P0-9 classifier
  } = options;

  // 1. Worker Job RAAS (existing — from raas.store.js)
  const jobRaas = await loadJobRaas(workerConfig);

  // 2. Constraint RAAS modules
  const constraintModules = await loadConstraintModules(
    workerConfig.constraintRaasSources || [],
    classificationHint
  );

  // 3. Worker-scoped vault context
  const vaultContext = await loadVaultContext(workerId, userId);

  // 4. Conversation context
  // (already in chat handler)

  // 5. Compose with priority + token budget
  return composeWithBudget({
    sections: [
      ...jobRaasSections(jobRaas),
      ...constraintSections(constraintModules),     // priority-tagged
      ...vaultSections(vaultContext),
    ],
    budget: MAX_WORKER_TOKEN_BUDGET,
    truncationOrder: [
      "constraint_module_reference",
      "vault_context",
      "constraint_module_important",
      "job_raas_reference",
      // never truncate: job_raas_critical, constraint_module_critical
    ],
  });
}
```

**`constraintRaasSources` array on worker config**:
- Field on `workers/{id}`, `raasCatalog/{id}`, `digitalWorkers/{slug}`.
- Default `[]`. Workers explicitly opt in.
- Validation in `helpers/workerSchema.js::validateWorkerRecord` confirms each declared moduleId resolves to a `live` module.
- `helpers/workerSync.js::autoFixWorkerRecord` defaults missing field to `[]`.

**Token budgeting strategy**:
- `MAX_WORKER_TOKEN_BUDGET = 12000` (vs Alex's 10000 — accommodates constraint modules).
- Truncation order: vault context first, then constraint module reference sections, then important sections, then Job RAAS reference. Never truncate critical sections from either Job or Constraint RAAS.
- Module loading respects per-section priority tags.

**Conditional loading deferred to v1.1**: At v1, all declared `constraintRaasSources` always load. v1.1 introduces `loadingTriggers` per module (keyword regex, classification match, tenant attribute), and the loader skips modules whose triggers don't fire. Exception at v1: P0-11 wires Marketing & Content with a keyword-trigger for `securities_compliance_v1` because Marketing handles many non-investment communications and the token cost matters. Implementation: simple regex match on the user's input + the worker's prior-turn output.

### D — Pre-publish constraint check service (P0-8)

**File location**: `functions/functions/services/raas/constraintCheck.js`.

**Hook points**:
1. **Chat completion (post-generation)** — at `index.js` chat handler, after the model returns its response. Runs constraint check against the response before returning to user.
2. **`worker1:prePublish`** — at `index.js:8877-9007`. Replaces placeholder `showstopper_screening` (line 8905) and `harm_surface_scan` (line 8919) with real constraint checks.
3. **`socialService::saveDraft`** — at `services/socialService/index.js:81`. Constraint check before write; failed check sets `status: "draft_blocked"`.
4. **`socialService::approveDraft`** — at `services/socialService/index.js:139`. Re-runs constraint check against final content (defense-in-depth against post-draft edits).

**Two-pass enforcement**:
- **Pass 1 — AI moderation**: For each loaded constraint module, send the generated content + module's `ai_moderation_prompt` to Claude (Sonnet 4.6 — fast, cost-controlled). Model returns structured violations.
- **Pass 2 — Pattern matching**: For each loaded constraint module, run all `violation_patterns` (regex + phrase) against the generated content. Deterministic, fast, catches what AI moderation misses.

**Disposition logic**:
- `severity: "high"` violation → disposition `block`. Worker self-corrects on first pass: re-prompt with violation context, generate again, re-check. If second pass still violates: surface explicit block-with-explanation to user.
- `severity: "moderate"` violation → disposition `flag`. Content goes through but appended with disclaimer; flagged for human review (status `draft_review_required` for social posts; logged to audit trail with `requires_review: true` for chat).
- `severity: "low"` violation → disposition `allow_with_disclosure`. Content passes; disclosure footer auto-appended.

**Worker self-correction transparency**:
- First-pass violation: worker silently regenerates with violation context. User sees only the corrected output. Audit trail captures `regenerationCount: 1` with original violation.
- Second-pass violation: worker surfaces "I started to write [X] but [explanation]; let me try again" pattern. User sees acknowledgment of the constraint.
- Third-pass violation: explicit block with clear explanation: "I cannot generate this content because [violation]. To proceed, [user-action recommendation]."

**Integration with chat completion flow**: 1-line wrapper at chat handler:
```js
const completion = await modelCompletion(prompt, conversation);
const checkResult = await runConstraintCheck(completion, workerConfig.constraintRaasSources);
if (checkResult.disposition === "block") {
  if (regenerationCount < 2) {
    return retryWithViolationContext(prompt, checkResult);
  }
  return surfaceBlockToUser(checkResult);
}
// allow / flag — pass through, log to audit
return completion;
```

### E — Content classification primitive (P0-9)

**File location**: `functions/functions/services/raas/contentClassifier.js`.

**Taxonomy**:
- `jurisdiction`: `"US-federal"` | `"US-state-{XX}"` | `"EU"` | `"UK"` | `"multi"`.
- `audienceTier`: `"public"` | `"accredited_investors"` | `"institutional"` | `"existing_relationships"` | `"internal_team"`.
- `messageType`: `"educational"` | `"promotional"` | `"transactional"` | `"advisory"` | `"regulated_disclosure"`.
- `complianceDomains`: array of `"securities"` | `"healthcare"` | `"aviation"` | `"legal"` | `"banking"` | `"sanctions"` | `"data_privacy"`.

**Classification logic at v1** (rule-based, no AI call):
- Worker config declares default classification (e.g., Fundraise's default audience is `accredited_investors`, Marketing's default is `public`).
- Per-message classification overrides via keyword detection: text mentions "Reg D"|"506(b)"|"506(c)"|"investor"|"accredited" → adds `complianceDomains: ["securities"]`. Text mentions "patient"|"PHI"|"diagnosis" → adds `complianceDomains: ["healthcare"]`. Etc.
- Output is `{ jurisdiction, audienceTier, messageType, complianceDomains }`.

**Captured in audit trail** (P0-7) at `content_classification` field.

**Drives constraint loading at v1.1** (deferred — see Decision D-5). At v1, the keyword-trigger in the Marketing wiring (P0-11) is the only classification-driven loading. All other workers load their declared `constraintRaasSources` unconditionally.

### F — Audit trail extension (P0-7)

**Files affected**:
- `services/auditTrailService.js` — add new fields to `auditRecords` write at line 68-81.
- `services/alex/auditLog.js` — extend violation entry shape; collection unchanged.
- New: `services/audit/workerAuditLog.js` — parallel to `alexAuditLog`, writes to `workerAuditLog/{userId}/{sessionId}/{messageId}` for ordinary workers.

**Extended `auditRecords` schema**:
```
{
  // existing
  event_id, worker_id, user_id, org_id, execution_type,
  txHash, chain, gas_cost_actual, fee_charged, net_margin,
  _mintMethod, _written_at,

  // NEW (P0-7)
  raas_sources_applied: [
    { moduleId, version, source: "job"|"constraint", tokens_used }
  ],
  constraint_check_results: [
    {
      moduleId, ruleId, severity, disposition,
      autoCorrected: boolean,
      regenerationCount,
      pattern_matched: "regex|phrase|ai_moderation",
      original_excerpt, corrected_excerpt
    }
  ],
  content_classification: {
    jurisdiction, audienceTier, messageType, complianceDomains: []
  },
  version_resolution: {
    resolvedAt: timestamp,
    modulesResolved: [{ moduleId, alias, resolved_version }]
  },
  // 50.13 / 50.14 integration
  dtc_id,                    // optional, when generation produces a DTC
  logbook_entry_id,          // optional, when generation logs an event
  hash_anchor                // optional, hash anchor txHash from 50.14
}
```

**DTC + Logbook integration (per 50.13)**: Compliance-significant generations write a Logbook entry referencing the relevant DTC. Schema additions on `auditRecords` (`dtc_id`, `logbook_entry_id`) link the audit to the moat record. Re-auditing flow: regulator queries `auditRecords` filtered by `worker_id` + time range; for each result, dereferences `dtc_id` for the source data and `logbook_entry_id` for the event chain. Full chain visible.

**Hash anchor integration (per 50.14)**: Each `auditRecords` write carries a hash anchor (Polygon txHash from the chain anchor batch). Tampering detection: regulator can verify `auditRecords` content hash against the on-chain hash. Mismatch = tampered. Production-ready at 50.14 P0 level; 50.17 P0-7 just adds the field reference.

### G — RAAS update notification cascade (P1-1, post-launch but specified here)

**File location**: extend `functions/functions/onContentSync.js` with `regulatory_module_updated` event handler.

**Cascade**:
1. `constraintRaasModules/{moduleId}` write fires Firestore trigger.
2. Trigger writes `platform/contentSync/events/{eventId}` with `event_type: "regulatory_module_updated"`.
3. `onContentSync` consumes:
   a. Mark prior version `superseded`.
   b. Invalidate cached prompts for workers using this module (write to `platform/promptCacheInvalidations/{cacheKey}`).
   c. For each worker with this module declared: write `regulatoryUpdates/{updateId}` containing diff summary.
   d. Enqueue email + SMS digest via `messageQueue` (consumed by `campaigns/messageProcessor.js`). Default delivery: weekly digest unless severity is `critical`, in which case immediate.
   e. Enqueue Alex `ta:chatPrompt` notification for next session: "The Securities Compliance module updated on [date]. Summary: [diff]. Workers using this module: [list]."

**Auto-update default**: Constraint RAAS updates auto-apply (regulatory updates do not require subscriber re-acceptance — unlike Job RAAS updates from creators where `materialChangeDetection.js` re-acceptance flow gates the change). Subscribers can opt into review-before-update on a per-module basis (P1-3 admin UI).

---

## Securities Compliance module composition for v1 (P0-4 detail)

Substrate (existing, no new authorship):
- `raas/investor/investor-rules.md` (413 lines) — full body imported as section content.
- `raas/investor/company-knowledge.md` (217 lines) — relevant sections imported (general firm-level context excluded).
- `raas/investor/GLOBAL/prompts/investor-relations-system-prompt.md` (159 lines) — adapted into `ai_moderation_prompt` for sections 1-5.
- `raas/investor/GLOBAL/prompts/investor-reporting-distributions-system-prompt.md` (367 lines) — section 11 (Fund formation).
- `raas/investor/GLOBAL/sops/accreditation_sop_v0.md` (73 lines) — section 5.
- `raas/investor/GLOBAL/sops/distribution_sop_v0.md` (99 lines) — section 11.
- `raas/investor/GLOBAL/templates/*.json` (55 lines) — referenced as approved templates.
- `raas/investor/GLOBAL/workflows/README.md` (31 lines) — referenced for workflow context.
- `raas/rulesets/ir_compliance_v0.json` (118 lines) — imported as hard-stops + soft-flags for sections 1-4, 5.
- `raas/rulesets/ir_fund_v0.json` (91 lines) — imported as hard-stops + soft-flags for section 11.
- `raas/rulesets/ir_syndication_v0.json` (101 lines) — imported as hard-stops + soft-flags for section 12.

**Total imported substrate**: 1,724 lines.

Additive content needed beyond existing (composed by Sean + counsel; engineering wires it):
1. **Anti-fraud beyond Rule 10b-5 patterns** — pattern set for forward-looking statements, guarantees, material omissions. Section 6 above. ~200 lines of pattern definitions + prose.
2. **Blue sky state-by-state for HI, CA, NY, TX, FL** — per-state notice filing requirements, fees, deadlines. Section 7. ~300 lines (5 states × ~60 lines each).
3. **FINRA Rule 2111 suitability mention** — Section 8. ~50 lines.
4. **Broker-dealer registration triggers (Section 15(a))** — Section 9. ~75 lines.
5. **Investment adviser registration analysis (Advisers Act 202(a)(11))** — Section 10. ~75 lines.

**Additive total**: ~700 lines new authorship.

**Counsel review scope**: Counsel reviews the composed module (1,724 + 700 = ~2,424 lines) before activation. Counsel sign-off captured in `constraintRaasModules/securities_compliance_v1.reviewed_by` + `reviewed_at` fields. Module status flips from `draft` → `live` only after sign-off.

---

## Sequencing relative to 50.13/50.14/50.11/50.15

**50.17 P0 items that 50.15 P0 items depend on**:

| 50.15 item | Depends on 50.17 | Why |
|------------|-------------------|-----|
| 50.15 P0-12 (Fundraise registered) | 50.17 P0-5 (worker schema constraintRaasSources field) | Worker doc must support the new field before Fundraise is registered with the field populated |
| 50.15 P0-13 (Fundraise Apollo prospecting) | 50.17 P0-2 (OFAC SDN integration) | Investor records get screened on import; defensible KYC requires real OFAC, not aspirational rule references |
| 50.15 P0-15 (Fundraise KYC) | 50.17 P0-2 (OFAC) | Same |
| 50.15 Fundraise going live to investors | 50.17 P0-1 through P0-10 (full Securities Compliance v1 module operational, wired, audit-traced) | The whole point: Fundraise generations get pre-publish constraint checked against securities compliance |

**50.17 P0 items that 50.13 / 50.14 P0 items enable**:

| 50.17 item | Builds on 50.13 / 50.14 | How |
|------------|--------------------------|-----|
| 50.17 P0-7 (audit trail extension) | 50.13 (DTC + Logbook integration) | New `dtc_id` + `logbook_entry_id` fields on `auditRecords` cross-reference the moat records |
| 50.17 P0-7 | 50.14 (chain anchor + hash anchor) | New `hash_anchor` field anchors the audit record to Polygon for tamper-detection |
| 50.17 P0-1 (regulatory ingestion) | 50.13 (Drive/Vault unified pipeline) | Regulatory ingestion forks the same `driveImport.js` shape that 50.13 hardens |

**50.17 relative to 50.11 (worker improvement loop)**:
- 50.17 P1-4 (constraint check observability dashboard) feeds the 50.11 improvement loop with structured violation patterns. False positives surface as `improvement_request` records that prompt module-curation iteration.

**Sequencing risk**: Fundraise (50.15 P0-12) cannot ship live to real investors without 50.17 `securities_compliance_v1` module operational. The catalog can register Fundraise at the 50.15 P0-12 ship; the worker can show on the marketplace; subscribers can view it — but **chat-completion must constraint-check before any generation goes to user**, OR the worker must be marked `status: "waitlist"` until 50.17 P0-10 ships. Recommended path: 50.15 P0-12 registers Fundraise as `status: "waitlist"` with an admin-side preview surface; 50.17 P0-10 wires the constraint and flips `status: "live"`.

---

## Open questions remaining for Sean

After T1 answers what code visibility allows, four questions remain for Sean:

1. **Counsel engagement timing for P0-4 module review**. Compose-then-review takes 16 engineering hours for composition; counsel review is asynchronous and out-of-band. If counsel review takes 2 weeks calendar, P0-10 / P0-11 (which depend on P0-4 going live) wait. Sean: do you want to engage counsel now (parallel with P0-1 through P0-3 engineering), or wait until composition is done? Recommendation: engage counsel at start of week, so review runs in parallel with P0-1 through P0-3.

2. **Initial-version Fundraise launch posture**. P0-10 wires Fundraise to constraint-check. If counsel review of `securities_compliance_v1` takes longer than expected, Fundraise sits in `status: "waitlist"` longer. Acceptable, or push v1 launch with `securities_compliance_v1` in `status: "draft"` and a Sean+Kent override that audits everything but does not block? Recommendation: ship `securities_compliance_v1` in `status: "live"` with counsel sign-off — the moat depends on this being defensible from day one.

3. **Marketing & Content keyword-trigger thresholds for P0-11**. Marketing handles most non-investment content. Trigger keyword list: `["invest", "investor", "fundraise", "raise", "Reg D", "506(b)", "506(c)", "Reg A", "Reg CF", "accredited", "PPM", "subscription agreement", "private placement", "syndication", "IRR", "preferred return"]`. Sean: confirm list, or amend? Implication: too narrow misses risky content; too broad inflates token cost.

4. **OFAC false-positive tolerance**. Fuzzy name-matching produces false positives (common names match SDN entries). Default disposition: flag-for-human-review on any match score > 0.85; auto-pass below. Sean: confirm threshold, or set differently? Implication: 0.85 catches most real matches; lower threshold catches more but increases human-review burden.

---

## Success criteria (definition of "constraint enforcement working")

A v1 launch is "constraint-enforcement-ready" when ALL of these are true:

- [ ] `regulatoryDocuments/` collection populated with at least 7 days of regulatory ingestion data from SEC EDGAR + Federal Register + FINRA + CFPB (P0-1).
- [ ] OFAC SDN integration operational: `services/compliance/ofacScreen.js::screen(name)` returns hits with confidence scores; `regulatoryDocuments/sdn/` collection populated and refreshed daily (P0-2).
- [ ] `constraintRaasModules/securities_compliance_v1` doc exists with `status: "live"`, `reviewed_by` populated by counsel, `reviewed_at` populated (P0-3, P0-4).
- [ ] All 12 sections of Securities Compliance module composed (P0-4); engineering smoke-test passes per-section ingestion.
- [ ] Worker schema supports `constraintRaasSources` array; validate + autoFix work; existing 226 catalog workers default to `[]` cleanly (P0-5).
- [ ] `services/raas/workerPromptBuilder.js::assembleWorkerPrompt()` exists; chat handler wires it; token budget enforcement tested with worst-case 14K-token module (P0-6).
- [ ] `auditRecords` schema includes all 4 new fields (raas_sources_applied, constraint_check_results, content_classification, version_resolution); `workerAuditLog` collection exists; sample audit record demonstrates DTC + Logbook + hash anchor cross-references (P0-7).
- [ ] `services/raas/constraintCheck.js` runs both AI-moderation pass and pattern-match pass; chat handler integration produces self-correction on first-pass violation, surfaces explicit block on second-pass failure; saveDraft / approveDraft hooks work (P0-8).
- [ ] Content classifier returns valid taxonomy output for representative test cases; classification captured in audit trail (P0-9).
- [ ] Fundraise (`BANK-FUND-001`) wired with `constraintRaasSources: ["securities_compliance_v1"]`; end-to-end test: generation containing 506(b) general-solicitation language gets blocked-with-explanation; generation properly scoped for 506(c) passes; audit record shows constraint applied with version pinned (P0-10).
- [ ] Marketing & Content (PLAT-003) wired with keyword-triggered loading; Marketing post mentioning "Reg D investor" loads `securities_compliance_v1`; Marketing post about "monthly newsletter" does not (P0-11).
- [ ] Regression: existing 226 workers unaffected — they declare empty `constraintRaasSources`, the loader is a pass-through, no token budget regression on Alex-only flows.

When all 12 are checked, 50.17 v1 is shipped and 50.15 Fundraise can flip `status: "live"`.

---

## Critical Files for Implementation

**To create**:
- `functions/functions/services/regulatory/ingestion.js` — main pipeline (P0-1).
- `functions/functions/services/regulatory/adapters/secEdgar.js` (P0-1).
- `functions/functions/services/regulatory/adapters/federalRegister.js` (P0-1).
- `functions/functions/services/regulatory/adapters/cfpb.js` (P0-1).
- `functions/functions/services/regulatory/adapters/finra.js` (P0-1).
- `functions/functions/services/regulatory/adapters/treasuryOfac.js` (P0-2).
- `functions/functions/services/regulatory/adapters/stateSecurities.js` (P0-1).
- `functions/functions/services/regulatory/scheduledJobs.js` (P0-1, P0-2).
- `functions/functions/services/compliance/ofacScreen.js` (P0-2).
- `functions/functions/services/raas/constraintModules.js` (P0-3).
- `functions/functions/services/raas/workerPromptBuilder.js` (P0-6).
- `functions/functions/services/raas/constraintCheck.js` (P0-8).
- `functions/functions/services/raas/contentClassifier.js` (P0-9).
- `functions/functions/services/audit/workerAuditLog.js` (P0-7).
- `functions/functions/scripts/seedSecuritiesComplianceModule.js` (P0-4 — composes module from substrate).

**To extend**:
- `functions/functions/services/auditTrailService.js:68-81` — add 4 new fields to `auditRecords` write (P0-7).
- `functions/functions/services/alex/auditLog.js:74` — extend violation entry shape to include constraint-check fields (P0-7).
- `functions/functions/onContentSync.js:33-61` — add `regulatory_module_updated` event handler (P1-1).
- `functions/functions/helpers/workerSchema.js` — add `constraintRaasSources: []` field; validate moduleId resolution (P0-5).
- `functions/functions/helpers/workerSync.js` — autoFix default `constraintRaasSources: []` (P0-5).
- `functions/functions/index.js:8877-9007` (worker1:prePublish) — replace placeholder showstopper_screening + harm_surface_scan with real constraint check (P0-8).
- `functions/functions/index.js` chat handler — wire `assembleWorkerPrompt()` + post-generation constraint check (P0-6, P0-8).
- `functions/functions/services/socialService/index.js:81` (saveDraft) — pre-write constraint check (P0-8).
- `functions/functions/services/socialService/index.js:139` (approveDraft) — re-run constraint check on final content (P0-8).

**To reference (existing, do not modify)**:
- `functions/functions/services/vault/driveImport.js` — pipeline pattern to fork (P0-1).
- `functions/functions/services/alex/promptBuilder.js` — assembly pattern to extend (P0-6).
- `functions/functions/services/sandbox/studioLocker.js` — confirmed sandbox-only, do not touch (Investigation #3).
- `functions/functions/raas/rulesets/ir_compliance_v0.json` — substrate import (P0-4).
- `functions/functions/raas/rulesets/ir_fund_v0.json` — substrate import (P0-4).
- `functions/functions/raas/rulesets/ir_syndication_v0.json` — substrate import (P0-4).
- `raas/investor/` directory (1,414 lines) — substrate import (P0-4).
- `functions/functions/raas/rulesets/ad_013_fi_compliance_v1.deprecated.json` — preserved for P2-1 lending module (Investigation #1).

**Catalog entries to update** (P0-5, P0-10, P0-11):
- `services/alex/catalogs/banking-finance.json` (created in 50.15 P0-12) — Fundraise gets `constraintRaasSources: ["securities_compliance_v1"]`.
- `services/alex/catalogs/platform.json` — PLAT-003 (Marketing & Content) gets `constraintRaasSources: ["securities_compliance_v1"]` with keyword-trigger declaration.
- All other 224 workers default to `constraintRaasSources: []` via `autoFixWorkerRecord` migration.

End of CODEX 50.17 implementation spec.
