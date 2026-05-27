# CODEX 51.19 — EOD Record (2026-05-26 IR Signing Live + SOCIII Accounting Seed)

**Window:** 2026-05-26 ~07:00 PT through ~22:30 HST
**Predecessor:** CODEX 51.18 (SOCIII MVP signup + brand finalization + doc pack)
**Successor:** TBD
**Commit prefix:** S51.19

---

## Executive summary

A "make Kent able to sign tomorrow" sprint. The day fell into four arcs:

1. **IR Worker Phase 1 — Advisor signing flow proven end-to-end via Dropbox Sign.** Multi-template signatureService now covers 4 roles (Investor SAFE / Advisor / Creator / NDA), all with a Company countersigner pattern. Smoke test renders cleanly with all 7 merge fields populated.
2. **Legal template suite assembled and cleaned** — NDA · Post-Money SAFE · Advisor Agreement · CEO Employment Agreement, all in `docs/legal-templates/` as both `.md` source and `.docx` render. Sender-side variant with blank lines (vs. Mustache placeholders) replaces the original templates in Dropbox Sign.
3. **SOCIII Accounting FY26 seeded** — pre-funding active burn ($3,730/mo) + post-funding target ($38,333/mo) + 3 founder loan agreements (Rosenberg $100K · Dunn $15K · Gibson $10K, all 4% annual) + 7 customObligations (quarterly interest + Oct decision-review checkpoint).
4. **CEO Employment structure locked** — W-2 employee, $1 → $150K → $175K → $200K trigger ladder, 3-year CEO Term, 18-month severance, 100% double-trigger CoC acceleration, narrow Cause definition, medevac flying carve-out, anywhere-remote permitted, 4-year founder vesting with 18-month pre-formation credit.

Also: Staff.jsx large refactor, CommandCenter polish, Accounting CoA + obligations cleanup, chatEngine + Alex prompt tweaks, AddWorkspaceWizard improvements.

---

## Section A — IR Phase 1 Advisor Signing Flow (the main arc)

### A.1 signatureService extended to 4 roles + Company countersigner

**File:** `functions/functions/services/signatureService/index.js`

Added `COMPANY_SIGNER` constant (Sean as default, env-overridable). Extended `ROLE_TEMPLATE_ENV` from 3 to 4 roles:

```js
const ROLE_TEMPLATE_ENV = {
  investor: { signerRole: "Investor",     companyRole: "Company",  docType: "safe_agreement",    title: "SOCIII SAFE Agreement" },
  advisor:  { signerRole: "Advisor",      companyRole: "Company",  docType: "advisor_warrant",   title: "SOCIII Advisor Agreement" },
  creator:  { signerRole: "Creator",      companyRole: "Platform", docType: "creator_agreement", title: "SOCIII Creator Platform Agreement" },
  nda:      { signerRole: "Counterparty", companyRole: "Company",  docType: "mutual_nda",        title: "SOCIII Mutual NDA" },
};
```

Each packet now sends TWO signers (recipient + SOCIII Company countersigner). Note: role names are case-sensitive in Dropbox Sign and must match the template exactly — title case after iteration (initial uppercase attempt failed with "No recipients specified").

`_buildCustomFields(role)` updated for advisor to use `advisor_address` + `equity_pct` + `vesting_months` + `cliff_months` (replacing earlier `warrant_shares` + `strike_price`).

### A.2 Smoke test script — env-overridable for any recipient

**File:** `scripts/smokeTestSafeSigning.js`

Recipient name + email + cliff months + vesting months are now env-overridable (`SMOKE_RECIPIENT_EMAIL` · `SMOKE_RECIPIENT_NAME` · `SMOKE_CLIFF_MONTHS` · `SMOKE_VESTING_MONTHS` · `SMOKE_EQUITY_PCT` · `SMOKE_ADVISOR_ADDRESS`). Defaults remain investor SAFE with test recipient = Sean.

Usage:
```bash
ROLE=advisor \
SMOKE_RECIPIENT_EMAIL=kent.redwine@gmail.com \
SMOKE_RECIPIENT_NAME="Kent Redwine" \
SMOKE_CLIFF_MONTHS=6 \
node scripts/smokeTestSafeSigning.js
```

### A.3 Dropbox Sign template iteration

Three templates uploaded to Dropbox Sign and field-placement debugged through API error messages (most useful diagnostic: `curl -u $HELLOSIGN_API_KEY: https://api.hellosign.com/v3/template/{id} | jq '.template.custom_fields'`):

| Template | Template ID | State |
|---|---|---|
| NDA | `e0c73be8a66bd98712a61d0d407c848afea9a666` | Built, fields placed — needs sender-side .docx re-upload tomorrow |
| Post-Money SAFE | `a449d959c7fad977625e56c19b5e33400cefd459` | Built, fields placed — needs sender-side .docx re-upload tomorrow |
| Advisor Agreement | `4f91885c2c5d2b5ac5d3c0997f9ef68d9787ccab` | **LIVE — smoke test green, sender-side .docx + all 7 fields rendering clean** |

Firebase secret `DROPBOX_SIGN_TEMPLATE_ADVISOR_WARRANT` updated to version 3. Production Cloud Run still on stale version + uppercase roles — **needs redeploy tomorrow before IR worker UI works in prod**.

### A.4 The "double layers of text" bug + sender-side .docx fix

**Root cause:** Original .docx renders from markdown kept the literal `{{agreement_date}}` etc. as visible static text in the PDF. Dropbox Sign merge fields fill OVER but don't replace, producing visible double layers.

**Fix:** Regenerated source .docx with blank underscore lines (24-40 char widths) replacing every Mustache placeholder. Re-uploaded as the Advisor template document. Merge fields drop on the blanks — no underlying text bleeds through.

Pattern documented for tomorrow's NDA + SAFE re-do.

### A.5 Field-width gotcha

Dropbox Sign rejects custom_field values longer than the field's pixel width. `seanlcombs@gmail.com` (20 chars) failed in a 15-char-wide field. Fix: drag right edge of field wider in template editor.

### A.6 Live send blocker discovered

Sean's Dropbox Sign **Standard plan ($30/mo)** covers multi-signer templates in the web app, but the **API** requires a separate paid tier to leave test_mode. Live API send to Kent blocked tonight. **Path forward:** either upgrade API plan, or Sean fires from web app manually (~30 sec — template is ready, just hit "Use Template" → enter Kent's data → Send).

---

## Section B — Legal Template Suite

**Directory:** `docs/legal-templates/`

New canonical sources (all .md → .docx via `pandoc`):

| Template | Purpose |
|---|---|
| `SOCIII-Mutual-NDA.md` | 2-year term, 5-year survival, Delaware governing law |
| `SOCIII-Post-Money-SAFE.md` | Y Combinator post-money template adapted for SOCIII |
| `SOCIII-Advisor-Agreement.md` | FAST v2 baseline + Worker-Linked Equity Bonus (Section 4): 0.5%/worker, cap 2.5%, board approval required |
| `SOCIII-CEO-Employment-Agreement.md` | See Section D for full structure |

Also: a sender-side variant (`SOCIII-Advisor-Agreement-sender.docx` in `~/Downloads/`) with blank-underline placeholders for Dropbox Sign upload. Same approach to be applied to NDA + SAFE tomorrow.

---

## Section C — SOCIII Accounting FY26 Seed

**Script:** `scripts/seedSociiiAccountingFy2026.js` (created + executed)

Wrote into Firestore for `tenants/ws_1779846027006_hc71aw`:

**`forwardBudgets` (2 docs):**
- Pre-funding active: $44,760 annualized ($3,730/mo) — covers Stripe Atlas filing recovery, Gusto, Mercury fees, software stack
- Post-funding target: $460,000/yr ($38,333/mo) — Sean W-2 $150K, advisor equity overhead, planned hires triggered by raise close

**`loanAgreements` (3 docs, all 4% annual, quarterly interest):**
- Robert Rosenberg $100K — handshake formalization, personal guaranty, transfers from TitleApp LLC to SOCIII at LLC wind-down. **ONLY loan allowable on SOCIII books at formation.**
- Chris Dunn $15K — SaoViet ICPD bridge to HOM DAO Foundation, originally Jan 2024 / 180-day / 10% with +30K PHOM coverage. Decision still pending.
- Michael Gibson $10K — HOM holder wallet position. Decision still pending.

**`customObligations` (7 docs):**
- Q1/Q2/Q3 2026 interest payments on each of 3 loans
- October 2026 decision-review checkpoint (re-evaluate Dunn + Gibson terms post-raise visibility)

---

## Section D — CEO Employment Agreement Structure Locked

**File:** `docs/legal-templates/SOCIII-CEO-Employment-Agreement.md`

Key terms decided during the session:

| Term | Value | Rationale |
|---|---|---|
| Status | W-2 employee | Triggers full benefits + withholding via HR worker |
| Base salary trigger ladder | $1 → $150K → $175K → $200K | Prorates with company stage; $150K kicks in at funding close, $175K at $5M ARR or Series A, $200K at Series B |
| CEO Term | 3 years (2026-05-19 → 2029-05-19) | Long enough to prevent quick founder cut-out; aligns with founder vesting |
| Severance | 18 months | Aggressive but defensible at this stage |
| CoC acceleration | 100% double-trigger | Standard founder protection |
| Cause definition | Narrow — felony fraud/dishonesty, gross willful misconduct, material breach with 90-day cure | Protects against pretextual removal |
| Good Reason | Material reduction in duties/title/comp, relocation >50 miles | Standard |
| Outside activity | Medevac flying explicitly carved out | Sean's existing commitment, non-negotiable |
| Remote | Anywhere with payroll-nexus notification | Sean already lives multi-state |
| Founder vesting | 4-year, 18-month pre-formation credit | 18 months captures TitleApp → SOCIII transition work |
| Benefits | 401(k) 4% safe harbor + $5K/yr education + standard group life/disability | Post-funding only |
| Board removal threshold | 75% supermajority | Founder protection against single-VC takeover |

Sean signs as a one-off (not template) tomorrow.

---

## Section E — Other modifications

The day's diff also includes work across:

- **`apps/business/src/sections/Staff.jsx`** — 810-line refactor (Staff page reorganization for SOCIII advisor/vendor structure)
- **`apps/business/src/sections/CommandCenter.jsx`** — launch-mode section adjustments
- **`apps/business/src/sections/Accounting.jsx`** — minor wiring
- **`apps/business/src/App.jsx`** + **`AddWorkspaceWizard.jsx`** + **`LandingPage.jsx`** + **`MeetAlex.jsx`** — signup/wizard polish
- **`apps/business/src/components/Sidebar.jsx`** — brand label cleanup
- **`functions/functions/chatEngine.js`** — Builder Interview carve-out tone fix continuation
- **`functions/functions/helpers/canvasTabs.js`** — schema additions
- **`functions/functions/index.js`** — route additions
- **`functions/functions/services/accounting/coaTemplates.js`** + **`obligations.js`** — CoA polish
- **`functions/functions/services/alex/prompts/core.js`** — minor prompt tweak
- **`functions/functions/services/signatureService/TEMPLATES.md`** — template documentation update
- **`scripts/seedAccountingSystemPrompt.js`** — seed tweak

New scripts beyond signing:
- `scripts/installSociiiWorkers.js`
- `scripts/patchSociiiCoaCcorp.js`
- `scripts/setupBusinessLawWorker.js`

New hook: `apps/business/src/hooks/useStaff.js`
New spec: `docs/specs/projects/brave-new-world-treatment.md` (literary property — second novel after Hamilton v Che)

---

## Section F — Pending / Tomorrow morning

**Critical path for Kent:**
1. Either Sean sends Advisor packet to Kent from Dropbox Sign web app manually (~30 sec) OR upgrades API plan + we fire via script
2. Heads-up text to Kent before he opens the doc

**Production deploy (blocking IR worker UI in prod):**
3. `firebase deploy --only functions` — picks up signatureService changes (4-role expansion + title-case roles) and the new advisor template GUID secret

**Template clean-up (mirror today's advisor work for NDA + SAFE):**
4. Regenerate NDA sender-side .docx (blank lines instead of `{{...}}`) + re-upload to Dropbox Sign template `e0c73be8...`
5. Same for Post-Money SAFE → template `a449d959...`
6. Smoke test both with HELLOSIGN_TEST_MODE=1

**SOCIII follow-ups:**
7. Port TitleApp contacts (3,179 contacts from `ws_1778652045795_vk4sz1`) → SOCIII tenant
8. HOM warrant candidate list review (72 contributors at $1,000+ cash, $357K total) — Sean to mark cuts
9. HR worker seeding (Sean as employee, 7 advisors)
10. Sean countersigns his own CEO employment agreement (one-off, not template)
11. **83(b) election filing — deadline ~6/18/2026** (RED obligation, time-sensitive)

---

## Decision log captured to memory

- Dropbox Sign API requires separate paid tier from Standard plan ($30/mo) for live (non-test) sends — Sean's current plan covers multi-signer templates in web app only
- Dropbox Sign role names are case-sensitive — Advisor templates settled on title case (Advisor / Company)
- Dropbox Sign merge fields can't fill OVER existing PDF text — source .docx must have blank lines, not Mustache placeholders, to render cleanly
- Custom field values longer than placed field pixel width are rejected — `seanlcombs@gmail.com` (20 chars) needs >15-char field

---

**Compiled by:** Claude · 2026-05-26 22:30 HST
