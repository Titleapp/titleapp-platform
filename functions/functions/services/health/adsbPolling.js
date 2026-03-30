"use strict";

/**
 * ADS-B Polling Strategy — defines polling behavior per worker type.
 *
 * Flight Following & Tracking: live poll every 60 seconds
 * Dispatch Board: live poll every 60 seconds
 * Daily Ops Report: on-demand only (no auto-poll)
 * CoPilot workers: on-demand for nearby traffic only
 */

const ADSB_POLLING_STRATEGIES = {
  "av-dispatch-board": { mode: "live", intervalMs: 60000, description: "Live poll every 60 seconds" },
  "av-flight-following": { mode: "live", intervalMs: 60000, description: "Live poll every 60 seconds" },
  "av-daily-ops-report": { mode: "on-demand", intervalMs: null, description: "On-demand only — no auto-poll" },
  "av-pc12ng": { mode: "on-demand", intervalMs: null, description: "On-demand for nearby traffic only" },
  "av-efb-companion": { mode: "on-demand", intervalMs: null, description: "On-demand for nearby traffic only" },
};

// Default for any unlisted worker
const DEFAULT_STRATEGY = { mode: "on-demand", intervalMs: null, description: "On-demand — no auto-poll" };

/**
 * Get polling strategy for a worker.
 * @param {string} workerId
 * @returns {{ mode: string, intervalMs: number|null, description: string }}
 */
function getPollingStrategy(workerId) {
  return ADSB_POLLING_STRATEGIES[workerId] || DEFAULT_STRATEGY;
}

module.exports = { ADSB_POLLING_STRATEGIES, DEFAULT_STRATEGY, getPollingStrategy };
