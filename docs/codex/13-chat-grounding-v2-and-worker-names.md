# CODEX 13 — Chat grounding v2 (per-worker own-records) + worker-name codename leak

**Status:** 🟢 shipped + verified · **Date:** 2026-06-26 · **Owner:** Sean (built while traveling)
**Frame:** baseline-demo readiness (Meadow Creek / Dr. Maya Chen). Follow-on to CODEX 12.

---

## Why CODEX 12's "10/10 green" was misleading
CODEX 12 fixed the history-bleed and pointed chat at the canvas collections, and its
harness reported 10/10. But that harness only checked `expectDomain` (is the reply in the
right subject area) + no-fabrication. A reply could be on-topic and fabrication-free yet
know nothing about the user's actual records and still pass. When the harness was tightened
with `expectData` (must quote THIS worker's own records) + `forbid` (must not claim "I have
no access" while the canvas shows the data), it went **7 red**. So the real grounding work
was still open. This is that work.

## Root cause (precise)
Grounding came entirely from `spineState.buildSiblingStatePrompt`, which:
1. models ONLY the 5 Spine workers (accounting/marketing/hr/contacts/control-center), and
2. injects them as KPI **counts** via `renderOwnState` — which renders KPIs +
   `recentTransactions` but **drops** the rich arrays (`roster`, `campaigns`).

Consequences:
- HR knew "1 credential overdue" but not WHOSE (no roster→credential detail).
- Marketing knew "6 campaigns" but not WHICH is winning.
- The catalog workers (`vet-003-drug-dosing`, `edu-001-cvt-exam-prep`,
  `spine-4-staff-credentials`, `title-abstract-001`) weren't in the snapshot at all, so
  their chat quoted accounting/contacts data or said "I don't have access" while the canvas
  showed the records.

## The fix — `services/canvas/workerOwnData.js` (one new module)
`buildWorkerOwnData({ db, tenantId, workerSlug })` reads each worker's OWN canvas
collections — the SAME Firestore reads the canvas endpoints do — and returns a compact
"YOUR OWN RECORDS" block:
- `platform-hr` / `spine-4-staff-credentials` → `staff_credentials`, walked to per-person
  overdue/expiring credential lines + roster.
- `vet-003-drug-dosing` → `dosing_orders` + `protocol_library` (pending proposal, recent
  orders w/ dose+route+DEA, controlled count).
- `edu-001-cvt-exam-prep` → `course_enrollments` + `module_completions` +
  `cohort_analytics` (weakest subjects, at-risk students, per-student scores).
- `platform-marketing` → `campaigns` ranked by conversions w/ CTR/CPL.
- `platform-contacts` → segment breakdown.
- `platform-accounting` → real YTD + MTD + by-month totals from `transactions`
  ($341,040 net / $588,600 rev / $247,560 exp) so chat stops extrapolating MTD across
  months and matching the dashboard.

Injected ahead of the worker system prompt in BOTH worker-direct chat paths in `index.js`
(the primary `selectedWorker` path ~2970 and the sales/landing worker-override path ~3863).
Tenant-scoped, defensive (per-query catch, no data → ""), zero demo hardcoding.

`chatTest.js` probes tightened to demand the specific real figures (so the MTD-extrapolation
bug can't regress silently). **Result: 7 red → 🟢 10/10 green, with real names/numbers in
every reply.** Still the gate to run before any recording: `node scripts/test/chatTest.js`.

## Worker-name codename leak (separate fix, same day)
Four frontend slug-prettify sites title-cased the raw slug when no `display_name` was on
hand. Catalog/demo workers aren't in `catalog:byVertical`, so `cat = {}` and the fallback
rendered the internal codename on screen: "Spine 4 Staff Credentials", "Edu 001 Cvt Exam
Prep", "Vet 003 Drug Dosing", "Title Abstract 001".

Fix: new shared `prettyWorkerName(slug)` in `utils/displayName.js` strips the leading
`vertical-NNN-` / `spine-N-` prefix and trailing `-NNN` / `-vN` suffix, then uppercases
known acronyms (CVT/DVM/OSHA/DEA/HR…) → "Staff Credentials", "CVT Exam Prep", "Drug
Dosing", "Title Abstract". Generalizes to future creator workers (no per-slug hardcoding).
Wired into WorkerHome cards, Sidebar (string + object paths), VaultDashboard, and the
WorkerStateContext missing-doc fallback. (The "Dr.'s Personal Space" honorific header was
already fixed prior — `userFirstName` skips honorifics → "Maya's Personal Space".)

## Still open (mapped, intentionally NOT done unsupervised before filming)
- **Weed-whacker:** 8,247 `dist/` files tracked in git despite `.gitignore` covering
  `apps/business/dist` — untracking is an 8k-file change, do it supervised. No `.bak`/`.old`
  files exist (already clean). Dead second chat handler (~19235) still present but inert.
- **#86 training-records canvas restructure** (wall-of-text → structured) — design call.
- Port these chat fixes to Ruthie's fork if her videos use chat (separate track).
