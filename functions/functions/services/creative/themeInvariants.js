"use strict";

/**
 * creative/themeInvariants.js — CREATIVE-001 Phase A
 *
 * Machine-checkable theme invariants for a creative project.
 *
 * Examples (Hamilton v Che):
 *   - "no_premature_inversion_cue" — no modern vocabulary / fourth-wall
 *     breaks / system-meta references before chapter index N.
 *   - "foil_woman_sees_through" — when a "foil woman" character appears,
 *     the chapter must surface the seeing-through dynamic without the
 *     male character noticing.
 *   - "system_survives_man_sentence" — the canonical sentence appears
 *     exactly once at end of Part I, once at end of Part II, and is
 *     transformed in Part III.
 *   - "narrator_drift" — Part I voice must remain intimate-literary;
 *     Part II must trend unsettled→sorrowful; Part III must register
 *     as subtly not-human by chapter 25.
 *
 * Firestore:
 *   creativeProjects/{projectId}/invariants/{invariantId}
 *
 * v1: declare + store. checkInvariant returns a stub report; real
 * model integration is v1.1. Shape of the returned report is fixed
 * here so the chapter-commit pipeline can be wired against it now.
 */

const admin = require("firebase-admin");

const projects = require("./projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_INVARIANT_TYPES = [
  "no_premature_cue",        // forbidden tokens/patterns before a threshold
  "voice_drift",             // voice must drift across declared sections
  "single_canonical_phrase", // a sentence appears exactly N times in declared positions
  "continuity_rule",         // a pattern must hold across the work
  "structural_constraint",   // page-count budgets, chapter ordering, etc.
];

const VALID_SEVERITIES = ["error", "warn", "info"];

/**
 * Declare invariants for a project. Each invariant carries a rule
 * machine the v1.1 check pass will execute. v1 stores the declaration
 * verbatim; the rule field is opaque shape and consumers can store any
 * JSON they want there.
 *
 * @param {string} projectId
 * @param {object[]} invariants
 * @param {string} invariants[].invariantId
 * @param {string} invariants[].type           — one of VALID_INVARIANT_TYPES
 * @param {string} invariants[].label
 * @param {object} invariants[].rule           — opaque JSON consumed by check pass
 * @param {string} [invariants[].severity]     — defaults to "error"
 * @param {string} [actor]
 */
async function declareInvariants(projectId, invariants, actor = null) {
  if (!projectId) throw new Error("declareInvariants: projectId required");
  if (!Array.isArray(invariants)) throw new Error("declareInvariants: invariants[] required");

  const db = getDb();
  const colRef = db.collection("creativeProjects").doc(projectId).collection("invariants");
  const batch = db.batch();

  for (const inv of invariants) {
    if (!inv.invariantId) throw new Error("declareInvariants: every invariant needs invariantId");
    if (!inv.type || !VALID_INVARIANT_TYPES.includes(inv.type)) {
      throw new Error(`declareInvariants: invalid type ${inv.type} for ${inv.invariantId}`);
    }
    const severity = inv.severity || "error";
    if (!VALID_SEVERITIES.includes(severity)) {
      throw new Error(`declareInvariants: invalid severity ${severity}`);
    }
    const ref = colRef.doc(inv.invariantId);
    batch.set(ref, {
      invariantId: inv.invariantId,
      type: inv.type,
      label: inv.label || inv.invariantId,
      rule: inv.rule || {},
      severity,
      declared_at: ts(),
      updated_at: ts(),
    }, { merge: true });
  }

  await batch.commit();
  await projects.recordEvent(projectId, "invariant.declare", {
    count: invariants.length,
    ids: invariants.map(i => i.invariantId),
  }, actor);

  return { ok: true, projectId, count: invariants.length };
}

async function listInvariants(projectId) {
  if (!projectId) throw new Error("listInvariants: projectId required");
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("invariants").get();
  return snap.docs.map(d => d.data());
}

async function getInvariant(projectId, invariantId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("invariants").doc(invariantId).get();
  return snap.exists ? snap.data() : null;
}

/**
 * Check a draft (or full chapter) against a single invariant.
 *
 * Returns:
 *   {
 *     ok: boolean,            — pass/fail (warn-severity invariants still set ok=true)
 *     invariant: {...},
 *     violations: [{ lineIndex, line, reason }],
 *     note: string,
 *   }
 *
 * v1: stub — returns ok=true, violations=[], note flagging stub.
 */
async function checkInvariant(input) {
  const { projectId, invariantId, draftText, chapterId = null } = input;
  if (!projectId) throw new Error("checkInvariant: projectId required");
  if (!invariantId) throw new Error("checkInvariant: invariantId required");

  const invariant = await getInvariant(projectId, invariantId);
  if (!invariant) {
    return { ok: false, invariant: null, violations: [], note: `invariant ${invariantId} not declared` };
  }

  // TODO v1.1 — implement per-type check passes:
  //   no_premature_cue:        regex/tokenizer scan against rule.forbidden
  //   voice_drift:             call voiceRegister.checkDraftAgainstRegister
  //                            with the expected register for the section
  //   single_canonical_phrase: string-match across the entire project's
  //                            committed drafts, validate count + position
  //   continuity_rule:         model-side check against rule.predicate
  //   structural_constraint:   numeric check against rule.bounds
  //
  // For v1 this records the event and returns a stub.

  await projects.recordEvent(projectId, "invariant.check", {
    invariantId,
    chapterId,
    draftLength: typeof draftText === "string" ? draftText.length : 0,
    stub: true,
  });

  return {
    ok: true,
    invariant,
    violations: [],
    note: "invariant-check stub — to be wired to model in v1.1",
  };
}

module.exports = {
  declareInvariants,
  listInvariants,
  getInvariant,
  checkInvariant,
  VALID_INVARIANT_TYPES,
  VALID_SEVERITIES,
};
