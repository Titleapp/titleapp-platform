# King Air Family -- Training Procedures & Standards Reference

> Sources:
> - FlightSafety International King Air C90A/B/GT Pilot Training Manual (Rev 1.2)
> - FlightSafety International King Air 200/B200 Pilot Training Manual (Rev 1.2)
> - FlightSafety International B200GT Client Guide
> - FlightSafety International King Air 350/350C Pro Line 21 Pilot Training Manual
> FOR TRAINING REFERENCE ONLY

---

## 1. King Air Family Overview

The Beechcraft King Air family comprises three primary airframe sizes, all sharing the Pratt & Whitney Canada PT6A turboprop engine platform and a common design philosophy. All are FAR Part 23, Normal Category, approved for single-pilot operations.

| Model | Engine | SHP (each) | Wingspan | MTOW (lbs) | Max Alt | Pressurization |
|---|---|---|---|---|---|---|
| C90A/B/GT | PT6A-21 | 550 | 50 ft 3 in | 9,650-10,100 | Refer to AFM | Refer to AFM |
| 200/B200/B200GT | PT6A-42/52 | 850 | 54 ft 6 in | 12,500 | 35,000 ft | 6.0-6.6 psid |
| 350/350C/350ER | PT6A-60A | 1,050 | 57 ft 11 in | 15,000-16,500 | 35,000 ft | 2.0-4.6 psid |

### Tail Configuration
- C90 series: Conventional tail
- 200/B200 series: T-tail
- 350 series: T-tail

### Avionics Suites (by era)
- Collins Pro Line II (older C90A, 200)
- Collins Pro Line 21 (350/350C, later B200)
- Garmin G1000 (select newer models)

---

## 2. Common Systems Across the Family

### PT6A Turboprop Engine (All Models)
The PT6A is a free-turbine turboprop. Key characteristics common to all King Air variants:
- Reverse-flow annular combustion chamber
- Free power turbine (not mechanically linked to compressor turbine)
- Compressor section driven by compressor turbine (Ng/N1)
- Power section drives propeller through reduction gearbox (Np/N2)
- Beta range for ground operations (below flight idle gate)
- Fuel condition lever controls fuel shutoff (not power in flight)
- Power lever controls fuel flow and thereby power output

### Electrical Architecture (All Models)
All King Air variants share a common multi-bus electrical architecture:
- 28 VDC primary system
- Dual starter/generators (250A on C90/200, 300A on 350)
- Multi-bus distribution: Left Gen, Right Gen, Center, Triple-Fed, Battery, Hot Battery
- Hall effect current sensors for automatic bus isolation
- GEN TIES switch for manual bus tie control
- BUS SENSE switch for reset/test
- Current limiters (250-275A on gen/center buses, 60A on triple-fed)
- Load shedding on dual generator failure
- AC power from dual inverters (115 VAC / 26 VAC at 400 Hz)
- External power receptacle (28 VDC, AN-type plug)

### Pressurization (200/B200/350)
- Automatic and manual controllers
- Bleed air from compressor section
- Safety valve prevents exceeding max differential
- Negative pressure relief valve
- Outflow valve modulates cabin altitude
- The 200 and 350 have different pressurization differential limits; always reference model-specific values

---

## 3. Normal Procedures

### Preflight Flow
Common elements across all King Air models:
1. Cockpit preparation -- battery ON, check voltages and annunciators
2. Exterior walk-around (model-specific checklist)
3. Fuel quantity verification
4. Control surface freedom of movement
5. Ice protection system check (visual on boots, check fluid if equipped)
6. Propeller and engine inlet inspection
7. Landing gear and tire inspection
8. Pitot/static system inspection

### Engine Start Sequence (All Models)
The PT6A start sequence is fundamentally the same across the family:
1. Battery -- ON (verify min 24V; 23V minimum recommended for external power)
2. Fuel boost -- as required per model
3. Fuel condition lever -- CUTOFF
4. Power lever -- IDLE (or below flight idle gate per model)
5. Ignition and Engine Start switch -- ON (or START position)
6. Monitor Ng rise and ITT
7. At specified Ng (typically 12-15%), fuel condition lever -- LOW IDLE
8. Monitor ITT for hot start limit (C90: 1,090 C; B200GT: 1,000 C)
9. Monitor for light-off (ITT rise, fuel flow indication)
10. Starter limits: C90/200: 40s ON/60s OFF/40s/60s/40s/30min; 350: 30s ON/5min OFF/30s/5min/30s/30min
11. At stable idle, check all engine instruments in limits
12. Generator -- ON (switch to RESET then ON)
13. Repeat for second engine (cross-start available using operating generator)

### Cross-Start Procedure
- With one engine running and its generator on line
- Cross-start relay bypasses generator bus, current limiter, and bus tie relay
- Hall effect sensors disabled during start to prevent false bus isolation
- Battery bus tie desensitized for starting

### After-Start Checks
1. Both generators -- ON and sharing load within 2.5%
2. AC power -- verify 115 VAC, 400 Hz (cycle inverters)
3. Avionics master -- ON
4. Pressurization -- set for departure altitude
5. Ice protection -- as required
6. Trim -- set for takeoff
7. Flight instruments -- cross-check

### Taxi
- Minimum power to start rolling; avoid excessive brake use
- Power levers in the Beta range for ground maneuvering
- Turning radius reference: C90 = 35 ft 6 in (wingtip)
- Nosewheel steering via rudder pedals
- Verify brakes, flight instruments, nosewheel steering during taxi

### Before Takeoff
1. Flight controls -- free and correct
2. Trim -- set
3. Flaps -- as required (normally approach or up for normal takeoff)
4. Fuel -- balanced, selectors confirmed
5. Pressurization -- set
6. Props -- full forward (maximum RPM)
7. Engine instruments -- all green
8. Ice protection -- as required
9. Transponder -- on, altitude reporting
10. Autopilot -- check and disengage for takeoff

### Takeoff (Normal)
1. Power levers -- advance smoothly to takeoff power
2. Verify engine instruments (torque, ITT, Ng, Np) within limits
3. Rudder to maintain centerline
4. Rotate at Vr per AFM
5. Positive rate -- gear UP
6. Accelerate to Vy or cruise climb speed per schedule
7. At appropriate altitude, reduce to climb power

### B200GT Suggested Takeoff Power
- Torque: 2,100-2,230 ft-lbs
- Prop RPM: 2,000

---

## 4. Cruise Climb Speed Schedules

### C90A/B
Refer to the aircraft-specific AFM for cruise climb speeds by altitude band.

### B200/B200GT

| Altitude Band | Speed (KIAS) |
|---|---|
| Sea level to 10,000 ft | 160 |
| 10,000 to 20,000 ft | 140 |
| 20,000 to 25,000 ft | 130 |
| 25,000 to 35,000 ft | 120 |

### 350/350C/350ER

| Altitude Band | Speed (KIAS) |
|---|---|
| Sea level to 10,000 ft | 170 |
| 10,000 to 15,000 ft | 160 |
| 15,000 to 20,000 ft | 150 |
| 20,000 to 25,000 ft | 140 |
| 25,000 to 30,000 ft | 130 |
| 30,000 to 35,000 ft | 120 |

---

## 5. Approach and Landing

### B200GT Power Settings (from FlightSafety Client Guide)

| Phase | Torque (ft-lbs) | Prop RPM |
|---|---|---|
| Descent | 800 | 1,700 |
| ILS Approach | 600-700 | 2,000 |
| Non-Precision Approach | 400 | 2,000 |
| MDA Holding | 1,000 | 2,000 |

### Approach Speed Reference (B200GT)
- Vref + 30 KIAS for flaps-up configuration (engine-out practice)
- Vs1 = 99 KIAS (clean stall)
- Vs (approach config) = 85 KIAS
- Vs0 = 75 KIAS (full flaps)

### Normal Approach Sequence (All Models)
1. ATIS/weather -- obtain and brief
2. Approach briefing -- type, minimums, missed approach
3. Pressurization -- set for field elevation
4. Descent -- configure per power settings table
5. Before landing checklist: gear DOWN (verify three green), flaps as required, props FULL FORWARD, fuel balanced
6. Stabilized approach by 1,000 AGL (IFR) or 500 AGL (VFR)
7. At decision altitude or MDA: land or go around
8. Touchdown and reverse: power levers below flight idle gate (Beta), then into reverse as needed
9. Taxi clear, after-landing checklist

### Crosswind Considerations
- B200GT max crosswind: 25 knots (20 for coupled approaches)
- 350 max crosswind: 20 knots
- C90: refer to AFM

---

## 6. Single-Engine Operations

### Vmca Comparison

| Model | Vmca (flaps up) | Vmca (flaps approach) |
|---|---|---|
| C90A | 90 KIAS | -- |
| C90B | 80 KIAS | -- |
| B200/B200GT | 86 KIAS | -- |
| 350 | 94 KIAS | 93 KIAS |
| 350ER | 101 KIAS | 98 KIAS |

### Blue Line (Vyse) Comparison

| Model | Vyse |
|---|---|
| C90A/B | Refer to AFM |
| B200/B200GT | 121 KIAS |
| 350/350ER | 125 KIAS |

### Engine Failure After Takeoff (Common Memory Items)
This sequence is fundamentally the same across all King Air models:
1. Mixtures -- FULL FORWARD
2. Props -- FULL FORWARD
3. Power levers -- MAX ALLOWABLE
4. Flaps -- UP
5. Landing gear -- UP (positive rate confirmed)
6. IDENTIFY: Dead foot = dead engine
7. VERIFY: Retard power lever on suspected engine, observe instruments
8. SECURE failed engine: Fuel condition lever CUTOFF, prop FEATHER, generator OFF, bleed air CLOSED

### Bank Angle
- 3-5 degrees toward operating engine (zero sideslip technique)
- Reduces drag significantly compared to wings-level with rudder alone
- Use rudder trim to relieve control forces

### Single-Engine Approach (B200GT Specifics)
- Double the torque setting of a normal approach on the operating engine
- Rudder boost activates at approximately 1,400 ft-lbs torque
- Maintain Vyse (121 KIAS) or Vref+10 until landing assured
- Go-around: max allowable power, retract flaps and gear, accelerate to Vyse

---

## 7. Emergency Procedures

### Engine Fire -- In Flight (All Models)
1. Failed engine -- SECURE (condition lever CUTOFF, prop FEATHER)
2. Fuel supply -- OFF
3. Bleed air -- CLOSED
4. Generator -- OFF
5. Firewall shutoff valve -- CLOSE
6. Fire extinguisher -- DISCHARGE (if equipped and fire persists)
7. Land as soon as practical

### Engine Fire -- On Ground (All Models)
1. Continue cranking (motoring) to draw fire into engine
2. Fuel condition lever -- CUTOFF
3. If fire persists: fuel shutoff, fire extinguisher, evacuate

### Dual Generator Failure (All Models)
1. Check both generators -- attempt RESET
2. If no reset, turn both generators OFF
3. Load shedding is automatic (gen bus loads shed)
4. Battery powers: center bus, triple-fed bus, hot battery bus
5. Endurance approximately 30 minutes (50A load, 75% battery)
6. Reduce electrical load to essential items only
7. LAND AS SOON AS PRACTICAL
8. Do NOT manually close generator ties (this reconnects gen bus loads and drastically reduces battery time)
9. On 350: operable equipment indicated by white circle on control switch

### Electrical Bus Fault/Isolation
- Automatic bus isolation via Hall effect sensors
- Monitor: GEN TIE OPEN, BAT TIE OPEN, DC GEN annunciators
- BUS SENSE RESET to attempt recovery
- If unsuccessful, investigate cause per POH abnormal procedures
- Center bus fault (0V): open generator ties, pull landing gear relay CB (350)

### Rapid Decompression (200/B200/350)
1. Oxygen masks -- ON (100%)
2. Emergency descent -- initiate immediately
3. Emergency descent speed: 181 KIAS (200/B200), 184 KIAS (350)
4. Descend to 10,000 ft or MEA (whichever is higher)
5. Pressurization controller -- check/troubleshoot
6. Divert to nearest suitable airport

### Turbulent Air Penetration
- All King Air models: 170 KIAS
- Disengage autopilot altitude hold (use attitude hold if available)
- Maintain wings level, accept altitude deviations
- Avoid abrupt control inputs

---

## 8. CRM and Decision-Making

### T-DODAR Framework (from B200GT Client Guide)
A structured decision-making model for time-critical scenarios:

| Step | Action |
|---|---|
| T -- Time | How much time is available? |
| D -- Diagnose | What is the problem? Gather information. |
| O -- Options | What are the available courses of action? |
| D -- Decide | Select the best option. |
| A -- Assign | Delegate tasks. Brief the plan. |
| R -- Review | Monitor execution. Adjust as needed. |

### Situational Awareness
- Maintain continuous SA across all phases of flight
- Monitor: aircraft state, systems state, environment, flight path
- Use automation wisely -- understand what the autopilot is doing
- Callouts: altitude, speed, configuration changes, abnormalities

### HF:RMA Assessment Card (from B200GT Client Guide)
Human Factors Risk Management Assessment:
- Pre-flight self-assessment of fitness, fatigue, stress, medications
- Identify threats and errors before they compound
- Use checklists, standard callouts, and briefings to trap errors

### Communication
- Standard callouts for all critical phases
- Pre-takeoff briefing: departure procedure, engine failure plan, abort criteria
- Approach briefing: type, minimums, missed approach, go/no-go criteria
- Clear handoff of controls: "I have the controls" / "You have the controls"

### Memory Aids (from B200GT Client Guide)

**VIPP -- FMS Initialization:**
- V = Verify database currency
- I = Initialize position
- P = Program flight plan
- P = Performance data entry

**Approach Setup Mnemonic (SNAPA or similar per operator):**
Use operator-standard approach setup mnemonics to ensure consistent configuration.

---

## 9. Training Maneuver Standards

### Engine Failure in Flight
- Identify, verify, and secure within a reasonable time
- Maintain Vyse or blue line throughout
- Bank 3-5 degrees toward operating engine
- Demonstrate proper securing sequence
- Demonstrate restart procedures if applicable

### Single-Engine ILS Approach
- Configure: gear and flaps per normal sequence
- Power: approximately double normal approach torque on operating engine
- Speed: Vyse or Vref+10 (whichever is higher) until landing assured
- Missed approach: add power, retract flaps (one increment at a time), gear up on positive rate

### Steep Turns
- Bank angle: 45 degrees (typical training standard)
- Altitude: +/- 100 feet
- Airspeed: +/- 10 knots
- Rollout within 10 degrees of entry heading

### Stall Recognition and Recovery
- Power-off stalls (approach and landing configuration)
- Power-on stalls (takeoff configuration)
- Recovery: reduce angle of attack, add power, minimize altitude loss
- Clean up configuration as speed permits

### Emergency Descent
- 200/B200: 181 KIAS
- 350: 184 KIAS
- Technique: reduce power, deploy speed brakes if equipped, descend at max speed to safe altitude
- Target: 10,000 ft MSL or MEA

---

## 10. Model Differences Summary

### C90 vs 200/B200

| Feature | C90A/B | 200/B200 |
|---|---|---|
| Tail | Conventional | T-tail |
| Engines | PT6A-21 (550 SHP) | PT6A-42 (850 SHP) |
| Generators | 250A | 250A (optional 300A) |
| Pressurization | Refer to AFM | 6.0/6.5 psid |
| Props | 3-blade (C90A) / 4-blade (C90B) | 4-blade Hartzell |
| Max Speed (Vmo) | 226 KIAS | 259 KIAS |
| Vmca | 80-90 KIAS | 86 KIAS |

### 200/B200 vs 350

| Feature | 200/B200/B200GT | 350/350C/350ER |
|---|---|---|
| Engines | PT6A-42/52 (850 SHP) | PT6A-60A (1,050 SHP) |
| Generators | 250A | 300A |
| MTOW | 12,500 lbs | 15,000-16,500 lbs |
| Wingspan | 54 ft 6 in | 57 ft 11 in |
| Max Speed (Vmo) | 259 KIAS | 263 KIAS (245 ER) |
| Mmo | 0.52 | 0.58 |
| Vmca (flaps up) | 86 KIAS | 94-101 KIAS |
| Avionics | Pro Line II/21 | Pro Line 21 |
| Starter Cycle | 40s/60s/40s/60s/40s/30m | 30s/5m/30s/5m/30s/30m |
| Baggage | Rear compartment | Rear + wing lockers (300 lbs each) |

### B200 vs B200GT
- B200GT has PT6A-52 engines (vs PT6A-42)
- B200GT: Ramp 12,590 lbs, ZFW 11,000 lbs
- B200GT: pressurization 6.6 psid (vs 6.5)
- B200GT: some avionics upgrades, may include Rockwell Collins FMS differences

### King Air 250/250C (noted in B200GT Client Guide, Chapter 7)
- Based on B200GT platform with differences
- Rockwell Collins FMS with VNAV authorizations
- Specific FMS differences covered in FlightSafety handouts
- Consult separate 250/250C supplement for details

---

## 11. Electrical System Quick Reference (All Models)

### Bus Hierarchy (Common Architecture)

```
HOT BATTERY BUS (always live)
    |
BATTERY ---> BATTERY BUS TIE ---> CENTER BUS
    |                                   |
    |              +--------------------+--------------------+
    |              |                                         |
    |         LEFT GEN BUS TIE                    RIGHT GEN BUS TIE
    |              |                                         |
    |         LEFT GEN BUS                          RIGHT GEN BUS
    |              |                                         |
    |         LEFT GENERATOR                        RIGHT GENERATOR
    |
    +---> TRIPLE-FED BUS (fed by left gen, right gen, AND battery via diodes/limiters)
```

### Current Protection

| Bus | C90 | 200/B200 | 350 |
|---|---|---|---|
| Generator Bus Limiters | 250A | 325A | 250A |
| Center Bus Limiters | 275A (x2) | -- | 275A (x2) |
| Triple-Fed Limiters | 60A (x3) | -- | 60A (x3) |
| Bus Tie Sensors | Hall effect | Hall effect | Hall effect |

### External Power Requirements (All Models)
- AN-type plug
- 28.25 VDC regulated
- Min 1,000A momentary, 300A continuous for start cycle
- Min battery voltage 23V before connecting
- Never connect external power unless battery shows at least 20V
- Battery may be damaged by voltages above 30V for extended periods
- Disconnect external power before applying generator power to buses

---

*This document is a training reference compiled from FlightSafety International Pilot Training Manuals for the King Air C90A/B/GT, 200/B200, B200GT, and 350/350C. It does not replace any approved AFM/POH or FlightSafety Training Checklist. All values should be verified against aircraft-specific, FAA-approved documentation before use in operations.*
