# What do you fucking hate about your job that's obvious to you and invisible to your manager?

*The "OF for smart people" principle, told through the case of why nobody has fixed medevac dispatch yet.*

---

## The principle

There is a question that, once you start asking it of people who actually do skilled professional work for a living, never stops yielding answers.

The question is: **what do you absolutely hate about your job that is completely obvious to you, and completely invisible to whoever runs the meeting?**

Ask a senior paralegal. Ask a Part 135 chief pilot. Ask an ER charge nurse on her fifteenth year. Ask a county recorder who's been processing deeds for two decades. Ask a maintenance controller at a regional Part 135 op. Ask a senior escrow officer. Ask a dispatcher at a CRE leasing brokerage. Ask an underwriter who's seen the same insurance fraud pattern come through under three different names in the last ninety days.

They will not need a long warm-up. They will start telling you about the thing that breaks every week. They will tell you why it breaks. They will tell you what would catch it. They will tell you why it never gets caught.

Then they will tell you that they have brought it up at every staff meeting for the last four years, that the people in the meetings nod politely, that nothing changes, and that the reason nothing changes is that the people running the meetings have never done the work, do not understand the work, and are budgeting against the wrong cost.

If you have run a regulated business and you have not noticed this pattern, the pattern is noticing you.

The SOCIII platform is the structural response to that pattern. The pitch is short: domain experts get an SDK, build a digital worker that catches the thing only they can see, and earn revenue every time someone subscribes to it. The platform handles the regulatory substrate, the audit trail, the identity layer, the billing.

This blog post is about one of those domains.

---

## Medevac dispatch, as a worked example

Helicopter air ambulance — the on-scene rotor-wing transport from a highway crash or a remote clinic — has been killing pilots, medical crews, and patients in the United States at a rate that any other regulated commercial aviation segment would not accept.

The numbers, from National Transportation Safety Board sources:

- From 2002 through 2005, NTSB counted **fifty-five air ambulance accidents** — **fifty-four fatalities, eighteen serious injuries** in four years. Roughly one fatal event per month for that entire period.
- From 2010 through 2015, NTSB counted **forty-seven helicopter air ambulance accidents — twenty-one fatal**. One fatal accident every three to four months.
- After 14 CFR Part 135 Subpart L took effect in 2016, requiring Operations Control Centers at larger HEMS operators, fatal accidents fell to roughly **one per year** from 2016 through 2021. The rule worked.
- The rule did not work *enough*. **The current Part 135 air ambulance fatal accident rate is still approximately fifty to one hundred times worse than Part 121 scheduled airline operations** and three to four times worse than non-medevac Part 135 charter.
- A VFR-rated helicopter pilot who inadvertently enters instrument meteorological conditions has approximately a **fourteen percent survival rate**.

NTSB's 2024 special investigation report on Part 135 operations — AIR-24-03 — identified **twelve specific accidents between 2010 and 2022 where operational control or flight-locating deficiencies were direct contributing factors**. Those twelve accidents alone account for **forty-five fatalities and thirteen serious injuries**.

A few of those twelve, in summary, from the public record:

**Survival Flight, Zaleski, Ohio, January 2019.** Bell 407 helicopter, night flight, snow and instrument conditions, controlled flight into forested terrain. Three fatalities. NTSB found that the accepting pilot reviewed the weather for approximately twenty-eight seconds before launching. **Three other operators had already refused the same flight** for weather. The operations control specialist handling the flight, per the report, "did not fully use the weather tool available for preflight and in-flight planning."

**Air Methods, Enterprise, Alabama, March 2016.** Night helicopter air ambulance, visual flight rules into instrument meteorological conditions, controlled flight into terrain shortly after pickup. Three fatalities. NTSB found that **the operations control computer program had destination coordinates entered in the wrong format**, returned weather for the wrong location showing visual conditions when the actual destination was in instrument conditions, and that after the helicopter had departed, the operations control specialists discovered the error but **did not alert the pilot**.

**Air Methods, Hazelhurst, Wisconsin, April 2018.** Single-pilot helicopter, night cruise, loss of control. Three fatalities. Probable cause, per NTSB: "the pilot's loss of helicopter control as a result of fatigue during cruise flight at night." The pre-flight risk assessment had been scored "low risk" and approved at 1727 hours — **over five hours before impact** — and was never re-scored as conditions and the duty day changed. Cockpit recordings captured the pilot yawning approximately fifty minutes before the loss of control. NTSB language: the scoring approach "provided the illusion of managing risk." Seventeen months after the accident, no company-wide fitness-for-duty change had been implemented.

**Air Methods, Mosby, Missouri, August 2011.** Four fatalities including the patient. Fuel exhaustion. The pilot had **told the communication specialist before takeoff that he did not have enough fuel to reach the hospital** and asked for help finding a fuel stop. The communication specialist was not qualified to provide that operational guidance, and the qualified operations control function was never looped in.

There are more.

The unifying NTSB finding across all twelve cases, in the language of AIR-24-03:

> *"Essential operational control functions, such as preflight weather and fuel planning, flight release, flight monitoring, or flight locating, were performed without adequate company procedures or by individuals who lacked the training, knowledge, or experience to effectively perform such critical safety duties."*

In plain language: the people in the operations centers, on the days when the accidents happened, were not the right people, did not have the right tools, and were not held to a standard that would have caught the flight before it killed the people on it.

This is the operational reality the working pilots, paramedics, and flight nurses in the industry have known for decades. It is the thing they hate about their job. It is the thing that, with rare exceptions, the people in the management meetings have not built a fix for.

---

## Why nobody has fixed this from inside the industry

Three structural reasons, each worth naming because each is the kind of structural reason that recurs across regulated professions.

**First**, the existing software stack is competent at the thing it was built for — tracking — and was not built for the thing the safety record requires, which is participating in safety decisions in real time. Flight Vector tracks status and currency. Baldwin manages safety reporting after the fact. RAMCO tracks maintenance. ForeFlight is a pilot's tool, not a dispatch tool. emsCharts records care after it happens. Each of these is, at its job, the right answer. Stacked together, none of them flag, before takeoff, that three other operators just refused this flight. None of them re-score the pre-flight risk assessment as the duty day extends and the weather develops. None of them cross-reference the patient's actual clinical acuity against the receiving facility's actual surgical theater availability tonight. None of them share data across operators in a way that closes the gap a single operations control center cannot close alone.

**Second**, the Operations Control Specialist role created by the 2014 rulemaking is an advisory role, not an authoritative one. Unlike a certificated dispatcher in Part 121 scheduled airline operations — who shares legal operational control with the captain and can refuse to release or recall a flight — the OCS in helicopter air ambulance cannot override the pilot's decision to launch into a hazard the OCS has identified. They can flag. They cannot stop. That structural asymmetry is the wedge NTSB has been pushing on for years, and in 2024 finally formalized as Safety Recommendation A-24-13: *require certificated dispatchers, holding joint operational control authority with the PIC, in all Part 135 operations except single-pilot operations.* That recommendation is not yet rule. The notice of proposed rulemaking has not been issued.

**Third**, the people in the seats are usually doing their best with the tools they have, and the tools they have were designed under a budget that assumed the role was administrative rather than safety-critical. Industry conversation pegs the typical entry-level salary for a medevac communication-center staffer in the high teens to low twenties per hour. Compare that to the salary required to attract someone with both a Part 65 dispatcher certificate's depth of aviation knowledge and an IAED Emergency Medical Dispatcher certificate's depth of clinical triage knowledge, and the gap explains itself. The operators that try to hire to that combined standard cannot find candidates. The candidates do not exist because the training pipeline does not exist. The training pipeline does not exist because the regulatory floor does not require it.

Operationally, in the cases NTSB documents, what stands between the patient and the newspaper is the pilot, the medical crew, and luck.

This is not safety. This is a system held together by individual heroism.

The medical crews, on average, are good. The pilots, on average, are good. The senior people in the field are *very* good. The system as it currently exists could not function if the senior practitioners were not, every shift, manually catching the things the system did not catch.

When a senior practitioner is not on shift — when the pilot is the third-year captain, when the OCS is a six-month hire, when the flight nurse is filling in from the ground service for the weekend — the system performs the way it was designed.

That is the day the newspaper writes about it.

---

## The "OF for smart people" principle, applied

This is what the SOCIII platform is for. The thesis is short:

Domain experts are sitting on the answer to the question above for every regulated profession in the country. Pilots, paralegals, nurses, escrow officers, dispatchers, county recorders, controllers, underwriters, charge nurses, lab directors. The thing they fucking hate about their job is the thing they could fix if they had a way to capture their judgment in code and ship it as a tool.

For thirty years there has been no economic mechanism for them to do that. They could quit and start a SaaS company — most don't, because they would rather do the work. They could write a book — books go stale and never get read by the operations managers who needed them most. They could run a training program — training programs scale linearly and the senior practitioner ages out. They could be a paid expert witness in the litigation that follows the accident — by which point everyone the expert witness might have saved is already dead.

What they have not had, until now, is a way to take the rules they know, encode them in a digital worker that runs against AI, ship that worker into the market, and earn revenue every time a customer subscribes to it.

That is what an SDK plus a marketplace plus an audit substrate is for.

The worker we are starting with — `dispatch-medevac-001` — does the dispatch and operations-control function for medevac in a way that the existing stack does not. It cross-references the patient's acuity to the receiving hospital's actual capability tonight. It pulls actual weather, actual NOTAMs, actual maintenance state of the actual aircraft. It re-scores the pre-flight risk assessment as the duty day extends. It maintains a cross-operator turndown registry so that the fourth operator knows when three others have already refused the flight. It does the math an FAA-certificated airline dispatcher would do, while preserving the legal operational authority of the pilot-in-command that Part 135 requires. It captures every decision, every input, every override in an audit record that survives a National Transportation Safety Board investigation, a Federal Aviation Administration enforcement action, a Centers for Medicare and Medicaid Services billing audit, and a civil deposition.

It will be built by a working pilot. The platform supplies the substrate — the rule engine, the audit chain, the identity layer, the billing rail, the patent moat. The pilot supplies the thirty years of knowing what should and should not get caught.

When that worker ships and a clinic in rural Alaska or a hospital in central Wyoming subscribes to it, the dispatch intelligence that the senior practitioner has been manually providing in the head of one captain on one shift becomes the dispatch intelligence that the system provides on every shift, for every flight, on every aircraft, in every operator that subscribes.

This is what scale means when you actually have the right people authoring.

---

## What we are doing next

We are starting the dispatch worker. We are publishing the SDK so other working pilots in other regulated specialties — and working paralegals, working nurses, working escrow officers, working county recorders — can fork it and build the worker they would have built if anyone had given them the time and the leverage.

We are not running a fundraising tour right now. The platform is being built by the founder, who is a working Part 135 pilot, on his own time, alongside the flying. The dispatch worker is being built because the safety record of the industry he flies in is what it is, and because the question at the top of this post is the question that keeps yielding answers.

When the platform raises, the founder will tell the founding story in long form. For now, the founding story is the question.

What do you fucking hate about your job that's obvious to you and invisible to your manager?

If you have an answer, the SDK is open. The instructions are at `sociii.ai/docs/install`. Bring the thing you hate and the rules you know. The platform will handle the rest.

---

*This post cites the public NTSB record. Specific names of accidents, cases, and dates are matters of public record published by the National Transportation Safety Board and are linked in the source footer. Operating companies named in this post are named because they appear in the published NTSB findings. Nothing in this post should be construed as describing or commenting on any active or non-public investigation.*

*Sources: NTSB Special Investigation Report AIR-24-03 (2024); NTSB Safety Recommendation A-24-13; NTSB Special Investigation SIR-06-01; NTSB Accident Report AAR-20/01; case files CEN19FA072, ERA16FA140, CEN11FA599, N127LN; 14 CFR Part 135 Subpart L; FAA AC 135-14B; FAA AC 135-15; published industry safety analysis in *Air Medical Journal*, *Prehospital and Disaster Medicine*, and the Journal of Aviation/Aerospace Education and Research.*
