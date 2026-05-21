# CODEX 51.2 — General Dev Snapshot (May 19-21, 2026)

**Status:** Captured. Two-day general-dev record across the SOCIII Inc. formation window.
**Period:** 2026-05-19 through 2026-05-21
**Author:** Sean Lee Combs + AI workforce
**Companion records:** CODEX 51.3 (SOCIII Inc. Setup), CODEX 51.4 (Knowledge Capture Pipeline)

---

## Purpose

This record captures the general platform-engineering work completed during the SOCIII Inc. formation period, separate from the corporate-formation work itself (which is recorded in CODEX 51.3). The intent is to preserve a structured history of what changed in the platform codebase during a period that was otherwise dominated by company-formation activity, so the engineering work does not get lost in the corporate record.

---

## Scripts Shipped

### `scripts/portContactsToSociii.js`

**Purpose:** Port contacts from one workspace (tenant) to another, preserving provenance and idempotency.

**Use case:** Sean's LinkedIn contacts lived in the TitleApp AI workspace; needed to move to the new SOCIII Inc. workspace so the Fundraise worker and Kent could run outreach with Apollo enrichment billed against SOCIII's data-fee meter.

**Key features:**
- Lists workspaces by user UID or USER_EMAIL (resolves email → UID via Firebase Auth)
- Dry-run by default, `--apply` to execute
- Idempotent: tracks `ported_from` on target and `ported_to[<target_tenant_id>]` on source
- Dedupe by email in target tenant
- Preserves `enrichment_history[]` — prior Apollo spend stays attributed to the paying tenant
- Batched commits (200 contacts per batch)

**Result:** 3,178 contacts ported from TitleApp AI tenant (`ws_1778652045795_vk4sz1`) → SOCIII Inc. tenant (`ws_1779168732286_42qw6m`). One dupe skipped.

**Future improvement queued:** Wire as a UI button (Task #215) so future workspace splits do not require a script.

### `scripts/mineApolloFundraiseLeads.js`

**Purpose:** Mine Apollo for fundraise leads — VC partners, accelerator MDs, angel investors — matching SOCIII's ICP. Writes matches into the contacts collection scoped to a target tenant with proper segment + tag metadata.

**Key features:**
- Three ICPs: vc-seed-partners, accelerator-leads, angels
- Paginated against Apollo with target-count + dedupe-by-Apollo-person-id
- Per-ICP target via `--target=N` flag
- Existing-segment baseline dedupe so re-runs accumulate net-new
- Apollo budget tracking (alerts at 75%, hard halts at 95%)
- Per-contact provenance written with `source_member_uid`, `enrichment_history[]` capturing `paid_by_tenant_id`

**Result:** 50 net-new angel investors mined into SOCIII Inc.'s `fundraise:angels` segment. Spent 50 Apollo credits.

**Issues discovered:** v1 query for VC partners returned junk (Apollo's `q_organization_industries` filter is silently ignored — matched on title only, returning Partners at architecture firms, consulting shops). Same issue with accelerator-leads.

**Follow-up queued (Task #243):** Build `mineApolloFundraiseLeads-v2.js` with org-first search — search organizations by industry tag first, then search for partners at those specific org IDs.

---

## Brand Assets Added

`apps/business/src/assets/sociii-brand/` directory added with SOCIII brand system from OpenAI:

- Mark + lockup SVGs in platform palette (`#7C3AED` primary purple, `#16A34A` accent green, `#0686D4` accent cyan, slate neutrals)
- Geometric interlock-style mark (two hexagonal blades, purple top + green bottom)
- 4-pillar iconography
- Status indicator palette mapped to BrandLoader 5-state loader (idle → connecting → synchronizing → processing → activated)

Note: source SVG files do not yet exist. Asset board is captured in `~/Downloads/Technical Brand Board.png`. Reference SVGs at `~/Downloads/SOCIII-logo-mark-v3.svg` and `~/Downloads/SOCIII-logo-lockup-v3.svg` are best-effort recreations.

---

## Platform Code Modifications (other)

The following files in the platform repo show pending modifications from this period (full diffs not authored solely by AI; may include manual platform-side work by Sean):

- `functions/functions/index.js` — main API handler modifications
- `functions/functions/services/alex/catalogs/banking-finance.json` — catalog updates
- `functions/functions/services/canvas/spineState.js` — canvas state updates
- `apps/business/src/components/BrandLoader.jsx` — brand loader component
- `apps/business/src/config/brandConfig.js` — brand configuration

These are committed together with the codex docs in the same commit window. Each will need a follow-up review pass once SOCIII Inc. is fully operational and the platform brand cutover is scheduled (see Task #242 — Platform brand pass).

---

## Bugs Filed During This Period

| Task | Summary | Severity |
|---|---|---|
| **#240** | Worker chat misroutes admin setup prompts (HR chat → marketplace search; Accounting chat → cross-worker delegation to Marketing) | High — blocks paste-into-chat admin workflows |
| **#241** | Workspace context lag in right panel (sidebar shows new workspace; right panel pin shows prior workspace) | Medium — UX confusion only |
| **#242** | Platform brand pass — update `brandConfig.js` + `BrandLoader.jsx` to new SOCIII mark | Low priority — scheduled post-EIN |
| **#243** | Apollo miner v2 — org-first search for VC + accelerator pipeline | Medium — current v1 returns garbage for VC ICP |
| **#239** | Patent strategy — 3 provisionals at SOCIII Day 0 | Filing budget allocated; counsel coordination needed |

---

## Open Engineering Items at End of Period

| Item | Owner | Next Action |
|---|---|---|
| Apollo miner v2 (Task #243) | Sean + AI | Rewrite VC + accelerator queries using organizations-first search pattern |
| Worker chat routing fix (Task #240) | Sean + AI | Root cause: cross-worker routing keyword extraction is over-eager on long admin prompts. Need policy: long admin paste-ins to a specific worker stay with that worker. |
| Codex Ingestion job (CODEX 51.4) | Sean + AI | Spec'd; engineering work pending. ~2-3 weeks focused effort. |
| Terminal worker for creators/advisors (CODEX 51.4) | Sean + AI | Architecture spec'd; phased rollout proposed. Phase 1 starts post-Storyhouse close. |

---

## Memory References (preserved across conversations)

This period generated the following durable memory records that future Claude sessions will load automatically:

- `project_sociii_self_fund_philosophy.md` — Sean has 12 months personal runway; AI workers are an operational necessity to protect flying bandwidth
- `project_kent_cofounder_role.md` — Cofounder title (external), 15% milestone + 5% on capital sourced + SME vertical rights
- `project_robert_loan_formalization.md` — $100K @ 4% quarterly, personal guaranty, assumed by SOCIII Inc.
- `project_sociii_ip_governance_philosophy.md` — Platform IP is personal (Sean), never owned by TitleApp LLC; sole-director governance
- `project_creator_equity_structure_v2.md` — Bounded restructure: HOM contributors get cash + warrants only; advisors get 0.5%/worker capped at 2.5%; founder protected
- `reference_sociii_brand_system.md` — Canonical OpenAI palette + 4 pillars + tagline
- `feedback_minimize_first_person_singular.md` — "We" over "I" in external communications

---

## Bottom Line

Engineering output during this two-day window was modest in volume — two scripts + brand assets + bugs filed — but high in leverage. The scripts unlocked the SOCIII Inc. setup work in CODEX 51.3 by porting Sean's contact universe and seeding the fundraise pipeline. The bugs filed are the platform-engineering punch list that emerges from real founder use of the workers under stress. The memory captures are the leverage layer — they ensure the next AI conversation does not start from zero.

The pattern this period validated: AI-assisted founder operations work, but the platform does not yet learn from those operations automatically. CODEX 51.4 specifies the work needed to close that loop.
