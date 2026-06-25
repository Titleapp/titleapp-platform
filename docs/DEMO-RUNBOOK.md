# DEMO RUNBOOK — Meadow Creek Veterinary (Dr. Maya Chen)

**For:** recording the worker demo videos · **Updated:** 2026-06-25
**Workspace:** Meadow Creek Veterinary Clinic · **URL:** https://sociii.ai/?demo=1
**Data status (verified 2026-06-25):** all demo workers read REAL Firestore records — 12 dosing orders, 8 students, 18 credentials, 84 accounting txns, 6 campaigns, 160 clients, 18 Drive files. Nothing on these paths is frontend fixture except where noted.

---

## ⚠️ Before you record (30-second warm-up)
The demo workers **auto-land on their dashboard with live data** — but only after you've opened each one once in this browser profile (first-ever visit shows the onboarding landing, which holds the trial CTA). **You already warmed them yesterday.** If you're in a *fresh* browser/profile, click into each worker once first, then record.

Also: dismiss the "New SOCIII available" pill (hard-refresh) so you're on the latest build before recording.

---

## VIDEO 1 — The A-HA: one governed worker, text + voice + image + video
**Worker:** Drug Dosing (Meadow Creek → Drug Dosing)
**Why it lands:** the differentiator — RAAS governs *text, voice, imagery, AND video* on one canvas, with a propose→approve gate.

1. Open **Drug Dosing**. It lands on the **Dosing Calculator** — at the top is the **AI-generated dosage video** (Fal.ai), then KPIs, then a **proposed order** (Slinky · Burmese Python · Dexmedetomidine+Ketamine) with the math shown, DEA badge, contraindication check, and **Approve order**.
2. In chat: *"Can you make me a picture of where to apply the pre-anesthetic?"* → Alex generates the **cockatiel IM-injection diagram** onto the canvas (the image-gen A-HA). Note the cost line ("1 Data Credit") — that's metered, governed imagery.
3. Walk the tabs: **Order History** (real patients — Bella, Mango, Charlie…), **Protocols** (Avian/Canine/Feline/Reptile pre-anesthesia), **Controlled Log** (audit-ready Schedule II–V).
- *Talking point:* "Every number here is a real record in her clinic's database — not a mockup."

## VIDEO 2 — Drive → Accounting (the document-to-books moment)
**Worker:** Accounting
1. Open **Accounting** → it lands on the dashboard: **setup 6/6 complete**, **$165k cash**, **$20.6k avg burn**, **~8-month runway**, real P&L.
2. Go to **Import from Drive** → pick **"Meadow Creek — Business Card Statement (June 2026).pdf"**.
3. Claude reads the *actual PDF* → extracts all 16 transactions (Patterson Veterinary, MWI, IDEXX, Zoetis, PG&E…) → categorizes them against the chart of accounts → review → commit.
- *Talking point:* "A real statement, parsed and posted to her books — governed, reviewable, append-only."
- **Avoid:** asking the CoS/Alex chat to "post it to accounting" — use the worker's **Import from Drive** button. (The chat narrates; the button actually parses.)
- There are 4 statements (Mar/Apr/May/Jun) if you want a fresh one per take.

## VIDEO 3 — Personal Vault DTC (consumer "why care")
**Persona:** switch to **Dr.'s Personal Space**
1. Chat: *"I just bought a new Rad Power e-bike for $2,400 — add it to my vault so I have proof I own it."*
2. Alex creates a **Digital Title Certificate** + **Logbook** entry (note the language — "Digital Title Certificate," never crypto/mint/NFT).
3. Show **My Vault** → the 4 pillars (Stuff / Money / Health / Education) and the new e-bike DTC.

## VIDEO 4 — The team & compliance (HR + Credentials)
**Workers:** HR & People, Staff Credentials
1. **HR & People** → **People** tab: the real roster (Dr. Chen, Dr. Park, Sam Rivera CVT, Alex Torres, Casey Kim + the 4 digital workers). **Compliance** tab: Alex Torres' **OSHA training overdue** (hard-stop) + Dr. Chen's **DEA expiring in 14 days** (soft-flag).
2. **Staff Credentials** → same OSHA/DEA flags, **Renewals** calendar, **Training** log.
- *Talking point:* "HR and Credentials read the **same** records — one source of truth. The overdue OSHA shows up in both because it's one fact in the database, not two copies."
- *(HR is now genuinely DB-backed + tenant-scoped as of 2026-06-25 — no SOCIII advisors leak in.)*

## VIDEO 5 — Marketing & Education (supporting)
- **Marketing & Content** → Overview (134k reach, winning "Puppy & Kitten Package"), Campaigns, Creative.
- **Edu / CVT Exam Prep** → Records (hash-anchored completions), Cohort analytics, Curriculum (11-week course).

---

## Known rough edges (avoid on camera or have a workaround)
| Edge | Workaround |
|---|---|
| **Marketing Creative / campaign images** are colored placeholders, not real ad photos | Don't click into individual campaign creative; stay on Overview/Campaigns numbers (those are real). *Real Fal.ai ad imagery = next build.* |
| **Vet Order History** patients show emoji, not photos | Fine as-is; just don't promise "click for the photo." |
| **Title Abstract / RE worker** canvas is still a hardcoded sample property (Pinedale WY) | Use the live **address lookup** ("325 Battery St") to show the real ATTOM pull; don't dwell on the static chain. |
| **First-ever visit** to a worker shows the onboarding landing | Warm-up step above. |
| **HR tabs** — if a tab doesn't switch on click, it's the dual-mount canvas issue (#36) | Click slowly / once; data is correct when it renders. Flag if it misbehaves so we can pin the mount path. |

## If something looks wrong mid-take
- Hard-refresh (clears stale build).
- The chat canary texts/emails on outage — if Alex stops responding, check that.
- Everything on the green paths above was data-verified 2026-06-25; if a worker shows empty, it's the first-visit landing — click its first tab.
