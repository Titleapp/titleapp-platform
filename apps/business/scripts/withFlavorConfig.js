#!/usr/bin/env node
/**
 * scripts/withFlavorConfig.js — 2026-09-05, extended 2026-09-08 (twice).
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
 * mechanism instead of four near-identical copies.
 *
 * 2026-09-08 (fix #1): that swap was ALSO never enough on its own, confirmed
 * by a real device-simulator test — `cap sync` copies web assets + the JSON
 * config into the native project, but it does not touch Xcode's own
 * PRODUCT_BUNDLE_IDENTIFIER build setting, Info.plist's CFBundleDisplayName
 * literal, Android's applicationId, or Android's app_name. So those four
 * native project files got added to the patch list, keyed off the same
 * flavor config's appId/appName.
 *
 * 2026-09-08 (fix #2 — the important one): fix #1 gave the four native files
 * the SAME "swap before the wrapped command, restore right after it returns"
 * lifecycle as capacitor.config.json — which is wrong for them specifically,
 * and a second real device test proved it. capacitor.config.json only needs
 * to be correct at the instant `cap sync` COPIES it into the app bundle's
 * resources; the copy already has the right values baked in, so reverting
 * the source file immediately after is safe and correct. The four native
 * files are different: Xcode/Gradle read THEM fresh, live, at BUILD time —
 * a separate, later, interactive step (opening Xcode and clicking Run) that
 * happens completely outside this script's process. By the time that
 * happens, this script's `finally` block had already restored them to the
 * shared default. Xcode was always building the reverted state.
 *
 * So the four native identity files now follow a DIFFERENT lifecycle:
 * swap in -> run the command -> LEAVE them swapped. There is only one real
 * native Xcode/Android project on disk at a time, and it should reflect
 * whichever flavor was most recently synced — exactly like a real native
 * project actually behaves — until a later invocation (any flavor,
 * including "default", see below) explicitly asks for something else.
 * Restore-to-a-known-good-value for these files happens at the START of the
 * *next* invocation (each patch is applied by matching the target
 * property's NAME via regex, e.g. `PRODUCT_BUNDLE_IDENTIFIER = ...;`, not by
 * matching the previous flavor's exact value) — so it doesn't matter which
 * flavor (or the shared default) last touched these files, the next run
 * always overwrites cleanly.
 *
 * capacitor.config.json itself keeps its original transient lifecycle
 * (swap before, restore after — even on failure) unchanged. Do NOT "fix"
 * the native files back to that pattern; that is the exact bug this comment
 * is describing.
 *
 * The bare, no-flavor npm scripts (cap:sync / cap:ios / cap:android) don't
 * go through a flavor config at all, but they still sync the SAME native
 * project the flavor scripts mutate. Left alone, a developer who last ran
 * `cap:aviation:ios` and then ran plain `cap:ios` would silently ship/test a
 * build labeled "SOCIII" in capacitor.config.json but still carrying
 * aviation's PRODUCT_BUNDLE_IDENTIFIER/app_name natively — surprising and
 * wrong. So package.json's bare cap:sync/cap:ios/cap:android now route
 * through this same script with the special flavor name "default", which
 * means "patch native identity to match capacitor.config.json's OWN current
 * appId/appName" instead of requiring a capacitor.default.config.json file
 * that doesn't exist. That explicitly parks the native project back on the
 * shared identity before every plain sync, the same way a real flavor
 * switch would.
 *
 * Usage: node scripts/withFlavorConfig.js <flavor|default> <command> [...args]
 *   e.g. node scripts/withFlavorConfig.js nursing npx cap sync ios
 *   e.g. node scripts/withFlavorConfig.js default npx cap sync ios
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const [, , flavor, ...cmdParts] = process.argv;
if (!flavor || cmdParts.length === 0) {
  console.error("Usage: node scripts/withFlavorConfig.js <flavor|default> <command> [...args]");
  console.error("  e.g. node scripts/withFlavorConfig.js dpp npx cap sync ios");
  console.error("  e.g. node scripts/withFlavorConfig.js default npx cap sync ios");
  process.exit(1);
}

const liveConfig = path.join(root, "capacitor.config.json");

let appId, appName;
if (flavor === "default") {
  // No capacitor.default.config.json exists — "default" means "whatever
  // the shared capacitor.config.json already says", which is also what the
  // capacitor.config.json swap step below will (no-op) copy onto itself.
  ({ appId, appName } = JSON.parse(fs.readFileSync(liveConfig, "utf8")));
} else {
  const flavorConfigPath = path.join(root, `capacitor.${flavor}.config.json`);
  if (!fs.existsSync(flavorConfigPath)) {
    console.error(`No such flavor config: ${flavorConfigPath}`);
    process.exit(1);
  }
  ({ appId, appName } = JSON.parse(fs.readFileSync(flavorConfigPath, "utf8")));
}
if (!appId || !appName) {
  console.error(`Flavor "${flavor}" is missing appId/appName — both are required to patch the native identity.`);
  process.exit(1);
}

const IOS_PBXPROJ = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");
const IOS_INFO_PLIST = path.join(root, "ios/App/App/Info.plist");
const ANDROID_BUILD_GRADLE = path.join(root, "android/app/build.gradle");
const ANDROID_STRINGS_XML = path.join(root, "android/app/src/main/res/values/strings.xml");

// Each target patches by matching the property's NAME, not its previous
// value — so this is correct no matter which flavor (or the shared
// default) last wrote these files. No "current value" lookup needed.
const NATIVE_TARGETS = [
  {
    file: IOS_PBXPROJ,
    apply: (content) => content.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${appId};`),
  },
  {
    file: IOS_INFO_PLIST,
    apply: (content) =>
      content.replace(
        /(<key>CFBundleDisplayName<\/key>\s*\n\s*<string>)[^<]*(<\/string>)/,
        (_m, pre, post) => `${pre}${appName}${post}`
      ),
  },
  {
    file: ANDROID_BUILD_GRADLE,
    apply: (content) => content.replace(/applicationId\s+"[^"]+"/, `applicationId "${appId}"`),
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

let exitCode = 0;

// capacitor.config.json — transient swap, unchanged from the original
// design: correct at cap-sync time, restored after — even on failure.
const configBackup = path.join(root, "capacitor.config.json.bak");
fs.copyFileSync(liveConfig, configBackup);

try {
  if (flavor === "default") {
    // No-op copy (source already holds appId/appName) — kept for symmetry
    // so the restore-in-finally below always has a matching backup to work
    // from, regardless of which branch was taken above.
    fs.copyFileSync(liveConfig, liveConfig);
  } else {
    fs.copyFileSync(path.join(root, `capacitor.${flavor}.config.json`), liveConfig);
  }

  // Native identity files: patch and LEAVE patched (no backup, no restore —
  // see the file header comment for why). Applied unconditionally; if a
  // target file doesn't exist yet (e.g. android/ not generated), skip it.
  for (const target of NATIVE_TARGETS) {
    if (!fs.existsSync(target.file)) continue;
    const original = fs.readFileSync(target.file, "utf8");
    const patched = target.apply(original);
    if (patched === original) {
      console.warn(`[withFlavorConfig] warning: no identity match found to patch in ${target.file} — left unchanged.`);
    }
    fs.writeFileSync(target.file, patched);
  }

  execSync(cmdParts.join(" "), { stdio: "inherit", cwd: root });
} catch (e) {
  exitCode = e.status || 1;
} finally {
  fs.copyFileSync(configBackup, liveConfig);
  fs.unlinkSync(configBackup);
}
process.exit(exitCode);
