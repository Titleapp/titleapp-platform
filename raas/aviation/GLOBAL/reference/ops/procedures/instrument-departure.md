# Instrument Departure Procedures

> Part 135 Reference Template -- White-labeled for generic operator use.
> Source knowledge derived from operational training materials for Pilatus PC-12NG with Honeywell APEX avionics.
> All regulatory references (FARs, TERPS, AIM) and instrument procedure standards retained verbatim.

---

## 1. Overview

This document covers the requirements, types, standard operating procedures, and avionics setup for instrument departure procedures under Part 135 operations. Instrument departures are not optional in Part 135 -- they are required when published for the departure airport.

**Key topics:**
- Departure procedure requirements and regulatory basis
- Types of instrument departures (ODPs and SIDs)
- Construction assumptions and obstacle clearance standards
- Standard operating procedures for departure configuration
- Avionics setup (ForeFlight and FMS)
- Worked examples
- Common errors and mitigations

---

## 2. Requirements

### Regulatory Basis

Under **14 CFR Part 135**, operators are required to comply with published instrument departure procedures. Unlike Part 91 operations, where ODPs are considered "optional" (though strongly recommended), **Part 135 operators MUST fly ODPs when published** for the departure runway.

### Ops Spec C063

SIDs that require RNAV capability may only be flown if the operator holds **Ops Spec C063** (or equivalent operations specification authorizing RNAV SID operations). Verify your operator's current Ops Specs before accepting or filing RNAV SIDs.

---

## 3. Types of Instrument Departures

### Obstacle Departure Procedures (ODPs)

- Published when an **obstacle penetrates the 152 feet per nautical mile** departure surface gradient.
- ODPs are designed solely for obstacle clearance -- they do not consider traffic flow or ATC requirements.
- ODPs are **textual** (described in words, not charted as a graphic procedure) in most cases, though some have graphic depictions.
- **Do not require RNAV capability** -- ODPs are designed to be flown with conventional navigation (VOR, NDB, or dead reckoning heading).
- **MUST be flown under Part 135** when published for the departure runway, unless ATC provides an alternative clearance that ensures obstacle clearance (e.g., radar vectors with a minimum vectoring altitude that provides clearance).

### Standard Instrument Departures (SIDs)

- Published primarily for **traffic flow management** and ATC efficiency, not solely for obstacle clearance (though they may incorporate obstacle clearance).
- SIDs are always charted as graphic procedures with detailed routing.
- **May require RNAV capability** -- RNAV SIDs are increasingly common and require GPS/FMS navigation capability and the appropriate Ops Spec (C063).
- SIDs are assigned by ATC as part of the IFR clearance. If a SID is assigned that requires RNAV and the operator is not authorized, the crew must advise ATC and request an alternative.

---

## 4. Departure Procedure Construction Assumptions (TERPS)

All published instrument departure procedures (ODPs and SIDs) are constructed using the following standard assumptions from the U.S. Standard for Terminal Instrument Procedures (TERPS):

| Parameter | Standard Value |
|-----------|---------------|
| Height at departure end of runway | **35 feet AGL** |
| Minimum turn altitude | **400 feet AGL** (no turns below this altitude) |
| Required climb gradient | **200 feet per nautical mile** (standard) |

- The aircraft is assumed to cross the departure end of the runway at 35 feet AGL.
- No turns are permitted below 400 feet AGL unless the procedure specifically states otherwise.
- The standard climb gradient is 200 feet per nautical mile. If a procedure requires a **non-standard climb gradient** (e.g., 300'/NM, 400'/NM), it will be noted on the procedure chart and/or in the takeoff minimums section. Crews must verify the aircraft can meet any non-standard gradient at the planned takeoff weight, altitude, and temperature before accepting the procedure.

---

## 5. ForeFlight Integration

### Accessing Departure Procedures

In ForeFlight, departure procedures are located under the **Departures tab** on the airport information page. Two categories are displayed:

- **Obstacle** -- Lists ODPs (textual obstacle departure procedures).
- **RNAV** -- Lists RNAV SIDs and RNAV ODPs.

### Takeoff Minimums

The **TAKEOFF MINIMUMS** section (accessible via ForeFlight or the TPP) provides critical additional information that may not be visible on the procedure chart itself:

- **No entry** -- If no takeoff minimums are published for the airport, standard minimums apply. Depart on the runway heading and climb to 400 feet AGL before making any turns.
- **"N/A"** -- Departure under IFR is **not authorized** from that runway or airport. Do not depart IFR.
- **Specific runway procedures** -- Detailed textual instructions for each runway, including required climb gradients, turn instructions, and ceiling/visibility minimums. Read these carefully before every IFR departure.

---

## 6. Standard Operating Procedure -- Departure Configuration

### Initial Departure (All Types)

1. Configure the autopilot flight director for **ROL (Lateral) / GA (Vertical)** mode for the initial departure roll and climb.
   - ROL holds wings level on the runway heading.
   - GA commands the go-around pitch attitude for initial climb performance.
2. Maintain ROL/GA through rotation and initial climb to **400 feet AGL**.

### At 400 Feet AGL

3. At 400 feet AGL (or the procedure-specified turn altitude, whichever is higher), transition to the departure procedure:
   - **HDG mode** -- Select heading mode and set the heading bug to the required departure heading or course. Use HDG when the procedure calls for a specific heading to fly.
   - **NAV mode** -- Engage NAV mode when the procedure calls for tracking a course or FMS route (VOR radial, GPS course, FMS flight plan). Verify the correct navigation source (FMS, VOR, LOC) is active before engaging NAV.

### Mode Selection Guidance

| Procedure Requirement | Mode to Use | Notes |
|----------------------|-------------|-------|
| "Fly runway heading" | HDG | Set heading bug to runway heading |
| "Fly heading XXX" | HDG | Set heading bug to assigned heading |
| "Track XXX course" | HDG or NAV | HDG to intercept, NAV once established (verify TRK vs HDG -- see Common Errors) |
| "Direct [fix]" | NAV | Load fix in FMS, verify NAV source, engage NAV |
| "Climb via SID" | NAV | Full FMS route loaded, verify waypoint sequence |
| "Radar vectors" | HDG | Fly assigned headings from ATC |

---

## 7. Worked Examples (KRNO -- Reno/Tahoe International)

The following examples use KRNO to illustrate different departure procedure types. The specific procedures shown are representative of real-world complexity. Crews should use these examples as study aids for their own departure airports.

### Example 1: ODP -- SPARKS ONE Departure

- **Type:** ODP (Obstacle Departure Procedure)
- **Navigation required:** Conventional (VOR)

**Setup:**
1. Tune the Mustang VOR (FMG), frequency 117.9.
2. Load the SPARKS ONE departure in the FMS.

**Execution:**
1. Depart ROL/GA.
2. Climb to 400 feet AGL.
3. At the turn altitude specified on the procedure (or 400 feet AGL if none specified), either:
   - Select **NAV** mode if the FMS course is correctly sequenced to the first fix, OR
   - Select **HDG** mode and set the heading bug to intercept the required VOR radial or course, then transition to NAV once established.
4. Comply with all altitude restrictions on the departure.

### Example 2: Non-RNAV SID -- MUSTANG ONE Departure

- **Type:** SID (Standard Instrument Departure), Non-RNAV
- **Navigation required:** VOR + LOC

**Setup:**
1. Load the MUSTANG ONE departure in the FMS.
2. Tune I-RNO LOC (localizer), frequency 110.9, course 167.
3. Tune Mustang VOR (FMG), frequency 117.9.

**Execution:**
1. Depart ROL/GA.
2. At 400 feet AGL, select **HDG** mode and fly heading 177 (or the runway-specific heading on the chart).
3. Transition to **NAV** to intercept the LOC course 167, OR maintain HDG and fly **TRK 167** to intercept.
4. At RIJTU intersection (LOC 3.0 DME from I-RNO), turn left direct Mustang VOR (FMG).
5. Continue per the published SID routing.

### Example 3: Non-RNAV SID -- RENO ONE Departure

- **Type:** SID, Non-RNAV
- **Navigation required:** VOR + LOC

**Setup:**
1. Load the RENO ONE departure in the FMS.
2. Tune I-RNO LOC, frequency 110.9, course 167.

**Execution:**
1. Depart ROL/GA.
2. At 400 feet AGL, follow the runway-specific instructions on the chart. Different runways have different initial headings and turn points.
3. Comply with all charted altitude and course restrictions.

> **Note:** The RENO ONE has different procedures for each runway. Brief the specific runway in use and confirm the correct routing before takeoff.

### Example 4: RNAV SID -- PVINE FIVE Departure

- **Type:** SID, RNAV (requires Ops Spec C063)
- **Navigation required:** GPS/FMS only (no conventional navaids required)

**Setup:**
1. Load the PVINE FIVE departure in the FMS. Verify the waypoint sequence matches the chart.
2. No conventional navaid tuning required.

**Execution:**
1. Depart ROL/GA.
2. From Runway 35L/35R: At 400 feet AGL, select **HDG** mode and fly heading 347.
3. At **4920 feet MSL**, engage **NAV** mode. The FMS will sequence to the first RNAV waypoint.
4. Continue per the published SID routing and altitude restrictions.

> **Note:** The altitude trigger (4920 MSL) for NAV engagement is specific to this procedure. Always verify the procedure-specific transition altitude before departure.

---

## 8. Common Errors and Mitigations

### HDG vs TRK Confusion

- **HDG (Heading)** is referenced to magnetic north and does not account for wind. The aircraft flies a constant magnetic heading.
- **TRK (Track)** is the aircraft's actual path over the ground, corrected for wind. The autopilot adjusts heading to maintain the desired ground track.
- Some departure procedures specify "fly heading XXX" while others specify "fly track XXX." These are not interchangeable. Using HDG mode when the procedure requires TRK (or vice versa) can result in the aircraft drifting off the required course, particularly in strong crosswind conditions.
- **Mitigation:** Read the procedure text carefully. If it says "heading," use HDG mode. If it says "track," verify your autopilot TRK mode is properly engaged and the correct track value is set.

### GA Button Resets NAV Source

- On the Honeywell APEX (and similar integrated avionics), pressing the **GA (Go-Around) button** may switch the CDI navigation source back to the FMS, even if the crew had manually selected a VOR or LOC source.
- This is by design (the avionics assume a missed approach will use the FMS), but it can cause confusion during departure if the crew expects the CDI to remain on a VOR or LOC source after pressing GA for the initial climb.
- **Mitigation:** After pressing GA for departure, immediately verify the CDI navigation source. If the procedure requires VOR or LOC tracking, re-select the correct source before engaging NAV mode.

### Loading the Wrong Procedure

- At airports with multiple departure procedures (KRNO has 6+), it is easy to load the wrong procedure in the FMS, especially under time pressure.
- **Mitigation:** Always cross-check the FMS-loaded procedure against the paper/electronic chart. Verify the procedure name, runway, and waypoint sequence. Brief the departure procedure with the crew before taxi.

---

## 9. Principles

- **Slow is smooth, smooth is fast.** Take the time to set up correctly. Rushing departure procedure programming leads to errors.
- **Communicate with ATC and crew.** Brief the departure procedure, confirm the clearance, and verbalize mode changes during the departure.
- **Trust but verify the FMS.** The FMS is a tool, not a replacement for understanding the procedure. Always verify the FMS routing against the published chart. If the FMS and the chart disagree, fly the chart and advise ATC.

---

*This document is a white-labeled reference template. Operators must adapt examples to their own departure airports, fleet avionics, and Ops Specs before use.*
