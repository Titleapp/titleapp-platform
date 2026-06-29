"use strict";

/**
 * studentRecord.js — Vault record schema for a student's ACADEMIC RECORD.
 *
 * The academic record is ONE DTC per student; everything that happens in their
 * program is an append-only logbook event on it. The student owns it for life
 * (FERPA-portable). A worker (e.g. nursing-education-001) mints it once via
 * vaultWriter.mintDtc(), then appends events via vaultWriter.appendEvent().
 *
 * Aligned to the existing nursing data model (nursingEducationData.json) so it's
 * a drop-in for live writes, not a redesign.
 *
 *   const S = require("../vault/schemas/studentRecord");
 *   const { type, metadata } = S.mintInput({ student });
 *   await mintDtc({ userId: studentUid, tenantId: "vault", worker, ...{ type, metadata }, createdByWorker });
 *   const { entryType, data } = S.event("reflection.submitted", { course, site, sloNumber, text });
 *   await appendEvent({ userId: studentUid, dtcId, worker, entryType, data, createdByWorker });
 */

const TYPE = "academic_record";
const ASSET_CLASS = "Education";

// Event types for the academic record logbook.
// `fields` = canonical data keys each event carries; additional keys are allowed.
// `required` = minimum keys that must be present for the event to be valid.
const EVENT_TYPES = {
  // ── Enrollment & Attendance ──────────────────────────────────────────────
  "enrollment.recorded":      { label: "Enrolled",             fields: ["courseId", "course", "cohort", "term", "credits", "section", "date"], required: ["course", "date"] },
  "attendance.recorded":      { label: "Attendance",           fields: ["courseId", "course", "site", "status", "instructor", "date", "note"], required: ["course", "date"] },

  // ── Clinical Hours ───────────────────────────────────────────────────────
  // #74 — per-shift clinical hours, required for accreditation compliance.
  // `category` maps to the nursingEducationData entryRequirements (e.g. "Med-Surg", "Peds").
  "clinical_hours.logged":    { label: "Clinical hours",       fields: ["courseId", "course", "site", "category", "preceptor", "hoursWorked", "shiftDate", "signedOff", "note"], required: ["course", "site", "hoursWorked", "shiftDate"] },

  // ── Reflections & Observations ───────────────────────────────────────────
  "reflection.submitted":     { label: "Reflection",           fields: ["courseId", "course", "site", "sloNumber", "title", "framework", "text", "date", "wordCount"], required: ["course", "sloNumber", "text", "date"] },
  "slo.observed":             { label: "SLO observed",         fields: ["courseId", "course", "sloNumber", "level", "instructor", "date", "note"], required: ["course", "sloNumber", "date"] },
  "professionalism.observed": { label: "Professionalism",      fields: ["courseId", "course", "status", "instructor", "date", "note"], required: ["course", "date"] },
  "incident.recorded":        { label: "Clinical incident",    fields: ["courseId", "course", "site", "severity", "selfReported", "date", "note"], required: ["course", "severity", "date"] },

  // ── Competency / Rubric Assessment ──────────────────────────────────────
  // #74 — per-criteria competency assessment (criteria A-F per SLO, per nursingEducationData).
  "competency.assessed":      { label: "Competency assessed",  fields: ["courseId", "course", "sloNumber", "criteriaId", "criteriaLabel", "level", "evidenceNote", "assessor", "date"], required: ["course", "sloNumber", "criteriaId", "level", "date"] },

  // ── Assignments ──────────────────────────────────────────────────────────
  // #74 — individual assignment submissions and grades.
  "assignment.submitted":     { label: "Assignment",           fields: ["courseId", "course", "assignmentId", "assignmentTitle", "type", "submittedDate", "dueDate", "score", "maxScore", "passed", "feedback", "lateSubmission"], required: ["course", "assignmentTitle", "submittedDate"] },

  // ── Assessments (quizzes, exams, skill demonstrations) ──────────────────
  // #74 — scored assessments distinct from reflections.
  "assessment.submitted":     { label: "Assessment",           fields: ["courseId", "course", "assessmentId", "assessmentTitle", "type", "score", "maxScore", "percentile", "passed", "attempts", "date", "proctored"], required: ["course", "assessmentTitle", "score", "date"] },

  // ── Course-level Grade ───────────────────────────────────────────────────
  // #74 — final locked grade for an entire course. Replaces the per-SLO grade.locked.
  // Once written, this entry type is immutable by design (append-only).
  "course.graded":            { label: "Course grade",         fields: ["courseId", "course", "letterGrade", "percentageGrade", "gpaPoints", "credits", "term", "passedCourse", "lockedBy", "date", "anchored"], required: ["course", "letterGrade", "date"] },

  // ── Legacy (SLO-level grade) — kept for backwards compat ────────────────
  "grade.locked":             { label: "Grade locked",         fields: ["courseId", "course", "sloNumber", "score", "date", "anchored"], required: ["course", "sloNumber", "score", "date"] },
};

function mintInput({ student }) {
  return {
    type: TYPE,
    metadata: {
      title: `${student.displayName || student.name} — Academic Record`,
      name: student.displayName || student.name,
      cohort: student.cohort || null,
      program: student.program || "ASN",
      institution: student.institution || "Clearwater Nursing",
      currentCourse: student.currentCourse || null,
      enrolled: student.enrolledISO || student.enrolled || null,
      demo: !!(student.isDemo || student.demo),
    },
  };
}

function isValidEvent(entryType) {
  return Object.prototype.hasOwnProperty.call(EVENT_TYPES, entryType);
}

// Validate required fields. Returns { ok, missing[] }.
function validateEvent(entryType, data = {}) {
  const spec = EVENT_TYPES[entryType];
  if (!spec) return { ok: false, missing: [], error: `Unknown event type: ${entryType}` };
  const required = spec.required || [];
  const missing = required.filter(k => data[k] == null || data[k] === "");
  return { ok: missing.length === 0, missing };
}

// Shape an event for appendEvent(). Includes a human description so the logbook
// viewer reads well even before per-type rendering exists.
function event(entryType, data = {}) {
  const spec = EVENT_TYPES[entryType];
  const description = data.description || (spec
    ? buildDescription(spec, data)
    : entryType);
  return { entryType, data: { ...data, description } };
}

function buildDescription(spec, data) {
  let d = spec.label;
  if (data.course) d += ` · ${data.course}`;
  if (data.assessmentTitle || data.assignmentTitle) d += ` — ${data.assessmentTitle || data.assignmentTitle}`;
  else if (data.title) d += ` — ${data.title}`;
  if (data.score != null && data.maxScore != null) d += ` (${data.score}/${data.maxScore})`;
  else if (data.letterGrade) d += ` — ${data.letterGrade}`;
  else if (data.hoursWorked) d += ` — ${data.hoursWorked}h`;
  return d;
}

module.exports = { TYPE, ASSET_CLASS, EVENT_TYPES, mintInput, event, isValidEvent, validateEvent };
