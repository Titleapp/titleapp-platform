"use strict";

/**
 * Sandbox service barrel — lazy-load to minimize cold-start impact.
 */

module.exports = {
  get handleCreateSession() {
    return require("./specGenerator").handleCreateSession;
  },
  get handleGetSessionPdf() {
    return require("./pdfOnePager").handleGetSessionPdf;
  },
  get getPreviewData() {
    return require("./previewHandler").getPreviewData;
  },
  get capturePreviewInterest() {
    return require("./previewHandler").capturePreviewInterest;
  },
  get detectAbandonment() {
    return require("./abandonmentDetector").detectAbandonment;
  },
  get processDripQueue() {
    return require("./dripEmailQueue").processDripQueue;
  },
  get emitCreatorEvent() {
    return require("./creatorEvents").emitCreatorEvent;
  },
  get CREATOR_EVENT_TYPES() {
    return require("./creatorEvents").CREATOR_EVENT_TYPES;
  },
};
