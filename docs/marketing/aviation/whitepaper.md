# The Record That Follows No One: Why Aviation Compliance Infrastructure Is Broken, and What Comes Next

*SOCIII Aviation — Technical and Product Overview*

---

## The Problem

In 2021, a well-regarded aviation software platform failed. The database went down, backups were incomplete, and pilots lost years of flight records — records that took a career to accumulate, records that formed the legal basis of their certificates, records that, once gone, could not be reconstructed. The platform issued an apology. The FAA offered no remedy. The pilots were simply out of luck.

That incident was not a fluke. It was a preview.

Aviation's compliance infrastructure is built on a foundation that was never designed to be infrastructure. Paper logbooks are still the legal master record. Line checks live in PDF forms inside filing cabinets at operators that may not exist in five years. When a Part 135 pilot leaves an employer, their training history becomes that employer's property — inaccessible, unreliable, sometimes deliberately withheld. When a new employer submits a PRIA request — the formal mechanism for obtaining a pilot's prior employment record — they send it by fax or mail. Prior employers are legally required to respond within 30 days. Many don't. The industry has normalized this.

Dispatch at a Part 135 operation is not much better. A director of operations assembling a release decision on a typical operation touches at least six separate systems: a navigation platform like ForeFlight for weather and NOTAMs, an ERP like RAMCO or CAMP for aircraft maintenance status, a spreadsheet or scheduling tool for crew duty time, a paper or PDF logbook for pilot currency, an email thread for recent FRAT scoring, and a dispatch tool like Protean for the actual release. None of these systems talk to each other. The dispatcher assembles the compliance picture by hand, every time, for every flight. The entire release decision — a decision that carries legal and safety weight — lives as institutional memory in one person's head.

After the flight, a crew member returns and spends 15 minutes re-entering data into a CAD system that already captured half of it. The debrief becomes administrative overhead instead of operational learning.

The root problem is not that the industry lacks software. There is plenty of software. The problem is that no piece of that software owns the record. Data lives in employer systems, not with the assets — the aircraft and the pilot — that the data describes. Every time a tail changes hands or a pilot changes operators, that history either disappears or requires a bureaucratic recovery process that the industry has learned to tolerate because there has been no alternative.

There is now an alternative.

---

## The SOCIII Approach

SOCIII is built on a single architectural commitment: records are append-only, cryptographically anchored, and belong to the asset they describe — not to the employer who created them.

This is not a philosophical position. It is a technical constraint that changes what the system can do.

When a maintenance record is appended — not overwritten, appended — with a cryptographic anchor, it becomes producible. An inspector's identity is bound to that sign-off permanently. An AD compliance entry cannot be backdated. A component life entry cannot be quietly corrected when a fleet sale is under negotiation. The record is what the record is, and it always has been.

When a pilot's training record lives on a substrate that follows the pilot rather than the employer, PRIA becomes a formality. The new employer doesn't need to chase down prior operators because the pilot carries the chain. The record is portable by design, not as a feature that any particular employer has chosen to enable.

Underneath these records sits a rules engine — what SOCIII calls RAAS (Rules + AI as a Service). The rules engine is the difference between a compliance tool and a compliance platform. ForeFlight is a great navigation tool. It will not tell you whether your crew duty time, aircraft airworthiness, and FRAT score are simultaneously green for a release decision. That requires rules — domain-specific, operator-configurable rules that can be applied to a set of live records and produce a single go/no-go with an auditable rationale.

AI in SOCIII is not the product. AI is the accelerant. The AI drafts, summarizes, and surfaces; the rules engine validates; the append-only record captures the outcome. The record that goes into Firestore after a dispatch release or a line check sign-off is not an AI output. It is a structured, timestamped, cryptographically anchored event. The AI just made it faster to get there.

---

## How It Works

### CoPilot

CoPilot is the preflight tool the pilot actually uses. It pulls weather, NOTAMs, weight and balance, and FRAT into one view and produces a go/no-go recommendation the pilot can show dispatch before the crew van leaves the ramp. Currency alerts fire automatically — not when dispatch notices a lapse, but when the threshold is approaching. The digital flight log syncs to the record substrate immediately on completion, which means the post-flight data entry disappears. The record exists the moment the flight ends, not the moment the pilot gets around to logging it.

For individual pilots, CoPilot is the upgrade to a paper logbook that the FAA has never mandated but the industry has always needed. It is the record that survives when the employer doesn't.

### Dispatch

Dispatch is the Part 135 release tool that replaces the six-app stack. Before a release decision, the system assembles the compliance picture automatically: crew duty time against applicable rest rules, pilot currency against type and recency requirements, aircraft airworthiness against open maintenance items and ADs, FRAT scoring against operator minimums. The dispatcher reviews a single screen, not six. The release decision — with the full record that supports it — is appended to the flight record at the moment of issuance.

When an FAA inspector asks to see the records for a flight that departed 14 months ago, the answer is not a folder retrieval. It is a query.

### MX Worker

MX Worker is the maintenance record that follows the tail. AD compliance, component life tracking, and inspector sign-offs all live on the append-only substrate. Inspector identity is cryptographically bound to each sign-off — no more signature-on-a-form that proves nothing about who actually performed the work or what they were looking at. When the aircraft is sold, the buyer gets the full record chain, not a stack of logbooks that may or may not be complete.

For fleet operators, MX Worker surfaces airworthiness status across all tails in one view — not by calling the maintenance shop, but by querying the record.

### Training Suite

Training Suite is the chain-anchored training record system for crews and students. Line checks, recurrents, simulator sessions, and proficiency checks are captured as structured records with identity-bound sign-offs. They follow the pilot through employer changes, not the employer's filing system.

When a certificate action follows an accident and the NTSB asks for the crew's complete training history going back seven years across three operators, the answer is a query — not a months-long records chase that turns up gaps where prior employers went out of business or declined to cooperate.

### Studio Locker

Studio Locker is the document generation and regulatory library tool for operators. It produces GOM, SOP, and MEL drafts from your actual fleet configuration — not from a generic template that your director of operations will spend 40 hours customizing. The underlying regulatory library is searchable: CFRs, ADs, ACs, POHs — updated and indexed, retrievable by natural language query. When your chief pilot needs to know whether a specific AD applies to your tail number before a midnight departure, the answer takes 30 seconds, not a manual search of the FAA website.

---

## The Long Game

Aviation is changing faster than aviation software. The drone delivery market — Part 135 operations at scale, automated, without a pilot in the aircraft — is not a future scenario. It is a current FAA regulatory project, and the operators who receive those waivers will need the same compliance infrastructure that a traditional Part 135 operator needs: airworthiness records, dispatch go/no-go, FRAT, chain-of-custody for every flight. The SOCIII rules engine does not know whether the aircraft has a pilot onboard. It validates records against rules. The same substrate that powers a medevac dispatch in rural Montana will power a drone delivery network in a suburban corridor.

The portable pilot record is the longer-term structural play. PRIA exists because there is no portable pilot record. The fax-based process, the 30-day response window, the endemic non-compliance from prior employers — all of that exists because pilot records live in employer systems. When the record lives with the pilot, PRIA becomes a verification step rather than a recovery mission. SOCIII is not proposing to replace PRIA. SOCIII is building the substrate that makes PRIA unnecessary — and when the FAA eventually modernizes (it will; it always does), the operators whose pilots already carry portable records will not need to rebuild their infrastructure.

The moat is not the navigation tool. The moat is not the AI. The moat is the record chain — the append-only, identity-anchored, cryptographically verifiable history of what happened to this aircraft, what this pilot has done, and who signed off on every step. That record has compounding value. Every flight adds to it. Every sign-off deepens it. Every employer change that a competitor's system would have erased instead strengthens it.

Incumbent platforms — RAMCO, CAMP, Protean — are single-tenant, single-employer systems built on the assumption that the operator owns the data. They are expensive, siloed, and architecturally incapable of building the portable record chain because their data models were never designed for it. ForeFlight is a navigation company. Navigation is not compliance.

SOCIII is compliance infrastructure. The AI is the interface. The record is the product.

---

## Who Should Be Talking to Us

If you are a director of operations at a Part 135 operator and your dispatcher is assembling a compliance picture by hand before every release, you should be talking to us.

If you are a safety director who has tried to reconstruct a complete crew training history after an incident and discovered that half the records don't exist or can't be located, you should be talking to us.

If you are a chief pilot who has lost a currency alert because it was in a spreadsheet that the scheduler forgot to update, you should be talking to us.

If you are a pilot who changed operators and watched your training history become a records request that went unanswered for 45 days, you should be talking to us.

The demo is live. The records infrastructure is running in production. The first operators are on it now.

**sociii.ai/aviation** — or email **aviation@sociii.ai**

There will be an audit. The question is whether the records are ready.
