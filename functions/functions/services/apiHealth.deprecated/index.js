"use strict";

/**
 * apiHealth/index.js — Barrel export (41.3-T2)
 */

const { callWithHealthCheck, logHealth, getHealthStatus, DEGRADED_THRESHOLD } = require("./monitor");
const { getErrorMessage, ERROR_MESSAGES } = require("./messages");

module.exports = {
  callWithHealthCheck,
  logHealth,
  getHealthStatus,
  getErrorMessage,
  ERROR_MESSAGES,
  DEGRADED_THRESHOLD,
};
