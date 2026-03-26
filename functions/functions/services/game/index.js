"use strict";

/**
 * services/game/index.js — Barrel export (lazy-load)
 *
 * Same pattern as services/sandbox/index.js.
 * Modules are loaded on first access to minimize cold-start impact.
 */

module.exports = {
  // modeDetector.js
  get detectRaasMode() {
    return require("./modeDetector").detectRaasMode;
  },

  // rules.js
  get compileGameRules() {
    return require("./rules").compileGameRules;
  },

  // questions.js
  get generateQuestions() {
    return require("./questions").generateQuestions;
  },
  get loadRulePack() {
    return require("./questions").loadRulePack;
  },

  // stresstest.js
  get generateStressTestPrompts() {
    return require("./stresstest").generateStressTestPrompts;
  },

  // audit.js
  get logGameEvent() {
    return require("./audit").logGameEvent;
  },

  // cta.js
  get emitCtaTrigger() {
    return require("./cta").emitCtaTrigger;
  },
  get VALID_TRIGGERS() {
    return require("./cta").VALID_TRIGGERS;
  },

  // preflight.js
  get checkPreflightAccuracy() {
    return require("./preflight").checkPreflightAccuracy;
  },
};
