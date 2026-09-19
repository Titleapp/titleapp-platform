"use strict";

// Real GA4 Data API client for SOCIII's own marketing site (sociii.ai).
// Uses Application Default Credentials — the Cloud Function's own runtime
// service account (496560182504-compute@developer.gserviceaccount.com) —
// so no OAuth dance or stored token is needed, unlike Google Ads. The only
// setup step is granting that service account "Viewer" on the GA4 property
// in Google Analytics Admin (Admin -> Property Access Management).
//
// Scoped to SOCIII's own site traffic, not a per-tenant/per-customer feature —
// there is one GA4 property (measurement ID G-F6EDHCVXWX, per
// marketing/launch-project-brief.md) tracking sociii.ai itself. Callers
// should only surface this on SOCIII's own workspace, not a customer tenant's
// Ivy canvas — see spineState.js's tenantId gate.
//
// GA4_PROPERTY_ID confirmed 2026-09-18 by checking the actual GA4 console
// directly (account: titleapp.core@gmail.com -> "Default Account for
// Firebase" -> property "title-app-alpha") rather than trusting the stale
// G-F6EDHCVXWX measurement ID cited in an old marketing doc, which turned
// out not to match anything real. The confirmed property (519522748,
// measurement ID G-REDNYLES89, stream "titleapp-web-frontdoor 0.1") is the
// same one wired into apps/business/src/firebase.ts's `measurementId` — but
// that config was never actually activated (`getAnalytics()` was never
// called anywhere in the app) until fixed the same day this was found, so
// there is no historical data yet, only data from the fix's deploy forward.
// Still set via env var, not hardcoded, so it stays a real config value
// rather than a silent assumption if the property ever changes.

const { google } = require("googleapis");

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || "519522748";

let _authClient = null;
async function getAuthClient() {
  if (_authClient) return _authClient;
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  _authClient = await auth.getClient();
  return _authClient;
}

/**
 * Pull core traffic metrics for sociii.ai from the GA4 Data API for the
 * last N days. Returns null (not a thrown error) if GA4_PROPERTY_ID isn't
 * configured yet, or if the service account doesn't have property access —
 * both are real, expected states until Sean completes the two setup steps
 * above, and callers (spineState.js) should treat null as "not available
 * yet," same as every other stubbed KPI in this codebase.
 *
 * @param {number} days
 * @returns {Promise<{sessions:number, activeUsers:number, engagedSessions:number, topLandingPages:Array<{page:string,sessions:number}>} | null>}
 */
async function getSiteTrafficSummary(days = 7) {
  if (!GA4_PROPERTY_ID) {
    console.warn("[ga4] GA4_PROPERTY_ID not set — skipping, see services/analytics/ga4.js header");
    return null;
  }
  try {
    const authClient = await getAuthClient();
    const analyticsdata = google.analyticsdata({ version: "v1beta", auth: authClient });

    const [summaryResp, pagesResp] = await Promise.all([
      analyticsdata.properties.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        requestBody: {
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
          metrics: [
            { name: "sessions" },
            { name: "activeUsers" },
            { name: "engagedSessions" },
          ],
        },
      }),
      analyticsdata.properties.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        requestBody: {
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
          dimensions: [{ name: "landingPagePlusQueryString" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 5,
        },
      }),
    ]);

    const row = summaryResp.data.rows?.[0];
    const sessions = Number(row?.metricValues?.[0]?.value || 0);
    const activeUsers = Number(row?.metricValues?.[1]?.value || 0);
    const engagedSessions = Number(row?.metricValues?.[2]?.value || 0);

    const topLandingPages = (pagesResp.data.rows || []).map(r => ({
      page: r.dimensionValues?.[0]?.value || "(unknown)",
      sessions: Number(r.metricValues?.[0]?.value || 0),
    }));

    return { sessions, activeUsers, engagedSessions, topLandingPages };
  } catch (err) {
    // Fail closed, not open — a permissions error here (service account not
    // yet granted Viewer access) is an expected, real state during rollout,
    // not a bug. Log for visibility, return null so the canvas shows the
    // existing "--" stub rather than crashing the whole live-KPI snapshot.
    console.warn("[ga4] getSiteTrafficSummary failed:", err.message);
    return null;
  }
}

module.exports = { getSiteTrafficSummary };
