# Vendor & Subscription Controller Worker — Scaffold Spec

**Catalog slug (provisional):** `platform-vendor-controller` or `PLAT-006`
**Vertical:** Platform spine (universal)
**Pricing tier:** $49/mo (Tier 2)
**Status:** Scaffold — full spec at `docs/specs/Vendor-Inventory-Controller-Worker-Spec.md`. This document is the executive scaffold for the catalog + launch readiness.
**Origin:** Sean's directive 2026-05-22 from his manual spreadsheet pain point. *"In a big organization this data is siloed across departments. For an entrepreneur we just forget and lose the stuff."*

---

## One-Sentence Value Prop

> *"Stop forgetting which SaaS you're paying for — get a Controller-grade view of your subscriptions without hiring a Controller."*

---

## The Three-Role Consolidation

This worker is the SOCIII platform's proof-of-concept for **"enterprise governance for solo operators."** It consolidates three roles that are typically siloed:

1. **Dev Manager** — knows what's wired up, what's deprecated, what's in trial, what integration each vendor provides
2. **Controller** — knows what's being paid for, when renewals hit, what's auto-renewing, where budget variance is showing up
3. **Accounting** — knows how each charge categorizes against the Chart of Accounts and which vertical or project bears the cost

For solo founders, all three roles are the same person (and they forget). For 5-person startups, three separate people who don't talk. For enterprises, three departments with their own systems. In every case, the inventory drifts. This worker is the fix.

---

## Capabilities (Summary)

1. **Inventory maintenance** — canonical list of every vendor/SaaS/API/tool with status, integration, billing, allocation, lifecycle
2. **Auto-ingestion from connected accounts** — new charges from Mercury + Stripe FC + Plaid are detected, categorized, flagged for review
3. **Variance alerts** — price increases, missing charges, duplicate subscriptions, unused services
4. **Lifecycle tracking** — trial → paid → renewal → cancel signals
5. **Chart of Accounts mapping** — every vendor mapped to a CoA entry via Accounting worker integration
6. **Cost allocation** — per-vertical / per-project / per-deal cost distribution
7. **Budget caps** — per-category caps enforced via Accounting controller pattern (extends Phase C work already shipped)

---

## Pricing & Economics

- **$49/month** Tier 2 platform pricing
- **2 credits per session open** (matches Marketing worker pattern)
- **No additional data fees** — reuses Accounting worker's connected-account fees
- **Creator economics if shipped via a creator partner:** standard 75% subscription / 20% inference margin

---

## Build Phases (12-17 dev days total)

Phased build defined in the full spec. Summary:

- **Phase 1 — Inventory schema + manual UI (3-4 days)**
- **Phase 2 — Auto-ingestion from accounting (3-5 days)**
- **Phase 3 — Renewal + lifecycle tracking (2-3 days, depends on Inbox connector)**
- **Phase 4 — Controller hooks + budget caps (2-3 days)**
- **Phase 5 — Knowledge Capture integration (1-2 days)**

---

## Migration from Sean's Spreadsheet

The existing `~/Downloads/Title App Software Vendors and Costs.xlsx` (~40 vendors across 7 sheets) becomes the Phase 1 import seed. One-time effort: ~2 hours of Sean confirming categorizations + connecting accounts. After that, the worker maintains the inventory autonomously from observed financial signals.

---

## Strategic Importance

For investor conversations, this is the single most concrete example of the SOCIII wedge against generic AI platforms:

> *"ChatGPT can help you write an email about vendor management. SOCIII connects to your bank, watches your spending, knows your vendors, and tells you when you're paying $179/mo for a tool you stopped using. ChatGPT can't do that because it can't see your bank account, and even if it could, it has no governance layer to safely act on what it sees."*

---

*Scaffold spec produced 2026-05-24. Full spec at docs/specs/Vendor-Inventory-Controller-Worker-Spec.md. Ready for build post-launch.*
