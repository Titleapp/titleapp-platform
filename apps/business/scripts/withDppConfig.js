#!/usr/bin/env node
/**
 * scripts/withDppConfig.js — 2026-09-05.
 *
 * Capacitor's CLI has no per-target config flag, so a distinct native-app
 * identity per "flavor" (appId/appName — the thing that actually gets its
 * own App Store / Play Console listing) means temporarily swapping
 * capacitor.config.json before `cap sync`/`cap add` and restoring the
 * shared one after. This is the standard community workaround for
 * Capacitor multi-flavor builds.
 *
 * Worth noting: the existing nursing flavor's cap:nursing:* scripts do NOT
 * do this swap — they run `npx cap sync` straight against the shared
 * capacitor.config.json (appId "ai.sociii.app", appName "SOCIII"), so a
 * nursing-flavored native build today still carries the main app's
 * identity, not a distinct one. That's a real, previously-undiscovered gap
 * (CODEX 85 flagged the *decision* of shared-vs-separate flavors as open,
 * but didn't catch that the *existing* nursing scripts don't even attempt
 * the shared-flavor swap). Not fixed here — those are nursing's own
 * scripts and out of scope for this DPP-focused change — but this script
 * is what nursing's cap:nursing:* scripts would need too.
 *
 * Usage: node scripts/withDppConfig.js <command> [...args]
 * Backs up capacitor.config.json, copies capacitor.dpp.config.json over it,
 * runs the given command, then restores the backup — even if the command
 * fails — so a real config never gets left swapped by an interrupted run.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const live = path.join(root, "capacitor.config.json");
const dpp = path.join(root, "capacitor.dpp.config.json");
const backup = path.join(root, "capacitor.config.json.bak");

const [, , ...cmdParts] = process.argv;
if (cmdParts.length === 0) {
  console.error("Usage: node scripts/withDppConfig.js <command> [...args]");
  process.exit(1);
}

fs.copyFileSync(live, backup);
let exitCode = 0;
try {
  fs.copyFileSync(dpp, live);
  execSync(cmdParts.join(" "), { stdio: "inherit", cwd: root });
} catch (e) {
  exitCode = e.status || 1;
} finally {
  fs.copyFileSync(backup, live);
  fs.unlinkSync(backup);
}
process.exit(exitCode);
