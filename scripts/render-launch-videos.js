#!/usr/bin/env node
"use strict";

// Marketing-worker video renderer — v1 local script.
//
// Pipeline:
//   1. ImageMagick generates a top-bar PNG (black background, white headline).
//   2. ImageMagick generates a bottom-bar PNG (black background, white CTA).
//   3. ffmpeg overlays both bars onto the Kling source MP4.
//   4. Output lands in ~/Downloads/staged/<assetId>.mp4.
//
// We render the text via ImageMagick because the Homebrew ffmpeg formula
// ships without freetype/libass — so the ffmpeg drawtext filter isn't
// available without a much heavier rebuild. ImageMagick's `caption:` does
// the text-rendering job in one command and the result is a flat PNG.
//
// Once approved, the renderOne() function gets wired into the Marketing
// worker as /v1/marketing:render-asset.
//
// Usage:
//   node scripts/render-launch-videos.js --asset of-darnell-video-01
//   node scripts/render-launch-videos.js --campaign of-fred
//   node scripts/render-launch-videos.js --all

const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(REPO_ROOT, "functions", "functions", "services", "marketing", "assetRegistry.js");
const ROUTING_PATH = path.join(REPO_ROOT, "apps", "business", "src", "lib", "campaignRouting.js");
const LOGO_PATH = path.join(REPO_ROOT, "apps", "business", "src", "assets", "sociii-brand", "icon", "sociii-icon-mark-512.png");
const OUT_DIR = path.join(os.homedir(), "Downloads", "staged");

// Output is mobile-vertical 9:16 (TikTok / IG Reels / LinkedIn video).
// Kling source is 1920x1080 landscape — we scale it down to fit the 1080
// output width (becomes 1080x607) and pad with black above and below.
// The pad regions are where the headline + logo + CTA live.
//
// Layout (1080 × 1920 portrait):
//   Top bar    1080 × 656 — black + headline (1 or 2 lines)
//   Middle     1080 × 607 — Kling source scaled to 1080 wide
//   Bottom bar 1080 × 657 — black + logo (stacked over) URL/CTA
const OUT_WIDTH = 1080;
const OUT_HEIGHT = 1920;
const MIDDLE_HEIGHT = 607;       // 1080 * (1080/1920) — landscape source fit-to-width
const TOP_BAR_HEIGHT = 656;
const BOTTOM_BAR_HEIGHT = 657;

const HEADLINE_POINTSIZE_HYB = 60;   // 4-line empathy headline
const HEADLINE_POINTSIZE_OF = 96;    // single-line "OF for Smart People" mark
const CTA_POINTSIZE = 48;            // URL + hashtag
const CARD_NAME_POINTSIZE = 56;      // OF creator card "Name · Specialty · $29/mo"
const LOGO_HEIGHT = 130;             // subtle brand mark
const CARD_LOGO_HEIGHT = 110;        // logo inside OF card row (slightly smaller)
const LOGO_TOP_PAD = 60;
const TEXT_AFTER_LOGO_PAD = 20;

// Map a full character name to the per-boss URL slug used in the
// /creator/<slug> deep link. Per the LinkedIn HYB landing strategy
// (see project_hyb_linkedin_landing_strategy.md).
//   "Dale" → "dale"
//   "Synergy Sandra" → "sandra"
//   "YC Brandon" → "brandon"
//   "Priya" → "priya"
function bossSlugFor(character) {
  const last = String(character || "").trim().split(/\s+/).pop() || "";
  return last.toLowerCase();
}

function headlineFor(asset /* , subjects */) {
  const campaign = asset.campaign || "";

  if (campaign.startsWith("of-")) {
    // OF videos get the brand mark in the top band. Character name +
    // specialty + price live in the creator card row at the bottom.
    return "OF for Smart People";
  }
  if (campaign.startsWith("hate-boss-")) {
    return "Hate your boss?\n\nShip it yourself.\nKeep the money.";
  }
  if (campaign === "workers-unite") {
    return "WORKERS OF THE WORLD, BUILD.";
  }
  return asset.character || "";
}

function headlinePointsizeFor(campaign) {
  if (campaign && campaign.startsWith("of-")) return HEADLINE_POINTSIZE_OF;
  return HEADLINE_POINTSIZE_HYB;
}

function defaultCtaFor(campaign /* , character */) {
  // Generic in-video URL. Per-character attribution lives in the post
  // caption, not stamped onto the frame.
  if (!campaign) return "sociii.ai";
  if (campaign.startsWith("hate-boss-")) return "sociii.ai/creator";
  if (campaign.startsWith("of-"))        return "sociii.ai/creator";
  return "sociii.ai";
}

// Optional hashtag — rendered below the logo in the bottom band.
// HYB owns #hateyourboss · OF owns #OF4SmartPeople (Sean 2026-06-01).
function hashtagFor(campaign) {
  if (!campaign) return null;
  if (campaign.startsWith("hate-boss-")) return "#hateyourboss";
  if (campaign.startsWith("of-"))        return "#OF4SmartPeople";
  return null;
}

function findFont() {
  const candidates = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Helvetica.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("No usable font found.");
}

function checkBinaries() {
  const missing = [];
  for (const bin of ["magick", "ffmpeg"]) {
    const r = spawnSync("which", [bin]);
    if (r.status !== 0) missing.push(bin);
  }
  if (missing.length > 0) {
    throw new Error(`Missing: ${missing.join(", ")}. Run: brew install ${missing.join(" ")}`);
  }
}

function renderTopBarPng({ outPath, text, fontPath, pointsize }) {
  // Top bar: black canvas + caption centered. \n in text → hard line break.
  const args = [
    "-size", `${OUT_WIDTH}x${TOP_BAR_HEIGHT}`,
    "-background", "black",
    "-fill", "white",
    "-gravity", "center",
    "-font", fontPath,
    "-pointsize", String(pointsize),
    `caption:${text}`,
    outPath,
  ];
  const r = spawnSync("magick", args, { stdio: "pipe" });
  if (r.status !== 0) {
    throw new Error(`magick top-bar failed (${r.status}): ${r.stderr?.toString().slice(0, 300)}`);
  }
}

// OF bottom band — authentic OF profile-card layout:
//
//   [avatar]   Maria ✓                        ← row 1: name (bold large)
//              @maria  ·  Available now       ← row 2: handle + status (smaller, dim)
//              Nursing  ·  $29/mo             ← row 3: bio + price
//
//                  sociii.ai/creator          ← URL row (centered)
//                  #OF4SmartPeople            ← hashtag row (centered)
//
// Modeled after the OF reference Sean shared. The avatar sits at the
// top-left of the bottom band; name / handle / bio stack to its right.
// URL + hashtag sit centered below the profile-card block.
// Build a circular-cropped avatar PNG from the SOCIII logo.
// OF profile cards use a circular profile picture; rendering the hex
// mark as-is reads as a square icon. Masking it into a circle locks
// the visual reference.
function buildCircularAvatar({ logoPath, size, outPath }) {
  const half = Math.floor(size / 2);
  const args = [
    "(", logoPath, "-resize", `${size}x${size}`, "-background", "black", "-alpha", "remove", ")",
    "(",
      "-size", `${size}x${size}`,
      "xc:none",
      "-fill", "white",
      "-draw", `circle ${half},${half} ${half},0`,
    ")",
    "-alpha", "Off",
    "-compose", "CopyOpacity",
    "-composite",
    outPath,
  ];
  const r = spawnSync("magick", args, { stdio: "pipe" });
  if (r.status !== 0) {
    throw new Error(`magick circle-avatar failed (${r.status}): ${r.stderr?.toString().slice(0, 400)}`);
  }
}

function renderOFBottomBarPng({ outPath, character, specialty, urlText, hashtagText, fontPath }) {
  const avatarSize = 130;
  const leftPad = 60;
  const colGap = 30;
  const textColX = leftPad + avatarSize + colGap;

  const namePointsize = 64;
  const handlePointsize = 36;
  const bioPointsize = 44;

  const avatarY = 35;
  const nameY = 30;
  const handleY = nameY + 75;
  const bioY = handleY + 55;

  const urlY = 235;
  const tagY = 380;
  const urlBoxH = 120;
  const tagBoxH = 120;

  // @handle is character name lowercased, no spaces.
  const handle = "@" + String(character).toLowerCase().replace(/\s+/g, "");
  const nameLine = `${character}  ✓`;             // ✓ verified-style check
  const handleLine = `${handle}  ·  Available now`; // middle dot ·
  const bioLine = `${specialty}  ·  $29/mo`;

  // Pre-build the circular avatar (SOCIII logo masked into a circle).
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "of-avatar-"));
  const circleAvatar = path.join(tmpDir, "avatar.png");
  buildCircularAvatar({ logoPath: LOGO_PATH, size: avatarSize, outPath: circleAvatar });

  const args = [
    "-size", `${OUT_WIDTH}x${BOTTOM_BAR_HEIGHT}`,
    "xc:black",

    // ── Avatar (circular, top-left) ──
    "-gravity", "NorthWest",
    "(", circleAvatar, ")",
    "-geometry", `+${leftPad}+${avatarY}`,
    "-composite",

    // ── Name + ✓ ──
    "-gravity", "NorthWest",
    "(", "-background", "black", "-fill", "white", "-font", fontPath, "-pointsize", String(namePointsize), `label:${nameLine}`, ")",
    "-geometry", `+${textColX}+${nameY}`,
    "-composite",

    // ── @handle · Available now (dim gray) ──
    "-gravity", "NorthWest",
    "(", "-background", "black", "-fill", "#888888", "-font", fontPath, "-pointsize", String(handlePointsize), `label:${handleLine}`, ")",
    "-geometry", `+${textColX}+${handleY}`,
    "-composite",

    // ── Bio · $price ──
    "-gravity", "NorthWest",
    "(", "-background", "black", "-fill", "white", "-font", fontPath, "-pointsize", String(bioPointsize), `label:${bioLine}`, ")",
    "-geometry", `+${textColX}+${bioY}`,
    "-composite",

    // ── URL (centered) ──
    "-gravity", "North",
    "(",
      "-size", `${OUT_WIDTH}x${urlBoxH}`,
      "-background", "black",
      "-fill", "white",
      "-gravity", "center",
      "-font", fontPath,
      "-pointsize", String(CTA_POINTSIZE),
      `caption:${urlText}`,
    ")",
    "-geometry", `+0+${urlY}`,
    "-composite",
  ];

  if (hashtagText) {
    args.push(
      "-gravity", "North",
      "(",
        "-size", `${OUT_WIDTH}x${tagBoxH}`,
        "-background", "black",
        "-fill", "white",
        "-gravity", "center",
        "-font", fontPath,
        "-pointsize", String(CTA_POINTSIZE),
        `caption:${hashtagText}`,
      ")",
      "-geometry", `+0+${tagY}`,
      "-composite",
    );
  }
  args.push(outPath);

  const r = spawnSync("magick", args, { stdio: "pipe" });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (r.status !== 0) {
    throw new Error(`magick OF bottom-bar failed (${r.status}): ${r.stderr?.toString().slice(0, 400)}`);
  }
}

function renderBottomBarPng({ outPath, urlText, hashtagText, fontPath, pointsize }) {
  // Bottom bar stacks (top → bottom): URL → logo → optional hashtag.
  // Pushed UP within the band so the hashtag clears typical mobile-feed
  // and video-player UI overlay zones (bottom ~150-200px on TikTok / IG
  // Reels / QuickTime). Earlier version had hashtag too close to frame
  // bottom and it got covered by the playback controls.
  const rowGap = 15;
  const topPad = 30;
  const urlBoxH = 120;
  const tagBoxH = 120;

  const urlY = topPad;
  const logoY = urlY + urlBoxH + rowGap;
  const tagY = logoY + LOGO_HEIGHT + rowGap;

  const args = [
    "-size", `${OUT_WIDTH}x${BOTTOM_BAR_HEIGHT}`,
    "xc:black",

    // URL text — horizontally centered, anchored to top of band
    "-gravity", "North",
    "(",
    "-size", `${OUT_WIDTH}x${urlBoxH}`,
    "-background", "black",
    "-fill", "white",
    "-gravity", "center",
    "-font", fontPath,
    "-pointsize", String(pointsize),
    `caption:${urlText}`,
    ")",
    "-geometry", `+0+${urlY}`,
    "-composite",

    // Logo — horizontally centered
    "-gravity", "North",
    "(", LOGO_PATH, "-resize", `${LOGO_HEIGHT}x${LOGO_HEIGHT}`, ")",
    "-geometry", `+0+${logoY}`,
    "-composite",
  ];

  if (hashtagText) {
    args.push(
      "-gravity", "North",
      "(",
      "-size", `${OUT_WIDTH}x${tagBoxH}`,
      "-background", "black",
      "-fill", "white",
      "-gravity", "center",
      "-font", fontPath,
      "-pointsize", String(pointsize),
      `caption:${hashtagText}`,
      ")",
      "-geometry", `+0+${tagY}`,
      "-composite",
    );
  }
  args.push(outPath);

  const r = spawnSync("magick", args, { stdio: "pipe" });
  if (r.status !== 0) {
    throw new Error(`magick bottom-bar failed (${r.status}): ${r.stderr?.toString().slice(0, 400)}`);
  }
}

function renderOne({ inputPath, outputPath, headline, urlText, hashtagText, fontPath, asset, subjects }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "render-"));
  const topBar = path.join(tmpDir, "top.png");
  const bottomBar = path.join(tmpDir, "bottom.png");

  const isOF = (asset?.campaign || "").startsWith("of-");
  const headlinePointsize = headlinePointsizeFor(asset?.campaign);

  try {
    renderTopBarPng({ outPath: topBar, text: headline, fontPath, pointsize: headlinePointsize });
    if (isOF) {
      const specialty = subjects[asset.campaign] || "Worker";
      renderOFBottomBarPng({
        outPath: bottomBar,
        character: asset.character || "",
        specialty,
        urlText,
        hashtagText,
        fontPath,
      });
    } else {
      renderBottomBarPng({ outPath: bottomBar, urlText, hashtagText, fontPath, pointsize: CTA_POINTSIZE });
    }

    // Pipeline:
    //   1. Scale Kling source to 1080 wide (height becomes 607 for 16:9 source)
    //   2. Pad to 1080x1920 (vertical), source centered, black fill on top + bottom
    //   3. Overlay top bar at (0,0)
    //   4. Overlay bottom bar at (0, OUT_HEIGHT - BOTTOM_BAR_HEIGHT)
    const bottomY = OUT_HEIGHT - BOTTOM_BAR_HEIGHT;
    const filter = [
      `[0:v]scale=${OUT_WIDTH}:-2[scaled]`,
      `[scaled]pad=${OUT_WIDTH}:${OUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black[padded]`,
      `[padded][1:v]overlay=0:0[v1]`,
      `[v1][2:v]overlay=0:${bottomY}[outv]`,
    ].join(";");

    const args = [
      "-y",
      "-i", inputPath,
      "-i", topBar,
      "-i", bottomBar,
      "-filter_complex", filter,
      "-map", "[outv]",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "fast",
      "-crf", "20",
      "-c:a", "copy",
      outputPath,
    ];

    const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`ffmpeg exited with code ${r.status}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function loadRegistry() {
  return require(REGISTRY_PATH);
}

function loadSubjects() {
  const src = fs.readFileSync(ROUTING_PATH, "utf8");
  const subjects = {};
  const re = /"(of-[a-z0-9-]+)":\s*{[^}]*?workerDisplayName:\s*"([^"]+)"/gs;
  let m;
  while ((m = re.exec(src)) !== null) {
    subjects[m[1]] = m[2];
  }
  return subjects;
}

function parseArgs(argv) {
  const out = { mode: null, target: null, cta: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--asset") { out.mode = "asset"; out.target = argv[++i]; }
    else if (a === "--campaign") { out.mode = "campaign"; out.target = argv[++i]; }
    else if (a === "--family") { out.mode = "family"; out.target = argv[++i]; }
    else if (a === "--all") { out.mode = "all"; }
    else if (a === "--cta") { out.cta = argv[++i]; }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.mode) {
    console.error("Usage: node scripts/render-launch-videos.js (--asset <id> | --campaign <id> | --all) [--cta '<text>']");
    process.exit(2);
  }

  checkBinaries();

  const reg = loadRegistry();
  const subjects = loadSubjects();
  const fontPath = findFont();

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let pool = reg.LAUNCH_ASSETS.filter(a => a.type === "video");
  if (args.mode === "asset") {
    pool = pool.filter(a => a.assetId === args.target);
  } else if (args.mode === "campaign") {
    pool = pool.filter(a => a.campaign === args.target);
  } else if (args.mode === "family") {
    // --family of  → all of-* campaigns
    // --family hate-boss → all hate-boss-* campaigns
    pool = pool.filter(a => (a.campaign || "").startsWith(args.target + "-") || a.campaign === args.target);
  }
  if (args.mode === "all") pool = pool.filter(a => a.status === "draft");

  if (pool.length === 0) {
    console.error(`No matching video assets for mode=${args.mode} target=${args.target || "—"}`);
    process.exit(1);
  }

  console.log(`Font: ${fontPath}`);
  console.log(`Output dir: ${OUT_DIR}`);
  console.log(`Will render: ${pool.length} video(s)\n`);

  let okCount = 0;
  let failCount = 0;
  for (const asset of pool) {
    if (!asset.sourcePath) {
      console.error(`SKIP ${asset.assetId} — no sourcePath`);
      failCount++;
      continue;
    }
    if (!fs.existsSync(asset.sourcePath)) {
      console.error(`SKIP ${asset.assetId} — file not found: ${asset.sourcePath}`);
      failCount++;
      continue;
    }

    const headline = headlineFor(asset, subjects);
    const urlText = args.cta || defaultCtaFor(asset.campaign);
    const hashtagText = hashtagFor(asset.campaign);
    const outputPath = path.join(OUT_DIR, `${asset.assetId}.mp4`);

    console.log(`── ${asset.assetId} ──`);
    console.log(`   headline: ${headline.replace(/\n/g, " / ")}`);
    console.log(`   url:      ${urlText}`);
    if (hashtagText) console.log(`   hashtag:  ${hashtagText}`);
    console.log(`   out:      ${outputPath}`);
    try {
      renderOne({ inputPath: asset.sourcePath, outputPath, headline, urlText, hashtagText, fontPath, asset, subjects });
      okCount++;
    } catch (e) {
      console.error(`   FAIL: ${e.message}`);
      failCount++;
    }
    console.log();
  }

  console.log(`Done. OK: ${okCount}  FAIL: ${failCount}`);
}

main();
