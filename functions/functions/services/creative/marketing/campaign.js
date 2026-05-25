"use strict";

/**
 * creative/marketing/campaign.js — CREATIVE-001 Phase D
 *
 * Launch campaign scaffolding for a creative project.
 *
 * A book launch is three-phase:
 *   1. pre_launch_buzz — 6-12 weeks before pub date. Cover reveal, early
 *      reader copy outreach, podcast bookings (where the persona allows),
 *      ARC distribution, blurb collection. For Alex Sociii, podcasts are
 *      explicitly off the table — written-only exchanges per the persona
 *      operational rules.
 *   2. launch_week — pub date ± 1 week. Coordinated press hits, asset
 *      drops, retail outreach, owned-channel amplification.
 *   3. sustained_press — 6-12 weeks after pub date. Reviews, profiles,
 *      panel appearances (where the persona allows), award submissions.
 *
 * Firestore:
 *   creativeProjects/{projectId}/campaigns/{campaignId}
 *     phases: [{ id, kind, startAt, endAt, actions: [...] }]
 *
 * v1: scaffold an empty campaign with the three phases pre-populated as
 * empty action lists. The existing marketingService (apollo, email,
 * social) is the integration target for v1.1 — when actions get added
 * to a phase, they delegate to those services.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("../projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_PHASE_KINDS = ["pre_launch_buzz", "launch_week", "sustained_press"];
const VALID_AUDIENCES = ["literary", "genre", "trade", "consumer", "mixed"];

const DEFAULT_PHASES = [
  {
    kind: "pre_launch_buzz",
    label: "Pre-Launch Buzz",
    weeksBeforePubDate: { start: 12, end: 1 },
    actionTemplates: [
      "cover_reveal",
      "blurb_collection",
      "arc_distribution",
      "literary_press_outreach",
      "early_review_solicitation",
    ],
  },
  {
    kind: "launch_week",
    label: "Launch Week",
    daysAroundPubDate: { startOffset: -7, endOffset: 7 },
    actionTemplates: [
      "press_release",
      "owned_channel_announcement",
      "social_asset_drop",
      "retail_outreach",
      "review_outlet_followup",
    ],
  },
  {
    kind: "sustained_press",
    label: "Sustained Press",
    weeksAfterPubDate: { start: 1, end: 12 },
    actionTemplates: [
      "feature_pitches",
      "podcast_pitches",       // skipped for Alex Sociii by persona rules
      "award_submissions",
      "festival_submissions",
      "translation_rights",
    ],
  },
];

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} [input.audience]              — one of VALID_AUDIENCES
 * @param {string} [input.pubDate]               — ISO date; if known, populates phase timing
 * @param {boolean} [input.recluseAuthor]        — defaults true if project has Alex Sociii byline
 * @param {string} [input.actor]
 */
async function createLaunchCampaign(input) {
  const { projectId, audience = "literary", pubDate = null, actor = null } = input;
  if (!projectId) throw new Error("createLaunchCampaign: projectId required");
  if (!VALID_AUDIENCES.includes(audience)) {
    throw new Error(`createLaunchCampaign: invalid audience ${audience}`);
  }

  const project = await projects.getProject(projectId);
  if (!project) throw new Error(`createLaunchCampaign: project ${projectId} not found`);

  const recluseAuthor = typeof input.recluseAuthor === "boolean"
    ? input.recluseAuthor
    : (project.authorByline === "Alex Sociii");

  const campaignId = `cmp_${crypto.randomBytes(8).toString("hex")}`;

  // Build phases.
  const pubDateObj = pubDate ? new Date(pubDate) : null;
  const phases = DEFAULT_PHASES.map(template => {
    let startAt = null, endAt = null;
    if (pubDateObj) {
      if (template.weeksBeforePubDate) {
        startAt = new Date(pubDateObj.getTime() - template.weeksBeforePubDate.start * 7 * 86400000);
        endAt = new Date(pubDateObj.getTime() - template.weeksBeforePubDate.end * 7 * 86400000);
      } else if (template.daysAroundPubDate) {
        startAt = new Date(pubDateObj.getTime() + template.daysAroundPubDate.startOffset * 86400000);
        endAt = new Date(pubDateObj.getTime() + template.daysAroundPubDate.endOffset * 86400000);
      } else if (template.weeksAfterPubDate) {
        startAt = new Date(pubDateObj.getTime() + template.weeksAfterPubDate.start * 7 * 86400000);
        endAt = new Date(pubDateObj.getTime() + template.weeksAfterPubDate.end * 7 * 86400000);
      }
    }
    // Filter out persona-incompatible templates
    let templates = template.actionTemplates;
    if (recluseAuthor) {
      templates = templates.filter(t =>
        !["podcast_pitches", "live_event", "tour_bookings", "video_interview"].includes(t)
      );
    }
    return {
      phaseId: `${template.kind}`,
      kind: template.kind,
      label: template.label,
      startAt: startAt ? startAt.toISOString() : null,
      endAt: endAt ? endAt.toISOString() : null,
      actionTemplates: templates,
      actions: [], // populated by future calls to addAction
    };
  });

  await getDb().collection("creativeProjects").doc(projectId)
    .collection("campaigns").doc(campaignId).set({
      campaignId,
      projectId,
      audience,
      pubDate: pubDateObj ? admin.firestore.Timestamp.fromDate(pubDateObj) : null,
      recluseAuthor,
      phases,
      status: "draft",
      stub: true,
      created_at: ts(),
      updated_at: ts(),
      created_by: actor,
    });

  await projects.recordEvent(projectId, "campaign.create", {
    campaignId, audience, pubDate, recluseAuthor,
  }, actor);

  return { ok: true, projectId, campaignId, audience, recluseAuthor, phaseCount: phases.length };
}

async function getCampaign(projectId, campaignId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("campaigns").doc(campaignId).get();
  return snap.exists ? snap.data() : null;
}

async function listCampaigns(projectId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("campaigns").orderBy("created_at", "desc").get();
  return snap.docs.map(d => d.data());
}

module.exports = {
  createLaunchCampaign,
  getCampaign,
  listCampaigns,
  VALID_PHASE_KINDS,
  VALID_AUDIENCES,
  DEFAULT_PHASES,
};
