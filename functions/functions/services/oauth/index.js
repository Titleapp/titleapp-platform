"use strict";

/**
 * OAuth service — barrel export (lazy-load pattern).
 */

module.exports = {
  get OAUTH_PLATFORMS() { return require("./oauthConfig").OAUTH_PLATFORMS; },
  get getAuthorizationUrl() { return require("./oauthHandler").getAuthorizationUrl; },
  get handleCallback() { return require("./oauthHandler").handleCallback; },
  get getToken() { return require("./oauthHandler").getToken; },
  get disconnectPlatform() { return require("./oauthHandler").disconnectPlatform; },
  get getConnectionStatus() { return require("./oauthHandler").getConnectionStatus; },
};
