// services/creatorAssist.js — creator-facing AI helpers for the worker sandbox.
//
// Two jobs, both used in the creator authoring flow:
//   1. generateCreatorBio  — turn a LinkedIn URL / a few words into a clean,
//      credible 1–2 sentence bio (and pull a headshot if the profile exposes one).
//   2. generateWorkerDeck  — a 10-slide pitch deck that explains the worker to a
//      prospective SUBSCRIBER (what it is, what it does, why they should care).
//
// EH-01 (no fabrication): the bio prompt is explicitly forbidden from inventing
// employers, numbers, or titles that weren't provided — thin input yields an
// editable placeholder, never a fake credential.

const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-sonnet-4-5-20250929";
let _client;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function textOf(resp) {
  return (resp?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

// Best-effort fetch of a public profile's Open Graph meta (name/headline/photo).
// LinkedIn frequently serves a login wall to bots, so this MUST degrade
// gracefully — any failure returns {} and the caller falls back to typed input.
async function fetchProfileMeta(url) {
  if (!url || !/^https?:\/\//i.test(url)) return {};
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SOCIIIbot/1.0; +https://sociii.ai)" },
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return {};
    const html = await res.text();
    const og = (p) => {
      const a = html.match(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']+)["']`, "i"));
      if (a) return a[1];
      const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${p}["']`, "i"));
      return b ? b[1] : null;
    };
    const decode = (s) => (s || "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">") || null;
    return { title: decode(og("title")), description: decode(og("description")), image: og("image") };
  } catch (_) {
    return {};
  }
}

async function generateCreatorBio({ name, source, linkedinUrl, workerName, vertical } = {}) {
  const meta = await fetchProfileMeta(linkedinUrl);
  const grounding = [
    name ? `Name: ${name}` : "",
    meta.title ? `LinkedIn headline: ${meta.title}` : "",
    meta.description ? `LinkedIn summary: ${meta.description}` : "",
    source ? `What they told us about themselves: ${source}` : "",
    workerName ? `They are building a Digital Worker called "${workerName}"${vertical ? ` in ${vertical}` : ""}.` : "",
  ].filter(Boolean).join("\n");

  const prompt =
    `Write a short, credible creator bio (1–2 sentences, ~240 characters max) for a marketplace where verified experts publish "Digital Workers."\n` +
    `Third person. No hype, no buzzwords, no emojis. Lead with the experience or credential that makes this person trustworthy for the worker they're building.\n` +
    `IMPORTANT: Do not invent any specific fact — employer, job title, school, years, or number — that is not present below. If the information is thin, write a clean, honest placeholder the person can edit themselves.\n\n` +
    `What we know:\n${grounding || "(nothing provided yet)"}\n\n` +
    `Return ONLY the bio text, nothing else.`;

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  return {
    bio: textOf(resp),
    headshotUrl: meta.image || null,
    fetched: !!(meta.title || meta.description || meta.image),
  };
}

async function generateWorkerDeck({ spec } = {}) {
  const s = spec || {};
  const prompt =
    `Create a 10-slide pitch deck that explains a "Digital Worker" to a prospective SUBSCRIBER — the person who would pay to use it. Center every slide on THEIR benefit: the painful job it removes and why they should care.\n` +
    `Plain, confident, concrete. No buzzwords, no emojis, and never fabricate statistics or claims.\n\n` +
    `Worker:\n` +
    `- Name: ${s.name || "Untitled Worker"}\n` +
    `- Vertical: ${s.category || "—"}\n` +
    `- Audience: ${s.targetAudience || "—"}\n` +
    `- Job it performs: ${s.problemSolves || "—"}\n` +
    `- Built by: ${s.creatorName || "—"}${s.creatorBio ? ` — ${s.creatorBio}` : ""}\n\n` +
    `Return ONLY valid JSON of the form {"slides":[{"title":"...","subtitle":"...","bullets":["...","..."]}]} with EXACTLY 10 slides following this arc:\n` +
    `1 Title  2 The problem (their pain)  3 The cost of that pain  4 Meet the worker  5 What it does  6 How it works (3 steps)  7 Why you should care (the benefit)  8 Who built it (trust)  9 What it costs / how to start  10 Call to action.\n` +
    `Titles <=8 words. 2–4 bullets per slide, each <=12 words. subtitle is optional (one short line).`;

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = textOf(resp);
  let slides = [];
  try {
    const m = text.match(/\{[\s\S]*\}/);
    slides = JSON.parse(m ? m[0] : text).slides || [];
  } catch (_) {
    slides = [];
  }
  // Normalize/clip defensively.
  slides = (Array.isArray(slides) ? slides : []).slice(0, 10).map((sl) => ({
    title: String(sl.title || "").slice(0, 80),
    subtitle: sl.subtitle ? String(sl.subtitle).slice(0, 140) : "",
    bullets: Array.isArray(sl.bullets) ? sl.bullets.slice(0, 4).map((b) => String(b).slice(0, 120)) : [],
  }));

  return { slides };
}

module.exports = { generateCreatorBio, generateWorkerDeck, fetchProfileMeta };
