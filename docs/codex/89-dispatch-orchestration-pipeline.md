# CODEX 89 — Dispatch Orchestration Pipeline (ACARS-style, standardized)

**Status:** 🔴 spec only — not built. Written for red-team review before any code.
**Applies to:** Aviation Dispatch worker (`av-dispatch-001`, persona SKYE)
**Date:** 2026-09-05
**Trigger:** Sean's ask — a Dispatch worker that ingests a flight request and, "within a few milliseconds," has the aircraft, crew, and weather verified; then one accept action notifies the crew and delivers their flight package. Modeled on how an airline's ACARS/dispatch-release process works, and how some Part 135 operators already do it — but standardized so dispatch judgment can't introduce the inconsistency a human process allows.

---

## 1. Why this now

Everything Dispatch needs for this pipeline already exists **as separate, real, disconnected pieces** — this is not a from-scratch build, it's an integration project. That's the case for building it now: the primitives are proven, the risk is in the wiring and in the one piece that isn't a primitive at all (crew qualifications — see §3).

## 2. Capability audit — what's real today, verified by reading the actual code (not assumed)

| Capability Sean asked about | Status | Evidence |
|---|---|---|
| Ingest a flight request from a customer | ✅ Real | `POST /v1/dispatch:createTripRequest`, Requests tab |
| Assign aircraft by type/capability | ✅ Real | `services/dispatch/aircraftMatching.js` — scores fleet by type, category, seats, IFR cert, cargo capacity |
| Check MX / airworthiness before assigning | ✅ Real | Matching reads real computed airworthiness (`computeAirworthiness`), not a fixture |
| Weight and balance | ✅ Real | `WeightBalanceCalculator.jsx`, real moment-arm math, now with the CODEX 64 disclaimer wired in |
| Check weather at destination + alternate | ⚠️ Exists, not wired in | Real METAR/TAF live in the Weather tab — but `aircraftMatching.js` does not read weather at all; it's a separate, disconnected tab today |
| Crew roster / duty-hour scheduling | ⚠️ Partial | Real crew-assignment + duty-hour data exists (`services/scheduling/crewScheduling.js`), and real weekly-hours-cap math exists (`otRules.js`: projects prior + proposed hours, flags overtime) — but it's a **static pre-flight check**, not a dynamic re-check if a departure time slips |
| Assign crew with appropriate **training/type rating** | ❌ Real gap | No fleet-wide qualifications/type-rating/medical-currency database exists anywhere in the codebase. Each pilot's own currency lives in their own personal Vault (`GET /v1/pilot:currency`) — **not readable by Dispatch across the crew roster.** This is the one piece that needs new data architecture, not just wiring. |
| File the flight plan (FAA/ICAO) | ❌ Deliberately not built | The existing design doc for this worker (CODEX 64) explicitly lists this as **out of scope** — "❌ Filing flight plans directly to FAA/ICAO." Today's chat action is scripted text telling the pilot to file themselves via 1800wxbrief.com. Real auto-filing means a regulated third-party integration (Leidos Flight Service or 1800wxbrief's own API), not an internal feature. **Explicitly excluded from this CODEX's scope — see §6.** |
| Deliver a standardized "pilot package" / release sign-off | ⚠️ Real record, manual entry | `ReleaseFlightModal` → `POST /v1/aviation:dispatch:releaseFlight` writes a real, immutable `flightReleases` record. But it's a **manual form** — tail number, PIC/SIC, weather-briefing-acknowledged and W&B-acknowledged are all typed/checked by hand. Nothing auto-populates it from a matched aircraft, assigned crew, or pulled weather. |
| One "accept" → auto-notify crew → auto-deliver package | ❌ Doesn't exist | No orchestration layer connects any of the above. Each piece requires its own manual navigation and re-entry today. |

**Bottom line:** the pieces are real. The orchestration layer that ties them together, and the crew-qualifications data model, are the actual gaps.

## 3. The crew-qualifications gap — the one piece that isn't just wiring

Today: `pilot:currency` is a **personal**, per-pilot record. Dispatch cannot query "which of my crew are type-rated and current on a King Air 350 tonight." This needs a real, fleet-wide, Dispatch-readable qualifications record per crew member: type ratings held, medical class + expiration, recurrent training due dates, and currency (landings, IFR, night) — mirroring the same real-vs-fixture discipline as everything else built this session. This is genuinely new data architecture, not a query change.

**Open question for red-team:** who is authorized to see this data? A pilot's medical/training record is sensitive. Today it's private-by-design (personal Vault). Making it Dispatch-readable is a real privacy/scope decision, not just a technical one — same category of judgment call as the FERPA scoping work done elsewhere this session, applied to crew records instead of student records.

## 4. Proposed pipeline (draft — this is what needs red-teaming)

```
1. REQUEST RECEIVED
   Customer/ops submits: origin, destination, time window, mission type, pax/cargo.

2. PARALLEL VERIFICATION (target: near-instant, all three run together, not sequentially)
   a. Aircraft — matchAircraft() scores fleet by type/capability + real airworthiness (EXISTS)
   b. Weather — pull real METAR/TAF for destination + a computed alternate (NEW: alternate
      selection logic doesn't exist yet either — today alternates are chosen by the pilot,
      not computed)
   c. Crew — cross-reference duty-hour cap (EXISTS, otRules.js) AND type-rating/currency
      (NEW — see §3) for every crew member who could plausibly be assigned

3. DUTY-TIME PROJECTION, not just a snapshot
   If departure slips or the flight runs long, does any assigned crew member cross into an
   illegal duty period? otRules.js's math is real but static — this needs to become a
   live projection against the ACTUAL proposed schedule, re-run if the schedule changes.

4. ACCEPT (single action)
   Dispatcher/ops reviews the combined verification (aircraft ✓, weather ✓, crew ✓,
   duty-time margin shown) and accepts — this is the one point requiring human judgment,
   consistent with "Dispatch creates, PIC accepts" from CODEX 64's existing manifest model.

5. AUTO-POPULATE the release record (ReleaseFlightModal's fields, not a new form)
   Tail number, aircraft, crew, weather-briefing content, W&B all pre-filled from steps 2-3
   instead of re-typed. Human still explicitly attests before it's final — this doesn't
   remove the human sign-off, it removes the re-entry of data the system already verified.

6. NOTIFY + DELIVER
   Crew notified (push/SMS/email — mechanism TBD) with a real flight package: route, weather
   brief, NOTAMs, W&B, crew assignment, aircraft — everything CoPilot's own Pre-flight Brief
   view (CODEX 64, already real) already knows how to render, just pushed proactively instead
   of the pilot having to pull it.
```

## 5. What this deliberately does NOT include (and why)

- **Real FAA/ICAO flight plan filing.** A genuine, separate, vendor/regulatory decision — see CODEX 64's explicit non-goal. If Sean wants this, it should be its own CODEX (which provider, API access, cost, liability if a filing is wrong) — not folded into this pipeline silently.
- **Fully autonomous accept.** Step 4 keeps a human in the loop on purpose — this pipeline's job is to make the *verification* instant and the *data entry* automatic, not to remove dispatch judgment from the actual go/no-go decision. Sean's own framing ("standardized so Dispatch isn't given a chance to fuck everything up") is about eliminating inconsistent manual re-entry and missed checks, not about removing the human decision itself — worth confirming that reading is right before building.

## 6. Open questions for red-team

1. Crew-qualifications data model and access scope (§3) — who can see it, how is it kept current, what happens when it's stale or missing for a given pilot (fail closed like the W&B "no profile" mode, per CODEX 64's own precedent)?
2. Alternate-airport selection — computed automatically, or still a human/pilot call? If automated, on what criteria (distance, weather, fuel range)?
3. Notification mechanism for step 6 (push notification via the native app? SMS? email? all three?) — and what's the fallback if a crew member doesn't acknowledge in time?
4. What exactly triggers "accept" being blocked vs. just flagged — e.g., is a crew member 0.5 hours from their duty cap a hard block or a visible warning the dispatcher can override?
5. Does this apply to Part 91 self-dispatch (per CODEX 64's existing self-dispatch mode) at all, or only to staffed-Dispatch operations?
6. Real FAA/ICAO filing (§6) — worth scoping as its own CODEX now, or genuinely later?

---

## Cross-references

- `docs/codex/64-copilot-ipad-ux.md` — the manifest model ("Dispatch creates, CoPilot consumes and appends"), the explicit flight-plan-filing non-goal, and the Pre-flight Brief view this pipeline would feed.
- `functions/functions/services/dispatch/aircraftMatching.js` — real aircraft/airworthiness matching this pipeline builds on.
- `functions/functions/services/scheduling/otRules.js` / `crewScheduling.js` — real duty-hour math and crew assignment this pipeline builds on.
- `apps/business/src/components/canvas/AviationWorkerCanvas.jsx` (`ReleaseFlightModal`) — the real, immutable release record this pipeline would auto-populate rather than replace.
