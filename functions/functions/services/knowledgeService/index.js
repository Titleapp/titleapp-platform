"use strict";
const fs = require("fs");
const path = require("path");

// In-memory cache — knowledge docs rarely change
let _cache = {};

/**
 * Load TitleApp knowledge base documents for a worker's system prompt.
 * @param {string} workerSlug
 * @returns {string} Combined knowledge context
 */
function loadWorkerKnowledge(workerSlug) {
  if (_cache[workerSlug]) return _cache[workerSlug];

  const knowledgeDir = path.join(__dirname, "../../knowledge/titleapp");
  const docs = [];

  // All workers get brand guidelines and feature boundaries
  const files = ["brand-guidelines.md", "feature-boundaries.md"];

  // Marketing workers also get compliance tiers
  if (workerSlug === "platform-marketing" || workerSlug === "marketing-content") {
    files.push("compliance-tiers.md");
  }

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(knowledgeDir, file), "utf-8");
      docs.push(content.trim());
    } catch (e) {
      console.warn(`Knowledge file ${file} not found:`, e.message);
    }
  }

  if (docs.length === 0) return "";

  const result = "TITLEAPP KNOWLEDGE BASE (mandatory reference -- do not contradict):\n\n" + docs.join("\n\n---\n\n");
  _cache[workerSlug] = result;
  return result;
}

module.exports = { loadWorkerKnowledge };
