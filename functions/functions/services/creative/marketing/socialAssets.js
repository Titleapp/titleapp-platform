"use strict";

/**
 * creative/marketing/socialAssets.js — CREATIVE-001 Phase D
 *
 * Scaffold social media asset slots for a creative project launch.
 *
 * v1: writes empty asset records for the canonical asset types a book
 * launch needs. Real generation (image gen for cover reveal, quote-card
 * compositor, audio excerpt, video teaser) is v1.1 and routes through
 * the existing image/, documentEngine/, and external services.
 *
 * Firestore:
 *   creativeProjects/{projectId}/socialAssets/{assetId}
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("../projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_ASSET_TYPES = [
  "cover_reveal",
  "quote_card",
  "audio_excerpt",
  "video_teaser",
  "author_bio_card",      // for Alex Sociii: illustrated portrait only, no photo
  "blurb_card",
  "launch_announcement",
  "review_excerpt_card",
];

const DEFAULT_ASSET_SLOTS = [
  { type: "cover_reveal",          count: 1,  channel: ["instagram", "x", "linkedin"] },
  { type: "quote_card",            count: 8,  channel: ["instagram", "x"] },
  { type: "audio_excerpt",         count: 2,  channel: ["instagram_reels", "tiktok"] },
  { type: "video_teaser",          count: 1,  channel: ["instagram_reels", "tiktok", "youtube_shorts"] },
  { type: "author_bio_card",       count: 1,  channel: ["instagram", "x", "linkedin"] },
  { type: "blurb_card",            count: 4,  channel: ["instagram", "x"] },
  { type: "launch_announcement",   count: 1,  channel: ["instagram", "x", "linkedin", "email"] },
  { type: "review_excerpt_card",   count: 6,  channel: ["instagram", "x"] },
];

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} [input.actor]
 */
async function generateSocialAssets(input) {
  const { projectId, actor = null } = input;
  if (!projectId) throw new Error("generateSocialAssets: projectId required");

  const project = await projects.getProject(projectId);
  if (!project) throw new Error(`generateSocialAssets: project ${projectId} not found`);

  const db = getDb();
  const batch = db.batch();
  const created = [];

  for (const slot of DEFAULT_ASSET_SLOTS) {
    for (let i = 0; i < slot.count; i++) {
      const assetId = `asset_${crypto.randomBytes(8).toString("hex")}`;
      const ref = db.collection("creativeProjects").doc(projectId)
        .collection("socialAssets").doc(assetId);
      batch.set(ref, {
        assetId,
        projectId,
        type: slot.type,
        slotIndex: i,
        channels: slot.channel,
        status: "placeholder",
        artifact: {
          storageRef: null,
          mime: null,
          dimensions: null,
        },
        copy: {
          caption: null,
          altText: null,
          hashtags: [],
        },
        stub: true,
        created_at: ts(),
        updated_at: ts(),
      });
      created.push({ assetId, type: slot.type, slotIndex: i });
    }
  }

  await batch.commit();

  // TODO v1.1 — actual asset generation:
  //   - cover_reveal: hand-off to designer or image-gen pipeline
  //   - quote_card: composite quotes from drafted chapters over the
  //     cover art using the existing image/ service
  //   - audio_excerpt: text-to-speech of a passage (vendor TBD; not
  //     ElevenLabs for the Alex persona — synthesized voice is a tell)
  //   - video_teaser: stock-footage compositor or hand-edit
  //   - author_bio_card: illustration only per persona rules

  await projects.recordEvent(projectId, "socialAssets.scaffold", {
    assetCount: created.length,
    types: Array.from(new Set(created.map(a => a.type))),
  }, actor);

  return { ok: true, projectId, assetCount: created.length, created };
}

async function listSocialAssets(projectId, { type = null } = {}) {
  let q = getDb().collection("creativeProjects").doc(projectId).collection("socialAssets");
  if (type) q = q.where("type", "==", type);
  const snap = await q.get();
  return snap.docs.map(d => d.data());
}

module.exports = {
  generateSocialAssets,
  listSocialAssets,
  VALID_ASSET_TYPES,
  DEFAULT_ASSET_SLOTS,
};
