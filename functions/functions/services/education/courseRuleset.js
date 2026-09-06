"use strict";

/**
 * courseRuleset.js — Course Uploader Step 3, "Make sure your rules are in
 * place" (CODEX 70 Surface 2 rework, gap #1).
 *
 * Builds a per-course RAAS ruleset from a short structured questionnaire
 * and stores it on courses/{slug}.raasRuleset — same shape as a ruleset
 * JSON file (hard_stops, chat_rules, soft_flags, disclaimer,
 * system_context; see raas/rulesets/nursing_clinical_v1.json for the
 * reference schema this follows). See raas/raas.engine.js's
 * getCourseEnforcementContext() for how this object is consumed at chat
 * time — it is applied ON TOP OF whatever static WORKER_RULESET_MAP
 * ruleset (if any) already covers this course's workerId, not instead of.
 *
 * v1 scope: a fixed 3-question structured questionnaire (guided-chat
 * generation is the documented alternative but is not built here — the
 * questionnaire is deterministic, cheap, and testable, which matters more
 * for a first real ruleset mechanism than open-ended chat authoring).
 * chat_rules (regex) are generated as a nice-to-have for the
 * "no direct answers on graded work" case; hard_stops + disclaimer +
 * system_context are always produced, per the minimum bar in the spec.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const BASE_DISCLAIMER =
  "This AI tutor supports your learning but is not a substitute for your instructor. " +
  "It answers only from the materials your instructor uploaded for this course — always confirm graded work, deadlines, and grading decisions with your instructor.";

/**
 * Build a per-course ruleset object from questionnaire answers.
 *
 * @param {object} answers
 * @param {boolean} [answers.directAnswersOnGradedWork] — default false (no direct answers)
 * @param {boolean} [answers.citeSyllabusOnSubstantive] — default true (cite materials)
 * @param {string[]|string} [answers.neverAdviseOnTopics] — array or comma-separated string
 * @returns {object} ruleset — { version, source, generatedAt, answers, hard_stops, chat_rules, soft_flags, disclaimer, system_context }
 */
function buildRulesetFromAnswers(answers) {
  const a = answers || {};
  const directAnswersOnGradedWork = a.directAnswersOnGradedWork === true;
  const citeSyllabusOnSubstantive = a.citeSyllabusOnSubstantive !== false;
  const neverAdviseOn = Array.isArray(a.neverAdviseOnTopics)
    ? a.neverAdviseOnTopics.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
    : (typeof a.neverAdviseOnTopics === "string" && a.neverAdviseOnTopics.trim()
      ? a.neverAdviseOnTopics.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20)
      : []);

  const hard_stops = [
    {
      id: "course-scope-own-materials-only",
      label: "Only this course's own materials and this student's own conversation",
      logic: "The tutor may only ground answers in the documents uploaded for THIS course and the current student's own conversation history — never another course's materials or another student's conversation.",
      trigger: "AI references content, a student, or a conversation that did not come from this course's own uploaded materials or this session.",
      on_fail: "Say the information is not present in this course's materials rather than guessing or borrowing from elsewhere.",
    },
  ];
  const chat_rules = [];

  if (!directAnswersOnGradedWork) {
    hard_stops.push({
      id: "course-no-direct-graded-answers",
      label: "No direct answers on graded work",
      logic: "This instructor has NOT allowed the tutor to give direct answers to graded assignments, quizzes, or exam questions. The tutor may explain concepts, work similar practice examples, and ask guiding questions, but must not hand the student the specific answer to a question the instructor is grading.",
      trigger: "A student asks for the answer to a specific graded assignment, quiz, or exam question and the AI provides it directly.",
      on_fail: "Decline to give the direct answer. Offer to explain the underlying concept, walk through a similar example, or ask a guiding question instead.",
    });
    chat_rules.push({
      id: "course-graded-answer-phrase-check",
      pattern: "(the (correct )?answer (to (this|question|problem|#?\\d+))? is|here'?s the answer)",
      flags: "i",
      message: "This course does not allow direct answers on graded work. Reframe as a guiding question or worked example instead of stating the answer outright.",
    });
  }

  if (citeSyllabusOnSubstantive) {
    hard_stops.push({
      id: "course-cite-syllabus-rubric",
      label: "Cite the syllabus/rubric/materials on substantive answers",
      logic: "On any substantive academic answer, the tutor should reference which uploaded material (syllabus, rubric, learning objective, notes) it is drawing from. If the material doesn't cover the question, say so explicitly rather than answering from general knowledge without saying so.",
      trigger: "AI gives a substantive academic answer with no reference to the course materials and does not say the materials don't cover it.",
      on_fail: "Add a brief reference to the specific uploaded material the answer draws from, or state plainly that this isn't covered in the uploaded materials.",
    });
  }

  if (neverAdviseOn.length) {
    hard_stops.push({
      id: "course-restricted-topics",
      label: "Never advise on instructor-restricted topics",
      logic: `This instructor has marked the following topics off-limits for this tutor: ${neverAdviseOn.join(", ")}. The tutor must decline to advise on these and redirect the student to the instructor or an appropriate resource.`,
      trigger: `A student asks the tutor to advise on: ${neverAdviseOn.join(", ")}.`,
      on_fail: "Decline and redirect the student to the instructor or an appropriate professional/resource.",
    });
  }

  const system_context =
    "You are a course tutor operating under this course's own rules, set by the instructor at course-creation time. " +
    "Ground every substantive answer in the course materials uploaded for THIS course only — never another course's materials, never another student's data. " +
    (!directAnswersOnGradedWork ? "Do not give direct answers to graded assignments, quizzes, or exams — teach the concept instead. " : "") +
    (citeSyllabusOnSubstantive ? "Reference the specific uploaded material (syllabus, rubric, notes) a substantive answer draws from. " : "") +
    (neverAdviseOn.length ? `Never advise on: ${neverAdviseOn.join(", ")} — redirect the student to the instructor instead. ` : "");

  return {
    version: "v1",
    source: "questionnaire",
    generatedAt: new Date().toISOString(),
    answers: { directAnswersOnGradedWork, citeSyllabusOnSubstantive, neverAdviseOnTopics: neverAdviseOn },
    hard_stops,
    chat_rules,
    soft_flags: [],
    disclaimer: BASE_DISCLAIMER,
    system_context,
  };
}

/**
 * POST /v1/edu:course:setRuleset — authenticated as the course session
 * (courseUid), same auth model as publishCourse(). Body: { slug, answers }
 */
async function setCourseRuleset(req, res, courseAuthUser) {
  const db = getDb();
  const { slug, answers } = req.body || {};
  if (!slug) return res.status(400).json({ ok: false, error: "slug required" });

  const ref = db.collection("courses").doc(String(slug));
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "Course not found" });
  const data = snap.data();
  if (data.courseUid !== courseAuthUser.uid) {
    return res.status(403).json({ ok: false, error: "Not authorized for this course" });
  }

  const raasRuleset = buildRulesetFromAnswers(answers);
  await ref.update({ raasRuleset, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return res.json({ ok: true, ruleset: raasRuleset });
}

module.exports = { buildRulesetFromAnswers, setCourseRuleset, BASE_DISCLAIMER };
