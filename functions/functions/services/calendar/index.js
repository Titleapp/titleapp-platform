"use strict";

/**
 * calendar/index.js — Barrel for the calendar connector.
 *
 * Lazy-loads sub-modules to keep cold-start cost low. Calendar is a
 * connector that touches every worker (Sean 2026-05-13) — parallel to Drive.
 */

let _auth;
function getAuth() {
  if (!_auth) _auth = require("./googleCalendarAuth");
  return _auth;
}

let _service;
function getService() {
  if (!_service) _service = require("./googleCalendarService");
  return _service;
}

module.exports = { getAuth, getService };
