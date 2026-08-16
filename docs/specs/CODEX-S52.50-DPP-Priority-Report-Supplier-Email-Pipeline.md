# CODEX S52.50 — DPP Priority Report + Supplier Email Pipeline (Scope Only — Not Yet Built)

**Status:** SCOPED (2026-08-15), not built. Written up live during a DPP demo session with Elise, at Sean's request, as a follow-up build rather than something to force into today's demo.
**Author:** Sean Lee Combs + Elise + Claude Code
**Predecessor:** none directly — this is a new EU DPP-suite capability, adjacent to CODEX-S52.48/49's Back of House RAAS/tool-loop work but a different vertical (EU battery-passport compliance, not accounting/HR/marketing/contacts/IR).

---

## Why this exists

Live in the DPP demo, Elise asked Elara (DPP Compliance Tracker) for three things in one message: a priority report (highest-priority products, what data is missing, who should supply it), draft follow-up emails to each responsible supplier, and a fillable Excel template attached to each email. The request failed server-side (`jsonError(res, 500, "Chat engine failed")`).

Diagnosis, confirmed live: basic chat to the same worker succeeded instantly, and asking for **one** supplier email on its own also succeeded (in Dutch, matching the conversation). So this isn't a regression. **What wasn't isolated**: only the two endpoints were tested (trivial message; single email) — report-generation alone, document-generation alone, and a 2-email case were never tried separately, so "report + doc-gen + N emails in one turn is too much" is the most likely explanation for where it broke, not a confirmed isolation of which specific combination trips the limit.

Worth being precise about the mechanism, since it's a different failure shape from S52.48/49's accounting problem even though both are "single-shot chat can't do multi-step work": accounting's issue was the model needing multiple **tool round-trips to fetch grounded data** before it could answer correctly (a grounding/verification gap, fixed by the tool loop in S52.49). This failure looks more like an **output-volume/timeout gap** — one turn asked to produce a report plus N generated documents plus N drafted artifacts, independent of any data-fetching need. Related family of problem ("cram multi-step work into one chat turn"), not the same mechanism — which is also why the fix here is correctly "move it out of chat into a scheduled job" rather than "add a tool loop."

Elise's original framing was already the right shape for this: not a chat prompt, a **scheduled job**. This CODEX scopes that job.

## What already exists to build on

- **`dppProducts`, `dppSuppliers`, `dppRegistryStatus`, `dppFleet` collections** (`functions/functions/scripts/demo/seedDppDemo.js`) — real schema, not hypothetical. Products carry `sku`, `category`, `overallPct`, `passportStatus`. Suppliers carry `name`, `language`, `status`, `products: [sku,...]`, `certExpiry` — supplier-to-product linkage already exists (e.g. "Hanam Cell Corp." → `VLT-IND24`, `VLT-IND48`).
- **Scheduled-job pattern already in this codebase, precedent double-checked (correcting an earlier draft of this doc)**: `generateDailyDigest` itself is actually **single-scope** — it takes no parameters and reads fixed platform-level collections (`accounting/summary`, etc.), not a per-tenant fan-out. The real precedent for "one cron run, loop over every relevant record across tenants" is `checkTrialExpiry` (`services/workerTrial.js`): it queries `subscriptions` across the whole platform with a `where` filter and loops over every matching doc. That's the shape this job should follow — a single scheduled run querying `dppProducts`/`dppSuppliers` across all DPP tenants and looping, not "one function invocation per tenant." Proactive delivery into somewhere the user checks (Operating Feed / digest) rather than only-in-response-to-chat is still the right delivery precedent, matching `generateDailyDigest`'s and `cosWorkerMorningRun`'s output side even though their tenant-scoping doesn't apply.
- **`generate_document` tool** — already produces Word/Excel/PowerPoint documents (used elsewhere for accounting/marketing deliverables); the Excel-template-attachment piece doesn't need new document-generation infrastructure, just a DPP-specific template shape.
- **Explicit-approval-gate principle** (already platform-wide, `docs/PRODUCT.md`/CLAUDE.md: "Agents propose; users confirm") — matches exactly what Elise asked for ("I can then check and send out these emails"). Drafts, never auto-sends.
- **Regulatory ingest pipeline** (`services/compliance/regulatoryIngest/`, `regulatoryIngestDaily` cron) — flagged in S52.48's audit as "live ingestion, zero consumers" (SEC EDGAR/Federal Register/CFPB adapters). Sean's separate ask (real-time regulatory-source webhooks feeding the RAAS rules content, given how dynamic EU battery regulation is) is a natural extension of this *existing* pipeline with EU sources (EUR-Lex, European Commission battery regulation updates) added as adapters — feeds the **RAAS module content** (S52.51, tracked separately), not this report job directly.

## What's missing — real gaps, not assumptions

- **No supplier email address anywhere in the schema.** `dppSuppliers` has `name`/`language`/`status`/`products`/`certExpiry` — nothing to send to. Drafting a real email needs a contact field added.
- **No cluster-level responsibility mapping.** Supplier→product linkage exists, but "which supplier owns Cluster 3 (Carbon Footprint/LCA) vs Clusters 4-5 (Supply Chain Due Diligence)" for a given SKU isn't modeled — today Elara infers this conversationally. A real pipeline needs this as structured data, not inference, so the job can loop over it deterministically instead of re-deriving it via a model call every run.
- **No "pending drafts" surface for Elise to review before sending.** Right now a drafted email is just chat output. Needs a real inbox/queue view (a "Pending Supplier Requests" tab on the DPP Compliance Tracker canvas, parallel to Dashboard/Passport Builder/Timeline/Client File/Advisory Reports) where drafts land, get reviewed, edited if needed, and approved to send — not scrolled past in chat history.
- **Cadence rule undefined.** Elise said "daily or weekly, depending on volume" — needs an actual threshold (e.g. daily if N attributes changed since last report, else weekly) rather than a fixed cron with no adaptivity.

## Proposed shape (for review, not yet built)

1. **Scheduled job** (`dppPriorityReportJob`, cron), single run querying across all active DPP tenants (`checkTrialExpiry` shape, not `generateDailyDigest` shape):
   - Reads `dppProducts` + `dppSuppliers` (+ the new cluster-responsibility field once it exists), grouped by tenant.
   - Computes priority ranking per product — **proposed default, not yet a confirmed algorithm**: deadline proximity + blocking-cluster severity, weighted and tie-broken TBD. This is currently logic Elara applies conversationally with no stated weights; getting it wrong has the same "tells the wrong supplier the wrong thing" consequence as the cluster-mapping gap below, so it belongs in sign-off, not assumed.
   - Determines "what's missing" per product from cluster completion state.
2. **Report delivery** — lands as a canvas/Advisory Report entry + a proactive digest note (matching `generateDailyDigest`'s and `cosWorkerMorningRun`'s delivery pattern — output side only, not their tenant-scoping), not just chat output that scrolls away.
3. **Per-supplier email drafting — one model call per supplier, not one call for all of them.** This is the direct fix for today's failure: the job loops and drafts each email as its own step, attaches the Excel template via `generate_document`, and writes each draft to the new pending-review queue. Sequencing this in job code (not asking one prompt to do all of it) is what makes this actually reliable at N suppliers, not just at 1.
4. **Review surface** — Elise (or any tenant admin) opens "Pending Supplier Requests," edits/approves/sends per email. Nothing sends automatically.
5. **Cadence — proposed default, not yet a confirmed rule**: weekly, with a volume-based daily escalation added once there's real usage data to set a sane threshold. Moved to sign-off below rather than stated as decided.

## Open decisions needing Elise/Sean's sign-off

- Where exactly does "Pending Supplier Requests" live in the UI — new tab on this worker's canvas, or a cross-worker "Approvals" surface (accounting already has one: `Approvals` tab)?
- Supplier contact field: does Elise already have real supplier emails to seed, or does this need a data-collection step first?
- Cluster-to-supplier responsibility: confirm the mapping model before building it into the schema — get this wrong and the automated report tells the wrong supplier to do the wrong thing.
- **Priority-ranking formula** (weights/thresholds/tie-break for deadline proximity vs. blocking-cluster severity) — currently a proposed default above, needs explicit confirmation before build, not an assumed carry-over from how Elara reasons conversationally.
- **Cadence rule** — weekly-default-plus-volume-escalation is a proposed default above, not a decision; needs the same confirmation, plus a real threshold number once usage data exists.
- How many DPP tenants actually exist today, to sanity-check the `checkTrialExpiry`-style cross-tenant query shape at the scale this really needs (low risk at demo scale, worth a one-line check before this becomes a build item).
- Whitepaper/RAAS-documentation work (real-time regulatory webhook-fed compliance rules for the DPP domain) is being scoped separately as CODEX S52.51 — related, but a distinct piece of work from this report/email pipeline.
