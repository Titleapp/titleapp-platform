# CODEX 89 — Dispatch Orchestration Pipeline (ACARS-style, standardized)

**Status:** 🔴 spec only — not built. Round 1 red-team complete 2026-09-05 (Sean + external pass); still not built.
**Applies to:** Aviation Dispatch worker (`av-dispatch-001`, persona SKYE)
**Date:** 2026-09-05
**Trigger:** Sean's ask — a Dispatch worker that ingests a flight request and, "within a few milliseconds," has the aircraft, crew, and weather verified; then one accept action notifies the crew and delivers their flight package. Modeled on how an airline's ACARS/dispatch-release process works, and how some Part 135 operators already do it — but standardized so dispatch judgment can't introduce the inconsistency a human process allows.

## Round 1 red-team — outcome

Six points raised, all accepted, one (crew qualifications, §3) substantially simplified by Sean's own correction rather than the original framing:

1. **Crew-quals is not a new-database problem — it's the existing RAAS tier system applied to crew.** Sean: CFRs are cut-and-dry, and an operator's GOM/SOP/OpSpec may be *more* conservative than the CFRs but never less. So the fix is Studio Locker/RAAS having (a) a complete CFR set (already real) and (b) the operator's own GOM/SOP/OpSpec uploaded per their certificate — with a conservative "vanilla Part 135-style" GOM/SOP/OpSpec as the default for Part 91 operators who don't have their own, so they can't accidentally out-extend a real conservative operator's own limits. This is Level 1 (regulatory floor) + Level 2 (operator policy) exactly as already architected platform-wide — not new architecture.
   - **Refinement, verified by reading `GET /v1/pilot:currency`:** it splits into two different trust levels. Mode A (90-day/6-month recency currency) is computed from real logged flights — already robust, no new risk. Mode B (medical cert, type rating, BFR/IPC/recurrent) reads the latest self-logged `currency_event` per type — this is the one place a stale or dishonest entry could slip through rules that are otherwise correct.
   - **Resolved by Sean:** once a pilot or company runs on SKYE, this stops being self-report. Currency *events* get captured at the source — the CFI signs off recurrent training, the AME signs off the medical, directly in SKYE — the same instructor-attestation pattern already built and proven for nursing competency sign-offs (a verified instructor attestation event, not a self-reported one, is what makes a record real). Not new architecture; the same pattern applied to a new domain.
   - **What's still a real, smaller open item:** the transition period, before a given operator's crew all have their events captured this way — old/imported currency data has no attestation trail. Fail-closed behavior for that specific gap (missing or unattested currency for a given pilot) needs a definition, not just "fail closed like W&B."
2. **Accepted — race condition.** Parallel verification (aircraft/weather/crew) followed by dependent duty-time projection can go stale relative to each other by accept-time if the matched aircraft or weather changes the mission profile. Added an explicit re-validation pass immediately before accept (§4, step 3.5).
3. **Accepted — alternate-airport selection is its own line item.** Pulled out of the "weather" bucket into its own step with its own failure modes (§4, step 2b split from 2c).
4. **Accepted — sharpest point.** "One accept" changes the dispatcher's actual job from checking to trusting a checkmark. The accept screen must show underlying data, not just ✓/✗, so a human can actually catch a bad match (§4, step 4).
5. **Accepted — notification acknowledgment is a safety default, not a UX detail.** Explicit decision needed: does an unacknowledged notification block the flight, or does the system wrongly assume delivery = acknowledgment (§6, open question 3).
6. **Accepted — the release re-affirmation must be an enforced UI gate**, not just editable fields the dispatcher happens not to change (§4, step 5).

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

## 3. Crew qualifications — resolved architecture (post round-1 red-team)

**Not a new database. The existing RAAS tier system, applied to crew:**
- **Level 1 (regulatory floor):** the complete CFR set already lives in Studio Locker/RAAS.
- **Level 2 (operator policy):** the operator's own GOM/SOP/OpSpec, uploaded to Studio Locker per their certificate. A Part 91 operator with no formal OpSpec gets a conservative default "vanilla Part 135-style" GOM/SOP/OpSpec, so those pilots can't accidentally out-extend what a real conservative operator would allow.
- **The data Dispatch reads to check against those rules:** `GET /v1/pilot:currency`, extended with real Dispatch read-access (scoped, logged — this is the one genuine access-control decision, smaller than "build a new database": granting an assigning authority read access to a candidate's existing currency record, not creating a second copy of it).
- **The trust model for that data:** Mode A (90-day/6-month recency) is already computed from real logged flights. Mode B (medical/type/recurrent) becomes attested-at-source once an operator runs on SKYE — the CFI/AME/DPE signs off the event directly in SKYE at the time it happens, the same instructor-attestation pattern already proven for nursing competency sign-offs. Self-report is a transition-period condition, not the steady state.

**Remaining open item, narrower than before:** fail-closed behavior specifically for unattested/imported currency data during an operator's transition onto SKYE (§6, open question 1) — not a general "who can see crew records" question anymore.

## 4. Proposed pipeline (post round-1 red-team)

```
1. REQUEST RECEIVED
   Customer/ops submits: origin, destination, time window, mission type, pax/cargo.

2. PARALLEL VERIFICATION (target: near-instant, three independent checks run together)
   a. Aircraft — matchAircraft() scores fleet by type/capability + real airworthiness (EXISTS)
   b. Alternate selection — its own step, own failure modes (NEW — distance/weather minimums/
      fuel range/runway suitability; a legal-but-operationally-bad alternate is a real failure
      mode, not just "no alternate")
   c. Weather — real METAR/TAF for destination + the selected alternate (EXISTS for the data,
      NEW for feeding it into this flow)
   d. Crew — duty-hour cap (EXISTS, otRules.js) AND currency/quals checked against the
      operator's own RAAS-governed CFR+GOM/SOP/OpSpec rules (§3 — resolved architecture,
      not new database) for every crew member who could plausibly be assigned

3. RE-VALIDATE immediately before accept (closes the round-1 race-condition finding)
   Steps 2b-2d can go stale relative to each other — a matched aircraft or a selected
   alternate can change the mission profile, which changes duty-time math, which can
   invalidate the crew match step 2d just verified. Re-run the dependent checks against
   the FINAL combined result, not just the individually-parallel ones, immediately before
   presenting accept.

4. ACCEPT (single action, human judgment preserved on purpose)
   The dispatcher's job is not "trust four checkmarks" — the accept screen shows the
   underlying data behind each check (actual duty-hour margin, actual currency dates,
   actual weather minimums vs. actual alternate), not just ✓/✗, so a human can catch a
   wrong match rather than rubber-stamp a green light. Consistent with "Dispatch creates,
   PIC accepts" from CODEX 64's existing manifest model.

5. AUTO-POPULATE the release record (ReleaseFlightModal's fields, not a new form) —
   BEHIND A HARD GATE
   Tail number, aircraft, crew, weather-briefing content, W&B all pre-filled from steps 2-3
   instead of re-typed. The human re-affirmation is an enforced UI action (cannot submit
   without it), not merely "the fields happen to be editable" — closes round-1 finding #6.

6. NOTIFY + DELIVER, with an explicit acknowledgment contract
   Crew notified (push/SMS/email — mechanism TBD, still open) with a real flight package:
   route, weather brief, NOTAMs, W&B, crew assignment, aircraft — everything CoPilot's own
   Pre-flight Brief view (CODEX 64, already real) already knows how to render. Whether an
   unacknowledged notification blocks the flight, or the system defaults to assuming
   delivery = acknowledgment, is an explicit decision to make before building this step,
   not an implicit default (§6, open question 3).
```

## 5. What this deliberately does NOT include (and why)

- **Real FAA/ICAO flight plan filing.** A genuine, separate, vendor/regulatory decision — see CODEX 64's explicit non-goal. If Sean wants this, it should be its own CODEX (which provider, API access, cost, liability if a filing is wrong) — not folded into this pipeline silently. See §6 item 6.
- **Fully autonomous accept.** Step 4 keeps a human in the loop on purpose — this pipeline's job is to make the *verification* instant and the *data entry* automatic, not to remove dispatch judgment from the actual go/no-go decision. Sean's own framing ("standardized so Dispatch isn't given a chance to fuck everything up") is about eliminating inconsistent manual re-entry and missed checks, not about removing the human decision itself — worth confirming that reading is right before building.

## 6. Open questions (narrowed after round 1)

1. Fail-closed behavior specifically for unattested/imported/stale currency data during an operator's transition onto SKYE (not general access-scope anymore — that's resolved in §3).
2. Alternate-airport selection criteria — distance, weather minimums, fuel range, runway suitability: which of these gate automatically vs. surface as a dispatcher choice?
3. Notification mechanism for step 6 (push via the native app? SMS? email? all three?) — and the explicit acknowledgment-vs-delivery decision from §4 step 6.
4. What exactly triggers "accept" being blocked vs. just flagged — e.g., is a crew member 0.5 hours from their duty cap a hard block or a visible warning the dispatcher can override?
5. Does this apply to Part 91 self-dispatch (per CODEX 64's existing self-dispatch mode) at all, or only to staffed-Dispatch operations?
6. Real FAA/ICAO filing — still its own future CODEX, not this one.

---

## Cross-references

- `docs/codex/64-copilot-ipad-ux.md` — the manifest model ("Dispatch creates, CoPilot consumes and appends"), the explicit flight-plan-filing non-goal, and the Pre-flight Brief view this pipeline would feed.
- `functions/functions/services/dispatch/aircraftMatching.js` — real aircraft/airworthiness matching this pipeline builds on.
- `functions/functions/services/scheduling/otRules.js` / `crewScheduling.js` — real duty-hour math and crew assignment this pipeline builds on.
- `apps/business/src/components/canvas/AviationWorkerCanvas.jsx` (`ReleaseFlightModal`) — the real, immutable release record this pipeline would auto-populate rather than replace.
