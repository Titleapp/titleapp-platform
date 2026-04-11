"use strict";

/**
 * Sandbox service barrel — lazy-load to minimize cold-start impact.
 */

module.exports = {
  // ── Existing (32.7-T2) ──────────────────────────────────────────────
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

  // ── Worker Build Flow (CODEX 47.4 Phase A) ──────────────────────────
  get handleWorkerInit() {
    return require("./workerBuildFlow").handleInit;
  },
  get handleWorkerAdvance() {
    return require("./workerBuildFlow").handleAdvance;
  },
  get handleWorkerGetState() {
    return require("./workerBuildFlow").handleGetState;
  },
  get WORKER_STEPS() {
    return require("./workerBuildFlow").WORKER_STEPS;
  },

  // Studio Locker
  get handleKnowledgeIngest() {
    return require("./studioLocker").handleIngest;
  },
  get handleKnowledgeList() {
    return require("./studioLocker").handleList;
  },
  get handleKnowledgeSetTier() {
    return require("./studioLocker").handleSetTier;
  },
  get handleKnowledgeDelete() {
    return require("./studioLocker").handleDelete;
  },

  // Build Log
  get handleGetBuildLog() {
    return require("./buildLog").handleGetBuildLog;
  },
  get handleAppendBuildLogNote() {
    return require("./buildLog").handleAppendNote;
  },

  // Worker Test Protocol
  get handleTestQuestions() {
    return require("./workerTestProtocol").handleGetQuestions;
  },
  get handleTestRun() {
    return require("./workerTestProtocol").handleRunTest;
  },
};
