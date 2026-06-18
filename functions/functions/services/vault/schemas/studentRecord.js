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

// The six event types the nursing worker already produces, plus enrollment.
// `fields` = the data keys each event carries (for authoring + validation).
const EVENT_TYPES = {
  "enrollment.recorded":     { label: "Enrolled",        fields: ["course", "cohort", "date"] },
  "attendance.recorded":     { label: "Attendance",      fields: ["course", "site", "status", "instructor", "date", "note"] },
  "reflection.submitted":    { label: "Reflection",      fields: ["course", "site", "sloNumber", "title", "framework", "text", "date"] },
  "slo.observed":            { label: "SLO observed",    fields: ["course", "sloNumber", "level", "instructor", "date", "note"] },
  "professionalism.observed":{ label: "Professionalism", fields: ["course", "status", "instructor", "date", "note"] },
  "incident.recorded":       { label: "Clinical incident", fields: ["course", "site", "severity", "selfReported", "date", "note"] },
  "grade.locked":            { label: "Grade locked",    fields: ["course", "sloNumber", "score", "date", "anchored"] },
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

// Shape an event for appendEvent(). Includes a human description so the logbook
// viewer reads well even before per-type rendering exists.
function event(entryType, data = {}) {
  const spec = EVENT_TYPES[entryType];
  const description = data.description || (spec
    ? `${spec.label}${data.course ? ` · ${data.course}` : ""}${data.title ? ` — ${data.title}` : ""}`
    : entryType);
  return { entryType, data: { ...data, description } };
}

module.exports = { TYPE, ASSET_CLASS, EVENT_TYPES, mintInput, event, isValidEvent };
