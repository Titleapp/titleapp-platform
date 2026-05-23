# SOCIII Patent Filing Cycle — Sun 2026-05-24

**Pivot 2026-05-22 (Friday):** Sean reprioritized the filing slate based on fundraise relevance. The two filings with direct investor-pitch impact (Audit Trail + Knowledge Capture Pipeline) move to this weekend. The three application-specific filings (AI Escrow Locker + Title and Property Assurance + RAAS Multi-Tier) move to June alongside Build-Without-Code.

Two provisional patent applications targeting USPTO filing on Sunday, May 24, 2026 via EFS-Web. Total filing fee at small entity status: **$240** ($120 × 2).

---

## The Two Filings (This Weekend)

### Filing 1 — Identity-Anchored Hash-Chain Audit Trail
**Title:** Identity-Anchored Hash-Chain Audit Trail System with Version-Pinned Rule-Set Provenance, Confidential Off-Chain Payload Retention, and Chain-Agnostic Anchoring for AI-Powered Governance Decisions
**Base:** Net-new draft (audit-trail architecture extracted from the broader system into a standalone filing)
**Why this weekend:** The audit-trail architecture is the verifiable-governance moat institutional investors care about. Without it, AI-driven compliance is "vibes-based" and regulated buyers cannot rely on it. With it, SOCIII has IP protection on the specific architecture making AI-mediated decisions auditable in regulated industries.
**Scope:** Hash-on-chain + payload-off-chain split, version-pinning of rule sets, identity anchoring, chain-agnostic operation (Base, Ethereum, Polygon, Solana, Avalanche, permissioned), authorized hash-keyed audit retrieval, defensive longevity beyond platform lifecycle. Cross-industry: healthcare, financial services, real estate, aviation, government contracting, education.

### Filing 2 — Knowledge Capture Pipeline
**Title:** Knowledge Capture Pipeline for Converting Human Expert Conversations into Governed AI-Powered Digital Workers with Structured Rule Extraction, Worker Fixture Generation, and Terminal Worker Safety Architecture
**Base:** Net-new draft based on the architecture previously disclosed as CODEX 51.4 (~2026-05-19) — grace period under 35 USC 102(b)(1) remains open
**Why this weekend:** The compounding-data-moat patent. Institutional investors look for "what gets harder for a competitor over time" — the accumulated rule registry and worker fixture library this pipeline produces is that moat. Without this filing, the moat is undefended IP; with it, the moat has structural protection.
**Scope:** Three ingestion jobs (Codex Ingestion, Rule Extraction, Worker Fixture Capture) + Terminal Worker safety architecture (talk-to-AI / cannot-harm-code / policy-gated approval) + compounding-effects pattern. Reference embodiment: the Patent Worker (helps users identify patentable inventions, draft applications, manage families — itself produced by capturing Sean's expertise during this filing cycle).

---

## Deferred to June (Four Filings, Additional $480 fees)

Located in `docs/patents/2026-06-deferred/`. Drafts already complete from the Thursday/Friday session, ready for filing as soon as the next funding tranche arrives.

- **Filing A** — AI Escrow Locker (refile of Feb 2025 draft with 2026 platform deltas)
- **Filing B** — Title and Property Assurance (refile of Feb 2025 draft with 2026 deltas)
- **Filing C** — RAAS Multi-Tier Composable Rule System (net-new, structural moat for the rule architecture)
- **Filing D** — Build-Without-Code Worker Authoring (accessibility moat — not yet drafted)

Why these are deferred: they protect specific applications and architectural patterns that build on top of the Audit Trail + Knowledge Capture foundations. The two foundational patents must land first; the application patents follow naturally. Investors evaluating SOCIII this week will care about Audit Trail (governance) and Knowledge Capture (data moat); the application patents matter at later due-diligence stages.

---

## Prior Art Strategy (Unchanged)

All filings — both this weekend's and the deferred June batch — cite the same prior art using the canonical "continuous invention thread" Background paragraph:

- **U.S. Patent Application No. 18/398,973** (Combs, Dec 2023; abandoned; published as prior art ~June 2025) — foundational parent-child DTC architecture, multi-sig escrow
- **December 2024 Blockchain Logbook System filing** (Combs) — parent-child architecture extended to dynamically-updatable logbook records

The new filings claim **system-level composition** that extends rather than reclaims those primitives. The prior art is now public domain; anyone can use the parent-child DTC architecture in isolation. The new filings protect the composed systems built on top.

**Grace period:** Closes approximately 2026-06-28. Filing May 24, 2026 keeps these new claims well within the grace period.

---

## Filing Mechanics

**Applicant:** SOCIII Inc., a Delaware C-corporation.
**Named Inventor:** Sean Lee Combs (sole inventor on all filings).
**Inventor address:** [SOCIII business address; same as on SS-4 / Atlas formation docs]
**Small entity status:** Yes.
**Filing fee per provisional:** $120 (small entity).
**Total fees this weekend:** $240.

**Submission method:** USPTO EFS-Web (electronic filing system). Sean's USPTO.gov account.

**Required documents per filing:**
1. The provisional specification (Markdown drafts → convert to PDF before filing)
2. Drawings (to be created; placeholder figure references in current drafts)
3. Cover sheet (USPTO Form SB/16 or equivalent)
4. Fee transmittal
5. IP Assignment from Sean to SOCIII Inc. (executed; references SOCIII Inc. as applicant)

**Filing receipt:** USPTO returns an electronic filing receipt with the application number. Store filing receipts in `docs/patents/2026-05-24/receipts/` after filing.

---

## Calendar Alerts (Required)

- **2026-05-24:** Filing day. Block 4-6 hours for final review, PDF conversion, drawing finalization, and submission.
- **2026-06-28:** Grace period closes on prior 2023 disclosures. Both new filings already submitted by this date — no further action required, but worth confirming filing receipts on file.
- **2027-04-24:** Conversion prep window opens (60 days before conversion deadline). Begin drafting full nonprovisional applications for Filings 1 and 2.
- **2027-05-24:** **12-month conversion deadline.** Provisional applications must be converted to nonprovisional applications OR PCT applications by this date. **Failure to convert causes lapse with no recovery.**

Set Google Calendar alerts for all four dates with 30-day, 14-day, and 3-day reminders.

For the deferred June batch, set conversion alerts ~12 months after the June filing date.

---

## Pre-Filing Review Checklist

For each filing, Sean should verify:

- [ ] Title accurate and broad enough to support full scope
- [ ] All Background citations factually correct (application numbers, dates)
- [ ] Summary of Invention captures all the novel elements claimed
- [ ] Detailed Description includes enabling disclosure (someone skilled in the art can implement)
- [ ] Drawings list complete; figures will be created and attached
- [ ] Claims numbered and structured (independent + dependent)
- [ ] Abstract under 150 words (USPTO requirement)
- [ ] Inventor and applicant info correct
- [ ] No PII or confidential business info accidentally included
- [ ] IP Assignment from Sean → SOCIII Inc. is in place

For Filing 2 specifically:
- [ ] Confirm CODEX 51.4 publication date for accurate grace-period reference
- [ ] Confirm Patent Worker reference embodiment is accurate to current plans (per Sean's directive 2026-05-22, this worker will be built post-launch)

---

## File Manifest

```
docs/patents/2026-05-24/  (filing this weekend)
├── README.md (this file)
├── Filing-1-Audit-Trail-Provisional.md (~3500 words)
└── Filing-2-Knowledge-Capture-Pipeline-Provisional.md (~3500 words)

docs/patents/2026-06-deferred/  (deferred June batch)
├── Filing-A-AI-Escrow-Locker-Provisional.md (~3500 words, ready)
├── Filing-B-Title-and-Property-Assurance-Provisional.md (~3500 words, ready)
└── Filing-C-RAAS-Multi-Tier-Composable-Rules-Provisional.md (~3800 words, ready)

(Filing D — Build-Without-Code — to be drafted before June filing)
```

Five drafts total ready. Two filing Sunday, three already-drafted and waiting on the June check, fourth to be drafted before June filing day.

---

*This README reflects the 2026-05-22 (Friday) pivot. See `docs/specs/CODEX-51.10-Day-Snapshot-2026-05-21-22.md` for the day-level shipping context.*
