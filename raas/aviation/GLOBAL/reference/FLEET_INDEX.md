# Aircraft Reference Library — Fleet Index

> This index catalogs all aircraft reference data available to aviation Digital Workers.
> Source documents are manufacturer POH/AFM/PIM and training manuals.
> All data is for training and reference only — not a substitute for the official aircraft documents.

## Aircraft Types

### Single-Engine Piston
| Aircraft | File | Engine | Category | Typical Use |
|----------|------|--------|----------|-------------|
| Cessna 152 | `poh/cessna-152.md` | Lycoming O-235-L2C (110 HP) | Normal | Training |
| Cessna 172S Skyhawk SP | `poh/cessna-172s.md` | Lycoming IO-360-L2A (180 HP) | Normal | Training, Personal |

### Multi-Engine Piston
| Aircraft | File | Engine | Category | Typical Use |
|----------|------|--------|----------|-------------|
| Beechcraft Baron G58 | `poh/baron-g58.md` | Continental IO-550-C (300 HP x2) | Normal | Training, Charter |

### Single-Engine Turboprop
| Aircraft | File | Engine | Category | Typical Use |
|----------|------|--------|----------|-------------|
| Cessna 208B Grand Caravan | `poh/cessna-208b-caravan.md` | PT6A-114A (675 SHP) | Normal | Part 135 Charter, Cargo, Medevac |
| Pilatus PC-12/45 | `poh/pc12-45.md` | PT6A-67B (1,200 SHP) | Normal | Part 135 Charter, Medevac |
| Pilatus PC-12 NG | `poh/pc12-ng.md` | PT6A-67P (1,200 SHP) | Normal | Part 135 Charter, Medevac |
| Pilatus PC-12 NGX | `poh/pc12-ngx.md` | PT6E-67XP (1,845 SHP) | Normal | Part 135 Charter, Medevac |

### Multi-Engine Turboprop
| Aircraft | File | Engine | Category | Typical Use |
|----------|------|--------|----------|-------------|
| Beechcraft King Air C90A/B/GT | `poh/king-air-c90.md` | PT6A-21/135A (550-750 SHP x2) | Normal | Part 135 Charter |
| Beechcraft King Air 200/B200 | `poh/king-air-b200.md` | PT6A-42 (850 SHP x2) | Normal | Part 135 Charter, Medevac |
| Beechcraft King Air 350/350C | `poh/king-air-350.md` | PT6A-60A (1,050 SHP x2) | Commuter | Part 135 Charter, Medevac |

## Training References
| Document | File | Aircraft |
|----------|------|----------|
| FSI PC-12 NG Training Materials | `training/fsi-pc12ng-training.md` | PC-12/47E (NG) |
| Cessna 208B Caravan Training | `training/cessna-208b-caravan-training.md` | 208B EX, Caravan I |
| King Air Family Training | `training/king-air-family-training.md` | C90, 200/B200, 350 |

### FSI PC-12 NG Training Materials (4,209 pages)
Full PDF: `gs://title-app-alpha.firebasestorage.app/raas/aviation/GLOBAL/reference/fsi/FSI_PC12NG_Materials.pdf`
Contents: Safety briefs, MMEL (Doc 02395 Rev 08), PIM (Report 02277), Honeywell Primus APEX Pilot's Guide, systems descriptions, knowledge checks

## MEL / MMEL References
| Document | File | Aircraft |
|----------|------|----------|
| PC-12 Series MMEL | `../ops/pc12-mmel.md` | All PC-12 variants |
| PC-12-47E Operator MEL | `../ops/mel-pc12-47e.md` | PC-12-47E (template) |

## Worker Cross-Reference

| Worker | Uses These References |
|--------|----------------------|
| AV-P03 (My Aircraft) | All POH files — aircraft specs, V-speeds, systems |
| AV-015 (Weight & Balance) | All POH files — W&B data, CG envelopes |
| AV-036 (EFB Companion) | All POH files — checklists, performance data |
| AV-P04 (Training & Proficiency) | Training files — maneuver standards, profiles |
| AV-004 (MEL Tracker) | MEL/MMEL files — deferral items, rectification categories |
| AV-013 (Mission Builder) | POH files — performance planning, range, fuel burn |
| AV-007 (Maintenance Logbook) | POH files — inspection intervals, component limits |

## Operator Document Upload

This reference library provides manufacturer data only. For operational use, operators must upload their own:
- Aircraft-specific POH/AFM (serial-number specific W&B, equipment list)
- Operator MEL (derived from MMEL, approved by FSDO)
- Maintenance program documents

See `DOCUMENT_GOVERNANCE.md` for the complete document governance model.
