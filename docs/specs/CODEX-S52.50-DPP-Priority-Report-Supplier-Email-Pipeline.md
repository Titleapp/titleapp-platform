# CODEX S52.50 — DPP Priority Report + Supplier Email Pipeline (Scope Only — Not Yet Built)

**Status:** SCOPED (2026-08-15), not built. Written up live during a DPP demo session with Elise, at Sean's request, as a follow-up build rather than something to force into today's demo.
**Author:** Sean Lee Combs + Elise + Claude Code
**Predecessor:** none directly — this is a new EU DPP-suite capability, adjacent to CODEX-S52.48/49's Back of House RAAS/tool-loop work but a different vertical (EU battery-passport compliance, not accounting/HR/marketing/contacts/IR).

---

## Why this exists

Live in the DPP demo, Elise asked Elara (DPP Compliance Tracker) for three things in one message: a priority report (highest-priority products, what data is missing, who should supply it), draft follow-up emails to each responsible supplier, and a fillable Excel template attached to each email. The request failed server-side (`jsonError(res, 500, "Chat engine failed")`).

Diagnosis, confirmed live: basic chat to the same worker succeeded instantly, and asking for **one** supplier email on its own also succeeded (in Dutch, matching the conversation). So this isn't a regression — it's that report generation + document generation + N email drafts is too much for a single non-agentic chat turn to complete before hitting a timeout or an unsupported step combination. This is the same underlying class of problem S52.48/49 diagnosed for accounting (single-shot model, no real multi-step loop) — same root cause, different worker.

Elise's original framing was already the right shape for this: not a chat prompt, a **scheduled job**. This CODEX scopes that job.

## What already exists to build on

- **`dppProducts`, `dppSuppliers`, `dppRegistryStatus`, `dppFleet` collections** (`functions/functions/scripts/demo/seedDppDemo.js`) — real schema, not hypothetical. Products carry `sku`, `category`, `overallPct`, `passportStatus`. Suppliers carry `name`, `language`, `status`, `products: [sku,...]`, `certExpiry` — supplier-to-product linkage already exists (e.g. "Hanam Cell Corp." → `VLT-IND24`, `VLT-IND48`).
- **Scheduled-job pattern already in this codebase**: `generateDailyDigest`, `generateWeeklySubscriberBriefs`, `cosWorkerMorningRun`/`cosWorkerEveningRun` — proactive briefings already run on a cron and land somewhere the user checks (Operating Feed / digest), not just in response to a chat message. The new job follows this same pattern rather than inventing a new delivery mechanism.
- **`generate_document` tool** — already produces Word/Excel/PowerPoint documents (used elsewhere for accounting/marketing deliverables); the Excel-template-attachment piece doesn't need new document-generation infrastructure, just a DPP-specific template shape.
- **Explicit-approval-gate principle** (already platform-wide, `docs/PRODUCT.md`/CLAUDE.md: "Agents propose; users confirm") — matches exactly what Elise asked for ("I can then check and send out these emails"). Drafts, never auto-sends.
- **Regulatory ingest pipeline** (`services/compliance/regulatoryIngest/`, `regulatoryIngestDaily` cron) — flagged in S52.48's audit as "live ingestion, zero consumers" (SEC EDGAR/Federal Register/CFPB adapters). Sean's separate ask (real-time regulatory-source webhooks feeding the RAAS rules content, given how dynamic EU battery regulation is) is a natural extension of this *existing* pipeline with EU sources (EUR-Lex, European Commission battery regulation updates) added as adapters — feeds the **RAAS module content** (S52.51, tracked separately), not this report job directly.

## What's missing — real gaps, not assumptions

- **No supplier email address anywhere in the schema.** `dppSuppliers` has `name`/`language`/`status`/`products`/`certExpiry` — nothing to send to. Drafting a real email needs a contact field added.
- **No cluster-level responsibility mapping.** Supplier→product linkage exists, but "which supplier owns Cluster 3 (Carbon Footprint/LCA) vs Clusters 4-5 (Supply Chain Due Diligence)" for a given SKU isn't modeled — today Elara infers this conversationally. A real pipeline needs this as structured data, not inference, so the job can loop over it deterministically instead of re-deriving it via a model call every run.
- **No "pending drafts" surface for Elise to review before sending.** Right now a drafted email is just chat output. Needs a real inbox/queue view (a "Pending Supplier Requests" tab on the DPP Compliance Tracker canvas, parallel to Dashboard/Passport Builder/Timeline/Client File/Advisory Reports) where drafts land, get reviewed, edited if needed, and approved to send — not scrolled past in chat history.
- **Cadence rule undefined.** Elise said "daily or weekly, depending on volume" — needs an actual threshold (e.g. daily if N attributes changed since last report, else weekly) rather than a fixed cron with no adaptivity.

## Proposed shape (for review, not yet built)

1. **Scheduled job** (`dppPriorityReportJob`, cron), one run per active DPP tenant:
   - Reads `dppProducts` + `dppSuppliers` (+ the new cluster-responsibility field once it exists) for that tenant.
   - Computes priority ranking (deadline proximity + blocking-cluster severity — same logic Elara already applies conversationally, made deterministic).
   - Determines "what's missing" per product from cluster completion state.
2. **Report delivery** — lands as a canvas/Advisory Report entry + a proactive digest note (matching `generateDailyDigest`'s existing delivery pattern), not just chat output that scrolls away.
3. **Per-supplier email drafting — one model call per supplier, not one call for all of them.** This is the direct fix for today's failure: the job loops and drafts each email as its own step, attaches the Excel template via `generate_document`, and writes each draft to the new pending-review queue. Sequencing this in job code (not asking one prompt to do all of it) is what makes this actually reliable at N suppliers, not just at 1.
4. **Review surface** — Elise (or any tenant admin) opens "Pending Supplier Requests," edits/approves/sends per email. Nothing sends automatically.
5. **Cadence** — start with weekly default; add the volume-based daily escalation once there's real usage data to set a sane threshold (don't guess a number today).

## Open decisions needing Elise/Sean's sign-off

- Where exactly does "Pending Supplier Requests" live in the UI — new tab on this worker's canvas, or a cross-worker "Approvals" surface (accounting already has one: `Approvals` tab)?
- Supplier contact field: does Elise already have real supplier emails to seed, or does this need a data-collection step first?
- Cluster-to-supplier responsibility: confirm the mapping model before building it into the schema — get this wrong and the automated report tells the wrong supplier to do the wrong thing.
- Whitepaper/RAAS-documentation work (real-time regulatory webhook-fed compliance rules for the DPP domain) is being scoped separately as CODEX S52.51 — related, but a distinct piece of work from this report/email pipeline.
