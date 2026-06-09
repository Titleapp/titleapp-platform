// learningCanvasData.js — S52.47
// Designed canvas for the Student Evaluation Worker (Ruthie Clearwater, nursing).
// Renders through the shared designed-canvas renderer (RealEstateWorkerCanvas's
// band-colored block system) — NOT a forked component.
//
// IMPORTANT (architecture): the data here is a SAMPLE nursing learning record in
// the SHAPE of the real substrate (docs/learning-record-substrate.md). The Vault
// owns the real record (DTC + append-only typed logbook); this worker is a
// vault-adjacent READER. buildLearningCanvas() below is the reference for how the
// worker computes state from the logbook (evidence-first, never invents a grade) —
// it derives every number from SAMPLE_ENTRIES, it does not hardcode the cockpit.

// ── SAMPLE learning record (DTC + typed logbook) — clearly illustrative ──
// Shape matches Part A of the substrate spec. A real record comes from the Vault
// via LMS import + preceptor attestation; this is a demo BSN student.
export const SAMPLE_LEARNING_RECORD = {
  dtc: {
    category: "learning_record",
    subtype: "enrollment",
    institution: { name: "Sample State University — School of Nursing" },
    program: { name: "BSN", level: "undergraduate", cohort: "2027" },
    holder: "Sample Student",
    requirements: { clinicalHoursRequired: 270, competenciesRequired: 8 },
  },
  // Append-only typed logbook. State (GPA, hours, mastery) is COMPUTED from this.
  entries: [
    // assessments
    { kind: "assessment", course: "NUR 320 Pharmacology", assessmentType: "exam", score: 72, maxScore: 100, weight: 0.3, objectives: ["pharm-dosage", "pharm-interactions"], source: "lms:canvas", occurredAt: "2026-02-14" },
    { kind: "assessment", course: "NUR 320 Pharmacology", assessmentType: "quiz", score: 68, maxScore: 100, weight: 0.1, objectives: ["pharm-dosage"], source: "lms:canvas", occurredAt: "2026-03-02" },
    { kind: "assessment", course: "NUR 310 Health Assessment", assessmentType: "exam", score: 91, maxScore: 100, weight: 0.3, objectives: ["assessment-technique", "documentation"], source: "lms:canvas", occurredAt: "2026-02-20" },
    { kind: "assessment", course: "NUR 330 Med-Surg I", assessmentType: "exam", score: 84, maxScore: 100, weight: 0.3, objectives: ["pathophysiology", "care-planning"], source: "lms:canvas", occurredAt: "2026-03-10" },
    { kind: "assessment", course: "NUR 330 Med-Surg I", assessmentType: "assignment", score: 88, maxScore: 100, weight: 0.15, objectives: ["care-planning"], source: "lms:canvas", occurredAt: "2026-03-18" },
    // clinical hours (preceptor-attested — the aviation hours analog)
    { kind: "clinical_hours", hours: 96, site: "Med/Surg rotation", source: "instructor", attestedBy: { role: "preceptor" }, occurredAt: "2026-03-15" },
    { kind: "clinical_hours", hours: 72, site: "Pediatrics rotation", source: "instructor", attestedBy: { role: "preceptor" }, occurredAt: "2026-03-22" },
    // competency check-offs
    { kind: "competency", competency: { id: "med-admin", name: "Medication Administration" }, result: "met", source: "instructor", attestedBy: { role: "preceptor" }, occurredAt: "2026-03-12" },
    { kind: "competency", competency: { id: "vitals", name: "Vital Signs & Assessment" }, result: "met", source: "instructor", attestedBy: { role: "preceptor" }, occurredAt: "2026-02-28" },
    { kind: "competency", competency: { id: "iv-insertion", name: "IV Insertion" }, result: "remediate", source: "instructor", attestedBy: { role: "preceptor" }, occurredAt: "2026-03-20" },
    { kind: "competency", competency: { id: "wound-care", name: "Wound Care" }, result: "met", source: "instructor", attestedBy: { role: "preceptor" }, occurredAt: "2026-03-08" },
  ],
};

const OBJECTIVE_LABELS = {
  "pharm-dosage": "Pharmacology — dosage calc",
  "pharm-interactions": "Pharmacology — interactions",
  "assessment-technique": "Health assessment technique",
  "documentation": "Clinical documentation",
  "pathophysiology": "Pathophysiology",
  "care-planning": "Care planning",
};

// Band thresholds for mastery (green = on track, yellow = at risk, red = not met).
// Reads correctly for education — no "dyslexic" inversion.
function masteryBand(pct) {
  if (pct >= 80) return "GREEN";
  if (pct >= 70) return "YELLOW";
  return "RED";
}

// ── buildLearningCanvas(record) — derive the cockpit from the logbook ──
// Evidence-first: every figure is computed from `entries`; nothing is invented.
export function buildLearningCanvas(record = SAMPLE_LEARNING_RECORD) {
  const entries = record.entries || [];
  const req = record.dtc?.requirements || {};

  const assessments = entries.filter((e) => e.kind === "assessment");
  const clinical = entries.filter((e) => e.kind === "clinical_hours");
  const comps = entries.filter((e) => e.kind === "competency");

  // GPA-ish: weighted mean percent across assessments.
  const wSum = assessments.reduce((s, a) => s + (a.weight || 0), 0) || 1;
  const weightedPct = Math.round(
    assessments.reduce((s, a) => s + ((a.score / a.maxScore) * 100) * (a.weight || 0), 0) / wSum
  );

  // Mastery by objective: mean percent of assessments tagged with each objective.
  const byObj = {};
  for (const a of assessments) {
    const pct = (a.score / a.maxScore) * 100;
    for (const o of a.objectives || []) {
      (byObj[o] = byObj[o] || []).push(pct);
    }
  }
  const masteryBars = Object.entries(byObj).map(([o, pcts]) => {
    const pct = Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
    return { label: OBJECTIVE_LABELS[o] || o, pct, value: pct + "%", band: masteryBand(pct) };
  }).sort((a, b) => a.pct - b.pct);

  const totalHours = clinical.reduce((s, c) => s + (c.hours || 0), 0);
  const hoursReq = req.clinicalHoursRequired || 0;
  const hoursPct = hoursReq ? Math.round((totalHours / hoursReq) * 100) : 0;

  const compsMet = comps.filter((c) => c.result === "met").length;
  const compsRemediate = comps.filter((c) => c.result === "remediate");

  // At-risk = mastery bands below GREEN.
  const atRisk = masteryBars.filter((b) => b.band !== "GREEN");

  // Readiness estimate (DISCLOSED as an estimate, never a guarantee): blend of
  // weighted score, hours progress, and competency completion.
  const readiness = Math.round(
    0.5 * weightedPct + 0.25 * Math.min(hoursPct, 100) + 0.25 * (compsMet / (req.competenciesRequired || comps.length || 1)) * 100
  );
  const readyBand = masteryBand(readiness);

  // Instrument-panel counts (competency status at a glance).
  const cas = {
    GREEN: compsMet,
    YELLOW: compsRemediate.length,
    RED: comps.filter((c) => c.result === "not_met").length,
    BLUE: Math.max((req.competenciesRequired || 0) - comps.length, 0),
    WHITE: 0,
  };
  const casLabels = { GREEN: "Met", YELLOW: "Remediate", RED: "Not met", BLUE: "Remaining", WHITE: "—" };

  return {
    subtitle: `${record.dtc?.program?.name || "Program"} · ${record.dtc?.institution?.name || ""} · evidence-first from logbook`,
    sample: true,
    cas,
    casLabels,
    tabs: [
      {
        id: "overview", label: "Overview",
        blocks: [
          { type: "heroes", items: [
            { band: readyBand, title: `Readiness ~${readiness}%`, detail: "Estimate — blends scores, clinical hours, competencies. Not a guarantee." },
            { band: atRisk.length ? "YELLOW" : "GREEN", title: atRisk.length ? `${atRisk.length} at-risk area${atRisk.length > 1 ? "s" : ""}` : "On track", detail: atRisk.length ? "Weak objectives flagged below" : "No weak objectives flagged" },
          ] },
          { type: "kpis", items: [
            { label: "Weighted score", value: weightedPct + "%", band: masteryBand(weightedPct) },
            { label: "Clinical hours", value: `${totalHours}/${hoursReq}`, band: masteryBand(hoursPct) },
            { label: "Competencies met", value: `${compsMet}/${req.competenciesRequired || comps.length}`, band: compsMet >= (req.competenciesRequired || comps.length) ? "GREEN" : "YELLOW" },
            { label: "Assessments logged", value: String(assessments.length), band: "BLUE" },
          ] },
          ...(atRisk.length ? [{ type: "flags", items: atRisk.map((b) => ({ band: b.band, title: b.label, detail: `Mastery ${b.value} — below the 80% on-track threshold. Recommend targeted review.` })) }] : []),
        ],
      },
      {
        id: "mastery", label: "Mastery",
        blocks: [
          { type: "bars", title: "Mastery by objective (weakest first)", items: masteryBars, note: atRisk.length ? null : "All objectives on track" },
          { type: "prose", hero: null, items: atRisk.length ? atRisk.map((b) => ({ band: b.band, title: b.label, body: `Computed from the assessments tagged to this objective. Lift the underlying scores to move this to on-track (≥80%).` })) : [{ band: "GREEN", title: "No weak areas", body: "Every tagged objective is at or above the on-track threshold." }] },
        ],
      },
      {
        id: "clinical", label: "Clinical Hours",
        blocks: [
          { type: "bars", title: `Clinical hours — ${totalHours} of ${hoursReq} required`, items: [{ label: "Progress", pct: Math.min(hoursPct, 100), value: hoursPct + "%", band: masteryBand(hoursPct) }] },
          { type: "table", title: "Rotations logged (preceptor-attested)", columns: ["Site", "Hours", "Date", "Source"], rows: clinical.map((c) => ({ band: "GREEN", cells: [c.site, String(c.hours), c.occurredAt, "preceptor"] })) },
        ],
      },
      {
        id: "competencies", label: "Competencies",
        blocks: [
          { type: "cards", items: comps.map((c) => ({
            band: c.result === "met" ? "GREEN" : c.result === "remediate" ? "YELLOW" : "RED",
            label: c.result === "met" ? "MET" : c.result === "remediate" ? "REMEDIATE" : "NOT MET",
            title: c.competency?.name || c.competency?.id,
            detail: `${c.result === "met" ? "Checked off" : "Needs remediation"} · preceptor-attested · ${c.occurredAt}`,
          })) },
        ],
      },
      {
        id: "assessments", label: "Assessments",
        blocks: [
          { type: "table", title: "Recent assessments (from LMS)", columns: ["Course", "Type", "Score", "Date", "Status"], rows: assessments.map((a) => {
            const pct = Math.round((a.score / a.maxScore) * 100);
            const band = masteryBand(pct);
            return { band, cells: [a.course, a.assessmentType, `${a.score}/${a.maxScore} (${pct}%)`, a.occurredAt, band === "GREEN" ? "On track" : band === "YELLOW" ? "At risk" : "Below"] };
          }) },
        ],
      },
    ],
  };
}
