# King Air 350 / 350C / 350ER -- POH Quick Reference

> Source: FlightSafety International King Air 350/350C Pro Line 21 Pilot Training Manual
> FOR TRAINING REFERENCE ONLY -- Always consult the approved AFM/POH for dispatch.

---

## 1. Aircraft Overview

| Field | 350 | 350ER |
|---|---|---|
| Manufacturer | Beechcraft (Textron Aviation) | Beechcraft (Textron Aviation) |
| Type Certificate | Multi-engine turboprop | Multi-engine turboprop |
| Engines | 2x Pratt & Whitney Canada PT6A-60A (1,050 SHP each) | 2x PT6A-60A (1,050 SHP each) |
| Propellers | Hartzell 4-blade | Hartzell 4-blade |
| Tail | T-tail | T-tail |
| Avionics | Rockwell Collins Pro Line 21 | Rockwell Collins Pro Line 21 |
| Crew | 1-2 | 1-2 |
| Certification | FAR Part 23 | FAR Part 23 |

### Dimensions

| Dimension | Value |
|---|---|
| Length | 46 ft 8 in |
| Height | 14 ft 4 in |
| Wingspan | 57 ft 11 in |
| Wing Area | 310.0 sq ft |

---

## 2. Key Speeds (KIAS)

| Speed | 350 | 350ER | Notes |
|---|---|---|---|
| Vmo | 263 | 245 | Max operating speed |
| Mmo | 0.58 | 0.58 | Max Mach number |
| Va (maneuvering) | 184 | 182 | |
| Vfe (approach) | 202 | 202 | Flaps to approach position |
| Vfe (full down) | 158 | 158 | Flaps full extension |
| Vle | 184 | 182 | Landing gear extended |
| Vlo (extend) | 184 | 182 | Gear operating -- extend |
| Vlo (retract) | 166 | 164 | Gear operating -- retract |
| Vmca (flaps up) | 94 | 101 | Min control speed, air |
| Vmca (flaps approach) | 93 | 98 | |
| Vyse (blue line) | 125 | 125 | Best rate of climb, OEI |
| Vxse | 125 | 125 | Best angle of climb, OEI |
| Vsse | 110 | 135 | Safe intentional OEI speed |
| Vx (two engine) | 125 | 135 | Best angle, both engines |
| Vy (two engine) | 140 | 135 | Best rate, both engines |
| Emergency Descent | 184 | 184 | |
| Max Range Glide | 135 | 135 | |
| Turbulent Air Penetration | 170 | 170 | |
| Max Crosswind | 20 | 20 | |

### Cruise Climb Speed Schedule (KIAS)

| Altitude Band | Speed |
|---|---|
| Sea level to 10,000 ft | 170 |
| 10,000 to 15,000 ft | 160 |
| 15,000 to 20,000 ft | 150 |
| 20,000 to 25,000 ft | 140 |
| 25,000 to 30,000 ft | 130 |
| 30,000 to 35,000 ft | 120 |

---

## 3. Weight Limits (lbs)

| Weight | 350 | 350ER |
|---|---|---|
| Max Ramp Weight | 15,100 | 16,600 |
| Max Takeoff Weight | 15,000 | 16,500 |
| Max Landing Weight | 15,000 | 15,675 |
| Max Zero Fuel Weight | 12,500 | 13,000 |
| Max Baggage (aft) | 550 | 550 |
| Max Wing Locker (each) | 300 | 300 |

---

## 4. Fuel

| Parameter | Value |
|---|---|
| Approved Fuel Types | Jet A, Jet A-1, Jet B |
| Fuel Weight | 6.7 lbs/gal (Jet A) |

Note: Fuel capacity varies between 350 and 350ER (ER has additional wing fuel). Consult aircraft-specific POH for exact usable quantities.

---

## 5. Performance Summary

| Parameter | Value |
|---|---|
| Max Operating Altitude | 35,000 ft |
| Max Altitude (yaw damp inop, no strakes) | 5,000 ft |
| Max Altitude (yaw damp inop, strakes installed) | 19,000 ft |
| Max Climb Altitude without Crossfeed | 20,000 ft |
| OAT Limit (below 25,000 ft) | ISA + 37 C |
| OAT Limit (above 25,000 ft) | ISA + 31 C |

### Pressurization

| Parameter | Value |
|---|---|
| Delta-P Range (in flight) | 2.0 to 4.6 PSI |
| Max Cabin Altitude | 25,000 ft |

---

## 6. Engine Data -- PT6A-60A

| Parameter | Limit |
|---|---|
| Engine Model | Pratt & Whitney Canada PT6A-60A |
| Rated SHP | 1,050 SHP each |
| Starter Duty Cycle | 30s ON, 5 min OFF, 30s ON, 5 min OFF, 30s ON, 30 min OFF |

Note: Detailed ITT, torque, Ng, and oil limits vary by serial number. Consult the aircraft-specific AFM Section 2 (Limitations) for complete engine instrument markings.

---

## 7. Systems Summary

### Electrical
| Component | Specification |
|---|---|
| System Voltage | 28 VDC |
| Starter/Generators | Two 300-ampere, dual-purpose |
| Generator Output | 28.25 +/- 0.25 VDC |
| Battery | 24V, 42 amp-hour sealed lead acid |
| AC Power | Dual inverters |

### Bus Architecture
| Bus | Protection |
|---|---|
| Left Generator Bus | 250A current limiter |
| Right Generator Bus | 250A current limiter |
| Center Bus | 275A current limiters (two) |
| Triple-Fed Bus | 60A current limiters (three) |
| Battery Bus | RCCB (Remote-Controlled Circuit Breaker) |
| ESIS Battery Bus | 5A fuse, dedicated to ESIS (Emergency Standby Instrument System) |
| Dual-Fed Bus | Engine fire extinguisher, cabin entry lights |
| Hot Battery Bus | Always powered (annunciator panel, emergency lights) |

### Bus Tie System
- GEN TIES switch: MAN CLOSE / NORM / OPEN (spring-loaded to center)
- BAT BUS switch: NORM / EMER OFF
- BUS SENSE switch: RESET / TEST (momentary)
- Hall effect current sensors for automatic bus isolation
- 275A current limiters on center bus, 60A on triple-fed bus
- Load shedding on dual generator failure
- Battery endurance (dual gen failure, continuous loads only, 50A/75% capacity): approximately 30 minutes

### Load Management (Dual Generator Failure)
Equipment that remains operable on battery only (Table 2-1 from PTM):
- Air-driven Attitude Gyro (continuous)
- Standby Attitude Gyro (continuous, powered by auxiliary battery)
- Inverter 1 (continuous)
- Pilot Audio, Nav 1, Pilot HSI (continuous)
- Annunciator Panel, Instrument/Emergency Lights (continuous)
- Fuel Quantity Indicator, Digital OAT (continuous)
- Pressurization Control, Cabin Temperature Control (continuous)
- Other items on timed use to extend battery duration

### Pressurization
- Delta-P range: 2.0 to 4.6 PSI during flight
- Max cabin altitude: 25,000 ft
- Automatic and manual controller
- Safety and negative pressure relief valves

### Flight Controls
- T-tail configuration
- Dual push rod actuators
- Electrically operated flaps and trim
- Yaw damper (required above 5,000 ft without strakes, 19,000 ft with strakes)

### Ice Protection
- Engine inlet anti-ice (bleed air)
- Propeller anti-ice (electric)
- Wing and empennage deice boots (surface deice)
- Windshield anti-ice

### Avionics
- Rockwell Collins Pro Line 21
- Dual PFD/MFD
- FGC (Flight Guidance Computer) for autopilot
- EGPWS
- TCAS (optional)
- ESIS (Emergency Standby Instrument System) on dedicated battery bus

### Circuit Breaker Buses (from Table 2-2)
- **Left Generator Bus**: Avionics (Pilot PFD Heater, DBU), Environmental (Bleed Air Control R, Blower Cabin Fwd, Radiant Heat), Engines (Chip Detector L, DCU 1, EDC 1), Flight Controls (Flap Ind & Control), ESIS, Lights, Weather, Furnishings
- **Right Generator Bus**: Avionics (EGPWS, MFD Heater), Environmental (Air Cond Clutch, Blower Cabin Aft/Cockpit), Engines (Chip Detector R, DCU 2, EDC 2, Prop Gov Test, Prop Sync), Flight Controls (Pitch Trim), Lights, Weather, Furnishings
- **Triple-Fed Bus**: Avionics (AHC 2 Secondary, Aural Warn, Avionics Master, Cabin Audio, DC Converter 2, FGC 1/2 Servo, IAPS L&R, MFD, Pilot Audio/Control, Voice Rcdr), Engines (Autofeather, DCU 1&2 Secondary, Fire Detect L&R, Ignitor Power L&R, Oil Press L&R, Start Control L&R, Torque Meter L&R), Environmental, Fuel, Landing Gear, Lights, Warnings/Annunciators, Weather
- **Battery Bus**: Electrical (Avionics, Bat Relay, Bat Bus Cont, Gnd Com, Gnd Heat)
- **Dual-Fed Bus**: Engines (Eng Fire Ext L, Eng Fire Ext R), Lights (Cabin Entry Lts)
- **Left/Right Gen Avionics Buses**: CDU, DIALER, DME, FSU, GPS, HF, SELCAL, TCAS, TEL, Radar, COM, NAV, ATC, ADC, AHC, DC Converter, PFD, DCP, RTU

---

## 8. CG Envelope

Refer to the aircraft-specific POH Weight & Balance section (Section 6). CG limits vary by serial number, model (350 vs 350C vs 350ER), and installed equipment. The 350 series has wing lockers that affect loading and CG.

---

## 9. Operating Limitations

| Limitation | 350 | 350ER |
|---|---|---|
| Max Operating Speed (Vmo) | 263 KIAS | 245 KIAS |
| Max Mach (Mmo) | 0.58 | 0.58 |
| Max Operating Altitude | 35,000 ft | 35,000 ft |
| Max Altitude (yaw damp inop, no strakes) | 5,000 ft | 5,000 ft |
| Max Altitude (yaw damp inop, strakes) | 19,000 ft | 19,000 ft |
| Max Crosswind Component | 20 knots | 20 knots |
| OAT Limit (below 25,000 ft) | ISA + 37 C | ISA + 37 C |
| OAT Limit (above 25,000 ft) | ISA + 31 C | ISA + 31 C |
| Cabin Delta-P Range | 2.0 - 4.6 PSI | 2.0 - 4.6 PSI |
| Max Cabin Altitude | 25,000 ft | 25,000 ft |
| Max Climb Alt without Crossfeed | 20,000 ft | 20,000 ft |
| Approved Fuel | Jet A, A-1, B | Jet A, A-1, B |
| Turbulent Air Penetration | 170 KIAS | 170 KIAS |
| Starter Duty Cycle | 30s/5m/30s/5m/30s/30m | 30s/5m/30s/5m/30s/30m |

---

## 10. Single-Engine Procedures

### Critical Speeds (OEI)

| Speed | 350 (15,000 lbs) | 350ER (16,500 lbs) | Notes |
|---|---|---|---|
| Vmca (flaps up) | 94 KIAS | 101 KIAS | Min control speed, air |
| Vmca (flaps approach) | 93 KIAS | 98 KIAS | |
| Vxse | 125 KIAS | 125 KIAS | Best angle of climb, OEI |
| Vyse (blue line) | 125 KIAS | 125 KIAS | Best rate of climb, OEI |
| OEI Enroute Climb | 125 KIAS | 125 KIAS | |
| Vsse | 110 KIAS | 135 KIAS | Safe intentional OEI speed |
| Emergency Descent | 184 KIAS | 184 KIAS | |
| Max Range Glide | 135 KIAS | 135 KIAS | |

### Engine Failure After Takeoff (Memory Items)
1. Mixtures -- FULL FORWARD
2. Props -- FULL FORWARD
3. Power levers -- MAX ALLOWABLE
4. Flaps -- UP
5. Landing gear -- UP (verify positive rate of climb)
6. Identify -- dead foot = dead engine
7. Verify -- retard power lever on failed engine, observe instruments
8. Failed engine -- SECURE (fuel condition lever CUTOFF, prop feather, generator OFF)
9. Maintain Vyse (125 KIAS) or above until obstacle clearance assured

### Engine Securing Procedure
1. Power lever -- IDLE
2. Fuel condition lever -- CUTOFF
3. Prop lever -- FEATHER
4. Generator switch -- OFF
5. Bleed air -- CLOSED (failed engine side)
6. Firewall shutoff -- AS REQUIRED

### Emergency Abnormal Electrical Indications

**L or R GEN TIE OPEN:**
1. Monitor corresponding loadmeter
2. If < 100% and normal, move BUS SENSE to RESET
3. If > 100% or abnormal, turn appropriate generator OFF
4. Monitor opposite loadmeter -- do not exceed 100%
5. If bus tie does not reset, generators are not sharing loads equally; monitor both loadmeters to stay within 10%

**L or R DC GEN (Generator Inoperative):**
1. Verify with loadmeter
2. Push generator switch to RESET, after 1 second release to ON
3. If it does not reset, turn it OFF and rely on remaining generator
4. Monitor remaining generator load -- do not exceed 100%
5. Turn off nonessential electrical equipment

**BAT TIE OPEN:**
1. Check center bus voltage (24-28V)
2. If normal, momentarily actuate BUS SENSE to RESET
3. If unsuccessful, probable battery bus tie circuitry malfunction
4. If center bus is 0V, possible center bus fault -- open generator bus ties (GEN TIES to OPEN)
5. Pull LANDING GEAR RELAY circuit breaker
6. Turn air conditioning off prior to landing

### Notes
- Maintain Vyse (125 KIAS) until at safe altitude
- Bank 3-5 degrees toward operating engine for zero sideslip
- Yaw damper provides critical assist on the 350 -- if inoperative, observe altitude restrictions
- Do not attempt restart below safe altitude unless cause identified and corrected
- Refer to POH Emergency Procedures for complete checklists

---

*This document is a training reference extracted from the FlightSafety International King Air 350/350C Pro Line 21 Pilot Training Manual. It does not replace the approved AFM/POH. All values should be verified against the aircraft-specific, FAA-approved documentation before use in operations.*
