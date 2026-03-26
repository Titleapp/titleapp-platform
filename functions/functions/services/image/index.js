"use strict";

/**
 * services/image/index.js — Barrel export (lazy-load)
 */

module.exports = {
  get generateImage() {
    return require("./generator").generateImage;
  },
  get buildPrompt() {
    return require("./generator").buildPrompt;
  },
  get scrubPhi() {
    return require("./generator").scrubPhi;
  },
};
