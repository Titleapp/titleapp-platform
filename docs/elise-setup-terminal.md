# Setup Guide — Part 2 of 2
# For Claude Code in Terminal (once Terminal is running)

---

**To Claude Code reading this:**

My name is Elise. I run TRAITLY, a Netherlands-based EU regulatory advisory firm. I license Digital Workers from SOCIII Inc. and I've built five of my own workers on their platform for my EU Battery Digital Product Passport (DPP) advisory practice.

I just got Terminal and Claude Code running. I'm now inside the `titleapp-platform` folder — the full SOCIII codebase, which is the platform my workers run on. I have my own fork of this repo on GitHub under my account.

My immediate goals in Terminal are:
1. Understand the codebase well enough to evolve my workers
2. Build the next items on my backlog (listed below)
3. Test changes before they go live

Please read everything below before you start helping me.

---

## Who I Am and What I've Built

**My business:** TRAITLY — EU market entry advisory. I help EU battery manufacturers get compliant with the EU Battery Regulation (2023/1542) before the February 18, 2027 mandatory deadline. The EU DPP Central Registry opens in 6 days (July 19, 2026). That's the most time-sensitive thing in my world right now.

**My launch client:** Voltara BV (Netherlands). Six battery product lines at different compliance stages. Their data is already loaded into the platform as a test workspace.

**My pipeline:** HOPPECKE (Germany), FIAMM (Italy), WETAC (Netherlands) — I'll be pitching them with Voltara as proof.

---

## My Five Workers — What Each One Does

All five workers are part of the **EU Battery DPP Suite**. They each have:
- A canvas (visual interface with tabs) that the client sees on the right side of the screen
- An AI advisor named **Elara** who answers questions in the chat
- Real compliance data from Voltara BV loaded in the background

### Worker 1 — DPP Compliance Auditor (`eu-battery-dpp-001`)
Tracks all 90 mandatory battery passport attributes across 7 regulatory clusters. Shows each of Voltara's battery products with a charge-bar (grey < 50%, yellow 50–87%, green 88%+). Elara answers questions like "what's missing for VLT-IND24?" with specific gaps, not vague answers.

**Canvas tabs:** Overview (charge bars) · Cluster Detail · Gap Analysis · Report · Connectors

**Voltara's current state:**
- VLT-IND24 (Industrial 24V, 500Ah): 38% — Cluster 3 not started, Hanam Cell Corp. data not submitted
- VLT-IND48 (Industrial 48V, 400Ah): 64% — Cluster 3 LCA initiated, Rheinwerk GmbH cert missing
- VLT-LMT12 (LMT 12V, 100Ah): 87% — Cluster 3 at 60%, LCA cert outstanding
- VLT-LMT24 (LMT 24V, 80Ah): 95% — Cluster 3 at 80%, closest to passport generation
- VLT-EV48 (EV 48V, 200Ah): 0% — not started
- VLT-EV72 (EV 72V, 150Ah): 8% — just started

### Worker 2 — DPP Passport Builder (`eu-passport-builder-001`)
Generates the Battery Passport in EU Annex XIII JSON-LD format. The most important rule: **Cluster 3 (Carbon Footprint) must be 100% before any passport can be exported**. This is enforced by the rules engine — Elara will refuse to generate even if asked, citing exactly what's needed.

**Canvas tabs:** Generation Status · Passport Preview · Export & Submit · Cluster Completion

### Worker 3 — DPP Supply Chain Tracer (`eu-supply-chain-tracer-001`)
Manages Voltara's four suppliers:
- **Zhenghe Celltech Co.** (China) — EV lines, verified and connected
- **ShinPower Corp.** (Korea) — LMT lines, connected, cert renewal due Nov 2026
- **Hanam Cell Corp.** (Korea) — Industrial lines, **invited but not submitted yet** — this is the key supply chain story: when Hanam submits, both VLT-IND24 and VLT-IND48 get their Clusters 4+5 filled automatically
- **Rheinwerk GmbH** (Germany) — All lines, partial — conflict minerals certificate missing, holding back Cluster 3 for IND48

**Canvas tabs:** Supplier Network · Coverage Map · Gap Alerts · Supplier Portal

### Worker 4 — DPP Registry Manager (`eu-registry-manager-001`)
Handles submission to the EU DPP Central Registry. Currently in **TEST MODE** because the registry doesn't open until July 19 (6 days). After July 19, this is where real passport submissions happen. Voltara has applied for the allowlist (required for third-party submitters like TRAITLY).

**Canvas tabs:** Submission Queue · Registry Status · QR Codes · Timeline

**Important:** Until July 19, all QR codes are mock stubs. There are TEST MODE banners on the Export and QR tabs. These will automatically disappear after July 19 — the countdown is calculated live, not hardcoded.

### Worker 5 — DPP Lifecycle Monitor (`eu-lifecycle-monitor-001`)
Tracks battery health after products are deployed in the field via BMS (Battery Management System) data. Shows State of Health (SoH%) for each deployed unit.

**Voltara's live fleet:**
- VLT-IND24: 94% SoH, 23 units, 312 cycles — healthy
- VLT-IND48: 88% SoH, 41 units, 587 cycles — healthy
- VLT-LMT12: 79% SoH, 67 units, 1103 cycles — **approaching 80% repurposing threshold**, amendment pre-drafted
- VLT-LMT24: 71% SoH, 89 units, 1298 cycles — **second-life workflow initiated**, amendment pending
- VLT-EV48: BMS not connected
- VLT-EV72: BMS not connected

**The 80% SoH rule:** This threshold is confirmed for EV batteries. For LMT batteries it's an open regulatory question — Elara will flag this uncertainty rather than stating a fact that hasn't been confirmed.

---

## Key Rules Elara Follows (The RAAS Ruleset)

These are the hard rules enforced by the system regardless of what anyone asks. Elara cannot be prompted around them:

1. **No fabricated compliance status** — Elara cannot say a product "is EU compliant" or "passes the regulation" unless the passport is actually registered. If asked, she cites the real status.
2. **No fabricated passport IDs** — She cannot invent a registry ID or QR code. She only shows IDs that were actually issued.
3. **Cluster 3 is a hard gate** — No passport generation until C3 = 100%. She will explain what's needed, but she will not generate.
4. **No invented SoH readings** — She only cites BMS data that exists. She does not estimate.
5. **No non-EU standards** — She only references EU Battery Regulation 2023/1542, not ANSI, UL, or other standards unless asked specifically.
6. **No non-allowlisted registry claims** — She cannot say a registry submission succeeded without confirmation from the actual registry API.

---

## Where Everything Lives in the Code

You don't need to touch most of this to start. But knowing where things are helps:

```
apps/business/src/components/canvas/DPPWorkerCanvas.jsx
```
→ This is the visual canvas for all 5 workers. It contains the demo data (SKUs, suppliers, fleet). Eventually this should read from Firestore instead of being hardcoded here — that's a future build task.

```
functions/functions/raas/rulesets/eu_battery_dpp_v1.json
```
→ The rules file. These are the hard rules listed above. If I want to add or change a rule, it goes here.

```
functions/functions/services/canvas/workerOwnData.js
```
→ This is what feeds Elara real data from Firestore before she answers a question. One function per worker. She reads the real Voltara data from here so she doesn't have to make things up.

```
functions/functions/raas/raas.engine.js
```
→ The rules engine. My workers are mapped here at line ~514. You generally don't need to touch this.

```
docs/codex/29-elise-dpp-battery-passport.md
```
→ My full product spec — what each worker is supposed to do, the data model, the RAAS rules, the client tiers, the revenue model.

```
docs/codex/30-eu-passport-builder.md through docs/codex/37-voltara-bv-demo-workspace.md
```
→ Detailed specs for each worker plus the Voltara test workspace.

---

## My Next Build Priorities

### ~~Priority 1 — Elara speaks Dutch, German, and Mandarin~~ ✅ DONE
Elara already responds in the language the user writes in. Supported languages: Dutch (NL), German (DE), Spanish (ES), French (FR), Mandarin (ZH), Korean (KO), Japanese (JA), English (EN). Regulatory citations (EU Regulation article numbers, Annex XIII attribute names) stay in their authoritative EU form regardless of UI language. No further work needed on this item.

### Priority 2 — Registry Allowlist (Business Task — July 19)
On July 19, 2026, I need to go to the EU DPP Central Registry portal and submit a TRAITLY allowlisting application. This isn't a code task — it's a real-world government application. Set a reminder.

### Priority 3 — Localization (NL/DE UI)
After Priority 1: the canvas labels and status text need to be available in Dutch and German for client-facing demos. CODEX 34 has the full spec for this. Don't start without Sean's approval on scope.

### Priority 4 — Supplier Portal Logins
Suppliers currently can't log in to submit their own data. Building this requires Firebase custom claims for a "supplier" role. CODEX 31 has the spec. This is not needed for the Voltara demo but becomes critical when I want CATL or ShinPower to submit data themselves.

---

## Open Decisions (Require Me or Sean to Decide — Not Engineering Calls)

- **Second-life marketplace model** (Worker 5, Tab 5): Show a list of EU recyclers for informational purposes only, or build a referral model where SOCIII gets a fee? Sean decides this.
- **Reseller economics**: TRAITLY's fee structure with SOCIII is not yet formally agreed. Sean and I need to discuss this before I use a specific pricing script with HOPPECKE or FIAMM.

---

## Things to Know Before Touching Anything

1. **The codebase is append-only** — Firestore records are never overwritten. State is computed from history. Do not write scripts that delete or update records in place.
2. **Never commit `.env`** — API keys live in `.env` locally and in GCP Secret Manager in production. The `.env` file is in `.gitignore` and must stay there.
3. **My workers share one RAAS ruleset** — `eu_battery_dpp_v1.json` applies to all 5 workers. If I add a new rule there, it affects all five simultaneously. Be intentional.
4. **The canvas is hardcoded right now** — The SKUs, suppliers, and fleet data in `DPPWorkerCanvas.jsx` are currently static demo fixtures. They match what's in Firestore, but the canvas doesn't actually read from Firestore yet. That's a future task (task #70 in the backlog).
5. **The EU DPP Central Registry opens July 19** — that's 6 days from today. The countdown is live. The TEST MODE banners will go away automatically on that date.

---

## Where to Start Right Now

Ask me what I want to work on. If I say I want to add the multilingual prompt (Priority 1), here's what that looks like:

1. Find where Elara's system prompt is built for chat in `functions/functions/index.js`
2. Find the section that handles `eu-battery-dpp-001` specifically
3. Add the one-line multilingual instruction to that prompt block
4. Deploy with `firebase deploy --only functions`
5. Test by writing to Elara in Dutch

If I'm not sure what to do next, suggest Priority 1 — it's the fastest win with the highest demo impact.
