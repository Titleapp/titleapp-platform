# Texas Title Production Rules
# Path: raas/real-estate/TX/title-production.md
# CODEX: docs/codex/48-title-production-suite.md

Rules governing title search, commitment, defect curation, escrow, and closing for Texas residential and commercial transactions. All rules are enforced by the RAAS engine at runtime; rule IDs are the authoritative reference.

---

## TX-T-001: Append-Only Chain Events

Every fact discovered during a title search MUST be written as an immutable chain event to `titleOrders/{orderId}/events/{eventId}` before the AI may reference or act on it.

**Enforcement:** deterministic — no event means no fact. AI must not assert a fact (lien, judgment, easement, ownership) that has no corresponding pipeline-written chain event with a `sourceRef` pointing to the ATTOM response or county-clerk pull.

**AI carve-out:** `title.defect_logged` events MAY be AI-authored, but ONLY when every fact cited in the defect's `evidence` array already exists as a prior pipeline-written chain event in the same order. AI may NOT write `title.lien_found`, `title.ownership_found`, `title.judgment_found`, or `title.tax_status_found`.

---

## TX-T-002: Texas Non-Attorney State

Texas is a non-attorney closing state. Closings are performed by licensed title agents (not attorneys). The platform MUST NOT render any output that implies attorney review is required for a standard closing.

**Exception:** curative work (TX-T-006) may recommend attorney review for complex title defects (e.g., boundary disputes, heirship affidavits, forgery/fraud).

---

## TX-T-003: Simultaneous Issuance Discount

Texas promulgated rates require a simultaneous issuance discount when both an Owner's Policy and a Lender's Policy are issued in the same transaction.

- Owner's Policy: full promulgated rate from the TDI rate schedule
- Lender's Policy (simultaneous): $100 flat (Texas Insurance Code §2703.161)

**Hard gate:** Commitment Engine may NOT quote a Lender's Policy at the full owner's rate when an Owner's Policy is issued in the same closing. Applies to all TX title transactions regardless of purchase price.

---

## TX-T-004: TDI Rate Schedule Staleness

The TDI promulgated rate schedule in `tdi-rate-schedule.json` carries a `lastVerifiedDate` field.

**WARN if:** `(today - lastVerifiedDate) > 365 days`. Surface a yellow alert: "Rate schedule not verified in 12+ months — confirm with TDI before issuing."

**This is advisory, not blocking** — the premium calculation uses the on-file table regardless. The warn exists to prevent systematic quoting against an outdated schedule.

---

## TX-T-005: Wet Close Default (BLOCKING)

Texas real estate closings are wet close by default. A deed CANNOT be recorded until all required funds are received and cleared.

**Hard gate:** The route `POST /v1/title:closing-record` is blocked unless the sum of all `title.funds_received` chain events ≥ `requiredToCloseCents` on the order, OR a `title.dry_close_authorized` chain event exists in the order (written by an authorized officer with `role: underwriter`).

No AI action, no tool call, no manual override may circumvent this gate. It is enforced at the route level, not the prompt level.

---

## TX-T-006: Curative Work Required Before Commitment

An exception on Schedule B-2 of the title commitment that is categorized as a P0 defect (title failure) MUST have a `cureAction` logged before the Commitment Engine may issue a Final Commitment.

**P0 defects:**
- Deed in chain executed under forged or fraudulent signature
- Adverse possession claim with active lawsuit (lis pendens)
- Federal tax lien (IRS) not released of record
- Unprobated heir interest — seller lacks authority to convey

**Cure gate:** `POST /v1/title:issue-final-commitment` checks for any `title.defect_logged` event with `severity: "P0"` and no corresponding `title.defect_cured` event. If found, returns HTTP 409 with the list of open P0 defects. Not waivable by AI.

---

## TX-T-007: Wire Fraud Prevention — Dual-Channel Verification

Any change to wiring instructions for a closing must be verified via a second out-of-band channel (phone call to a known number — not the number from the email requesting the change).

**Hard gate:** The Escrow Manager route `POST /v1/title:update-wire-instructions` requires a `verificationCallLogId` referencing a `title.wire_verification_call` event logged in the order. No wire instruction change takes effect without this record. Blocks if absent.

---

## TX-T-008: Beneficial Owner Disclosure (JV/Affiliated Opco)

If the title agent's tenant config has `affiliatedOpco: true`, a RESPA-compliant affiliated business disclosure MUST be acknowledged by the buyer before the order may proceed to commitment.

**The disclosure fires from `affiliatedOpco: true` in the tenant config** — NOT from per-order detection logic. Both the RE Advocate (pre-order) and the Title Search worker (order-opened) read the same config flag.

**Append-only:** Acknowledgment is stored as a `title.disclosure_acknowledged` chain event with `{ disclosureType: "affiliated_business", uid, tenantId, orderId, sessionId, acknowledgedAt, disclosureText }`. This is NOT a session flag. It persists forever.

---

## TX-T-009: FIRPTA / 1031 Exchange Flag

If the seller is a non-resident alien, the Commitment Engine MUST surface a FIRPTA withholding notice (15% of gross sales price unless exempted). If either party indicates a 1031 exchange, the Escrow Manager must lock the exchange funds in a segregated account and may not commingle with closing proceeds.

**Advisory — not blocking** at the search stage. Blocking at the escrow-open stage if FIRPTA withholding is due and no Qualified Intermediary agreement exists.

---

## TX-T-010: Survey Exception

Texas title commitments almost always include a survey exception on Schedule B-2 until a current survey is provided. The Commitment Engine MUST:

1. Include the survey exception on the initial Schedule B-2 draft
2. Remove the exception only when a `title.survey_received` chain event exists in the order with a `surveyDate` within 10 years of closing

AI may NOT remove the survey exception on instruction alone — the chain event is required.

---

## Event Type Reference

All events are written to `titleOrders/{orderId}/events/{eventId}`. Immutable after creation.

| Event | Who writes | Notes |
|-------|-----------|-------|
| `title.order_opened` | pipeline | Fired by `POST /v1/title:order` |
| `title.ownership_found` | pipeline | ATTOM ownership + sales history |
| `title.lien_found` | pipeline | ATTOM/DataTree lien + mortgage |
| `title.judgment_found` | pipeline | ATTOM judgment search |
| `title.tax_status_found` | pipeline | County tax status |
| `title.easement_found` | pipeline | ATTOM easement/encumbrance |
| `title.survey_received` | pipeline | Manual upload + metadata |
| `title.defect_logged` | AI (validated) | Requires `evidence[]` → prior pipeline events |
| `title.defect_cured` | pipeline/officer | Requires `cureDocRef` |
| `title.wire_verification_call` | pipeline | Out-of-band wire verification log |
| `title.disclosure_acknowledged` | pipeline | RESPA/affiliated disclosure |
| `title.commitment_issued` | pipeline | Preliminary commitment |
| `title.commitment_finalized` | pipeline | All P0s cured; final commitment |
| `title.funds_received` | pipeline | Wire/cashier's check confirmation |
| `title.dry_close_authorized` | officer | `role: underwriter` required |
| `title.closing_recorded` | pipeline | Deed recorded with county |
| `title.policy_issued` | pipeline | Owner's + Lender's policy |
| `title.order_closed` | pipeline | All disbursements confirmed |

---

## Ownership of This Ruleset

SOCIII Inc owns and versions this ruleset. Licensed operators (title companies, opco affiliates) MAY configure tenant-level parameters (e.g., `affiliatedOpco`, `dryCloseEnabled`) but CANNOT modify rule logic. Rule changes require a SOCIII platform deploy and increment the version number. No tenant admin can silently modify TX-T-001 through TX-T-010.
