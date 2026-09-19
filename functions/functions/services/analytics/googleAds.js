"use strict";

// Real Google Ads API client for SOCIII's own Search campaign (CODEX 94).
// Google Ads API has no service-account/Application Default Credentials
// path the way GA4 does (see ga4.js) — it requires OAuth2 credentials tied
// to a real Google user with access to the ad account, so this reuses the
// existing generic OAuth connector (google_ads, oauthConfig.js) rather than
// a project-level service account. Sean connects his own Google Ads-linked
// account once via Settings, the same UI already used for TikTok/LinkedIn.
//
// Two separate approvals gate this being real, tracked in CODEX 94 §3.1/§5:
//   1. GOOGLE_ADS_DEVELOPER_TOKEN — requires Basic Access approval on the
//      GCP project (automated, minutes, per Google's Sept 2026 restructure —
//      but only after brand verification is actually done; unconfirmed as
//      of this write).
//   2. The OAuth connection itself (Sean clicking "Connect Google Ads" in
//      Settings) — independent of #1, can happen any time.
// Both must be true before this returns real data. Fails closed (null, not
// a throw) on either being missing, same convention as ga4.js.

const CUSTOMER_ID = (process.env.GOOGLE_ADS_CUSTOMER_ID || "7534733093").replace(/-/g, "");
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
const API_VERSION = "v18";

/**
 * Pull core Search campaign metrics for SOCIII's own Google Ads account
 * over the last N days.
 *
 * @param {string} uid - the Firebase uid that connected google_ads via OAuth
 *   (Sean's own uid — same one used for LinkedIn/X posting, see
 *   config/marketingWorker.socialPosterUserId).
 * @param {number} days
 * @returns {Promise<{impressions:number, clicks:number, costMicros:number, conversions:number, campaigns:Array<{name:string, status:string}>} | null>}
 */
async function getSearchCampaignSummary(uid, days = 7) {
  if (!DEVELOPER_TOKEN) {
    console.warn("[googleAds] GOOGLE_ADS_DEVELOPER_TOKEN not set — skipping, see services/analytics/googleAds.js header");
    return null;
  }
  if (!uid) {
    console.warn("[googleAds] no uid provided — skipping");
    return null;
  }

  let accessToken;
  try {
    const { getToken } = require("../oauth/oauthHandler");
    accessToken = await getToken("google_ads", uid);
  } catch (err) {
    console.warn("[googleAds] token lookup failed:", err.message);
    return null;
  }
  if (!accessToken) {
    console.warn("[googleAds] no connected Google Ads account for this uid yet — Settings > Connect Google Ads");
    return null;
  }

  const query = `
    SELECT
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_${days}_DAYS
  `.replace(/\s+/g, " ").trim();

  try {
    // login-customer-id is only required if the connected account manages
    // this customer ID via a manager (MCC) account — unknown until Sean's
    // account is actually connected, so it's optional and only sent if set.
    const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/-/g, "");
    const resp = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${CUSTOMER_ID}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": DEVELOPER_TOKEN,
          ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      // Fail closed, not open — an auth/permission error here (developer
      // token not yet approved, account not linked) is an expected, real
      // state during rollout, not a bug.
      console.warn(`[googleAds] searchStream HTTP ${resp.status}:`, errBody.slice(0, 300));
      return null;
    }

    const chunks = await resp.json(); // searchStream returns an array of {results: [...]}
    const rows = chunks.flatMap(c => c.results || []);

    let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
    const campaigns = [];
    for (const row of rows) {
      impressions += Number(row.metrics?.impressions || 0);
      clicks += Number(row.metrics?.clicks || 0);
      costMicros += Number(row.metrics?.costMicros || 0);
      conversions += Number(row.metrics?.conversions || 0);
      if (row.campaign?.name) campaigns.push({ name: row.campaign.name, status: row.campaign.status });
    }

    return { impressions, clicks, costMicros, conversions, campaigns };
  } catch (err) {
    console.warn("[googleAds] getSearchCampaignSummary failed:", err.message);
    return null;
  }
}

module.exports = { getSearchCampaignSummary };
