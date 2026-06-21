# CODEX — HARTBREAKER Program (Shopify Integration)

**Status:** 🅿️ **PARKED** — do not start until the Dr. Chen demo + the YouTube
video sprint ship (investor-outreach priority). This doc captures the program so
it can be picked up cleanly later.
**Owner:** Sean · **Pilot founder:** Megan (Hartbreaker, Inc.) · **Created:** 2026-06-21
**Source brief:** `~/Downloads/files (52)/Hartbreaker-Executive-Summary.docx` + Investor Deck

---

## 1. Why this matters (the real objective)

Hartbreaker is the **pilot**, but the prize is the **Shopify integration**: a
connector that pulls any Shopify merchant's commerce data into the SOCIII spine
opens SOCIII to **tens of thousands of small DTC businesses**. Hartbreaker proves
it with a real founder; the connector is the reusable platform capability.

**Two halves, built in this order:**
1. **Shopify connector** — a platform capability (reusable by every merchant).
2. **Hartbreaker's worker set** — built *for* Megan, **credited to her Hartbreaker
   account** (she does not have to wear the "creator" hat — same model as the 3
   vet workers we seeded for Dr. Chen).

---

## 2. The Shopify connector (platform capability)

Mirror the existing OAuth integration pattern exactly — `services/social/youtube.js`
and `services/vault/driveAuth.js`:
- **Shopify Admin API OAuth 2.0** (per-store). Store the offline access token
  AES-256-GCM encrypted (reuse `GDRIVE_ENCRYPTION_KEY` pattern) at
  `tenants/{tenantId}/integrations/shopify` (or `users/{uid}/integrations/shopify`).
- **Scopes (read-first):** `read_orders`, `read_products`, `read_inventory`,
  `read_customers`, `read_fulfillments`. Add write scopes only when a worker
  needs to act (e.g. propose a surge restock).
- **Reads → spine:**
  - orders → **Accounting** (revenue, COGS, margins)
  - customers → **Contacts**
  - products + inventory → **Inventory** worker
- **Webhooks:** `orders/create`, `inventory_levels/update` → detect demand spikes →
  a worker **proposes** a surge order (founder approves; nothing auto-executes —
  honors the platform's propose→approve invariant).
- **Capability registry:** add `commerce.shopify_connect_v1`,
  `commerce.shopify_read_orders_v1`, etc. to `contracts/capabilities.json`
  (add-only versioning).

**Line to hold:** SOCIII does **not** rebuild the storefront/checkout. Shopify
stays the commerce engine (Shopify Payments, checkout, multi-vendor inventory).
SOCIII is the **operating brain on top** — it replaces the back-office SaaS stack.

---

## 3. Hartbreaker's workers (built for Megan, credited to her account)

From her exec summary's "Running on SOCIII" section. Each is a `digitalWorkers` +
`workers` doc with `creator_id = Megan's uid` (seed pattern:
`functions/functions/scripts/demo/seedCreatorWorkers.js`).

| Worker | Does |
|---|---|
| **Vault** | Both entities (DE C-Corp + WY LLC), cap table, IP filing deadlines, Mercury accounts, live net worth |
| **Vendor / Manufacturing** | Manufacturer relationships, NDA status, MOQs, lead times, surge capacity, G-hook supplier contacts, OEKO-TEX certs |
| **Affiliate / Auction** | Creator onboarding, product-seeding log, auction mechanics, revenue-split calc, fulfillment trigger |
| **Compliance** | FTC care-label rules, CA Prop 65, affiliate-agreement compliance, USPTO deadlines, 83(b) 30-day clock |
| **IP / Corporate** | Design-patent + trademark status, vesting schedule, DE C-Corp annual report, registered-agent renewal — **reuses the IR/83(b) cap-table worker (#47)** |

New baseline needed if productized: `raas/retail/` (or `raas/apparel/`) Level-2 vertical.

---

## 4. Risks / flags

- **Brand is adult-adjacent** (intimates, auction mechanic, "female sexual agency").
  Legit apparel business, but **payment-processor TOS scrutiny** is real (Stripe /
  Shopify policies) — Megan's call, just on the record.
- Auction mechanic uses **Stripe with custom split logic** — separate from Shopify
  Payments; the Affiliate/Auction worker must reconcile both.

---

## 5. Megan onboarding (the human side — can start TODAY, independent of the build)

She's on Claude chat + ChatGPT; **Claude Code** is the upgrade because it works off
her **git-resident repo**, not a chat thread — which kills the **drift** problem
(chat re-litigating settled decisions every session).

1. **SOCIII account** — she can self-serve now via the new email/password login
   (shipped), or Sean provisions her a workspace.
2. **Claude Code** — hand her the existing setup docs (`~/Downloads/SOCIII-Setup-Mac.docx`
   / `SOCIII-Setup-Windows-PC.docx`). Pin Terminal + browser side-by-side, one
   command per step.
3. **Anti-drift FOUNDATION doc** — the single most important onboarding artifact:
   a repo-resident `FOUNDATION.md` that hard-codes her settled facts so Code reads
   them instead of re-deriving via chat:
   - **Entity: DE C-Corp (operating) + WY LLC (holding).** Already decided in her
     exec summary, and it's the correct, standard structure (same as SOCIII, Inc.).
     WY LLC holds the founder's C-Corp equity; DE C-Corp is the operating/fundraising
     entity (Stripe Atlas).
   - **83(b) within 30 days of share issuance — non-negotiable** (same SOP as Sean's
     Atlas/Lob filing + the advisors).
   - Trademark HARTBREAKER (Class 25 & 35), design patent, NDA-before-design protocol.
4. **Domain** — the painful part; we have the playbook from the sociii.ai migration.

---

## 6. Sequencing

```
NOW         → Dr. Chen demo polish + YouTube video sprint (investor priority)
TODAY (Megan, parallel/human) → SOCIII account + Claude Code + FOUNDATION.md + entity/domain hand-holding
AFTER VIDEOS → Build half 1 (Shopify connector) → half 2 (Hartbreaker workers)
```
