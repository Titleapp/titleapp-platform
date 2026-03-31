"use strict";

/**
 * Universal OAuth Platform Registry — single source of truth.
 *
 * Adding a new platform: one object entry here + register redirect URI with platform.
 * All 4 endpoints (/connect, /callback, /status, /disconnect) work automatically.
 */

const OAUTH_PLATFORMS = {

  meta: {
    id: "meta",
    label: "Meta (Facebook & Instagram)",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["pages_manage_posts", "instagram_content_publish", "pages_read_engagement", "ads_management"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
    redirectUri: "https://app.titleapp.ai/auth/meta/callback",
    connectorId: "meta_posting",
  },

  tiktok: {
    id: "tiktok",
    label: "TikTok",
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish", "video.upload"],
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
    redirectUri: "https://app.titleapp.ai/auth/tiktok/callback",
    connectorId: "tiktok_posting",
  },

  buffer: {
    id: "buffer",
    label: "Buffer",
    authUrl: "https://bufferapp.com/oauth2/authorize",
    tokenUrl: "https://api.bufferapp.com/1/oauth2/token.json",
    scopes: [],
    clientIdEnv: "BUFFER_CLIENT_ID",
    clientSecretEnv: "BUFFER_CLIENT_SECRET",
    redirectUri: "https://app.titleapp.ai/auth/buffer/callback",
    connectorId: "buffer_posting",
  },

  google_business: {
    id: "google_business",
    label: "Google Business Profile",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/business.manage"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    redirectUri: "https://app.titleapp.ai/auth/google-business/callback",
    connectorId: "google_business_posting",
  },

  quickbooks: {
    id: "quickbooks",
    label: "QuickBooks Online",
    authUrl: "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    scopes: ["com.intuit.quickbooks.accounting"],
    clientIdEnv: "QB_CLIENT_ID",
    clientSecretEnv: "QB_CLIENT_SECRET",
    redirectUri: "https://app.titleapp.ai/auth/quickbooks/callback",
    connectorId: "quickbooks",
  },

  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["w_member_social", "r_liteprofile"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    redirectUri: "https://app.titleapp.ai/auth/linkedin/callback",
    connectorId: "linkedin_posting",
  },

};

module.exports = { OAUTH_PLATFORMS };
