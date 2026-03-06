# Health & EMS Education Vertical

**Workers:** HE-001 to HE-042 (42 total)
**Lanes:** 6 (Build It, Learn It, Chart It, Back Me Up, Cert It, Grow It)
**Session:** 28 (scaffold complete)

## Key Files
- `scope.md` — Full vertical scope (42 workers, 6 lanes, 2 axes, 3 tiers)
- `programs.md` — MEDCREATOR, GRADNURSE/EMS, NURSEEDU/EMSEDU special programs

## Architecture
- Two mandatory axes: subject_domain (10 clinical specialties) + jurisdiction (STATE:EmployerSlug)
- Three deployment tiers: Platform Default, Creator Public, Institutional Private
- Medical Director co-sign gate for high-liability workers (HE-013, HE-025, HE-027, HE-028, HE-030)
- Per-lane onboarding gates: simulation (Learn It), jurisdiction (Chart It), clinical (Back Me Up)

## Anchor Workers (platform-built)
- HE-001: Curriculum Architect
- HE-011: Scenario Simulator
- HE-019: ePCR Builder
- HE-029: Protocol Reference
- HE-032: CEU & License Tracker
- HE-037: Creator Analytics
