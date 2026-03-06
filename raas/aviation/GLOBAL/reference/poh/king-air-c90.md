# King Air C90A / C90B / C90GT -- POH Quick Reference

> Source: FlightSafety International King Air C90A/B/GT Pilot Training Manual (Rev 1.2)
> FOR TRAINING REFERENCE ONLY -- Always consult the approved AFM/POH for dispatch.

---

## 1. Aircraft Overview

| Field | C90A | C90B |
|---|---|---|
| Manufacturer | Beechcraft (Textron Aviation) | Beechcraft (Textron Aviation) |
| Type Certificate | Multi-engine turboprop | Multi-engine turboprop |
| Engines | 2x Pratt & Whitney Canada PT6A-21 (550 SHP each) | 2x Pratt & Whitney Canada PT6A-21 (550 SHP each) |
| Propellers | 3-blade McCauley | 4-blade McCauley (Hartzell on later) |
| Max Occupants | 13 (incl. crew) | 13 (incl. crew) |
| Typical Pax Config | 6 passengers | 6 passengers |
| Crew | 1-2 (approved single-pilot) | 1-2 (approved single-pilot) |
| Avionics | Collins Pro Line II, EFIS HSI (EHSI-74) | Collins Pro Line II / Pro Line 21 |
| Certification | FAR Part 23, Normal Category | FAR Part 23, Normal Category |

### Dimensions

| Dimension | Value |
|---|---|
| Length | 35 ft 6 in |
| Height | 14 ft 2.57 in |
| Wingspan | 50 ft 3 in |
| Wing Area | 293.94 sq ft |
| Cabin Width | 54 in |
| Cabin Length | 155 in |
| Cabin Height | 57 in |
| Turning Radius (wingtip) | 35 ft 6 in |

---

## 2. Key Speeds (KIAS)

| Speed | C90A (early/late) | C90B | Notes |
|---|---|---|---|
| Vmo | 226 | 226 | Max operating speed |
| Va (maneuvering) | 153 / 169 | 169 | Weight-dependent |
| Vfe (approach) | 184 | 184 | Flaps to approach position |
| Vfe (full down) | 148 | 148 | Flaps full extension |
| Vlo (extend) | 182 | 182 | Gear operating -- extend |
| Vlo (retract) | 163 | 163 | Gear operating -- retract |
| Vle | 182 | 182 | Gear extended limit |
| Vmca | 90 | 80 | Minimum control airspeed |
| Vs (stall, clean) | 76 | 78 | Power off, wings level |
| Turbulent Air Penetration | -- | -- | Refer to AFM |

---

## 3. Weight Limits (lbs)

| Weight | C90A (early) | C90A (later) | C90B |
|---|---|---|---|
| Ramp Weight | 9,710 | 10,160 | 10,160 |
| Max Takeoff Weight | 9,650 | 10,100 | 10,100 |
| Max Landing Weight | 9,168 | 9,600 | 9,600 |
| Max Zero Fuel Weight | No structural limit | No structural limit | No structural limit |

---

## 4. Fuel

| Parameter | Value |
|---|---|
| Approved Fuel Types | Jet A, Jet A-1, Jet B |
| Total Fuel Capacity | Refer to AFM for specific serial number |
| Fuel Weight | 6.7 lbs/gal (Jet A) |

Note: Fuel capacity varies by serial number and optional tank configuration. Consult the aircraft-specific POH for usable fuel quantities.

---

## 5. Performance Summary

| Parameter | Value |
|---|---|
| Max Operating Altitude | Refer to AFM |
| Rate of Climb (two engine) | Refer to AFM for weight/altitude/temp |
| Pressurization Differential | Refer to AFM |

Note: The C90A/B PTM covers aircraft systems in detail but does not consolidate all performance data in the same format as the AFM. Performance charts in the POH Section 5 are authoritative.

---

## 6. Engine Data -- PT6A-21

| Parameter | Limit |
|---|---|
| Engine Model | Pratt & Whitney Canada PT6A-21 |
| Rated SHP | 550 SHP each |
| Max Torque | 1,315 ft-lbs |
| ITT -- Start (max) | 1,090 C |
| ITT -- Takeoff (5 min) | 695 C |
| ITT -- Max Continuous | 695 C |
| Ng -- Max Continuous | 101.5% |
| Np (Prop RPM) -- Max | 2,200 RPM |
| Oil Pressure -- Min | 40 PSI |
| Oil Pressure -- Max | 100 PSI |
| Oil Temp -- Min | 10 C |
| Oil Temp -- Max | 99 C |
| Starter Limit | 40s ON, 60s OFF, 40s ON, 60s OFF, 40s ON, then 30 min cool |

---

## 7. Systems Summary

### Electrical
| Component | Specification |
|---|---|
| System Voltage | 28 VDC |
| Starter/Generators | Two 250-ampere, dual-purpose (starter and generator) |
| Generator Output | 28.25 +/- 0.25 VDC |
| Battery | 24V NiCad (34 or 42 amp-hour) or lead-acid on converted aircraft |
| AC Power | Two inverters: 115 VAC and 26 VAC at 400 Hz |
| Inverter Rating | Standard 250 VA, optional 300 VA |

### Bus Architecture
| Bus | Protection |
|---|---|
| Left Generator Bus | 250A current limiter, Hall effect sensor |
| Right Generator Bus | 250A current limiter, Hall effect sensor |
| Center Bus | 275A current limiters (two, one per side) |
| Triple-Fed/Battery Bus | 60A current limiters (three) |
| Hot Battery Bus | Direct from battery (always powered) |

### Bus Tie System
- GEN TIES switch: MAN CLOSE / NORM / OPEN (spring-loaded to center)
- BUS SENSE switch: RESET / TEST (momentary)
- Hall effect current sensors (0.010s reaction for gen bus, 0.012s for battery)
- Automatic bus isolation on overcurrent
- Load shedding: dual generator failure sheds gen bus loads, retains center/triple-fed/hot battery buses
- Battery duration (dual gen failure, 50A load, 75% capacity): approximately 30 minutes

### Pressurization
- Refer to aircraft-specific AFM for differential pressure limits

### Flight Controls
- Conventional pushrod-and-cable operated
- Ailerons, elevators, rudder
- Electrically operated flaps and trim

### Ice Protection
- Engine inlet and prop anti-ice (electric)
- Wing and empennage deice boots
- Windshield anti-ice

---

## 8. CG Envelope

Refer to the aircraft-specific POH Weight & Balance section (Section 6). CG limits vary by serial number and installed equipment. The C90 series uses a conventional straight-wing design with CG limits expressed in inches aft of datum.

---

## 9. Operating Limitations

| Limitation | Value |
|---|---|
| Max Operating Speed (Vmo) | 226 KIAS |
| Maneuvering Speed (Va) | 153-169 KIAS (weight-dependent) |
| Max Flap Extended (approach) | 184 KIAS |
| Max Flap Extended (full) | 148 KIAS |
| Max Landing Gear Operating | 182 KIAS (extend), 163 KIAS (retract) |
| Max Landing Gear Extended | 182 KIAS |
| Approved Fuel | Jet A, Jet A-1, Jet B |
| Min Crew | 1 pilot (single-pilot approved) |
| Max Occupants | 13 |
| Starter Duty Cycle | 40s ON / 60s OFF / 40s ON / 60s OFF / 40s ON / 30 min OFF |
| Tire Pressure -- Main | 52-58 PSI |
| Tire Pressure -- Nose | 50-55 PSI |

---

## 10. Single-Engine Procedures

### Critical Speeds (OEI)
| Speed | C90A | C90B |
|---|---|---|
| Vmca (flaps up) | 90 KIAS | 80 KIAS |

### Engine Failure After Takeoff (Memory Items)
1. Mixtures -- FULL FORWARD
2. Props -- FULL FORWARD
3. Power levers -- MAX ALLOWABLE
4. Flaps -- UP
5. Landing gear -- UP (verify positive rate of climb)
6. Identify -- dead foot = dead engine
7. Verify -- retard power lever on failed engine, observe instruments
8. Failed engine -- SECURE (fuel condition lever CUTOFF, prop feather, generator OFF)
9. Maintain Vyse or above until obstacle clearance assured

### Engine Securing Procedure
1. Power lever -- IDLE
2. Fuel condition lever -- CUTOFF
3. Prop lever -- FEATHER
4. Generator switch -- OFF
5. Bleed air -- CLOSED (failed engine side)
6. Firewall shutoff -- AS REQUIRED

### Notes
- Maintain blue line (Vyse) until at safe altitude and obstacles cleared
- Bank 3-5 degrees toward operating engine
- Do not attempt restart below safe altitude unless cause is identified and corrected
- Refer to POH Emergency Procedures for complete checklists

---

*This document is a training reference extracted from the FlightSafety International King Air C90A/B/GT Pilot Training Manual. It does not replace the approved AFM/POH. All values should be verified against the aircraft-specific, FAA-approved documentation before use in operations.*
