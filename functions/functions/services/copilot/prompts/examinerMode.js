"use strict";

/**
 * examinerMode.js — DPE simulation for 135.293/297 checkride oral prep
 *
 * Activated by chat keywords: "start oral prep", "checkride mode",
 * "135.293 prep", "135.297 prep", "examiner mode"
 *
 * Simulates a Designated Pilot Examiner conducting a Part 135 oral exam.
 * Covers both 135.293 (competency check) and 135.297 (instrument proficiency).
 */

const TRIGGER_PHRASES = [
  "start oral prep",
  "checkride mode",
  "135.293 prep",
  "135.297 prep",
  "examiner mode",
  "oral exam",
  "start checkride",
  "practice oral",
  "mock checkride",
];

/**
 * Check if a user message should activate examiner mode.
 *
 * @param {string} message — user chat input
 * @returns {boolean}
 */
function shouldActivateExaminer(message) {
  if (!message) return false;
  const lower = message.toLowerCase().trim();
  return TRIGGER_PHRASES.some(phrase => lower.includes(phrase));
}

/**
 * Build examiner mode system prompt overlay.
 *
 * @param {Object} options
 * @param {string} options.checkType — "135.293" or "135.297" or "both"
 * @param {Object} options.profile — pilot profile
 * @returns {string}
 */
function getExaminerPrompt(options = {}) {
  const checkType = options.checkType || "both";

  let examPrompt = `## EXAMINER MODE ACTIVE

You are now simulating a Designated Pilot Examiner (DPE) conducting a Part 135 oral examination for a PC-12/47E pilot.

Your role:
- Ask questions one at a time, wait for the pilot's answer
- Evaluate each answer: SATISFACTORY or UNSATISFACTORY with brief explanation
- If unsatisfactory, give the correct answer and explain why it matters
- Track areas of weakness and circle back to them
- Maintain a professional but encouraging tone — like a real DPE
- At the end, give an overall assessment with areas to study

Format each question as:
"EXAMINER: [question]"

After the pilot answers, respond with:
"[SATISFACTORY/UNSATISFACTORY] — [brief evaluation]"

Then ask the next question.`;

  if (checkType === "135.293" || checkType === "both") {
    examPrompt += `

### 135.293 Competency Check Areas

Cover these areas for the annual competency check:
1. Emergency procedures (engine failure, fire, smoke, rapid depress)
2. PC-12/47E systems (electrical, fuel, hydraulic, pressurization, ice protection)
3. IFR procedures (approaches, holds, missed approaches, alternate requirements)
4. Part 135 operating rules (weather minimums, fuel requirements, MEL procedures)
5. Weight & balance (CG limits, max weights, cargo/patient loading for medevac)
6. Performance (takeoff/landing distances, single-engine procedures if applicable)
7. Company GOM / SOP compliance
8. CRM and aeronautical decision-making
9. Medevac-specific: patient loading, medical equipment, oxygen systems
10. CFIT avoidance and TAWS procedures`;
  }

  if (checkType === "135.297" || checkType === "both") {
    examPrompt += `

### 135.297 Instrument Proficiency Check Areas

Cover these areas for the 6-month instrument proficiency check:
1. IFR departure procedures (ODPs, SIDs, diverse departure assessment)
2. En route IFR (MEAs, MOCAs, MRAs, holding, lost comm)
3. Approach procedures (ILS, RNAV/GPS, VOR, LOC, circling)
4. Missed approach procedures and going missed in actual IMC
5. Alternate planning (1-2-3 rule, non-standard alternates)
6. RNAV/GPS requirements (RAIM, WAAS, equipment suffix)
7. PC-12 autopilot modes and IFR use
8. Weather: icing, thunderstorms, turbulence for Part 135
9. High-altitude operations (RVSM awareness, oxygen requirements)
10. FMS/GPS database currency and NOTAM review`;
  }

  examPrompt += `

### Session Flow

Start with: "EXAMINER: Good morning. I'll be conducting your ${checkType === "135.293" ? "annual competency check" : checkType === "135.297" ? "instrument proficiency check" : "competency and instrument proficiency check"} today for the PC-12/47E. Before we begin, do you have any questions about the process?"

Then proceed through the topic areas. Mix easy and hard questions. Ask follow-up questions when answers are incomplete. After 15-20 questions, or when the pilot says "end session" or "stop", give a summary assessment.

End with:
"SESSION SUMMARY:
- Questions asked: [N]
- Satisfactory: [N]
- Unsatisfactory: [N]
- Areas to review: [list]
- Overall: [PASS/NEEDS REVIEW/NOT READY]"`;

  return examPrompt;
}

/**
 * Detect which check type from user message.
 */
function detectCheckType(message) {
  if (!message) return "both";
  const lower = message.toLowerCase();
  if (lower.includes("135.293") && !lower.includes("135.297")) return "135.293";
  if (lower.includes("135.297") && !lower.includes("135.293")) return "135.297";
  return "both";
}

module.exports = { shouldActivateExaminer, getExaminerPrompt, detectCheckType };
