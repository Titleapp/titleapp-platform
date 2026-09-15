# RealWear Testing Onboarding — MX, Pilot, Charting

**Status:** Active test plan, not yet run. Companion to `docs/CODEX-S52.72-RealWear-Glasses-Integration-Layer-Scope.md` (read that first for the *why* — sequencing logic, the mic/ANR-headset risk, the PHI dictation-mode decision, and the offline-sync architectural boundary). This doc is the *what to run and log*.

**Cockpit hardware config confirmed for these reps:** Bose ProFlight boom mic (left), RealWear Navigator in-ear piece (right).

**Scope note:** every checklist item below validates the RealWear device itself (recognition accuracy, mic routing, local capture) — none of it yet exercises SOCIII's real backend endpoints (`POST /v1/mx:addSquawk`, logbook entries, etc.) or the offline-capture-to-sync pipeline described in the companion scope doc. That's a distinct, later integration phase once wiring exists. Don't read a passing "wifi off, still queued" rep here as proof the append-only/tenant-scoped/RAAS-validated write path works — it only proves the device held onto the audio/photo locally.

**Consent note (MX colleague reps):** these reps capture colleagues' voice and photos. Give them a heads-up on what's recorded and where it goes before they run a rep — same spirit as the governance note below about this being a personal test, not a company-sanctioned rollout.

---

## Aviation MX — Sean's Own Walkaround / Inspection

- [ ] Baseline run, quiet ramp — full walkaround, all planned commands, nothing running nearby
- [ ] Same walkaround with APU or an engine running — real noise-floor test
- [ ] Near-homophone commands back-to-back, 2–3 times each — the exact failure mode RealWear's own UX guidelines flag
- [ ] One camera-intent capture mid-walkaround, timed — fast enough to not break flow?
- [ ] One long-form dictation note (30+ seconds) — check for drift or dropped words partway through
- [ ] One run in low light / early-morning or hangar shadow
- [ ] One run with wifi/data killed before starting — local capture and queuing still work?

## Aviation MX — Your 3 Colleagues (Variety Testing)

- [ ] Fit check first — boom arm position, display eye, band adjustment; note any hard-hat/head-shape friction
- [ ] Cold-start voice test — no practice, no warm-up, basic commands as given
- [ ] One full walkaround each, their normal pace, their normal environment (don't stage it)
- [ ] One deliberate near-homophone test
- [ ] One dictation note — unscripted, their own phrasing on a squawk
- [ ] Quick post-rep gut check (3 questions max): Did it understand you? Did it slow you down or speed you up? Would you actually want to use this?

*Governance note: this is Sean's personal test, not a company-sanctioned rollout — flag that clearly to participants and to base safety/IT if it comes up.*

## Cockpit / Mic-Routing Gate (Go/No-Go — Sean Only)

- [ ] Ground/taxi, headset on, try a command
- [ ] Cruise, steady state, try a command
- [ ] Try a command while a radio call is happening (yours or ATC)
- [ ] Note explicitly: did it hear you through the headset, through the boom mic, or not at all
- [ ] If FSI simulator time comes up, run the same three there too — log separately, sim audio ≠ real cockpit

*If any of these fails in a way that looks structural, that's the answer — don't burn more reps chasing it.*

## Flight-Element / Workflow (Once the Gate Clears)

- [ ] Retrieve a weather/NOTAM briefing hands-free mid-flight
- [ ] Log a flight/logbook entry via dictation, check against what you'd normally write
- [ ] Deliberate interruption test: start dictation/command, kill connectivity partway, check reconnect behavior (submits once, twice, or drops)

## Nursing/Charting — Ruthie (Classroom/Simulation Only)

**Hard rule: no real students captured on audio or camera in any rep. If one wanders into frame or earshot, that rep doesn't count.**

- [ ] Baseline: dictate a short, simple vitals note on a mannequin/simulated scenario
- [ ] One longer narrative note — representative multi-sentence charting
- [ ] Deliberately include real nursing terminology/abbreviations — open question is whether the recognizer (tuned on industrial vocabulary) handles clinical language well
- [ ] One WearHF command test for whatever navigation she'd use — check for near-homophone risk in her own command set
- [ ] One offline test: dictate with wifi off, confirm local capture and queuing
- [ ] Pending her answer: match test data to whatever format/rubric her program actually grades against (SOAP, focus/DAR, or a specific EHR template)

*Forward-looking note: this recognition-quality testing (clinical terminology, on-device-vs-cloud PHI mode) is real groundwork for the future bedside/field EMS charting worker, not just for Ruthie's education builder — see companion scope doc.*

---

## Per-Rep Log Template (same fields, all tracks)

| Date/Time | Environment | What was tested | Outcome (recognized / misfired / dropped / latency felt) | Notes |
|---|---|---|---|---|
| | | | | |

Keep this dead simple — a log actually filled in after each rep beats a detailed one that gets skipped by day two.
