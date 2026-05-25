"use strict";

/**
 * services/creative/index.js — CREATIVE-001 barrel export
 *
 * Long-Form Author worker. Composes a creative project (novel,
 * screenplay, stage play) from concept → outline → manuscript →
 * published artifact, across three output formats.
 *
 * Layout:
 *   projects.js          — project CRUD + event log
 *   outline.js           — outline + chapter records
 *   characterBible.js    — character entries with arc-per-chapter
 *   voiceRegister.js     — reference-tone declarations + drift check
 *   themeInvariants.js   — machine-checkable theme rules
 *   draftEngine.js       — chapter drafting + directed revisions
 *   continuity.js        — facts collection + cross-check
 *   formatConverter.js   — novel → screenplay / stageplay / KDP interior
 *   publishing/kdp.js    — Amazon KDP push (manual fallback documented)
 *   publishing/copyright.js — US Copyright TX form + DTC anchor
 *   marketing/campaign.js   — 3-phase launch campaign scaffolding
 *   marketing/pressList.js  — canonical literary press + tenant merge
 *   marketing/socialAssets.js — asset slot scaffolding (cover, quote, etc.)
 */

const projects = require("./projects");
const outline = require("./outline");
const characterBible = require("./characterBible");
const voiceRegister = require("./voiceRegister");
const themeInvariants = require("./themeInvariants");
const draftEngine = require("./draftEngine");
const continuity = require("./continuity");
const formatConverter = require("./formatConverter");
const kdp = require("./publishing/kdp");
const copyright = require("./publishing/copyright");
const campaign = require("./marketing/campaign");
const pressList = require("./marketing/pressList");
const socialAssets = require("./marketing/socialAssets");

module.exports = {
  projects,
  outline,
  characterBible,
  voiceRegister,
  themeInvariants,
  draftEngine,
  continuity,
  formatConverter,
  publishing: { kdp, copyright },
  marketing: { campaign, pressList, socialAssets },
};
