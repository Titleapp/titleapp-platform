"use strict";
/**
 * render-hate-boss-fal.js — S52.45 (v2). "Hate your boss" clips via Fal video.
 * Story-driven prompts (set the stage), Kling for quality (MiniMax looked too AI),
 * 9:16 vertical. Falls back across models so it produces something + reports which
 * model worked. Output → ~/Downloads/staged/<id>.mp4.
 *
 *   node scripts/render-hate-boss-fal.js
 */
const fs = require("fs");
const path = require("path");

const ENV = fs.readFileSync(path.join(__dirname, "..", "functions", "functions", ".env"), "utf8");
const KEY = (ENV.match(/^FAL_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!KEY) { console.error("FAL_API_KEY not found"); process.exit(1); }
const { fal } = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "@fal-ai/client"));
fal.config({ credentials: KEY });

const OUT = path.join(process.env.HOME, "Downloads", "staged");
// Try best-quality first, fall back if a model id/endpoint isn't available.
// 10s for more story/context (Kling v2 master supports 5 or 10). 9:16 vertical.
const MODELS = [
  { id: "fal-ai/kling-video/v2/master/text-to-video", extra: { duration: "10", aspect_ratio: "9:16" } },
  { id: "fal-ai/kling-video/v1/pro/text-to-video", extra: { duration: "10", aspect_ratio: "9:16" } },
  { id: "fal-ai/kling-video/v1/standard/text-to-video", extra: { duration: "10", aspect_ratio: "9:16" } },
  { id: "fal-ai/minimax-video", extra: {} },
];

// v3 — mockumentary "The Office (US)" style, deliberately absurd. Single handheld
// documentary camera, awkward zoom-ins, talking-head confessionals, deadpan looks
// to camera, fluorescent-drab open-plan office. Cringe corporate satire.
const CLIPS = [
  {
    id: "office-family-cult-06",
    prompt: "Shot as a mockumentary in the exact style of The Office (US): a single handheld documentary camera, slightly shaky, with a sudden awkward zoom-in that slightly overshoots and re-frames. A delusional middle-aged tech CEO in a wrinkled quarter-zip vest and lanyard stands on an office chair in a drab, fluorescent-lit open-plan office full of beige cubicles, a dying potted plant, and a crooked 'TEAMWORK MAKES THE DREAM WORK' poster. He spreads his arms wide like a cult leader, beaming with manic sincerity, mouthing the words 'we are FAMILY.' Around him exhausted employees in ergonomic chairs stare blankly; one slowly swivels and gives the camera a long, flat, deadpan stare. Absurd, cringe, satirical corporate energy. Photorealistic, flat documentary lighting, no music-video gloss — looks like a TV mockumentary still.",
  },
  {
    id: "office-leanin-to-ai-07",
    prompt: "A mockumentary talking-head confessional in the exact style of The Office (US): a polished corporate SVP woman in a blazer sits alone in a glass-walled conference room, speaking earnestly and with rehearsed passion directly to an unseen documentary interviewer just off-camera. On the whiteboard behind her, the phrase 'LEAN IN' has been scribbled out and replaced with 'LEAN INTO AI' in three different marker colors, with a lopsided rocket-ship doodle. A dusty hardcover business book sits on the table beside a cold coffee. She nods slowly at her own profundity and does an awkward little finger-gun. Single slightly-shaky handheld camera with a small awkward zoom toward her overconfident smile. Drab fluorescent office lighting. Absurd, deadpan, satirical. Photorealistic, TV-mockumentary look.",
  },
  {
    id: "office-trustfall-deadpan-08",
    prompt: "A mockumentary reaction shot in the exact style of The Office (US). In the blurred background of a drab open-plan office, an oblivious boss in a polo shirt enthusiastically attempts a team trust-fall, arms crossed, falling backward toward three confused employees who do not move to catch him. In sharp foreground, a tired employee at a beige desk slowly turns away from a spreadsheet and stares directly into the documentary camera with a flat, defeated, deadpan expression, holding the look a beat too long, then exhales. Single handheld camera with a sudden awkward zoom-in on the employee's face. Flat fluorescent lighting, mundane absurdity, cringe corporate comedy. Photorealistic, TV-mockumentary still look.",
  },
];

async function genOne(clip) {
  for (const m of MODELS) {
    try {
      const r = await fal.subscribe(m.id, { input: { prompt: clip.prompt, ...m.extra }, logs: false });
      const url = r?.data?.video?.url || r?.video?.url || r?.data?.url;
      if (!url) continue;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const f = path.join(OUT, clip.id + ".mp4");
      fs.writeFileSync(f, buf);
      return { ok: true, model: m.id, file: f, kb: Math.round(buf.length / 1024) };
    } catch (e) {
      // try next model
      if (m === MODELS[MODELS.length - 1]) return { ok: false, error: e.message };
    }
  }
  return { ok: false, error: "no model produced a video" };
}

(async () => {
  console.log(`hate-boss v2 · ${CLIPS.length} clips → ${OUT}\n`);
  for (const c of CLIPS) {
    process.stdout.write(`• ${c.id} ... `);
    const res = await genOne(c);
    console.log(res.ok ? `✓ [${res.model}] ${res.kb} KB → ${res.file}` : `FAILED: ${res.error}`);
  }
  process.exit(0);
})();
