# CODEX S52.72 — RealWear Glasses Integration Layer: Initial Scope

**Status:** Research/scoping only, grounded in RealWear Developer Support's direct technical input (Punit Arekar, 2026-09-09) — no code written yet.
**Source:** Punit Arekar (RealWear Developer Support), email thread "RealWear Developer Program purchased - Order #RWS7838," 2026-09-08/09. Sean is enrolled in the RealWear Developer Program (Order #RWS7838, 12-month access) and is the real end user for the pilot/MX use cases (active Life Flight Network medevac pilot).
**Public reference docs** (gated behind a RealWear developer login this session doesn't have — Sean has real portal access):
- Camera intents: `https://developer.ari-os.com/device_docs/docs/developer-examples/camera-applet`
- Keyboard & dictation: `https://developer.ari-os.com/device_docs/docs/developer-examples/keyboard-and-dictation`
- WearHF directive reference (voice command control): `https://developer.ari-os.com/device_docs/docs/wear-ml/embedded-api`
- UX guidelines for hands-free design: `https://developer.ari-os.com/device_docs/docs/Basics/ux-guidelines`

---

## The three candidate workflows (from Sean's own framing to Punit)

1. **Pilot / EFB copilot** — hands-free flight following, weather/NOTAM briefings, logbook workflows in the cockpit.
2. **Aircraft maintenance (MX)** — hands-free squawk logging and inspection workflows for A&P technicians on the ramp/hangar floor, including photo-based documentation.
3. **Nursing clinical charting** — hands-free charting for nurses at the bedside.

## Punit's recommended sequencing: MX first

Direct quote (paraphrased faithfully): aircraft maintenance is the closest fit to what the RealWear platform does natively, with the least friction. Hands-free inspection with photo documentation and spoken squawk entry maps onto three real platform building blocks:
- **WearHF** — voice commands and navigation
- **Camera intents** — photo capture without building a custom camera UI
- **Dictation** — free-text notes

His reasoning: this is the closest match to the industrial-inspection use case RealWear devices were designed around, so building MX first validates the platform foundation (voice navigation + freeform speech + structured data entry — the shared core across all three workflows) in the environment where it's most likely to just work. Pilot and nursing then become primarily workflow/integration questions rather than new platform-mechanics questions.

**Implication for SOCIII's build order:** MX (persona-equivalent of `av-mx-001`'s squawk-filing/inspection flows) should be the first RealWear integration target, not Pilot — even though Pilot/CoPilot is Sean's own most personally-used worker today.

## Real, load-bearing design constraint: voice command naming

From RealWear's own UX guidelines (per Punit): voice commands must be **multi-syllable and orally distinct from each other**. Commands differing only in their first syllable — common in checklist-style workflows — get confused by the recognizer. This needs to be a constraint on the command vocabulary from the start, not a retrofit. Concretely: when designing the MX voice-command set (e.g. "file squawk," "log inspection," "add note"), check pairwise distinctness before locking in wording, not after building against it.

## Nursing charting — PHI/dictation-mode decision, unresolved

Dictation on RealWear devices can run **on-device or via the cloud** — this materially matters for PHI, since on-device keeps audio local and cloud does not. Punit flagged this as a decision to make deliberately, not inherit as a default, because it also affects latency and whether partial results stream back mid-utterance (which affects how responsive the interaction feels). **Open item:** Punit offered to send exact configuration details for pinning the dictation mode — follow up with him before building nursing-charting voice capture, not after.

## Cockpit / EFB — two real risks flagged, not yet a "no"

Punit raised these directly, unprompted, as things to de-risk before investing in workflow depth:

1. **Certification/regulatory** — RealWear devices are not avionics-certified, and RealWear can't speak to airworthiness or how a head-mounted display would be treated under EFB guidance. This is SOCIII's/Sean's regulatory path to work through, not something RealWear clears.
2. **Microphone/audio-routing conflict** — the Navigator's mic and noise cancellation are tuned for industrial noise, assuming the device's own boom mic is the input. In a cockpit, the pilot already wears an ANR aviation headset. Whether the device's audio routing, Bluetooth headset input, and its own boom mic coexist sensibly is unverified and untested. **Recommended first step per Punit:** put a crude test in front of exactly this problem (does the device correctly route to/from a real ANR headset in a real cockpit) before building any cockpit workflow depth — this determines whether the use case is viable at all, not just how good it is.

## Sequencing recommendation (this doc's own synthesis, following Punit's logic)

1. **MX voice/photo/dictation pilot** — the platform-validation build. Reuses `av-mx-001`'s real squawk-filing (`POST /v1/mx:addSquawk`) and photo-documentation patterns already built for the web canvas; RealWear-side work is the WearHF command layer + camera-intent capture + dictation wiring into those same real endpoints. Voice command vocabulary needs the multi-syllable/distinctness check before finalizing wording.
2. **Cockpit mic/ANR-headset feasibility test** — a narrow, throwaway test (not a real workflow build) specifically to answer "does audio routing work at all in a real cockpit with a real ANR headset," before any pilot/EFB RealWear work is scoped further. This is a pre-requisite gate, not a nice-to-have.
3. **Nursing dictation-mode decision** — follow up with Punit for the exact on-device-vs-cloud pinning configuration before scoping nursing-charting voice capture; this is a compliance decision (PHI), not a technical preference, and should be made explicitly rather than inherited as a default.
4. **Pilot/EFB workflow build** — only after (2) confirms the audio path is viable; reuses the same MX-validated WearHF/camera/dictation foundation, applied to CoPilot's real endpoints (flight logging, NOTAM/weather briefings already live per `AviationWorkerCanvas.jsx`).

## Not yet answered — flagged only

- Exact device model(s) in hand (Navigator series assumed from context, not confirmed here).
- Whether SOCIII's existing worker backend endpoints need new "hands-free-shaped" response formats (short, voice-readable confirmations) versus reusing today's canvas-card JSON as-is.
- Discord developer community (`https://discord.gg/5S5n4FU5U`) as an ongoing support channel — not yet used.

---

## Point of view — the handoff boundary (2026-09-09)

Punit and RealWear Developer Support know RealWear's own platform in real depth. They know nothing about SOCIII's actual architecture — the real backend (`functions/functions/index.js`'s single `exports.api`), the tenant-scoped append-only Firestore model, the RAAS rules engine, or how a Digital Worker actually turns an action into a validated, audited record. That split needs to be explicit before the first build, not discovered mid-build.

**What is genuinely RealWear's world (their program, their risk):**
- The on-device voice recognition and command routing (WearHF)
- Camera capture and dictation/STT as OS-level intents — SOCIII never builds a custom camera UI or its own speech-to-text
- Device hardware behavior: battery, industrial-noise mic tuning, the boom-mic/ANR-headset conflict Punit already flagged
- The multi-syllable command-naming constraint — a real platform limitation, not a SOCIII design choice

**What is entirely SOCIII's world (ours to build, ours to get right):**
- Turning a captured voice command / photo / dictated note into an actual authenticated call against our real endpoints (`POST /v1/mx:addSquawk`, the logbook-entry tools, etc.) — RealWear's SDK ends at "here is a transcript" or "here is a photo," not at "here is a validated Firestore write."
- **Offline capture and sync — the harder half, and entirely ours.** Sean's own framing (remote EMS medevac, aviation MX in hangars/ramps with unreliable connectivity) means the real requirement isn't just "dictation," it's "capture now, structure and submit later, correctly, exactly once." RealWear's platform gives us a device that can record and store locally; it does **not** give us a queue-and-sync layer, idempotent submission on reconnect, or conflict handling. That's application logic SOCIII has to design and own.
- **This is where the existing architectural invariants actually bite.** CLAUDE.md's own core invariants — append-only Firestore, tenant scoping mandatory on every query, RAAS as the validation gate before anything commits — don't get a pass just because a write originated offline on a headset instead of from the web canvas. A squawk logged hands-free in a hangar with no signal has to reach the backend through the *same* auth, tenant-scoping, and RAAS-validation path as one typed into the canvas — no separate "offline mode" write path that quietly bypasses validation because it was convenient to build that way. If the sync layer is going to make a mistake, it's more likely to be here (a delayed, replayed, or duplicate write silently skipping a check) than anywhere in RealWear's own platform.

**My actual recommendation:** treat RealWear's SDK as the input layer only — voice, camera, dictation, hands-free UX — exactly the same relationship the web canvas already has with a browser's DOM APIs today. The real engineering work of this integration isn't learning WearHF, it's designing the offline-capture-to-real-write pipeline so a delayed sync can't silently violate an invariant this codebase already treats as load-bearing everywhere else. Scope the MX pilot build (step 1 above) around proving *that* pipeline end-to-end on a real device with real connectivity gaps — not just proving that voice commands work in a quiet room.
