#!/usr/bin/env node
"use strict";

/**
 * lint-dev-worker-scope.js — red-team round 4 (external review of CODEX
 * 100): "metadata-only" for Dev's Firestore reads is described honestly now
 * as code discipline, not IAM-enforced, but nothing backstopped that
 * discipline — the exact failure the doc itself warns about ("a careless
 * future check reading message content... would compile, deploy, and
 * work") had no automated check. Same shape of gap
 * lint-gmail-watch-callsites.js exists for a different boundary.
 *
 * Fails the build if monitoring/devWorker.js references a field or
 * collection that holds real message/document content rather than
 * metadata (status, timestamps, ids, booleans, counts).
 *
 * Wired into firebase.json's functions predeploy alongside the other gate
 * lints.
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join(__dirname, "..", "monitoring", "devWorker.js");

// Names that hold actual content, as opposed to the metadata devWorker.js
// is scoped to. Finding any of these here means a future check started
// reading content it isn't supposed to touch — update CODEX 100's scope
// section deliberately if that's ever intentional, don't just add a field.
const FORBIDDEN_PATTERNS = [
  { re: /\bdraftText\b/, why: "persona email draft/reply body" },
  { re: /\binboundBody\b/, why: "raw inbound email content" },
  { re: /\bsendArgs\b/, why: "full outbound send payload, includes body" },
  { re: /\brawMessage\b/, why: "raw Gmail message payload" },
  { re: /personaEmailReplyLog/, why: "collection stores draftText — no metadata-only reason to read it" },
];

function main() {
  const src = fs.readFileSync(TARGET, "utf8");
  const offenders = FORBIDDEN_PATTERNS.filter((p) => p.re.test(src));

  if (offenders.length) {
    console.error("[lint-dev-worker-scope] FAILED — devWorker.js references content outside its documented metadata-only scope (CODEX 100):");
    offenders.forEach((o) => console.error(`  - ${o.re} (${o.why})`));
    process.exit(1);
  }
  console.log("[lint-dev-worker-scope] OK — devWorker.js stays within its documented metadata-only scope.");
}

main();
