# The system held because the people in it are good. That's not safety. That's luck.

*A medevac pilot's case for why dispatch and operations control have to get better — and why "better" has to come from outside the existing software stack.*

---

## Last week, on a routine flight

A PC-12 climbed out of a Hawaiian airport with a child patient on 100% supplemental oxygen, the child's mother riding along, an experienced flight medical crew, and one pilot in the front seat. The takeoff briefing covered, as every medevac takeoff briefing covers, the emergency turnback procedures the crew would follow in the event of engine failure, fire, or structural detachment.

At 1,500 feet on climb-out, on the first power reduction, the control yoke and the entire front of the aircraft began vibrating violently — stick-shaker intensity — accompanied by a strange humming sound. The crew alerting system showed nothing. The medical crew in the back, working on the patient, couldn't feel the vibration at all.

The pilot's first thought was a catastrophic engine failure in progress. He pulled to maximum L/D, turned the aircraft back toward the departure airport — he was at 5,000 feet, well within glide range with a shut-down engine — and declared a Pan-Pan emergency for a mechanical issue. He asked the tower to inspect the aircraft for fire, smoke, or oil on landing. Fire rolled to meet the aircraft at the tarmac. The pilot used the emergency shutdown procedure because the child in the back was on 100% oxygen and any post-landing fire risk could not be tolerated. Standard precautionary-landing procedure. The medical crew was informed at every step.

The aircraft landed safely. The pilot called the operator's dispatch and asked to be connected to the Aircraft Maintenance Operations Center.

Dispatch's first question: *"Why aren't you in Honolulu?"*

The pilot explained: *"We need to arrange alternative transport for the patient. I had an in-flight emergency."*

Dispatch's response: *"Well, that's going to be kind of hard."*

There was no Pilot Manager on Call available.

The next day, the operator put the aircraft right back into revenue service. They couldn't replicate the issue on the ground in five minutes. They moved on.

It would later become clear — to the pilot, on his own time, doing his own research — that the symptom set is documented for the PC-12 NG. It is **not** an engine failure or a structural detachment. It is a failure of the air conditioning system bleed-air valve, located behind the instrument panel. The valve has not been replaced. The aircraft is still flying.

---

## What happened, and what almost happened

What happened: a working medevac pilot caught a poorly-characterized mechanical signal, made a textbook precautionary landing, kept a critically ill child and his mother safe, kept his medical crew informed, and brought everyone home. Then he called his employer and discovered the employer had no functional operational response to what he had just survived.

What almost happened: in a slightly different version of this story — with a slightly less experienced pilot, slightly less calm medical crew, slightly worse weather, slightly higher density altitude, slightly later in a duty day — the aircraft enters an uncommanded configuration the pilot mis-diagnoses, the patient destabilizes, the precautionary landing becomes a forced landing, and the newspaper writes about it.

That second version of the story happens roughly **every sixty days** in US helicopter air ambulance operations.

It almost happened to a child last week.

---

## The data nobody likes to look at

The National Transportation Safety Board's most recent special investigation report on Part 135 air ambulance — AIR-24-03, July 2024 — found that **twelve specific accidents between 2010 and 2022** were caused, in whole or in significant part, by failures in operational control or flight-locating. Those twelve accidents alone account for **forty-five fatalities and thirteen serious injuries**.

Twelve accidents. That's a baseline.

In the period 2002 through 2005, the NTSB counted **fifty-five air ambulance accidents** — fifty-four fatalities, eighteen serious injuries — in just four years. That's roughly one fatal medevac event every month for four straight years. It is the period Sean refers to when he says "every other month a fatal." He's not exaggerating. The data agrees with him.

The 2014 rulemaking that produced 14 CFR Part 135 Subpart L — the rule that finally required Helicopter Air Ambulance operators with ten or more aircraft to operate an Operations Control Center — helped. Fatal helicopter EMS accidents have fallen by roughly 75% since the OCC mandate took effect in 2016. The rule worked.

The rule did not work *enough*.

The current Part 135 fatal accident rate in air ambulance is still **approximately fifty to one hundred times worse than Part 121 scheduled airline operations**. The current night fatal accident rate is still **three to four times worse than non-medevac Part 135 charter operations**. Survival rates for a VFR-rated pilot who inadvertently enters instrument meteorological conditions: **fourteen percent**.

And then there is the rule itself, which the NTSB has been clear about for the better part of a decade: it has structural holes.

---

## What Subpart L did not fix

The Operations Control Specialists who staff the centers required by Subpart L are not certificated dispatchers. The Federal Aviation Administration does not issue them a certificate, does not require them to pass a knowledge test administered by the FAA, does not require them to demonstrate practical skill in a real-time scenario. Their training program — eighty hours initially, forty hours per year recurrent — is FAA-approved at the operator level. The qualifications of the individuals filling those seats vary enormously between operators.

The Operations Control Specialist does not share legal operational control with the Pilot-In-Command. In a Part 121 airline operation, the dispatcher and the captain jointly release the flight; the dispatcher can refuse to release a flight, and can recall a flight, on safety grounds. In a Subpart L Helicopter Air Ambulance operation, the OCS is advisory only. They can identify a hazard. They cannot override a pilot's decision to launch into that hazard.

The Subpart L rule applies only to operators with ten or more helicopters. Smaller air ambulance operators — a meaningful share of the industry, including many of the regional and rural operations that serve the patients most likely to need air transport in the first place — are outside the rule entirely.

The rule covers helicopters. The Cessna SkyCourier and the Pilatus PC-12 and the King Air 350 and the Lear 35 that move patients between cities and across states are not covered by Subpart L at all. The advisory circular that applies to fixed-wing medevac, AC 135-15, was last updated in 1990.

And then there is the systemic finding the NTSB has been making since 2006 and made again, with sharper language, in its 2024 report: a recommendation that the FAA *require certificated dispatchers, holding joint operational control authority with the PIC*, in all Part 135 operations except single-pilot single-PIC. That recommendation is not yet a rule. The rule has not been written. The notice of proposed rulemaking has not been issued.

The system that catches the pilot before the pilot catches himself is not the system that exists. It is the system that the safety board has been recommending for nearly twenty years.

In the meantime, what stands between the patient and the newspaper is the pilot, the medical crew, and — in too many cases — luck.

---

## What the existing software stack does not do

The medevac operator running last week's flight uses, like nearly every operator in the country, some combination of: a dispatch program called Flight Vector that tracks currency and shows mission status; a safety management system called Baldwin; a maintenance hub like RAMCO; some flavor of pilot tool, generally ForeFlight; an electronic patient care record, often emsCharts. Some operators add Spidertracks for satellite tracking, NinthBrain for credentialing, Air Maestro for scheduling.

These tools are not *bad*. They were built by people who cared about the work. Each does its slice of the job competently.

What they do not do — collectively, in concert, in real time — is catch the failure modes the NTSB keeps naming in case after case after case. They do not flag, before takeoff, that the same flight was just refused by three other operators for weather. They do not re-score the pre-flight risk assessment as conditions change at the aircraft six hours into a duty day. They do not cross-reference the patient's clinical acuity against the receiving facility's actual capability tonight, with surgical theater availability and blood bank status. They do not realize that the dispatcher answering the phone has never been trained to recognize the difference between a precautionary landing and a request to abandon a mission. They do not realize that the maintenance team putting the aircraft back into service without replacing the suspected component has missed a documented PC-12 NG failure mode.

They do not connect the airworthiness reality to the operational decision. They do not connect the medical decision to the aviation envelope. They do not give the pilot a peer in the operations center who actually understands what the pilot is looking at out the windscreen.

The people in those operations centers are usually doing their best with the tools they have. The tools they have were designed to track operations, not to participate in safety decisions.

---

## What needs to be different

A dispatch and operations-control layer for medevac that actually catches the failure modes the safety board names will need to do several specific things that nothing in the current stack does:

**It will need to know aviation at the level of a certificated dispatcher.** Meteorology to the depth required by the FAA Part 65 Subpart C dispatcher curriculum. Performance and weight-and-balance to the standard required for Part 121 release decisions. Operational rules for Part 135 air ambulance — both helicopter Subpart L and fixed-wing AC 135-15 — at the level required to spot a launch decision that violates the operator's own approved limits.

**It will need to know clinical care at the level of an emergency medical dispatcher.** The IAED Medical Priority Dispatch System protocols. The capability-level matching of patient acuity to receiving facility. The understanding of what equipment, crew, and configuration a NICU transport requires that a trauma scene response does not.

**It will need to know the operator's reality, not the regulatory floor.** The actual maintenance status of the actual aircraft, including open MEL items, deferred discrepancies, and the operator's own ops specs limitations. The actual crew rest state, including time-zone shifts, prior-week sleep, and fatigue exposure beyond what the duty/rest regulation captures. The hospital helipads' actual operating hours and weight limits. The local airspace's actual NOTAMs.

**It will need to keep watching after the flight launches.** Not a one-time pre-flight score, but a continuous risk assessment that re-scores as conditions change, as the duty day extends, as weather develops along the actual flown route. The Hazelhurst, Wisconsin fatality of 2018 was approved on a pre-flight risk assessment scored *five hours and thirteen minutes* before the helicopter hit the ground. That score was never refreshed.

**It will need to share, across operators, the information that no single operator can have alone.** When three operators in a region refuse the same flight for the same weather, the fourth operator should know about those refusals before launching. The Survival Flight crash in Zaleski, Ohio in 2019 — three fatal — flew into weather that three other operators had already turned down. The information existed. It was not connected.

**It will need to be defensible.** Every decision it makes, every input it considered, every rule it applied, every override it accepted — captured in an audit record that survives a subpoena, a Federal Aviation Administration enforcement action, a National Transportation Safety Board investigation, an insurance claim, a civil suit, a Centers for Medicare and Medicaid Services billing audit. Designed around the worst-case forensic use, not the average user.

That last point is the part of this that is not just a software product. It is a substrate. It is the part the existing software stack cannot retrofit, because it was not designed for it.

---

## What we are building

A dispatch worker for medevac operations that does the things above. Built as a digital worker in the SOCIII platform. Authored by a working Part 135 medevac pilot, on the same SDK that any domain expert in any regulated profession can use to author a worker for their own work.

We are starting with the dispatch decision: the go/no-go call, the aircraft selection, the crew assignment, the route plan, the receiving-facility selection. We are building it to consume the data the operator already has — Flight Vector for dispatch state, ForeFlight for flight planning, RAMCO for maintenance reality, emsCharts for clinical record interoperability where the HIPAA boundary permits, the NOAA HEMS Tool for weather, public NOTAM and TFR feeds. We are building it to push the dispatch output where the pilot already works — into ForeFlight via the published Dispatch API, so the brief shows up in the pilot's iPad without the pilot having to do anything different.

We are building the audit layer underneath it — the layer that no existing dispatch tool has — because the safety case the NTSB has been making for twenty years rests on a documented record of who knew what when, and that record does not exist today.

We are not building a crypto product. We are building infrastructure. The audit anchor is, for the patient and their family and the pilot and the medical crew, the difference between a deposition that goes one way and a deposition that goes the other way.

We will ship it as an open SDK so other working pilots, with their own operational reality and their own state regulatory overlay, can fork it for their own operations. We will ship the substrate it runs on as a closed and patented platform, because the substrate is the moat and the moat is what keeps the platform viable long enough to matter.

We are starting with one operator. We are starting with one rural clinic in Alaska that will, when this is running, have access to the same dispatch intelligence as a Level I trauma center in Seattle. We are starting with one receiving hospital that will, when this is running, see what is coming, prepped exactly the way it needs to be prepped, before the helicopter is wheels up at the sending site.

We are starting because the system as it stands today catches the patient about half the time — and the other half of the time the catch is the pilot and the medical crew, doing it manually, under stress, alone.

That is not safety. That is luck.

We are building this because it should not be luck.

---

*The PC-12 in the story above landed safely. The patient survived the diversion and was transported by alternate means. The aircraft was returned to service the day after the incident. The aircraft is still flying. The valve has not been replaced.*

*The pilot is fine.*

*Most days, in this industry, the pilot is fine.*

*The point of this work is to make "most days" into "every day," and to take the burden of that off the pilot.*
