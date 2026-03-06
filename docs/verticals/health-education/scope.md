# Health & EMS Education Vertical — Full Scope

**Approved: Session 28 (March 2026)**
**Workers:** HE-001 to HE-042 (42 total)

## The Three Core Pains
1. Charting consumes more time than patient care
2. Education that doesn't educate (video + quiz, nobody learns)
3. No one to ask at 3am (new grads on their own)

## Six Lanes

| Lane | Workers | Risk | Description |
|------|---------|------|-------------|
| Build It | HE-001 to HE-010 | LOW | Curriculum & AI program architecture |
| Learn It | HE-011 to HE-018 | LOW–MED | Scenarios, drills, competency, exam prep |
| Chart It | HE-019 to HE-026 | MED–HIGH | Documentation, handoffs, records |
| Back Me Up | HE-027 to HE-031 | HIGH | Real-time reference & protocol |
| Cert It | HE-032 to HE-036 | LOW | CEU, license renewal, continuing competency |
| Grow It | HE-037 to HE-042 | PLATFORM | Creator tools & side hustle analytics |

## Two Mandatory Axes (Every Worker)

**subject_domain** (enum, 10 values):
Critical Care/ICU, Emergency/ER, Flight Nursing/Transport, EMS/Paramedic,
Perioperative/OR, Pediatrics/NICU, OB/L&D, Home Health, Nursing Education Faculty,
EMS Instructor/Academy

**jurisdiction** (string):
Format: `STATE:EmployerSlug` (e.g., `HI:QueensMedical`)
Required for Chart It + Back Me Up. Full disclaimer active until uploaded.

## Three Deployment Tiers

| Tier | Rules | Disclaimer | Notes |
|------|-------|------------|-------|
| 1 — Platform Default | Tier 0 only | Always active | Listed with disclaimer badge |
| 2 — Creator Public | Tier 0 + Tier 1 (state board) | Lifts when jurisdiction uploaded | 75/25 rev share |
| 3 — Institutional Private | Tier 0 + Tier 1 + Tier 2 (employer SOPs) | Lifts when SOPs uploaded | internal_only: true, never public |

## Six Anchor Workers (Platform Builds These)
- HE-001: Curriculum Architect (Build It) — Worker #1, lowest liability
- HE-011: ACLS Megacode Scenario Builder (Learn It)
- HE-019: SOAP Note Builder (Chart It)
- HE-029: Scope of Practice Guide (Back Me Up)
- HE-032: CEU Tracker (Cert It)
- HE-037: Vibe Coding Onboarding Guide (Grow It)

## Medical Director Gate
Workers requiring MD co-signature (name + NPI + Dropbox Sign):
HE-013, HE-025, HE-027, HE-028, HE-030
