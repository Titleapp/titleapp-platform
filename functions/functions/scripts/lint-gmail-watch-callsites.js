#!/usr/bin/env node
"use strict";

/**
 * lint-gmail-watch-callsites.js — red-team round 2, point #6: "build the
 * lint rule now; it's one line." Fails the build if gmail.users.watch() is
 * called anywhere except inside the one gated function (watchMailbox() in
 * services/social/gmail.js) — that function is where assertGatesPass()
 * lives; any other call site would bypass it entirely.
 *
 * Run via `npm run lint:gates` (see package.json) — wire into predeploy /
 * CI once this codebase has a CI pipeline for functions/.
 */

const { execSync } = require("child_process");
const path = require("path");

const ALLOWED_FILE = "services/social/gmail.js";
const SELF = "scripts/lint-gmail-watch-callsites.js";

function main() {
  const root = path.join(__dirname, "..");
  let output;
  try {
    // Real call-site shape only: `<identifier>.users.watch(` — excludes this
    // script's own comments/strings about the pattern, and excludes .watch(
    // calls unrelated to the Gmail API (e.g. fs.watch, chokidar).
    output = execSync(
      `grep -rnE "\\.users\\.watch\\(" --include="*.js" . | grep -v node_modules | grep -v "${SELF}"`,
      { cwd: root, encoding: "utf8" }
    );
  } catch (e) {
    // grep exits 1 when there are no matches at all — that's fine, means nothing to check.
    if (e.status === 1 && !e.stdout) { console.log("[lint-gmail-watch-callsites] OK — no gmail.users.watch() call sites found."); return; }
    throw e;
  }

  const lines = output.trim().split("\n").filter(Boolean);
  const offenders = lines.filter((l) => !l.startsWith(`./${ALLOWED_FILE}:`) && !l.startsWith(`${ALLOWED_FILE}:`));

  if (offenders.length) {
    console.error(`[lint-gmail-watch-callsites] FAILED — gmail.users.watch() called outside ${ALLOWED_FILE}, which bypasses assertGatesPass():`);
    offenders.forEach((l) => console.error("  " + l));
    process.exit(1);
  }
  console.log(`[lint-gmail-watch-callsites] OK — gmail.users.watch() only called from ${ALLOWED_FILE} (${lines.length} call site(s)).`);
}

main();
