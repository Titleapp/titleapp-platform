"use strict";

/**
 * preflight.js — Game Preflight Accuracy Check
 *
 * v1: Warn only, never block publish.
 * If regulated mode + preflightAccuracyChecked is false, returns a warning.
 * Full accuracy validation pipeline is v2.
 */

/**
 * Check preflight accuracy status for a game worker.
 *
 * @param {object} gameConfig — worker's gameConfig
 * @returns {{ status: string, message: string }}
 */
function checkPreflightAccuracy(gameConfig) {
  if (!gameConfig || typeof gameConfig !== "object") {
    return { status: "pass", message: "No game config — not a game worker" };
  }

  if (gameConfig.raasMode === "regulated" && !gameConfig.preflightAccuracyChecked) {
    return {
      status: "warning",
      message: "Your game includes regulated content. Accuracy has not been verified against the vertical rule pack. Review generated questions before publishing.",
    };
  }

  return { status: "pass", message: "Preflight accuracy check passed" };
}

module.exports = { checkPreflightAccuracy };
