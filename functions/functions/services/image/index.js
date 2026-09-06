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
  get validateImagePrompt() {
    return require("./generator").validateImagePrompt;
  },
  get IMAGE_CREDIT_COST() {
    return require("./generator").IMAGE_CREDIT_COST;
  },
  get IMAGE_PRICE_USD() {
    return require("./generator").IMAGE_PRICE_USD;
  },
};
