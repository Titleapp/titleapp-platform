// QA-001 check: alex-awareness
// Verifies the Alex (COS) system prompt contains the key concepts and tool names
// that were shipped, and does NOT contain references to retired/removed tools.
//
// This check answers: "Does Alex know about the tools we just built?" — separate
// from tool-inventory (which verifies the definitions/handlers exist), this
// checks the PROMPT itself so Alex will actually USE the tools correctly.
//
// Add a MUST entry when a new tool is shipped that Alex needs to know about.
// Add a MUST_NOT entry when a tool is retired and removed from the prompt.

const fs = require("fs");
const path = require("path");

const INDEX = path.resolve(__dirname, "../../../functions/functions/index.js");

// Strings that MUST appear in the COS system prompt
const MUST_MENTION = [
  {
    id: "operating-feed-concept",
    phrase: "Operating Feed",
    title: "Alex prompt must explain what the Operating Feed is",
    detail: "Without this, Alex won't know where push_alert sends alerts or why they matter.",
    severity: "p0",
  },
  {
    id: "push-alert-instruction",
    phrase: "push_alert",
    title: "Alex prompt must instruct Alex to use push_alert",
    detail: "Alex uses push_alert to write to the Operating Feed. If the prompt doesn't mention it Alex won't call it proactively.",
    severity: "p0",
  },
  {
    id: "resolve-alert-instruction",
    phrase: "resolve_alert",
    title: "Alex prompt must mention resolve_alert",
    detail: "Alex needs to know it can close items when issues are addressed.",
    severity: "p1",
  },
  {
    id: "snooze-alert-instruction",
    phrase: "snooze_alert",
    title: "Alex prompt must mention snooze_alert",
    detail: "Alex needs to know it can snooze items when the user defers something.",
    severity: "p1",
  },
  {
    id: "get-campaigns-instruction",
    phrase: "get_campaigns",
    title: "Alex prompt must mention get_campaigns",
    detail: "Alex needs to check existing campaigns before proposing new ones to avoid duplicates.",
    severity: "p1",
  },
  {
    id: "campaign-status-awareness",
    phrase: "CAMPAIGN STATUS AWARENESS",
    title: "Alex prompt must have CAMPAIGN STATUS AWARENESS block",
    detail: "Without this block Alex won't know when to call get_campaigns or understand the proposed→sending→sent lifecycle.",
    severity: "p1",
  },
  {
    id: "push-alert-severity-guidance",
    phrase: "RED=urgent",
    title: "Alex prompt must define severity levels for alerts",
    detail: "Alex needs concrete RED/AMBER/GREEN guidance so it calibrates severity correctly. Without this, everything becomes AMBER.",
    severity: "p1",
  },
];

// Strings that MUST NOT appear in the COS system prompt
const MUST_NOT_MENTION = [
  {
    id: "no-set-priorities-tool-call",
    phrase: "CALL set_priorities",
    title: "Alex prompt must NOT instruct Alex to call set_priorities",
    detail: "set_priorities was retired. If the prompt still references it, Alex will attempt to call a non-existent tool and produce an error response.",
    severity: "p0",
  },
  {
    id: "no-set-priorities-immediately",
    phrase: "set_priorities IMMEDIATELY",
    title: "Alex prompt must NOT have 'set_priorities IMMEDIATELY' instruction",
    detail: "This specific phrasing was the old DASHBOARD PRIORITIES block that was replaced by the OPERATING FEED block.",
    severity: "p0",
  },
  {
    id: "no-userpriorities-reference",
    phrase: "userPriorities",
    title: "Alex prompt must NOT reference the retired userPriorities collection",
    detail: "userPriorities/{uid} was replaced by alertFeed/{uid}/items. Prompt reference to it would confuse Alex about where to write.",
    severity: "p1",
  },
];

// The prompt lives between these marker strings in index.js.
// We extract that section to avoid false positives from tool handler comments
// that might contain the forbidden phrases for reference purposes.
const PROMPT_START_MARKER = 'const cosPrompt = `';
const PROMPT_END_MARKER = '`; // end cosPrompt';

function extractPrompt(src) {
  const start = src.indexOf(PROMPT_START_MARKER);
  if (start === -1) return null;
  const end = src.indexOf(PROMPT_END_MARKER, start);
  if (end === -1) return src.slice(start); // fallback: rest of file
  return src.slice(start, end + PROMPT_END_MARKER.length);
}

module.exports = {
  id: "alex-awareness",
  title: "Alex system prompt mentions shipped tools and omits retired ones",
  severity: "p0",
  async run() {
    const findings = [];

    let src;
    try { src = fs.readFileSync(INDEX, "utf8"); }
    catch (e) {
      return { ok: false, findings: [{ check: "alex-awareness", severity: "p0", title: "Could not read index.js", detail: e.message, evidence: {} }] };
    }

    // Try to extract just the prompt region. If extraction fails, fall back to
    // scanning the full file (acceptable — more false-negative risk than false-positive).
    const prompt = extractPrompt(src) || src;
    const usingFullFile = prompt === src;
    if (usingFullFile) {
      findings.push({
        check: "alex-awareness",
        severity: "p1",
        title: "Could not locate cosPrompt boundaries — scanning full file",
        detail: `Expected to find '${PROMPT_START_MARKER}' and '${PROMPT_END_MARKER}' in index.js. Prompt boundary markers changed? MUST_NOT checks may produce false negatives.`,
        evidence: { startMarker: PROMPT_START_MARKER, endMarker: PROMPT_END_MARKER },
      });
    }

    for (const chk of MUST_MENTION) {
      if (!prompt.includes(chk.phrase)) {
        findings.push({
          check: "alex-awareness",
          severity: chk.severity,
          title: chk.title,
          detail: `${chk.detail}\n\nPhrase "${chk.phrase}" not found in Alex system prompt.`,
          evidence: { id: chk.id, missing: chk.phrase },
        });
      }
    }

    for (const chk of MUST_NOT_MENTION) {
      if (prompt.includes(chk.phrase)) {
        findings.push({
          check: "alex-awareness",
          severity: chk.severity,
          title: chk.title,
          detail: `${chk.detail}\n\nForbidden phrase "${chk.phrase}" found in Alex system prompt.`,
          evidence: { id: chk.id, found: chk.phrase },
        });
      }
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
