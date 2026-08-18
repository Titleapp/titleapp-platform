"use strict";

/**
 * credentialTracker.js — real, live-recomputed staff-credential status.
 *
 * staff_credentials docs stored days_remaining/status as a snapshot frozen
 * at seed time and never recomputed on read — found live (Sean, 2026-08-18):
 * Dr. Chen's DEA registration (expiry_date 2026-07-21) still showed
 * "expiring_soon, 14 days" weeks after it had actually already lapsed.
 * Both consumers of this collection (`/staff-credentials:list` and
 * services/alex/workspaceBrief.js's home-feed brief) read that stale
 * snapshot directly. This recomputes both fields from expiry_date vs now,
 * matching the ~30-day expiring-soon window already implied by the
 * existing seed data (a DEA cred at 14 days out was seeded as
 * "expiring_soon"; others at 56+ days were "current").
 */

const MS_PER_DAY = 86400000;
const EXPIRING_SOON_WINDOW_DAYS = 30;

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function recomputeCredential(cred, now) {
  if (!cred.expiry_date) return cred;
  const expiry = new Date(cred.expiry_date);
  if (isNaN(expiry.getTime())) return cred;
  if (cred.status === "in_progress") return cred;

  const daysRemaining = daysBetween(now, expiry);
  let status = "current";
  if (daysRemaining < 0) status = "overdue";
  else if (daysRemaining <= EXPIRING_SOON_WINDOW_DAYS) status = "expiring_soon";

  return { ...cred, days_remaining: daysRemaining, status };
}

function recomputeStaffCredentials(staffDocs, now = new Date()) {
  return staffDocs.map(s => ({
    ...s,
    credentials: (s.credentials || []).map(c => recomputeCredential(c, now)),
  }));
}

module.exports = { recomputeCredential, recomputeStaffCredentials };
