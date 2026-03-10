"use strict";

/**
 * Standardized API response helpers.
 *
 * All error responses use the same shape:
 *   { ok: false, error: "Human-readable message", code: "ERROR_CODE" }
 *
 * All success responses use:
 *   { ok: true, ...data }
 *
 * Rate limiting headers are attached when rateLimit context is provided.
 */

/**
 * Send a standardized error response.
 *
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} code - Machine-readable error code (e.g., "NOT_FOUND")
 * @param {string} message - Human-readable error message
 * @returns {Object} The response (for chaining)
 */
function sendError(res, status, code, message) {
  return res.status(status).json({ ok: false, error: message, code });
}

/**
 * Send a standardized success response.
 *
 * @param {Object} res - Express response object
 * @param {Object} [data] - Response data (spread into response body)
 * @returns {Object} The response (for chaining)
 */
function sendOk(res, data) {
  return res.status(200).json({ ok: true, ...data });
}

/**
 * Attach rate limiting headers to a response.
 *
 * @param {Object} res - Express response object
 * @param {Object} rateLimit - { limit, remaining, resetAt }
 */
function setRateLimitHeaders(res, rateLimit) {
  if (!rateLimit) return;
  if (rateLimit.limit != null) res.set("X-RateLimit-Limit", String(rateLimit.limit));
  if (rateLimit.remaining != null) res.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  if (rateLimit.resetAt != null) res.set("X-RateLimit-Reset", String(rateLimit.resetAt));
}

// Common error codes
const CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  MISSING_FIELDS: "MISSING_FIELDS",
  INVALID_INPUT: "INVALID_INPUT",
};

module.exports = { sendError, sendOk, setRateLimitHeaders, CODES };
