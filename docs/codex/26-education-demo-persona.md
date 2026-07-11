# CODEX 26 — Education Demo Persona: Cascade Health Sciences

**Demo persona:** `/demo?persona=school`  
**Primary prospect audience:** Ruthie, nursing school administrators, continuing ed directors, and any K-12 / higher-ed prospect  
**Story:** A small but serious nursing school that is the training pipeline for regional hospitals. Student performance is life-critical. The immutable learning record under every graduation credential is the moat. Ruthie's Student Eval Worker is the first live example.

---

## Lessons Inherited from Dr. Maya (Apply Here Too)

See CODEX 25 for the full Dr. Maya lessons. Short version for education demo:
- New dedicated tenant — never share with any real user tenant
- New dedicated demo UID — confirm from backend before seeding
- Checklist keys from WORKER_CHECKLISTS verbatim — no guessing
- Seed Firestore before exposing demo URL
- HR bootstrap defaults contaminate empty collections — seed HR first

---

## Institution 1 — Cascade Health Sciences (Nursing School)

**Fictitious entity:** Cascade Health Sciences, Inc.  
**Location:** Reno, NV 89501 (serves northern Nevada + eastern California rural hospitals)  
**Program:** Associate Degree in Nursing (ADN), 2-year program; NCLEX-RN pass rate 94%  
**Enrollment:** 40 active students (Year 1: 22, Year 2: 18)  
**Clinical partners:** 2 affiliate hospitals (fictitious names, real-ish structures)  
  - Sunrise Valley Medical Center — Reno (68-bed regional)  
  - Sierra Ridge Community Hospital — Carson City (42-bed critical access)

**Demo user name:** Dr. Ruthanne Calloway, Dean of Nursing Programs  
**Demo user email:** `school-demo@sociii.ai`

---

## HR Roster — Nursing School Staff

| Name | Role | Type | Notes |
|------|------|------|-------|
| Dr. Ruthanne Calloway | Dean of Nursing Programs | W2 / Admin | Demo user |
| Prof. Sandra Okafor | Lead Clinical Faculty (Med-Surg) | W2 | Year 2 lead |
| Prof. James Lim | Clinical Faculty (Pediatrics / OB) | W2 | |
| Prof. Anita Desai | Didactic Faculty (Anatomy, Pharm) | W2 | |
| Miguel Torres | Simulation Lab Coordinator | W2 | SimMan 3G certified |
| Claire Beaumont | Program Administrator | W2 | Scheduling + NCLEX tracking |
| Dr. Yolanda Pierce | Medical Director (consulting) | 1099 | Physician oversight per BRN |
| Kevin Nash | IT / LMS Administrator | 1099 | Manages student platform + EHR sim |

**Total: 8 staff.** Small school, high stakes.

---

## Students (40 Active — Year 1 and Year 2)

Seed representative students, not all 40. Use a diverse mix. Key attributes:
- `cohort`: `"Y1"` or `"Y2"`
- `clinicalSite`: `"Sunrise Valley"` or `"Sierra Ridge"`
- `nclex_readiness_score`: 0–100 (from ATI TEAS or practice exams)
- `ce_hours_completed`, `ce_hours_required`
- `clinical_hours_completed`, `clinical_hours_required` (672 required for ADN)
- `status`: `"active"`, `"at-risk"`, `"on-leave"`

**Year 2 students — demo-worthy records:**
| Name | Status | NCLEX Readiness | Clinical Hours | Note |
|------|--------|----------------|----------------|------|
| Priya Sharma | active | 84 | 580/672 | Top of class, NCLEX-ready |
| Daniel Osei | active | 71 | 610/672 | Strong clinical, weak pharm |
| Marisol Fuentes | at-risk | 53 | 520/672 | ATI scores declining — advisor flag |
| Tyler Burnham | active | 79 | 590/672 | |
| Aiko Tanaka | active | 88 | 645/672 | Early completion candidate |

**Year 1 students — demo-worthy records:**
| Name | Status | Clinical Hours | Note |
|------|--------|----------------|------|
| Chris Navarro | active | 120/320 | On track |
| Fatima Hassan | active | 108/320 | Missed 1 rotation — reschedule pending |
| Jordan Reyes | at-risk | 85/320 | Leave of absence request filed |
| Samantha Price | active | 140/320 | Ahead of schedule |

---

## Workers the School Needs

> **RED-TEAM NOTE:** `education-student-eval` does NOT exist as a wired worker.
> No WORKER_CHECKLISTS, WORKER_INTELLIGENCE, or liveData handler. Ruthie's eval worker
> likely has a different slug in her fork. Confirm the exact slug before writing any seed
> scripts or canvas code. This worker is the load-bearing pillar of the school demo.
> If it can't be wired into the main repo, the education demo cannot be built.

| Worker slug | Why needed | Notes |
|-------------|-----------|-------|
| `platform-hr` | 8 staff + clinical faculty adjuncts | Fully wired |
| `platform-contacts` | Students + hospital clinical coordinators | Fully wired |
| `platform-control-center-pro` | Enrollment KPIs, NCLEX pass rate, cohort health | Fully wired |
| `platform-accounting` | Tuition revenue, grant tracking, clinical affiliate fees | Fully wired |
| `education-student-eval` | Per-student clinical performance + CE | **Slug unconfirmed — verify from Ruthie's fork** |
| `chief-of-staff` | Surfaces at-risk students, upcoming clinical schedule gaps | Fully wired |

---

## Institution 2 — Hargrove Prep (Middle School / K-12)

**Fictitious entity:** Hargrove Preparatory Academy  
**Location:** Henderson, NV 89014 (suburb of Las Vegas — easy to pair with RE demo)  
**Grades:** 6–8 (middle school), 480 students  
**Notable programs:** STEM focus, dual-language (English/Spanish), after-school enrichment  

**Demo user name:** Margaret Weston, Head of School  
**Demo user email:** Could share the `school-demo@sociii.ai` account but with a different workspace, OR use a separate persona. **Recommend: separate UID for clean demo.** Defer until Cascade is built and working.

**Workers for K-12 (simpler version):**
- `platform-hr`: 34 teachers + 8 admin/support staff
- `platform-contacts`: Parent + guardian records, enrollment pipeline
- `platform-accounting`: Tuition, state funding, enrichment program P&L
- `chief-of-staff`: School calendar conflicts, IEP deadlines

**Build priority:** Cascade first, then Hargrove as an add-on once the school demo pattern is proven.

---

## Vault (Learning Record Substrate)

For the education demo, the Vault DTC model applies at the **student level**:
- Each student has a Vault with: clinical rotation logs (logbook entries), completed CE certificates, NCLEX readiness scores (time-stamped), program completion credential (when issued)
- These are immutable — signed by the Dean at attestation
- This is the SOCIII moat for education: the credential lives in a place **the school does not control** (append-only, anchored)

**Demo narrative:** When Marisol Fuentes finally passes NCLEX and graduates, her credential goes into her Vault. Cascade can never delete it. Her next employer can request a verified transcript that the school cannot tamper with.

---

## Demo Token Architecture

Same pattern as RE persona. New entry in `demo:token`:

```js
const SCHOOL_DEMO_UID = ""; // to be filled after Firebase Auth user creation
const SCHOOL_DEMO_TENANT = ""; // to be filled after Firestore tenant creation

if (req.query.persona === "school") {
  // issue token for school demo user (Cascade / Dr. Calloway)
}
```

Route: `/demo?persona=school` → `SchoolDemoSignIn.jsx` → `/?demo=1&persona=school`

---

## Student Records Schema (locked — do not drift)

Collection path: `tenants/{SCHOOL_TENANT_ID}/students/{studentId}`

```js
{
  name: string,
  email: string,
  cohort: "Y1" | "Y2",
  status: "active" | "at-risk" | "on-leave",
  clinicalSite: "Sunrise Valley" | "Sierra Ridge",
  clinical_hours_completed: number,
  clinical_hours_required: 672,           // Y2 total; Y1 = 320
  nclex_readiness_score: number,          // 0-100, from ATI practice exams (seeded, not live)
  last_ati_score_date: ISO-date-string,
  ce_hours_completed: number,
  ce_hours_required: number,
  demo: true,
}
```

Seed 40 stubs (name + cohort + status + hours only) so the enrollment KPI shows 40.
Seed 9 full-detail records for the "active students" list view.
The KPI reads count from the collection — 40 stubs = "40 enrolled" in Control Center Pro.

## DemoSignIn Checklist Keys — EXACT

```js
const schoolChecklists = {
  "ta_checklist_platform-control-center-pro": { "email-connection": now, "communication-preferences": now, "key-metrics": now, "revenue-tracking": now, "acquisition-goals": now, "external-feeds": now },
  "ta_checklist_platform-accounting":         { "bank-statements": now, "accounting-software": now, "tax-returns": now, "expense-rules": now, "vendor-lists": now },
  "ta_checklist_platform-hr":                 { "roster": now, "handbook": now, "org-chart": now, "payroll": now, "perf-reviews": now, "compliance-docs": now },
  "ta_checklist_platform-contacts":           { "import-contacts": now, "crm-connect": now, "comm-history": now, "followup-auto": now, "client-categories": now },
  // education-student-eval: NOT in WORKER_CHECKLISTS — must be added after slug is confirmed
};
```

## Seed Script Checklist (in order)

> **Every seed script must start with UID/tenant guard (Dr. Maya lesson):**
> ```js
> const DEMO_UID = ""; // VERIFY: must match SCHOOL_DEMO_UID in index.js demo:token exactly
> const DEMO_TENANT = ""; // VERIFY: must match SCHOOL_DEMO_TENANT in index.js demo:token exactly
> if (!DEMO_UID || !DEMO_TENANT) throw new Error("Fill in DEMO_UID and DEMO_TENANT before running");
> ```

**Prerequisites (before any seed script):**
- Confirm Ruthie's eval worker slug from her fork
- Wire `education-student-eval` into WORKER_INTELLIGENCE in WorkerCanvas.jsx
- Decide: school-side `students` collection or reuse `teamMembers` with type="student"

1. `scripts/demo/createSchoolDemoUser.js` — create Firebase Auth user `school-demo@sociii.ai`, print UID
2. `scripts/demo/createSchoolTenant.js` — create Cascade Health Sciences tenant, print tenant ID
3. Update `index.js` `demo:token` endpoint with new UID + tenant; add UID to credit whitelist
4. `scripts/demo/seedSchoolHRPeople.js` — seed 8-person faculty + admin roster
5. `scripts/demo/seedSchoolStudents.js` — seed 40 stubs + 9 full-detail records (see schema above)
6. `scripts/demo/seedSchoolOperatingFeed.js` — alert feed to `alertFeed/{DEMO_UID}/items` (UID not tenant)
7. Update `SchoolDemoSignIn.jsx` with exact checklist keys above
8. QA:
   - Control Center Pro shows 40 enrolled (not 9)
   - HR: 8 staff, mix of W2/1099
   - Student list: 9 full records, Marisol flagged at-risk
   - alertFeed: 6 items surfaced
   - education-student-eval: intelligence mode, no setup checklist
   - No SOCIII defaults anywhere

---

## Operating Feed — Dr. Calloway's Alex Daily Brief

- **Marisol Fuentes** — ATI score dropped 8 points in last practice exam; three consecutive declines. Remediation recommended before October NCLEX date.
- **Fatima Hassan (Y1)** — Missed Sunrise Valley rotation June 28; reschedule window closes July 15. Contact clinical coordinator.
- **Aiko Tanaka** — 645/672 clinical hours complete. Eligible for early NCLEX application — review transcript.
- **NCLEX prep workshop** — Prof. Desai's pharmacology session scheduled for 12 students July 14.
- **Clinical affiliation renewal** — Sierra Ridge Community Hospital affiliation agreement expires August 31. Initiate renewal.
- **Accreditation documentation** — ACEN self-study due October 1. 3 sections incomplete per current tracker.

---

## FERPA / Privacy Notes

Education demo data is all **fictitious** — made-up names, no real student records. However:
- The demo must never show a real student's data even accidentally
- The `school-demo` tenant must be completely isolated (no shared tenant with any real user)
- If Ruthie ever connects her real school, it must be a **separate, non-demo tenant**

---

## Forward Reference

When the nursing school demo is fully seeded, CODEX 14 (nursing-lms-signed-vault) should be updated to reference this as the demo implementation of that substrate.
