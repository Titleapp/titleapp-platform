"use strict";

/**
 * services/version/index.js — Barrel export (lazy-load)
 */

module.exports = {
  get incrementVersion() {
    return require("./manager").incrementVersion;
  },
  get emitWorkerUpdatedEvent() {
    return require("./manager").emitWorkerUpdatedEvent;
  },
};
