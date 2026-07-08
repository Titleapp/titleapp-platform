# CODEX 24 — Vertical Suites & Marketplace Bundles
## Status: 🟢 Shipped 2026-07-08

---

## The Thesis

The marketplace was a flat list of 60+ workers with no visual hierarchy, no on-ramp, and no story. A real estate operator searching "real estate" scrolled through noise to find the workers they needed — and never saw how comprehensive the suite was. This CODEX turns the marketplace into a vertical discovery experience: **one bundle card at #1, core ranked workers behind it, then the long tail A–Z.**

Four verticals now have this treatment. The pattern is identical across all four — which means adding a fifth vertical (Healthcare, FinTech) requires only: seed workers + one array in ChatPanel.

---

## What Shipped

### 1. Property Manager Worker (CODEX 23 implementation)

**RAAS ruleset `property_manager_v1`** — 9 hard stops:
- `PM-FH-001`: No racial/gender/national-origin/disability criteria in listing, screening, or denial
- `PM-FH-002`: Source-of-income discrimination blocked in CA, NV, OR, WA, NY, IL + 6 more states
- `PM-FH-003`: Blanket criminal-history bans require individualized assessment guidance
- `PM-FH-004`: Screening criteria must be applied consistently (documented policy)
- `PM-EV-001`: Retaliatory eviction guard — flags if notice within 180 days of protected activity
- `PM-EV-002`: State-specific cure windows enforced (NV: 5d, CA: 3d, NY: 14d, TX/FL/IL: 3-5d)
- `PM-EV-003`: Self-help eviction (lockout, utility shutoff) — hard block with legal citation
- `PM-HAB-001`: Emergency MX (heat, water, structural) — max 24hr dispatch, no deferral
- `PM-HAB-002`: No rent increase proposed on a unit with an open habitability defect

Chat rules block: discriminatory screening language, lockout advice, absolute legal guarantees.

**`PropertyManagerCanvas.jsx`** — 6-tab canvas:
- **Properties**: Portfolio stats (occupied/total, gross rent, past-due count, open MX) + unit-by-unit grid with R/Y/G status badges, days-past-due flags, open MX count
- **Lease-Up**: Vacancy pipeline funnel (Inquired → Toured → Applied → Screened → Approved → Signed) with stage counts per vacant unit
- **Screening**: Applicant cards with Fair Housing enforcement badge on each decision; FH flag (GREEN/YELLOW/RED) surface discriminatory criteria before they're acted on
- **Maintenance**: Emergency/routine/cosmetic work orders with vendor, status, cost. Emergency highlighted in red border
- **Evictions**: Cure-period tracker, "self-help eviction is illegal" banner, next-step action block
- **Compliance**: Urgency-sorted deadline calendar — past due (red), 7-day (yellow), 30-90 day (green)

Demo data: 3-unit portfolio (1 Main St × 2 occupied + 1 vacant in lease-up, 2 Oak Ave × 1 unit in eviction post-cure).

**Wired into:** `WORKER_RULESET_MAP`, `canvasTypes.js` (6 signal types: `card:pm-portfolio` through `card:pm-compliance`), `CanvasComponentMap.jsx`, Firestore `digitalWorkers/property-management` (already existed from prior session). Shows as **#11** in RE search.

---

### 2. Marketplace Bundle-First Search

**Pattern (same for all 4 verticals):**
```
Search "real estate" →
  [#1 purple bundle card — "RE in a Box"] Add the suite — Free
  [#2 Site Recon] ... [#11 Property Manager]
  A–Z: 1031 Exchange, Accessibility & Fair Housing, ...
```

**applyRankedBundle()** — extracted helper replacing duplicated RE/ED if-else chains. Takes a bundle item + ranked slugs array; injects bundle at index 0, maps known slugs to numbered ranks, alphabetizes the rest.

**Four active bundles with search ranking:**

| Vertical | Bundle ID | Core workers | Detection terms |
|---|---|---|---|
| Real Estate | `re-in-a-box` | site-recon-001, cre-analyst, title-abstract-001, zoning-001, law-landuse-001, feasibility-001, re-marketing-001, re-salesperson, permit-submission, property-management | real estate, cre, property, title, zoning, land use |
| Education | `education-in-a-box` | student-evaluation, clinical-eval-001, nursing-ce-001, staff-credentials-001, student-transcript-001 | education, nursing, school, student, ce credit, license, learning |
| Aviation | `aviation-in-a-box` | av-copilot-001, av-dispatch-001, av-mx-001, crew-scheduling-roster, maintenance-work-order-logbook, flight-duty-time-enforcer, weather-intelligence, flight-risk-assessment-frat | aviation, pilot, flight, aircraft, dispatch, crew, maintenance |
| eCommerce | `ecommerce-in-a-box` | ecom-dpp, ecom-product-catalog, ecom-order-ops, ecom-inventory, ecom-customer-service, ecom-marketing, ecom-revenue-analytics | ecommerce, shopify, retail, store, product, dpp, inventory |

**Bundle language:** "The most popular [Vertical] digital workers" — not "All 7" or "All workers". Button: "Add the suite — Free".

**Scroll fix:** `data-worker-results="true"` attribute on message wrapper + `requestAnimationFrame` scroll to `[data-worker-results='true']:last-of-type` — results now snap to the bundle card (#1), not the bottom of the 60-item list.

---

### 3. RE in a Box additions

Added `1031-exchange` and `appraisal-valuation` to bundle `workerSlugs`. Both appear in the A–Z tail of RE search results and are subscribed with the bundle.

---

### 4. Education vertical — 10 new Coming Soon workers seeded

| Slug | Name |
|---|---|
| edu-curriculum | Curriculum Designer |
| edu-assessment | Assessment & Grading |
| edu-advising | Academic Advising |
| edu-enrollment | Enrollment & Admissions |
| edu-ferpa | FERPA & Privacy Compliance |
| edu-parent-comms | Parent & Family Communication |
| edu-student-success | Student Success Coach |
| edu-outcomes | Student Outcome Analytics |
| edu-lms-admin | LMS Administration |
| edu-ce-tracker | Continuing Education Tracker |

---

### 5. Aviation vertical — 8 new Coming Soon workers seeded

| Slug | Name |
|---|---|
| crew-scheduling-roster | Crew Scheduling & Roster |
| maintenance-work-order-logbook | MX Work Order & Logbook |
| flight-duty-time-enforcer | Flight & Duty Time Enforcer |
| flight-risk-assessment-frat | Flight Risk Assessment (FRAT) |
| charter-quoting-engine | Charter Quoting Engine |
| safety-reporting-sms | Safety Reporting (SMS) |
| component-life-tracker | Component & Life Tracker |
| parts-inventory-manager | Parts & Inventory Manager |

Aviation catalog reference: `services/alex/catalogs/aviation.json` — 38 operator workers + 11 personal pilot workers fully specced. Aviation in a Box currently selects the top 10 operator-facing workers.

---

### 6. eCommerce vertical — new, DPP as the live anchor

| Slug | Name | Status |
|---|---|---|
| ecom-dpp | Digital Product Passport (DPP) | **live** |
| ecom-product-catalog | Product & Catalog Manager | coming soon |
| ecom-order-ops | Order Operations | coming soon |
| ecom-customer-service | Customer Service AI | coming soon |
| ecom-inventory | Inventory Intelligence | coming soon |
| ecom-returns | Returns & Refunds Handler | coming soon |
| ecom-marketing | eCommerce Marketing | coming soon |
| ecom-revenue-analytics | Revenue Analytics | coming soon |
| ecom-supplier-compliance | Supplier & Compliance Monitor | coming soon |

**DPP anchor rationale:** Elise (pilot customer) has a medical supplies Shopify store. EU Battery Regulation 2023/1542 mandates DPP by 2027. The DPP worker ships live now so it's demo-ready for Elise. The rest of the eCommerce suite is Coming Soon.

---

### 7. Spine RAAS rulesets — canary alerts fixed

`platform_accounting_v1.json`, `platform_contacts_v1.json`, `platform_marketing_v1.json` — promoted from `.deprecated.json` to active. These were created in a prior session but never added to `WORKER_RULESET_MAP`. Result: 4 spine workers ran without compliance rules → canary RED alerts. Fixed by adding entries in the map.

---

### 8. Personal Space workspace UX

- All workspaces (including Personal Space) now land on `WorkerHome`, not Vault
- Vault is accessible only via explicit "MY VAULT" nav click
- `dashboardKey` state + `ta:workspace-changed` listener in AdminShell forces re-render on workspace switch
- `handleWorkspaceLaunch` syncs `VERTICAL` localStorage key on switch

---

## QA-001 Results (2026-07-08)

| Check | Result |
|---|---|
| `npm run lint` (errors only) | 0 errors (was 4, fixed unused params in PropertyManagerCanvas + AviationNavDbCard + AviationWeatherCard) |
| `npm run build` | ✅ clean (chunk size warning is pre-existing) |
| Firestore seeds | ✅ 10 education + 17 aviation/ecom workers confirmed added |
| RAAS ruleset JSON | ✅ all 4 new JSON files valid |
| Canvas registration | ✅ PropertyManagerCanvas in CanvasComponentMap + canvasTypes (6 signals) |
| `WORKER_RULESET_MAP` | ✅ property-management + 3 spine workers wired |

---

## Open Items / Next Session

1. **Aviation suite finalization** — decide definitive top-5 for Aviation in a Box (tomorrow per Sean); MX/Crew Scheduling spec depth; Aviation in a Box landing demo
2. **Workspace-on-subscribe routing** — when user clicks "Add the suite — Free", should it auto-create a vertical workspace named e.g. "Real Estate Workspace"? Sean raised this question. Decision pending (see §Workspace On Subscribe below)
3. **eCommerce go-live** — wire Elise's Shopify store to the DPP worker; her pilot = first eCommerce customer
4. **ATTOM graceful fallback** — free tier expired July 3, paying starts July 15; need 401/403 catch + cached last-known result for Scott's July 11 demo
5. **Bundle subscribe → workspace auto-create** — open design question (see below)

---

## Workspace On Subscribe — Open Design Question

When a user clicks "Add the suite — Free" on the RE in a Box bundle card, they currently receive the workers into their current workspace. Sean's question: should this auto-create a named workspace instead (e.g. "Real Estate Workspace")?

**Arguments for auto-create:**
- Workers are vertical-specific; mixing RE + Aviation workers in one "Personal Space" is confusing
- A named workspace gives the vertical a home and a persistent canvas context
- Matches how a real customer thinks: "I have a Real Estate business and an Aviation business"

**Arguments against (or for lazy creation):**
- Most customers start with one vertical; forcing a workspace creation on first add is friction
- Power users (like Sean) may prefer to route workers into an existing workspace manually
- Workspace creation today requires a name + vertical selection — not zero-friction

**Recommended approach (not yet built):** Bundle subscribe shows a 1-tap confirmation modal — "Create a Real Estate Workspace for these workers?" with a pre-filled name ("Real Estate") and a Cancel option that adds to current workspace instead. No forced creation, but a strong nudge. Matches the persona model: Vault = singular, Drive + workers = per-persona.
