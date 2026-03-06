# Cessna 208B Grand Caravan -- Training Reference

Sources:
- FlightSafety International CE-208 Caravan EX / Caravan (G1000) Pilot Training Manual, Revision 3.1
- FlightSafety International Cessna Caravan I Pilot Training Manual, Second Edition, Revision 1.0

---

## Training Manual Overview

### Coverage
Both PTMs cover the following aircraft variants:
- Cessna 208 Caravan 675 (PT6A-114A, 675 SHP)
- Cessna 208B Grand Caravan (PT6A-114A, 675 SHP)
- Cessna 208B Super Cargomaster (PT6A-114A, 675 SHP)
- Cessna 208B Grand Caravan EX (PT6A-140, 867 SHP)

### Chapter Structure (21 Chapters)

| Chapter | Topic |
|---|---|
| 1 | Aircraft General |
| 2 | Electrical Power Systems |
| 3 | Lighting |
| 4 | Avionics (G1000) |
| 5 | Fuel |
| 6 | Environmental Systems |
| 7 | Powerplant |
| 8 | Fire Protection |
| 9 | Ice and Rain Protection |
| 10 | Landing Gear |
| 11 | Flight Controls |
| 12 | Oxygen |
| 13 | Pressurization (not applicable to this aircraft) |
| 14 | Weight and Balance |
| 15 | Performance |
| 16 | Preflight / Postflight |
| 17 | Normal Procedures |
| 18 | Maneuvers and Procedures |
| 19 | Abnormal Procedures |
| 20 | Emergency Procedures |
| 21 | Walkaround |
| -- | Appendix |

Each chapter includes end-of-chapter self-assessment questions.

---

## Systems Training Profiles

### Profile 1: Electrical Power Systems (Chapter 2)

Key learning objectives:
- 28 VDC electrical system architecture
- 24-volt NiCad battery (main power source for starting)
- Starter-generator: Functions as motor for engine starting, then as generator after start
  - 200 amp (675 SHP Caravans)
  - 300 amp (Grand Caravan EX)
- Standby alternator: 75 amp, belt-driven from accessory gearbox
  - Receives field current from hourmeter/AC circuit breaker
  - Can be brought online without BATTERY switch ON in emergency
- Generator contactor closes when starter switch is moved to OFF after engine start
- STBY ALT PWR switch: Must be positioned to OFF before engine shutdown to prevent battery drain

Training questions (sample):
1. The primary source of electrical power in flight is the: (A) Battery, (B) Standby alternator, (C) Starter-generator, (D) External power unit
2. The standby alternator output is: (A) 28 VDC, 75 amps, (B) 14 VDC, 75 amps, (C) 28 VDC, 200 amps, (D) 24 VDC, 60 amps
3. The starter-generator functions as a motor until Ng reaches: (A) 12%, (B) 46%, (C) 55%, (D) 65%

### Profile 2: Fuel System (Chapter 5)

Key learning objectives:
- Two wing tanks, gravity feed to fuselage reservoir
- Total capacity: 335.6 US gallons (SN 208B0090+) / 335 US gallons (SN 208B001-0089)
- Usable fuel: 332 US gallons
- Unusable: ~2.8 gallons per tank (when indicator shows E)
- Fuel selectors: LEFT and RIGHT on overhead panel (ON/OFF each)
- Normal operation: Both tanks ON
- Ejector boost pump: Driven by motive flow from fuel control unit, provides fuel to engine
- Auxiliary boost pump: Electric backup, activates automatically when fuel pressure drops below 4.75 PSI
- Fuel filter: Bypass mechanism with red flag indicator (must be reset by maintenance)
- Oil-to-fuel heater: Preheats fuel using engine oil, with temperature-sensing bypass valve
- Fuel flow indicator: Measures in pounds per hour (PPH) based on Jet A
- FUEL LOW annunciators: Amber, one per tank, illuminates at 25 gallons or less
- RESERVOIR FUEL LOW: Red warning, approximately 1.5 minutes of engine operation at max continuous power remaining
- Maximum fuel imbalance in flight: 200 lbs
- Maximum full rudder sideslip duration: 3 minutes (fuel starvation risk)
- Approved fuels: Jet A, Jet A-1, Jet B, JP-1, JP-4, JP-5, JP-8, and aviation gasoline (emergency only, max 150 hours per overhaul period)
- Anti-icing additive required per MIL-I-27686 (EGME) or MIL-I-85470 (DIEGME)

Fuel system emergency procedures:
- FUEL SELECT OFF warning: Both shutoff valves closed triggers red annunciator + warning horns
- Single tank OFF during start: Red FUEL SELECT OFF + both warning horns
- FUEL PRESS LOW: Amber annunciator when reservoir fuel manifold pressure below 4.75 PSI
- RESERVOIR FUEL LOW: Immediately verify both fuel selectors ON, turn on IGNITION and FUEL BOOST switches

Training questions (sample):
1. Fuel flows from the wing tanks to the reservoir tank by: (A) Auxiliary fuel boost pump pressure, (B) Ejector pump pressure, (C) Gravity, (D) Fuel control unit pressure
2. Fuel is pumped from the reservoir tank primarily by the: (A) Main ejector pump, (B) Auxiliary boost pump, (C) Engine-driven fuel pump, (D) Fuel control unit
3. If the fuel filter becomes blocked: (A) Fuel starvation occurs, (B) An instrument panel annunciator illuminates, (C) The red fuel filter bypass flag pops up, (D) The fuel filter bypass horn sounds

### Profile 3: Powerplant (Chapter 7)

Key learning objectives:

#### PT6A Engine Architecture
- Free-turbine design: Gas generator turbine drives compressor; power turbine drives propeller through reduction gear
- 7 major sections (front to rear): Reduction gear, exhaust, turbine, combustor, compressor, air intake, accessory drive
- Reverse-flow combustion: Air enters rear, compressed forward, reverses through combustor, expands through turbines forward to exhaust
- Reduction gear: Two-stage planetary, converts high RPM/low torque to low RPM/high torque

#### Air Induction and Inertial Separator
- Ram air inlet at front of engine nacelle
- Inertial separator: Two movable vanes + fixed airfoil
  - NORMAL (push): Gentle turn into compressor plenum
  - BYPASS (pull): Sharp turn separates moisture, discharges overboard through left cowling outlet
- Use BYPASS for: Visible moisture at OAT below 41 deg F (5 deg C), ground operations in dust/sand
- Use NORMAL for all other operations
- When switching BYPASS to NORMAL in flight: Reduce engine power, maintain firm grip on handle

#### Engine Fuel System
- Oil-to-fuel heater with temperature-sensing bypass valve
- Engine-driven fuel pump (on AGB at 2 o'clock position)
- Fuel control unit: Metering section, temperature-compensating section, Ng governor
- Flow divider and dump valve connect to dual fuel manifolds (14 simplex nozzles)
- Fuel rejected at shutdown drains to fireproof fuel can on firewall (675 SHP drains to fuel can daily or every 6 shutdowns)

#### Starting System
- Starter-generator motors the gas generator to 46% Ng, then start cycle terminates
- Three-position STARTER switch: OFF, START, MOTOR
- MOTOR position: No ignition, used for engine clearing/washing
- Interlock: Cannot motor unless IGNITION switch is in NORM position

#### Propeller System
- 3-blade, all metal, constant-speed, full-feathering, reversible
- Governor modes: Underspeed, Onspeed, Overspeed, Feathering, Beta range
- PROP RPM lever: MAX (1,900 RPM), MIN, FEATHER
- Feathering: Counterweights and spring tension drive blades to streamlined position
- Beta range: Non-governing, pilot controls blade pitch directly
- Overspeed governor test: RPM should not exceed 1,750 +/- 60 RPM

#### Engine Controls (4 levers)
1. POWER lever: MAX through IDLE through BETA to MAX REVERSE
2. EMERGENCY POWER lever: Mechanical override for fuel control unit pneumatic failure
   - NORMAL (full aft): Normal operation, power selected by POWER lever
   - IDLE to MAX: Governs engine when POWER lever is ineffective
   - Red EMERG PWR LVR CAS message when not stowed to NORMAL
3. PROP RPM lever: MAX to MIN to FEATHER
4. FUEL CONDITION lever: CUTOFF / LOW IDLE (55% Ng, 52% on 675 SHP) / HIGH IDLE (65% Ng)

#### Engine Indication System (EIS)
- ENGINE page: Torque, ITT, Ng, Prop RPM, oil PSI, oil temp, fuel qty, fuel flow, battery amps, bus volts, anti-ice remaining
- SYSTEM page: Numerical values for all ENGINE page plus fuel totalizer, generator amps, standby alternator amps
- Dynamic redline on torque gauge: Adjusts for OAT, altitude, inertial separator, bleed air heat

#### ITT Limits (EX vs 675 SHP)

| Condition | Grand Caravan EX | 675 SHP Caravans |
|---|---|---|
| Normal Operating (Green) | 100--825 deg C | 100--740 deg C |
| Caution (Amber) | 826--849 deg C | 765--805 deg C |
| Red Line | 850 deg C | 805 deg C |
| Starting (Amber Caution) | 766--805 deg C | 766--805 deg C |
| Starting (Red Line) | 871 deg C | 1,090 deg C |

#### Ng Limits

| Condition | Grand Caravan EX | 675 SHP Caravans |
|---|---|---|
| Maximum (Red Line) | 103.7% | 101.6% |

#### Oil System
- Integral oil tank: 9.5 US quarts
- Total system capacity: 14 US quarts
- Maintain within 1.5 quarts of MAX HOT or MAX COLD
- Normal pressure: 85--105 PSI
- Caution: 40--84 PSI (675 SHP: 40--85 PSI)
- Red lines: Below 40 PSI, above 106 PSI (675 SHP: below 40, above 105)
- Normal temp: 32--99 deg C (675 SHP: 10--99 deg C)
- Chip detectors: One on reduction gearbox, one on AGB case (amber CHIP DETECT CAS)

Training questions (sample):
1. The PT6A-140 engine is defined as a: (A) Fixed-shaft constant-speed engine, (B) Free-turbine turboprop engine, (C) Single-spool variable-speed engine, (D) None of the above
2. The torque indication indicates the power: (A) Developed by the gas generator, (B) Delivered by the propeller, (C) Of the combined gas generator and power turbine, (D) Delivered to the propeller
3. The power turbine is on a shaft that: (A) Drives the gas generator, (B) Drives the accessory section, (C) Drives the reduction gear, (D) Both A and B
4. Air induced into the engine: (A) Enters at the rear and is exhausted at the front, (B) Enters at the front and is exhausted at the rear, (C) Passes from the power turbine to the compressor wheels, (D) Must be cooled by the compressor section
5. Loss of any pneumatic signal to the fuel control unit causes: (A) The engine to shut down, (B) The engine to drop to idle rpm, (C) The engine rpm to increase rapidly, (D) A complete stoppage of fuel flow

### Profile 4: Fire Protection (Chapter 8)

Key learning objectives:
- Engine fire detection: Heat sensor in engine compartment
- Red ENGINE FIRE CAS message + warning horn
- FIRE DETECT test switch: Toggles to verify system operation
- Cabin heat firewall shutoff knob: Push-pull on pedestal, actuates two firewall shutoff valves (bleed air supply + cabin return)
- Portable fire extinguisher: Halon or equivalent, accessible to crew

### Profile 5: Ice and Rain Protection (Chapter 9)

Key learning objectives:
- Grand Caravan EX: TKS weeping anti-ice system (fluid-based)
  - Anti-ice fluid quantity displayed on ENGINE page (gallons remaining)
- 675 SHP Caravans: Pneumatic deicing boots on wings, wing struts, and horizontal stabilizer
- Propeller anti-ice: Electrical
- Windshield anti-ice: Electrical panel
- Inertial separator BYPASS mode for visible moisture below 41 deg F (5 deg C)

---

## Emergency Procedure Training

### Engine Failure During Takeoff Roll
1. POWER lever -- IDLE
2. Brakes -- Apply as necessary
3. FUEL CONDITION lever -- CUTOFF
4. If unable to stop on runway, refer to POH/AFM

### Engine Failure Immediately After Takeoff
1. Maintain safe airspeed
2. Land straight ahead if possible
3. If altitude permits: attempt airstart

### Engine Failure During Flight
1. Airspeed -- Maintain safe speed
2. Identify suitable landing area
3. Attempt airstart (with or without starter assist)

### Airstart -- Starter Assist (Preferred Procedure)
1. FUEL CONDITION lever -- CUTOFF
2. POWER lever -- IDLE
3. EMERGENCY POWER lever -- NORMAL
4. PROP RPM lever -- Forward of FEATHER gate
5. IGNITION switch -- NORM
6. STARTER switch -- START
7. At 12% Ng or above: FUEL CONDITION lever -- LOW IDLE
8. Monitor ITT (do not exceed limits)
9. After stable idle: Advance POWER lever as needed

### Airstart -- No Starter Assist
1. FUEL CONDITION lever -- CUTOFF
2. POWER lever -- IDLE
3. EMERGENCY POWER lever -- NORMAL
4. PROP RPM lever -- Forward of FEATHER gate
5. IGNITION switch -- ON (provides continuous ignition)
6. Establish airspeed for windmill: Ng must be above 12%
7. FUEL CONDITION lever -- LOW IDLE
8. Monitor ITT
9. After stable idle: IGNITION switch -- NORM

Note on 675 SHP Caravans: The ON position is used for airstarts without starter assist.

### Hot Start Recognition and Response
- Hot start: Excessive fuel flow at normal RPM or normal fuel flow with insufficient RPM
- Recognition: ITT rising rapidly toward limits, Ng not accelerating normally
- Response: If Ng accelerates rapidly above 20%, suspect gear train decouple -- do not continue start
- If no ITT rise within 10 seconds of FUEL CONDITION to LOW IDLE: Move FUEL CONDITION to CUTOFF
- If ITT rapidly approaches 1,090 deg C: FUEL CONDITION to CUTOFF immediately
- After aborted start: Allow time to drain unburned fuel, then dry motor within starter limitations

### Engine Fire on Ground
1. Continue cranking to draw fire into engine if possible
2. If engine starts: Run briefly to confirm normal operation
3. If engine does not start: Fuel -- CUTOFF, fire extinguisher, evacuate

### Engine Fire in Flight
1. FUEL CONDITION lever -- CUTOFF
2. Cabin heat firewall shutoff knob -- PULL
3. FUEL SHUTOFF -- OFF (both selectors)
4. Bleed air -- OFF
5. Land as soon as possible

---

## Simulator Training Profiles

### Sim Profile 1: Normal Operations
- Preflight walkaround (Chapter 21)
- Cold engine start sequence
- Hot engine start sequence
- Taxi and before-takeoff checks
- Normal takeoff and climb
- Cruise power setting and leaning
- Normal approach and landing
- Engine shutdown and securing

### Sim Profile 2: Engine Operations
- Inertial separator operation (NORMAL vs BYPASS)
- Emergency power lever operation
- Propeller governor checks (overspeed test at 1,750 +/- 60 RPM)
- Beta range operation for ground operations
- Reverse thrust for landing
- Propeller feathering procedure
- Engine trend monitoring (ADASd/ALTAIR system review)

### Sim Profile 3: Abnormal and Emergency
- Engine failure during takeoff roll
- Engine failure after rotation
- Engine failure during cruise
- Airstart with starter assist
- Airstart without starter assist (windmill)
- Hot start recognition and recovery
- Engine fire on ground
- Engine fire in flight
- Electrical system failures (generator failure, bus isolation)
- Fuel system malfunctions (low fuel pressure, reservoir fuel low, single tank operations)

### Sim Profile 4: Systems Management
- Electrical load management with standby alternator
- Fuel management (single tank, crossfeed awareness, fuel imbalance)
- Ice protection system operation (TKS vs deicing boots)
- Cabin environmental system
- G1000 failure modes (PFD/MFD reversion)

---

## Checkride Preparation Items

### Oral Exam Focus Areas

1. PT6A Engine Architecture
   - Describe the free-turbine concept and its advantages
   - Identify the 7 major engine sections in order
   - Explain reverse-flow combustion path
   - Distinguish between gas generator turbine and power turbine functions

2. Engine Limitations
   - State ITT limits for takeoff, max continuous, and starting (EX vs 675 SHP)
   - State Ng redline for each variant
   - State prop RPM limits and overspeed governor test parameters
   - State oil pressure and temperature normal ranges and limits
   - State starter duty cycle (30 ON/60 OFF, 30 ON/60 OFF, 30 ON/30min OFF)

3. Fuel System
   - Trace fuel flow from tanks to combustor
   - Explain the role of the ejector boost pump vs auxiliary boost pump
   - Identify fuel selector positions and normal configuration
   - State total capacity, usable capacity, and FUEL LOW annunciation threshold
   - Explain RESERVOIR FUEL LOW implications and required actions
   - State approved fuel types and anti-icing additive requirement

4. Propeller System
   - Describe the 5 governor modes
   - Explain feathering mechanism (counterweights + spring tension)
   - Describe Beta range operation and limitations
   - State when to use MAX REVERSE and the caution about POWER lever aft of IDLE

5. Electrical System
   - Describe 28 VDC architecture (battery, starter-generator, standby alternator)
   - State generator output (200 amp vs 300 amp by variant)
   - Explain standby alternator activation (automatic vs manual)
   - Describe proper engine start electrical sequence
   - Explain STBY ALT PWR switch shutdown procedure

6. Emergency Procedures
   - Recite engine failure during takeoff roll procedure
   - Recite airstart procedure (with and without starter assist)
   - Describe hot start recognition and response
   - Recite engine fire in flight procedure
   - Describe actions for RESERVOIR FUEL LOW annunciation

### Practical Test Maneuvers
- Normal takeoff and landing
- Short field takeoff and landing
- Crosswind takeoff and landing
- Steep turns (30 deg and 45 deg bank)
- Slow flight and approach to stall
- Power-off stall recovery
- Power-on stall recovery
- Emergency descent
- Engine failure simulation (all phases of flight)
- Instrument approaches (ILS, RNAV/GPS, VOR)
- Holding patterns
- Unusual attitude recovery

---

## Key Differences: Grand Caravan EX vs 675 SHP Caravans

| Feature | Grand Caravan EX | 675 SHP Caravans |
|---|---|---|
| Engine | PT6A-140 (867 SHP) | PT6A-114A (675 SHP) |
| Starter-Generator | 300 amp | 200 amp |
| ITT Redline (Running) | 850 deg C | 805 deg C |
| ITT Redline (Starting) | 871 deg C | 1,090 deg C |
| Ng Redline | 103.7% | 101.6% |
| Torque Redline (SL cruise) | ~1,865--1,970 ft-lbs | ~1,865--1,970 ft-lbs |
| Ice Protection | TKS weeping system | Pneumatic deicing boots |
| FUEL CONDITION LOW IDLE | 55% Ng | 52% Ng |
| Engine Indication | No propeller amps on ENGINE page | Propeller amps on ENGINE page |
| Oil Temp Normal | 32--99 deg C | 10--99 deg C |
| Oil Pressure Caution | 40--84 PSI | 40--85 PSI |
| Airstart (no starter assist) | IGNITION to ON | IGNITION to ON |
| Fireproof Fuel Can | Drains to ecology tank via motive flow | Drains to fuel can on firewall daily/every 6 shutdowns |

---

DISCLAIMER: This training reference file is extracted for Digital Worker use and is not a substitute for official FlightSafety International course materials or the FAA-approved POH/AFM. Pilots must complete approved training programs before operating the Cessna 208B series. Data may vary by aircraft serial number, installed equipment, and applicable supplements. All emergency procedures must be verified against the current POH/AFM for the specific aircraft being operated.
