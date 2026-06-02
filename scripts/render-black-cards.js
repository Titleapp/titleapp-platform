#!/usr/bin/env node
"use strict";

// Black-card renderer for SOCIII manifesto posts (dogfood series).
//
// Reads contentRegistry.js for posts where visualStyle === "black-card",
// generates a static PNG frame (white text + logo on black, 9:16 mobile
// vertical), then uses ffmpeg to loop it into a 5-second silent MP4
// ready to upload to TikTok / Reels / YouTube Shorts.
//
// Pairs with render-launch-videos.js (which handles character videos).
//
// Usage:
//   node scripts/render-black-cards.js --content dogfood-tiktok-001
//   node scripts/render-black-cards.js --campaign dogfood
//   node scripts/render-black-cards.js --all
//
// Output: ~/Downloads/staged/<contentId>.mp4

const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(REPO_ROOT, "functions", "functions", "services", "marketing", "contentRegistry.js");
const LOGO_PATH = path.join(REPO_ROOT, "apps", "business", "src", "assets", "sociii-brand", "icon", "sociii-icon-mark-512.png");
const OUT_DIR = path.join(os.homedir(), "Downloads", "staged");

const DURATION_SEC = 5;
const FPS = 30;

// Aspect presets — 9:16 vertical for Shorts/TikTok/Reels, 1:1 square for
// LinkedIn (which letterboxes verticals). `--aspect square` triggers 1:1
// and tags the output filename with `-square` so both renders coexist.
const ASPECTS = {
  vertical: { width: 1080, height: 1920, logoTopPad: 100, logoHeight: 220, textTopPad: 60, suffix: "" },
  square:   { width: 1080, height: 1080, logoTopPad: 70,  logoHeight: 150, textTopPad: 40, suffix: "-square" },
};

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
  for (const bin of ["magick", "ffmpeg"]) {
    const r = spawnSync("which", [bin]);
    if (r.status !== 0) {
      throw new Error(`Missing: ${bin}. Run: brew install ${bin === "magick" ? "imagemagick" : "ffmpeg"}`);
    }
  }
}

function loadRegistry() {
  delete require.cache[require.resolve(REGISTRY_PATH)];
  return require(REGISTRY_PATH);
}

function parseArgs(argv) {
  const out = { mode: null, target: null, aspect: "vertical" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--content") { out.mode = "content"; out.target = argv[++i]; }
    else if (a === "--campaign") { out.mode = "campaign"; out.target = argv[++i]; }
    else if (a === "--all") { out.mode = "all"; }
    else if (a === "--aspect") { out.aspect = argv[++i]; }
  }
  return out;
}

// Build the static frame PNG: black canvas + logo (top) + text (center).
function renderFramePng({ outPath, text, fontPath, aspect }) {
  const A = ASPECTS[aspect] || ASPECTS.vertical;
  const OUT_WIDTH = A.width;
  const OUT_HEIGHT = A.height;
  const LOGO_TOP_PAD = A.logoTopPad;
  const LOGO_HEIGHT = A.logoHeight;

  // Split text into lines so we can render each as a separate caption
  // with consistent typography. Empty lines kept for spacing.
  const lines = String(text).split("\n");

  // Decide pointsize based on line count + average line length.
  // Square aspect needs slightly smaller text since vertical space is tighter.
  const maxLineLen = Math.max(...lines.map(l => l.length), 1);
  const lineCount = lines.length;
  let pointsize = aspect === "square" ? 68 : 84;
  if (lineCount > 4 || maxLineLen > 32) pointsize = aspect === "square" ? 56 : 68;
  if (lineCount > 6 || maxLineLen > 42) pointsize = aspect === "square" ? 46 : 56;

  // Build one big caption that ImageMagick will lay out vertically.
  const textBlock = lines.join("\n");
  const textBoxHeight = OUT_HEIGHT - (LOGO_TOP_PAD + LOGO_HEIGHT) - (aspect === "square" ? 120 : 200);
  const textY = LOGO_TOP_PAD + LOGO_HEIGHT + A.textTopPad;
  const logoX = Math.round((OUT_WIDTH - LOGO_HEIGHT) / 2);

  const args = [
    "-size", `${OUT_WIDTH}x${OUT_HEIGHT}`,
    "xc:black",
    // Logo at top-center
    "-gravity", "NorthWest",
    "(", LOGO_PATH, "-resize", `${LOGO_HEIGHT}x${LOGO_HEIGHT}`, ")",
    "-geometry", `+${logoX}+${LOGO_TOP_PAD}`,
    "-composite",
    // Manifesto text — caption: auto-wraps but we also feed multi-line via \n
    "-gravity", "North",
    "(",
    "-size", `${OUT_WIDTH - 120}x${textBoxHeight}`,
    "-background", "black",
    "-fill", "white",
    "-gravity", "center",
    "-font", fontPath,
    "-pointsize", String(pointsize),
    "-interline-spacing", "18",
    `caption:${textBlock}`,
    ")",
    "-geometry", `+0+${textY}`,
    "-composite",
    outPath,
  ];

  const r = spawnSync("magick", args, { stdio: "pipe" });
  if (r.status !== 0) {
    throw new Error(`magick black-card frame failed (${r.status}): ${r.stderr?.toString().slice(0, 400)}`);
  }
}

// Loop the static PNG into a 5-second silent MP4.
//
// LinkedIn rejects uploads below 75 KB. Static black-card content compresses
// to ~40 KB by default — well under the floor. We force a minimum video
// bitrate (700 kbps) which gives a 5-sec file of ~350-450 KB, comfortably
// above LinkedIn's threshold without making the file gratuitously large.
function pngToMp4({ inputPng, outputMp4 }) {
  // -g 1 -bf 0 forces every frame to be an i-frame with no inter-frame
  // compression. Combined with the bitrate target, this guarantees a file
  // size proportional to duration × bitrate regardless of content
  // similarity between frames. Necessary because LinkedIn rejects uploads
  // below 75 KB and static black-card content otherwise compresses to ~40 KB.
  const args = [
    "-y",
    "-loop", "1",
    "-i", inputPng,
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t", String(DURATION_SEC),
    "-r", String(FPS),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "fast",
    "-g", "1",
    "-bf", "0",
    "-b:v", "1000k",
    "-minrate", "1000k",
    "-maxrate", "1000k",
    "-bufsize", "2000k",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    outputMp4,
  ];
  const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg exited with code ${r.status}`);
}

function renderOne(item, fontPath, aspect) {
  const A = ASPECTS[aspect] || ASPECTS.vertical;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "blackcard-"));
  const framePng = path.join(tmpDir, "frame.png");
  const outMp4 = path.join(OUT_DIR, `${item.contentId}${A.suffix}.mp4`);

  try {
    renderFramePng({ outPath: framePng, text: item.text, fontPath, aspect });
    pngToMp4({ inputPng: framePng, outputMp4: outMp4 });
    return outMp4;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.mode) {
    console.error("Usage: node scripts/render-black-cards.js (--content <id> | --campaign <id> | --all)");
    process.exit(2);
  }

  checkBinaries();
  const reg = loadRegistry();
  const fontPath = findFont();
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let pool = reg.DOGFOOD_POSTS.filter(p => p.visualStyle === "black-card");
  if (args.mode === "content") pool = pool.filter(p => p.contentId === args.target);
  if (args.mode === "campaign") pool = pool.filter(p => p.campaign === args.target);

  if (pool.length === 0) {
    console.error(`No black-card content matches mode=${args.mode} target=${args.target || "—"}`);
    process.exit(1);
  }

  if (!ASPECTS[args.aspect]) {
    console.error(`Unknown --aspect "${args.aspect}". Valid: vertical, square.`);
    process.exit(2);
  }

  console.log(`Font: ${fontPath}`);
  console.log(`Aspect: ${args.aspect} (${ASPECTS[args.aspect].width}x${ASPECTS[args.aspect].height})`);
  console.log(`Will render: ${pool.length} black card(s)\n`);

  let ok = 0, fail = 0;
  for (const item of pool) {
    console.log(`── ${item.contentId} (${item.platform}) ──`);
    console.log(`   text: ${item.text.split("\n")[0].slice(0, 60)}…`);
    try {
      const out = renderOne(item, fontPath, args.aspect);
      console.log(`   → ${out}\n`);
      ok++;
    } catch (e) {
      console.error(`   FAIL: ${e.message}\n`);
      fail++;
    }
  }
  console.log(`Done. OK: ${ok}  FAIL: ${fail}`);
}

main();
