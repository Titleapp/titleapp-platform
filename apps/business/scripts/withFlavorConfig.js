#!/usr/bin/env node
/**
 * scripts/withFlavorConfig.js — 2026-09-05, extended 2026-09-08.
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
 * 2026-09-08: that swap was ALSO never enough on its own, confirmed by a
 * real device-simulator test — `cap sync` copies web assets + the JSON
 * config into the native project, but it does not touch Xcode's own
 * PRODUCT_BUNDLE_IDENTIFIER build setting or Info.plist's CFBundleDisplayName
 * literal, and it does not touch Android's applicationId/app_name either.
 * Building and running "aviation" produced a binary that still reported
 * CFBundleIdentifier "ai.sociii.app" / display name "SOCIII" — the shared
 * default, not the flavor's real ai.sociii.aviation/"SKYE" identity. So the
 * native project files themselves now get the same backup/swap/restore
 * treatment as capacitor.config.json, keyed off the same flavor config's
 * appId/appName — one source of truth, not new hardcoded values here.
 *
 * Usage: node scripts/withFlavorConfig.js <flavor> <command> [...args]
 *   e.g. node scripts/withFlavorConfig.js nursing npx cap sync ios
 *
 * Looks up capacitor.<flavor>.config.json in the package root, backs up
 * every file this script touches (the shared capacitor.config.json, plus
 * whichever native project files actually exist), applies the flavor's
 * appId/appName to all of them, runs the given command, then restores every
 * backup — even if the command fails — so nothing is ever left swapped by
 * an interrupted or failing run.
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

const flavorConfigPath = path.join(root, `capacitor.${flavor}.config.json`);
if (!fs.existsSync(flavorConfigPath)) {
  console.error(`No such flavor config: ${flavorConfigPath}`);
  process.exit(1);
}
const { appId, appName } = JSON.parse(fs.readFileSync(flavorConfigPath, "utf8"));
if (!appId || !appName) {
  console.error(`${flavorConfigPath} is missing appId/appName — both are required to patch the native identity.`);
  process.exit(1);
}

// The default/shared identity, read live from each real file rather than
// hardcoded here, so a swap always restores to whatever the file actually
// said going in — correct even if the shared default ever changes.
const IOS_PBXPROJ = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");
const IOS_INFO_PLIST = path.join(root, "ios/App/App/Info.plist");
const ANDROID_BUILD_GRADLE = path.join(root, "android/app/build.gradle");
const ANDROID_STRINGS_XML = path.join(root, "android/app/src/main/res/values/strings.xml");

// Each target: how to find-and-replace the identity in its real file
// content. Matched by the CURRENT value already in the file (captured at
// backup time, see below) so this doesn't hardcode "ai.sociii.app"/"SOCIII"
// as a magic default — it patches whatever is really there right now.
const NATIVE_TARGETS = [
  {
    file: IOS_PBXPROJ,
    apply: (content, currentAppId) =>
      content.split(`PRODUCT_BUNDLE_IDENTIFIER = ${currentAppId};`).join(`PRODUCT_BUNDLE_IDENTIFIER = ${appId};`),
    // pbxproj has two occurrences (Debug + Release) — .split/.join above
    // replaces all of them, not just the first.
    needsCurrentAppId: true,
  },
  {
    file: IOS_INFO_PLIST,
    apply: (content, _currentAppId, currentAppName) =>
      content.replace(
        /(<key>CFBundleDisplayName<\/key>\s*\n\s*<string>)[^<]*(<\/string>)/,
        (_m, pre, post) => `${pre}${appName}${post}`
      ),
    expectedCurrentAppName: true,
  },
  {
    file: ANDROID_BUILD_GRADLE,
    apply: (content, currentAppId) =>
      content.split(`applicationId "${currentAppId}"`).join(`applicationId "${appId}"`),
    needsCurrentAppId: true,
  },
  {
    file: ANDROID_STRINGS_XML,
    apply: (content) =>
      content.replace(
        /(<string name="app_name">)[^<]*(<\/string>)/,
        (_m, pre, post) => `${pre}${appName}${post}`
      ),
  },
];

const backups = []; // { file, backupPath }
let exitCode = 0;

// capacitor.config.json — the original swap, unchanged in spirit.
const liveConfig = path.join(root, "capacitor.config.json");
const configBackup = path.join(root, "capacitor.config.json.bak");
fs.copyFileSync(liveConfig, configBackup);
backups.push({ file: liveConfig, backupPath: configBackup });

// Figure out the current shared appId once (from the live config, before
// it gets overwritten below) — several native-file patches need to know
// what string to search-and-replace.
const currentAppId = JSON.parse(fs.readFileSync(configBackup, "utf8")).appId;

try {
  fs.copyFileSync(flavorConfigPath, liveConfig);

  for (const target of NATIVE_TARGETS) {
    if (!fs.existsSync(target.file)) continue; // e.g. android/ not generated yet — skip, not an error
    const backupPath = `${target.file}.flavorbak`;
    fs.copyFileSync(target.file, backupPath);
    backups.push({ file: target.file, backupPath });

    const original = fs.readFileSync(backupPath, "utf8");
    const patched = target.apply(original, currentAppId, undefined);
    if (patched === original) {
      console.warn(`[withFlavorConfig] warning: no identity match found to patch in ${target.file} — left unchanged.`);
    }
    fs.writeFileSync(target.file, patched);
  }

  execSync(cmdParts.join(" "), { stdio: "inherit", cwd: root });
} catch (e) {
  exitCode = e.status || 1;
} finally {
  for (const { file, backupPath } of backups) {
    fs.copyFileSync(backupPath, file);
    fs.unlinkSync(backupPath);
  }
}
process.exit(exitCode);
