"use strict";

/**
 * copilot/index.js — Barrel exports for PC12-47E CoPilot service
 *
 * All modules lazy-loaded to minimize cold-start impact.
 */

let _handlers;
function getHandlers() {
  if (!_handlers) _handlers = require("./handlers");
  return _handlers;
}

let _foreflightParser;
function getForeflightParser() {
  if (!_foreflightParser) _foreflightParser = require("./parsers/foreflightParser");
  return _foreflightParser;
}

let _fvoParser;
function getFvoParser() {
  if (!_fvoParser) _fvoParser = require("./parsers/fvoParser");
  return _fvoParser;
}

let _deduplicator;
function getDeduplicator() {
  if (!_deduplicator) _deduplicator = require("./parsers/deduplicator");
  return _deduplicator;
}

let _currencyTracker;
function getCurrencyTracker() {
  if (!_currencyTracker) _currencyTracker = require("./logic/currencyTracker");
  return _currencyTracker;
}

let _dutyTimeTracker;
function getDutyTimeTracker() {
  if (!_dutyTimeTracker) _dutyTimeTracker = require("./logic/dutyTimeTracker");
  return _dutyTimeTracker;
}

let _form8710Builder;
function getForm8710Builder() {
  if (!_form8710Builder) _form8710Builder = require("./logic/form8710Builder");
  return _form8710Builder;
}

let _systemPrompt;
function getSystemPrompt() {
  if (!_systemPrompt) _systemPrompt = require("./prompts/pc12SystemPrompt");
  return _systemPrompt;
}

let _examinerMode;
function getExaminerMode() {
  if (!_examinerMode) _examinerMode = require("./prompts/examinerMode");
  return _examinerMode;
}

module.exports = {
  getHandlers,
  getForeflightParser,
  getFvoParser,
  getDeduplicator,
  getCurrencyTracker,
  getDutyTimeTracker,
  getForm8710Builder,
  getSystemPrompt,
  getExaminerMode,
};
