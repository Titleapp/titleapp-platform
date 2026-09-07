# CODEX S52.46 — Worker Naming Architecture & "OF for Smart People" Campaign Reconciliation

**Status:** In progress · 2026-09-06
**Owner:** Sean (decision) · Claude (implementation)
**Predecessor:** the `_SUITE_PERSONAS` decision itself, 2026-09-05, `functions/functions/index.js:5230-5272`

---

## Why this exists

On 2026-09-05, Sean committed a real naming rule directly in code but never wrote it down anywhere durable — it existed only as a code comment. One day later, while planning a marketing campaign, both Sean and Claude nearly re-invented a conflicting naming scheme from scratch before catching the mismatch. This doc exists so that doesn't happen a third time.

## The rule

**One Digital Worker persona name per whole vertical suite — not one name per individual worker chat.** Sean's own words, quoted from the `index.js` comment:

> "Petra is the single persona across the ENTIRE Title + Real Estate suite — Title being the lynchpin of all real estate — you pay rent on Petra, use Petra to do a home inspection, or a property underwriting; it's all one identity."

## Canonical persona registry (as of 2026-09-06)

| Persona | Suite / scope |
|---|---|
| **Skye** | Every aviation worker (20 slugs: CoPilot, Dispatch, MX, flight planning, currency tracking, training/proficiency, cert-assistant, GOM authoring, FRAT, mission-builder, crew scheduling, safety officer, ground school, etc.) |
| **Petra** | Every title/escrow/RE/mortgage/appraisal/construction worker (28 slugs). Also fixed a real name collision — `re-salesperson` used to resolve to "Dana," colliding with an unrelated MSR/servicing persona also named Dana. |
| **Elara** | The DPP suite (`eu-battery-dpp-001`, `eu-passport-registry-001`, `eu-supply-chain-tracer-001`) |
| **Hannah** | Nursing education (`nursing-education-001`, set as that worker's own `display_name`) |
| **Max** | Accounting (back-of-house) |
| **Jordan** | HR |
| **Sage** | Contacts |
| **Ivy** | Marketing & Content |
| **Reed** | IR |

Source of truth: `_SUITE_PERSONAS` table in `functions/functions/index.js` (~line 5230), duplicated in `apps/business/src/components/ChatPanel.jsx`.

**Adding a new worker to an existing suite does not get it a new name.** It resolves to that suite's persona automatically. **Adding a genuinely new vertical/suite requires a new one-word persona name**, added to this table and this doc in the same change.

## The conflict this doc resolves

The public "OF for Smart People" ad-campaign roster (`apps/business/src/lib/campaignRouting.js`, `CREATOR_SLUG_TO_CAMPAIGN`/`CAMPAIGN_ROUTES`) predates the 2026-09-05 decision and directly contradicted it: 22 individually-named comedic personas (Randy=Aviation MX, Captain Lisa=Boeing 777 CoPilot, Manpreet=Tax Compliance, Katarzyna=DPP, Maria=ER Nursing, Brandon=Accounting, Nancy=HR, plus ~9 more with no real underlying SOCIII vertical at all: Fred/Michael/Madison/Darnell/Julia/Dietrich/Monty/Clint/Brad), each with a real, working `/creator/<slug>` signup landing page. Someone clicking a "Randy" ad and signing up would land in a product that introduces itself as Skye, not Randy.

**Resolution (2026-09-06, Sean):** the ad-hook character stays as the top-of-funnel scroll-stopping face — "OF for Smart People" is deliberately top-of-funnel-only (see `project_week_2026-08-17_marketing_regcf_appstore` memory), meant to hook even serious B2B buyers (a chief pilot, a title company owner) without trying to convince them itself. Real conversion happens through vertical-matched serious content (Loom videos, whitepapers, the SKYE demo) that the joke should lead into. So: **the ad-hook name is allowed to differ from the suite persona, but the actual `/creator/<slug>` signup/reveal moment must introduce the real suite persona** (Skye/Petra/Elara/Hannah/Max/Jordan/Sage/Ivy/Reed), not perpetuate the joke name as an ongoing product identity.

Remapping applied (see `campaignRouting.js` + `CreatorLanding.jsx` for the actual implementation — this doc records the decision, not the diff):
- Randy (Aviation MX) → reveals **Skye**
- Captain Lisa (Boeing 777 CoPilot) → reveals **Skye**
- Katarzyna (EU DPP Compliance) → reveals **Elara**
- Maria (ER Nursing) → reveals **Hannah**
- Brandon (Tax & Accounting) → reveals **Max**
- Nancy (HR) → reveals **Jordan**
- Manpreet (Tax Compliance) → reveals **Max** (subject to confirming her underlying `workerSlug` is actually in the Accounting suite, not a separate one)

Personas with no real underlying vertical (Fred, Michael, Madison, Darnell, Julia, Dietrich, Monty, Clint, Brad) are flagged as retirement candidates, not renamed — there's nothing real to rename them to. The "Hate Your Boss" family (Dale, Sandra, YC Brandon, Priya) is a separate joke format, out of scope here.

## Creator consent policy (short, simple, 2026-09-06)

Suites tied to a real third-party domain expert — currently **Hannah** (Ruthie, nursing) and **Elara** (Elise, DPP) — do not get an "OF for Smart People" ad without that creator's explicit consent. Sean's own personas (Skye, Petra, Max, Jordan, Sage, Ivy, Reed) need no such consent — he built them.

The consent mechanism is simple and opt-in: if a creator wants an OF ad made of their persona, they supply their own picture and we build it from that. Their choice to opt in and supply the image is their own call — SOCIII isn't creating a likeness without their active participation.

## Locked-in joke template (applies to every "OF for Smart People" caption going forward)

> "[Name]'s never turning heads at [social scenario]. But you want [them] standing next to you [doing the real high-stakes job]. Just maybe not [social/family scenario]."

Sean's own example: *"Manpreet's never turning heads at a party. But you want her standing next to you in an audit. Just maybe not meeting your mother."* Vary the social scenario per character — don't repeat "meeting your mother" across the roster.

Also: don't put specific dollar pricing in ad captions. Use "some are free, others cost money" — accurate pricing lives on the real `/creator/<slug>` page, not memorized into a joke.

## Rule going forward

Before naming anything worker-related — a new persona, a new campaign character, a new bundle — check this doc and `_SUITE_PERSONAS` first. If a new vertical suite needs a name, add it here in the same change that adds it to code.
