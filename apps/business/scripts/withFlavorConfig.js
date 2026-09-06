#!/usr/bin/env node
/**
 * scripts/withFlavorConfig.js — 2026-09-05.
 *
 * Capacitor's CLI has no per-target config flag, so a distinct native-app
 * identity per "flavor" (appId/appName — the thing that actually gets its
 * own App Store / Play Console listing) means temporarily swapping
 * capacitor.config.json before `cap sync`/`cap add` and restoring the
 * shared one after. This is the standard community workaround for
 * Capacitor multi-flavor builds.
 *
 * Generalized from the DPP-only scripts/withDppConfig.js so every flavor
 * (dpp, nursing, realestate, aviation, ...) shares one swap/restore
 * mechanism instead of four near-identical copies. Before this, only DPP's
 * cap:dpp:* scripts did this swap — cap:nursing:*, cap:realestate:*, and
 * cap:aviation:* all called `npx cap sync` straight against the shared
 * capacitor.config.json (appId "ai.sociii.app", appName "SOCIII"), so a
 * nursing/realestate/aviation-flavored native build carried the main app's
 * identity, not a distinct one — meaning two flavors built and installed on
 * the same device (or submitted to an App Store) would either collide on
 * appId or silently overwrite each other.
 *
 * Usage: node scripts/withFlavorConfig.js <flavor> <command> [...args]
 *   e.g. node scripts/withFlavorConfig.js nursing npx cap sync ios
 *
 * Looks up capacitor.<flavor>.config.json in the package root, backs up
 * the shared capacitor.config.json, copies the flavor config over it, runs
 * the given command, then restores the backup — even if the command fails
 * — so the shared/default config never gets left swapped by an
 * interrupted or failing run.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const [, , flavor, ...cmdParts] = process.argv;
if (!flavor || cmdParts.length === 0) {
  console.error("Usage: node scripts/withFlavorConfig.js <flavor> <command> [...args]");
  console.error("  e.g. node scripts/withFlavorConfig.js dpp npx cap sync ios");
  process.exit(1);
}

const live = path.join(root, "capacitor.config.json");
const flavorConfig = path.join(root, `capacitor.${flavor}.config.json`);
const backup = path.join(root, "capacitor.config.json.bak");

if (!fs.existsSync(flavorConfig)) {
  console.error(`No such flavor config: ${flavorConfig}`);
  process.exit(1);
}

fs.copyFileSync(live, backup);
let exitCode = 0;
try {
  fs.copyFileSync(flavorConfig, live);
  execSync(cmdParts.join(" "), { stdio: "inherit", cwd: root });
} catch (e) {
  exitCode = e.status || 1;
} finally {
  fs.copyFileSync(backup, live);
  fs.unlinkSync(backup);
}
process.exit(exitCode);
