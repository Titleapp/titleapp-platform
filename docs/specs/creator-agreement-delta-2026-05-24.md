# Creator Agreement — 3-Month Delta Surface

**Source document:** `apps/business/public/legal/creator-agreement.pdf` — Version 1.0, effective 2026-03-08 (11 weeks old)
**Surfaced by:** Claude, 2026-05-24 evening (Sean asked for delta review, explicitly said not to unilaterally rewrite legal text)
**Purpose:** List every clause that needs review against current state, with proposed direction. Sean reviews with counsel before any text changes ship.

---

## A. Required updates (everything below MUST change before next signing)

### A1. Entity, address, contact — all stale

| Current text | Required change |
|---|---|
| `The Title App LLC, a Delaware limited liability company` | `SOCIII, Inc., a Delaware corporation` |
| `1209 N Orange St, Wilmington, DE 19801` (Stripe Atlas registered agent address from formation) | `1810 E Sahara Ave STE 75942, Las Vegas, NV 89104` (per `docs/company/SOCIII-Inc-Details.md`) |
| `legal@titleapp.ai` | `legal@sociii.ai` |
| `titleapp.ai` references throughout | `sociii.ai` throughout |

### A2. Branding strings

- `TitleApp` / `TitleApp AI` → `SOCIII` (consumer-facing brand)
- `TitleApp Catalog` → `SOCIII Catalog`
- `Alex recommendation engine` reference in §5.4 — Alex is still Alex, but the surrounding language should re-anchor to SOCIII.
- Section 4.3 regulated-vertical list (Healthcare/HIPAA, Aviation/FAA, Financial, Legal) — fine to keep, but verify each surface in the current SOCIII catalog uses the corresponding addendum.

### A3. Governing law (no change needed — confirm)

Delaware governing law + Wilmington AAA arbitration was correct under TitleApp LLC. SOCIII Inc. is also a Delaware corporation formed via Stripe Atlas — Delaware governing law stays. **No change.** (Counsel should confirm "the venue" given the move from LLC to Inc., but this is administrative.)

---

## B. New material that wasn't in the v1 agreement

Per CODEX 51.13 (advisor deck iteration) + Sean's instructions today, the v2 agreement needs these new sections:

### B1. Creator Warrants Program — NEW SECTION

CODEX 51.13: *"Creator path is now warrants tracked separately from advisor equity, not an additional equity slot."*

This means creators get **cash economics** (the existing 75% subscription share + 20% inference share) **plus** separate warrants when their workers cross performance thresholds. The warrants live outside the cap table proper, in a tracked program.

**Proposed direction (for counsel to draft):**
- New §6.7 "Creator Warrants Program" describing:
  - Warrant qualification thresholds (per-worker revenue milestones, or aggregate creator earnings)
  - Strike price (post-money valuation at time of qualification)
  - Warrant size formula (e.g., warrant for 0.01% of company per $10K creator earnings, capped at X%)
  - Vesting (probably 4-year monthly with 1-year cliff to match employee equity)
  - Treatment on acquisition / IPO
- Counsel should structure this so it doesn't create securities-registration exposure for creators receiving warrants.

### B2. HOMDAO Legacy Creator Carve-Out — NEW SECTION

Sean today: *"creators outside of HOMDAO need to pay the $2 for the ID check, generally as part of their annual creator license fee."*

Implication: HOMDAO contributors get different terms.

**Proposed direction:**
- New §3.4 "Legacy HOMDAO Creators" defining:
  - Who qualifies (pHOM holders pre-formation; reference Pre-Formation-Creditor-Warrants-Memo for the canonical list)
  - License fee: $0 (instead of $49/yr)
  - ID verification fee: $0 (SOCIII absorbs)
  - Receive warrants under the Pre-Formation-Creditor-Warrants schedule, not the standard B1 program
- Sunset clause: HOMDAO carve-out closes 24 months after SOCIII formation (2028-05-19) — after that, legacy creators move to standard terms with their warrant grants vesting per their original schedule.

### B3. Stripe Identity ID-only Fee — NEW SECTION OR CLARIFY §3.2

§3.2 currently says creators must complete Stripe Connect Express + Stripe Tax. Per today's decision:

- **Investors + advisors:** SOCIII absorbs the Stripe Identity $1.50/session cost
- **Creators (non-HOMDAO):** $2 ID fee charged to creator (bundled with $49 annual license)
- **Creators (HOMDAO pHOM holders):** $0 (per B2)

**Proposed direction:**
- New §3.2.a "Identity Verification" clarifying:
  - Creators pay a one-time $2 identity verification fee at the time of signing the Creator Agreement (waived for Legacy HOMDAO Creators)
  - SOCIII performs identity verification via Stripe Identity (not Persona/Jumio per Phase 1 decision)
  - Failure to complete identity verification within 30 days of signing voids the Creator License

### B4. Worker Forking Revenue Split — NEW SECTION

`pricing.js` declares `creatorParentForkSharePct: 0.30` ("when a Creator-authored worker is forked, 30% of share goes to the immediate parent, 70% to current forker"). This is canonical in code but not in the legal agreement.

**Proposed direction:**
- New §6.1.a "Forked Workers" explaining:
  - When a creator forks an existing creator-authored worker, the creator-share of revenue from the fork is split: 30% to the parent creator, 70% to the forker
  - Multi-level forks attribute only the immediate parent (no upstream chain)
  - The platform fee (25%) remains unchanged

### B5. Data Pass-Through Fees + Audit Trail Fees Not Shared

Current §6 only addresses subscription + inference overage. The platform also earns:
- **Data pass-through fees** (`pricing.js: dataFeeMarkupMultiplier = 2.0`) — actual cost × 2
- **Audit trail fees** (`auditTrailFeePerRecord = 0.005`) — $0.005/blockchain record

Neither is shared with creators today. Whether this is the intended design or an oversight is a Sean decision.

**Proposed direction (Sean to decide):**
- Option 1 (status quo): add explicit §6.8 stating "Data Pass-Through Fees and Audit Trail Fees are platform revenue and not subject to creator revenue share."
- Option 2: extend creator share to these revenue lines at a lower percentage (e.g., 10% to creator on data markup margin), to align incentives toward creators whose workers drive high data usage.

---

## C. Wording-level fixes (not material; can batch)

### C1. "Four-tier rules stack" (§2 RAAS Rules definition)

`CLAUDE.md` describes a three-level hierarchy: Level 0 (AI style guide) / Level 1 (Core behavioral rules) / Level 2 (Vertical baselines). The phrase "four-tier rules stack" in the agreement may be implicitly counting Tier 0 (platform safety, mentioned in §4.2) + Levels 0/1/2 = 4 tiers total — but it's confusing and unsupported by current docs.

**Proposed fix:** rewrite §2 RAAS Rules definition to say "the rules hierarchy comprising Tier 0 platform safety rules and Levels 0–2 (AI style, core behavioral, vertical baseline) configured under your Worker."

### C2. §10.3 BAA reference

§10.3 lists "breach of a BAA" as grounds for immediate termination. BAA isn't defined elsewhere in the agreement. Either add to §2 Definitions or change to "breach of the Business Associate Agreement (where applicable)."

### C3. §6.6 chargebacks (no change needed — flag)

Refund/chargeback clawback logic is consistent with how `pricing.js` Refund Walkback is wired (CODEX 50.5 Pass 3, validated by Test 5). **No change.** Just confirming counsel reads this in light of how the codebase actually implements it.

---

## D. Things to ask counsel

1. **Securities exposure on creator warrants.** B1 above needs counsel to confirm the warrant structure stays out of securities-registration triggers (e.g., Reg D 506(b) caps on non-accredited holders, integration with the simultaneous SAFE round, Rule 701 if applicable).
2. **HOMDAO carve-out fairness.** B2 creates two tiers of creators. Counsel should pressure-test for any discrimination/fair-dealing exposure.
3. **Cross-border creator tax.** §6.5 says non-US creators handle their own tax. Worth confirming this still works for creators in EU (DAC7 reporting), UK, India under the new SOCIII Inc. entity.
4. **Class action waiver enforceability.** §11 has a class action waiver, which has been increasingly challenged by state attorneys general (CA, NY in particular). Worth a check that current language is enforceable.

---

## E. Implementation note for Phase 3 of the IR Worker

Phase 3 (Creator flow) per the IR roadmap depends on this delta landing. The Dropbox Sign template for the creator agreement cannot be uploaded (task #278) until the v2 text is approved. Phase 3 cannot ship Creator signing flow without it.

**Suggested order:**

1. Sean reviews this delta surface
2. Sean approves direction on B1 / B2 / B3 / B4 / B5 (the substantive new sections)
3. Counsel drafts the v2 text against the approved direction
4. Sean uploads v2 PDF to Dropbox Sign + sets `DROPBOX_SIGN_TEMPLATE_CREATOR_AGREEMENT` env var
5. IR Worker Phase 3 can build against the live template

If Sean wants Phase 3 to ship before counsel turns the v2, the alternative is to use the v1 PDF as-is for Storyhouse-week creator signings — and run a forced re-execution of v2 once it's approved (every creator re-signs). This is a worse experience but unblocks the launch.

---

*This is a delta surface, not legal text. Every line under §A, §B, §C should be reviewed by counsel before it ships in a v2 agreement. Sean's direction governs the substantive choices in §B and §D.*
