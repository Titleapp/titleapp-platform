"use strict";

/**
 * creative/continuity.js — CREATIVE-001 Phase B
 *
 * Cross-chapter continuity check.
 *
 * Long-form work fails on continuity drift more than on prose quality.
 * The system keeps an append-only "facts" collection per project — every
 * verifiable anchor (dates, places, named persons, public-record events,
 * character whereabouts, named objects, in-world rules) is captured
 * there. The continuity pass cross-references a new draft against the
 * facts collection and surfaces contradictions.
 *
 * Facts collection shape:
 *   creativeProjects/{projectId}/facts/{factId}
 *     {
 *       factId, type, subject, claim, source, chapterRefs,
 *       confidence: "verified"|"asserted"|"speculative",
 *       created_at, updated_at,
 *     }
 *
 * type vocabulary:
 *   biographical_date, biographical_place, public_event,
 *   character_whereabouts, character_relationship, named_object,
 *   in_world_rule
 *
 * v1: declare + store facts via addFact. checkContinuity returns a stub
 * report; real model integration is v1.1. Shape is fixed here so the
 * pre-commit chapter pipeline can be wired against it now.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("./projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_FACT_TYPES = [
  "biographical_date",
  "biographical_place",
  "public_event",
  "character_whereabouts",
  "character_relationship",
  "named_object",
  "in_world_rule",
];

const VALID_CONFIDENCE = ["verified", "asserted", "speculative"];

async function addFact(input) {
  const {
    projectId,
    factId = null,
    type,
    subject,
    claim,
    source = null,
    chapterRefs = [],
    confidence = "asserted",
    actor = null,
  } = input;

  if (!projectId) throw new Error("addFact: projectId required");
  if (!type || !VALID_FACT_TYPES.includes(type)) throw new Error(`addFact: invalid type ${type}`);
  if (!subject) throw new Error("addFact: subject required");
  if (!claim) throw new Error("addFact: claim required");
  if (!VALID_CONFIDENCE.includes(confidence)) {
    throw new Error(`addFact: invalid confidence ${confidence}`);
  }

  const id = factId || `fact_${crypto.randomBytes(8).toString("hex")}`;
  await getDb().collection("creativeProjects").doc(projectId)
    .collection("facts").doc(id).set({
      factId: id, type, subject, claim, source, chapterRefs, confidence,
      created_at: ts(), updated_at: ts(),
    }, { merge: true });

  await getDb().collection("creativeProjects").doc(projectId).update({
    factCount: admin.firestore.FieldValue.increment(1),
    updated_at: ts(),
  });

  await projects.recordEvent(projectId, "fact.add", {
    factId: id, type, subject, confidence,
  }, actor);

  return { ok: true, projectId, factId: id };
}

async function listFacts(projectId, { type = null, subject = null } = {}) {
  let q = getDb().collection("creativeProjects").doc(projectId).collection("facts");
  if (type) q = q.where("type", "==", type);
  if (subject) q = q.where("subject", "==", subject);
  const snap = await q.limit(1000).get();
  return snap.docs.map(d => d.data());
}

/**
 * Cross-check a draft against the facts collection.
 *
 * Returns:
 *   {
 *     ok: boolean,
 *     conflicts: [{ factId, claim, draftExcerpt, reason }],
 *     note: string,
 *   }
 *
 * v1: stub.
 */
async function checkContinuity(input) {
  const { projectId, chapterId, draftText } = input;
  if (!projectId) throw new Error("checkContinuity: projectId required");
  if (!chapterId) throw new Error("checkContinuity: chapterId required");

  // TODO v1.1 — implement:
  //   1. Pull facts for project (or filter to subjects referenced in
  //      chapter via NER on draftText).
  //   2. For each fact, ask model: does the draft contradict the claim?
  //   3. Collect conflicts with line refs into the report.
  // For v1 record the event and return a stub.

  await projects.recordEvent(projectId, "continuity.check", {
    chapterId,
    draftLength: typeof draftText === "string" ? draftText.length : 0,
    stub: true,
  });

  return {
    ok: true,
    conflicts: [],
    note: "continuity-check stub — to be wired to model in v1.1",
  };
}

module.exports = {
  addFact,
  listFacts,
  checkContinuity,
  VALID_FACT_TYPES,
  VALID_CONFIDENCE,
};
