# Vendor & Subscription Controller Worker — Specification

**Working name:** Vendor & Subscription Controller (catalog ID provisional: `PLAT-005` if added to the platform spine, or a vertical-specific slug if scoped differently)
**Spec date:** 2026-05-22
**Origin:** Sean's directive — pain point with the manual `~/Downloads/Title App Software Vendors and Costs.xlsx`, a 7-sheet spreadsheet tracking ~40 vendors plus dashboard burn math. Sean's framing: *"In a big organization best case these kind of data is siloed in different departments. For an entrepreneur we just forget and lose the stuff."*
**Target build window:** Post-launch — Week 1-2 of June, after the patent filings and Mercury/Coinbase corporate setup land.
**Spec status:** Draft for review

---

## What This Worker Does

The Vendor & Subscription Controller maintains the canonical inventory of every third-party vendor, subscription, API, and tool the company uses — across software, data feeds, labor, and advertising — and keeps that inventory ACTIVE and CURRENT through automated signal ingestion rather than relying on the founder to remember to update a spreadsheet.

The worker consolidates three roles that are typically siloed in larger organizations:

1. **Dev Manager** — knows what's wired up, what's deprecated, what's in trial, what integration each vendor provides
2. **Controller** — knows what's being paid for, when renewals hit, what's auto-renewing, where budget variance is showing up
3. **Accounting** — knows how each charge categorizes against the Chart of Accounts and which vertical or project bears the cost

For a solo founder, those three roles are the same person (you). For a five-person startup, they're three people who don't talk to each other. For an enterprise, they're three departments with their own tracking systems that don't sync. In every case, the inventory drifts. The worker is the fix.

---

## The Core Value Prop

> *"In a big organization, this kind of data is siloed across IT, Finance, and Operations. For a solo founder, it just gets lost. SOCIII gives the solo founder enterprise-class visibility, and the enterprise team a single source of truth."*

This worker is the proof that SOCIII isn't just "AI for businesses" but specifically "enterprise governance for solo operators" — a framing that institutional investors recognize as a real wedge against generic AI agent platforms.

---

## Data Model

### Vendor Record (Firestore collection: `vendors/{tenantId}/{vendorId}`)

```
{
  vendorId: "venly_v1",                    // stable identifier
  displayName: "Venly",                     // user-facing name
  legalName: "Venly NV",                    // legal name on invoices
  category: "blockchain_minting",           // mapped category (see below)
  status: "off",                             // active | trial | off | cancelled | in_discussion
  purpose: "NFT minting / DTC creation",    // free-text description of what we use it for
  useCases: ["all_dtc"],                    // which platform features depend on this vendor
  integration: {
    type: "api",                            // api | app | sdk | data_feed | manual | hosted_service
    methods: ["api_zap"],                   // api | zapier | direct | shopify_app | manual
    healthCheck: null,                       // optional endpoint or test command
    docsUrl: "https://docs.venly.io",
    consoleUrl: "https://login.venly.io/",
  },
  account: {
    signInEmail: "dev@homdao.io",           // login email (NOT the password)
    passwordRef: "1password:Venly",          // pointer to credential store, NEVER the password itself
    twoFactorMethod: "totp_sean_phone",     // where 2FA codes go
    accountOwner: "Sean",                    // who currently owns this account
  },
  billing: {
    cardOnFile: "TitleApp_Visa_4242",       // payment method identifier
    coaAccount: "62100_software_subscriptions", // Chart of Accounts mapping
    averageMonthlyCost: 0,                   // computed from observed charges
    lastChargeDate: "2025-10-05",
    lastChargeAmount: 0,
    billingCadence: "monthly",               // monthly | annual | per_use | one_time | irregular
    autoRenew: true,
    nextRenewalDate: null,                   // computed for annual contracts
  },
  costAllocation: {
    method: "even_split",                    // single_vertical | even_split | weighted | usage_based
    verticals: ["real_estate", "aviation", "auto", "web3"],
    weights: null,                           // populated if method == weighted
  },
  lifecycle: {
    addedAt: "2024-10-05",                  // when first activated
    addedBy: "sean@titleapp.ai",
    statusChangedAt: "2025-10-05",
    statusChangedBy: "sean@titleapp.ai",
    statusChangedReason: "Replacing with Coinbase CDP — Venly EOL announcement",
    deactivationDate: null,
    cancellationConfirmed: false,
  },
  notes: "(10-5-25) replaced by Coinbase",
  tags: ["replaced", "blockchain", "nft"],
  attachments: [
    { type: "invoice", driveFileId: "abc123", date: "2025-09-15" },
    { type: "contract", driveFileId: "def456", date: "2024-10-05" },
  ],
  auditChainHash: "0xabc...",                // most recent governance event for this vendor
}
```

### Vendor Category Taxonomy (Tier 2 baseline rule)

```
software_dev_tools         (Firebase, Vercel, GitHub, etc.)
software_ops_tools          (Stripe, Mercury, Plaid, etc.)
software_marketing          (Klaviyo, Mailchimp, SendGrid, etc.)
software_design             (Figma, Canva, Adobe, etc.)
software_productivity       (Google Workspace, Microsoft 365, etc.)
software_ai_inference       (OpenAI, Anthropic, Google AI, etc.)
software_communications     (Slack, Twilio, Google Voice, etc.)
software_legal_compliance   (Stripe Identity, Mercury Compliance, etc.)
data_feed_real_estate       (First American, ATTOM Data, etc.)
data_feed_aviation          (FAA NFDC, ForeFlight, etc.)
data_feed_auto              (Bumper, NHTSA, KBB API, etc.)
data_feed_financial         (Plaid, Apollo, etc.)
data_feed_government        (USPTO, SEC EDGAR, OFAC, etc.)
labor_freelance             (Upwork, Fiverr, etc.)
labor_contractor            (specific contractors, agencies)
advertising_paid_search     (Google Ads, Bing Ads)
advertising_paid_social     (Meta, LinkedIn, X)
advertising_paid_video      (YouTube, TikTok)
advertising_referral        (UpPromote, Refersion, etc.)
hosting_infrastructure      (Cloudflare, AWS, GCP, Firebase Hosting, etc.)
hardware_devices            (Tracki devices, Apple devices, etc.)
blockchain_minting          (Venly [EOL], Coinbase CDP, Crossmint, etc.)
notary_signing              (Proof, DocuSign, Dropbox Sign, etc.)
identity_kyc_aml            (Stripe Identity, Persona, Coinbase Verified, etc.)
domains_registrar           (Namecheap, Google Domains, GoDaddy, etc.)
developer_accounts          (Apple Developer, Google Play Console, etc.)
financial_services          (banks, credit cards, payment processors)
insurance_compliance        (cyber insurance, E&O, D&O)
```

These categories map directly to Chart of Accounts entries in the Accounting worker. Adding a new vendor automatically suggests a CoA entry; the user confirms or overrides.

---

## Auto-Ingestion Sources

The worker keeps the inventory current by ingesting signals from connected systems rather than waiting for the user to remember to update.

### 1. Bank/Card Transactions (via Mercury + Stripe FC + Plaid)

Every recurring charge from a bank or card the user has connected to the Accounting worker is candidate signal:
- **New recurring charge** → flag as potential new vendor; surface for categorization
- **Charge amount changed** → flag as variance; surface for explanation (price increase? upgraded plan? added seat?)
- **Charge stopped appearing** → flag as potential cancellation; surface for confirmation
- **Duplicate charges from similar merchants** → flag as potential duplicate subscription (e.g., paying for two competing PDF tools)

### 2. Email Receipts (via Gmail integration, future)

Receipt parsing from `dev@`, `support@`, and `billing@` inboxes (with user consent):
- Welcome emails from new SaaS providers → suggest adding to inventory
- Upcoming renewal notifications → populate `nextRenewalDate`
- Cancellation confirmations → confirm status change
- Price-change announcements → flag for budget update

### 3. Browser Extension (future, low priority)

A browser extension that detects when the user is on a SaaS billing or settings page and offers to auto-capture the vendor details to the inventory. Useful for one-time imports of legacy accounts the founder forgot they had.

### 4. Manual Import

For founders coming from spreadsheets like Sean's `~/Downloads/Title App Software Vendors and Costs.xlsx`:
- Upload the spreadsheet → AI-mediated extraction maps columns to the schema
- Confirm each vendor before commit
- Bulk-add to the tenant's vendor inventory

---

## The Three-Role Consolidation

### Dev Manager Hat

**Surface:** Vendor list filtered by `integration.type`, grouped by purpose, with health status.

**Actions:**
- Mark vendor as "in trial" / "active" / "deprecated" / "replaced by [other vendor]"
- Document integration patterns (API, Zapier, SDK, manual)
- Link to internal docs explaining how the integration is wired
- Surface vendors whose integration health check is failing
- Recommend replacements when a vendor announces EOL

**Example use:** Sean asks the chat *"What are we using Venly for and what's the replacement plan?"* The worker pulls the vendor record, shows the use cases (DTC minting), the EOL date, and surfaces Coinbase CDP + Crossmint as the documented replacement candidates.

### Controller Hat

**Surface:** Monthly spend dashboard with variance alerts, renewal calendar, budget vs actual.

**Actions:**
- Set per-category budget caps; the Accounting worker's pre-commit hook blocks charges that would exceed cap (extends the controller pattern already in place from Phase C)
- Approve / deny suggested cancellations
- Approve / deny price increases above a threshold (e.g., any >10% MoM increase needs explicit approval)
- Renewal alerts X days before annual contracts auto-renew

**Example use:** Sean's tracked monthly spend on software was $X last month. This month it's $Y. The worker surfaces variance: *"Klaviyo charged 3x normal due to overage on contacts above 50K — your list grew from 1,500 to 51,200 this month. Confirm or downgrade?"*

### Accounting Hat

**Surface:** Vendor → CoA mapping; per-vendor monthly burn; per-vertical cost allocation.

**Actions:**
- Map each vendor to a CoA entry (Software Subscriptions, Data Feeds, Advertising, Professional Services)
- Allocate costs to verticals (RE, Aviation, Auto, Web3, etc.) — methods: even split, weighted, usage-based
- Tag costs with project / campaign references where applicable
- Surface anomalies (a vendor charged but no associated revenue activity)

**Example use:** Sean's Accounting worker shows a $179 charge to "BUMPER" categorized to `data_feed_auto`. The Vendor Controller has it allocated 100% to the auto-dealer vertical. At month-end, the cost flows into the auto-dealer vertical's P&L automatically. No manual journal entries.

---

## Bridge to Other Workers

### Accounting Worker (PLAT-001)

Already has the controller pattern (`#202` Phase C) that pre-commits hooks on Marketing side-effects. Extend the pattern to vendor management:
- New vendor detected from bank feed → pre-commit hook prompts user to confirm vendor + assign category before the charge posts to the books
- Recurring charge approval queue → annual renewals go through approval before auto-debit
- Variance threshold alerts → any charge >X% above 90-day average triggers Controller review

### Knowledge Capture Pipeline (Filing 2 patent)

Every vendor entry, every categorization decision, every cancellation reason becomes training data for the Worker's vertical baseline rules. After 50 SOCIII tenants have used this worker for 6 months, the worker has learned (and the rule registry has captured):
- The 200 most common SaaS vendors used by early-stage founders
- The "right" CoA category for each
- The typical price range (so anomalies flag automatically)
- The typical renewal cadence
- The typical replacement when a vendor EOLs

This becomes the data moat protected by Filing 2.

### Patent Worker (Task #264)

When the Patent Worker is built, it consumes vendor data to identify: *"You're using Coinbase CDP and Crossmint for blockchain minting — both have IP filings around their minting flows. Verify your composition doesn't infringe."* Cross-worker IP audit becomes possible.

---

## Migration from Sean's Existing Spreadsheet

The existing `~/Downloads/Title App Software Vendors and Costs.xlsx` contains:
- 7 sheets
- ~40 vendors with status, integration type, payment method, purpose, costs
- Dashboard math computing monthly burn by category and by vertical
- Cost allocation by vertical (the old vertical labels Pets / Real Estate / Auto / Boats — current verticals are slightly different)

**Migration steps when the worker is built:**

1. Upload the spreadsheet to the worker's import surface
2. AI-mediated extraction maps each row to the vendor record schema
3. Sean reviews each extracted vendor and confirms / corrects categorization
4. Bulk-write to Firestore under the SOCIII Inc. workspace
5. Connect Mercury + Stripe accounts; the worker cross-references existing vendor records against observed transactions to populate `lastChargeDate` and `averageMonthlyCost`
6. Spreadsheet gets archived to Vault as historical reference; it's no longer the source of truth

**One-time effort:** ~2 hours of Sean's time confirming categorizations + connecting accounts. Ongoing: zero, because the worker maintains the inventory from observed signals.

---

## What This Worker Sells (Pricing)

If positioned as a PLATFORM SPINE WORKER (parallel to Accounting, HR, Contacts, Marketing, Control Center Pro):

**Suggested pricing:** $49/month (Tier 2 platform price point). Included in the SOCIII platform bundle for users who subscribe to 3+ spine workers.

**Credit cost per session:** 2 credits (matches Marketing worker).

**Connected-data fees:** Reuses the Accounting worker's connected-account fees. No additional data-fee per vendor lookup (it's all from existing financial connections).

**Value framing for the marketing page:**
- Bullet 1: *"Stop forgetting which SaaS you're paying for."*
- Bullet 2: *"Get a Controller-grade view of your subscriptions without hiring a Controller."*
- Bullet 3: *"Every charge auto-categorized to your books and allocated to the right vertical."*
- Bullet 4: *"Renewal alerts so annual contracts don't auto-renew without you knowing."*
- Bullet 5: *"Cancellation suggestions for subscriptions you stopped using."*

**Target buyer:** Solo founders running pre-Series-A startups, where the founder is wearing the dev + controller + accounting hats simultaneously. Secondary buyer: small businesses (10-50 employees) where there's a single person trying to track software spend across multiple departments.

**Initial vertical fit:** Universal — every business has vendors. Doesn't require a regulated-industry baseline like Aviation or Healthcare; just Tier 0 platform safety + Tier 1 ops rules apply.

---

## Build Sequencing

**Phase 1 — Inventory schema + manual UI (3-4 dev days):**
- Vendor record schema in Firestore
- Vendor list / add / edit / delete UI
- Category taxonomy + CoA mapping
- One-time spreadsheet import flow

**Phase 2 — Auto-ingestion from Accounting transactions (3-5 dev days):**
- Cross-reference recurring charges against existing vendor records
- New-vendor detection from unmatched recurring charges
- Variance alerts (cost increase, missing recent charge)
- Surface anomalies in the worker's chat

**Phase 3 — Renewal + lifecycle tracking (2-3 dev days):**
- Email parsing for receipts and renewal notices (Gmail integration, opt-in)
- Renewal calendar
- Cancellation confirmation flow
- Replaced-by relationships (Venly → Coinbase CDP)

**Phase 4 — Controller hooks + budget caps (2-3 dev days):**
- Per-category budget caps
- Pre-commit hooks integrated with Accounting worker
- Approval queue for variance + renewals

**Phase 5 — Knowledge Capture integration (1-2 dev days):**
- Rule extraction from vendor categorization decisions
- Worker fixture capture for representative vendor patterns
- Cross-tenant aggregated category suggestions (with PII scrubbed)

**Total build: ~12-17 dev days.** Realistic ship target: mid-July 2026, depending on what gets prioritized after the May 27/28 launch and Series A prep.

---

## Sean's Existing Vendor List (snapshot from spreadsheet, 2026-05-22)

For preservation pending the formal Phase 1 build. Listed alphabetically with current status:

**Active / In Use:**
- Apple Developer (per-year, S. Combs account)
- Appstle Subscription (Shopify subscription app)
- ATTOM Data (property reports — note: duplicates First American)
- ChatGPT 4.5 / OpenAI Platform (general AI work)
- Creatify (AI video generator)
- ESCROW.COM (sandbox configured)
- FAA NFDC (aircraft database, free)
- Firebase (hosting + functions, primary infra)
- Google Cloud (Maps, OCR, document prep)
- Google Developer (2FA to Sean cell)
- Google Voice (virtual phone — dev@titleapp.io)
- Google Workspace (drive + office + domains)
- Klaviyo (email/SMS, trial through 10-31)
- pdf-api.io (PDF generation, 2000/month plan)
- Powerful Form Builder (Shopify forms app)
- Proof (digital notary)
- Shopify (commerce/CRM/hosting)
- Stripe (payments, primary processor)
- TIDIO (AI customer service)
- Tracki (GPS trackers — referral marketing partner)
- Upwork (freelance dev + marketing)
- Zapier (workflow automation)

**In Discussion / Trial:**
- TILE (RFID tags — outreach to Tile team)
- SignPanda (signatures — 14-day trial when activated)
- WILLDESK AI (customer service trial)

**Off / Deprecated:**
- Venly (NFT minting — being replaced by Coinbase CDP)
- First American Title (Real Estate title reports — off)
- Bumper (auto/moto reports — was active, status TBD)
- EVLOP App (mobile app — deleted)
- EVLOP Product Options (deleted)
- MegaConfetti Effects (Shopify animation — TBD)
- UpPromote (referral marketing — cancelled / uninstalled 10-18-24)
- PreProduct (presell — test trial 10-18-24)
- Super Subscriptions (test trial 10-18-24)
- Squarespace (domains + Google plan — status TBD)
- Adalo, Thunkable (no-code app builders — status TBD)
- PayPal Company Site (status TBD)
- Singonify (SSO — status TBD)
- CodeMate (forms — status TBD)
- EComposer Builder (Shopify custom pages — status TBD)

**Notes from the spreadsheet:**
- Login email convention: dev@titleapp.io for most, dev@homdao.io for some legacy, titleapp.core@gmail.com for primary infra (Stripe, Firebase, GCP)
- Payment method: most are on "TitleApp Visa" or "Corp Card"
- Password storage: referenced inline (NOT secure — moving to password manager is a separate task)

---

## Open Questions

1. **Scope:** Is this a platform spine worker (universal) or a vertical worker (small-business-specific)? Recommend platform spine — it's universal.

2. **Pricing tier:** $49 spine pricing matches Marketing. Could also be $79 if positioned as Controller-grade. Recommend $49 to make it accessible to the solo-founder buyer.

3. **Email integration:** Phase 3 depends on Gmail integration which is a separate platform capability (the Calendar connector is V1 shipped; an Inbox connector would be similar in shape). When does Inbox connector ship?

4. **Cross-tenant aggregated suggestions:** Phase 5 surfaces "other tenants in your vertical typically pay $X for this vendor — you're paying $Y." This requires cross-tenant data aggregation with appropriate privacy. Confirm policy.

5. **Sean's spreadsheet ownership:** When the worker ships, who imports Sean's existing list — Sean himself or a platform admin? Recommend Sean (it's his data and he knows the context).

---

## Tasks Captured

- New task created for the build (see TaskCreate below)
- Existing #229 (HOM DAO reconciliation → IR/Cap Table worker) is a parallel pattern — both turn manual founder bookkeeping into governed worker capabilities. Could share architectural patterns.

---

*Spec produced 2026-05-22 based on Sean's directive. Source data: `~/Downloads/Title App Software Vendors and Costs.xlsx`. Build window: post-launch (target mid-July 2026 ship).*
