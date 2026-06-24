"use strict";

/**
 * canvasMarkers.js — Extracts |||CANVAS_RENDER|||...|||END_CANVAS||| blocks
 * from an AI response and returns the cleaned text plus parsed payloads (49.27).
 *
 * 49.32 — Added payload shape coercion. The model frequently emits the right
 * `type` but with the generic {title, summary, sections} shape because that's
 * the example in the work-product schema. Each typed card expects a specific
 * top-level key (calendar, campaigns, closingData, etc). Without coercion
 * the frontend renders an empty card. coerceCanvasPayload() detects common
 * shape mistakes and translates them into the shape the renderer expects.
 */

// Tolerant of 2-3 pipes + surrounding whitespace — the model occasionally emits
// ||CANVAS_RENDER|| (2 pipes) or stray spaces, which left raw JSON in chat (Sean 2026-06-24).
const MARKER_RE = /\|{2,3}\s*CANVAS_RENDER\s*\|{2,3}\s*([\s\S]*?)\s*\|{2,3}\s*END_CANVAS\s*\|{2,3}/g;

// Fallback: matches a CANVAS_RENDER block that opens but never closes — e.g.
// because the model truncated mid-JSON. The leaked block would otherwise
// render as raw marker text in chat (2026-05-12 bug — Sean caught the leak
// in the Marketing worker). We strip the orphan from chat and best-effort
// parse anything that looks like a complete JSON object inside it.
const ORPHAN_OPEN_RE = /\|{2,3}\s*CANVAS_RENDER\s*\|{2,3}\s*([\s\S]*)$/;
const ORPHAN_END_ONLY_RE = /\|{2,3}\s*END_CANVAS\s*\|{2,3}/g;

const PLATFORM_TOKENS = ["instagram", "twitter", "linkedin", "facebook", "email", "tiktok", "youtube", "x"];

/**
 * Best-effort: pull post entries out of a free-text body that the model
 * dropped into a "sections" array instead of structured posts.
 * Looks for lines like:
 *   - LinkedIn 9:00 AM — Q2 trends post
 *   - Instagram: Behind the scenes (12pm)
 *   - 9:00 AM Email — Newsletter
 */
function extractPostsFromText(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text.split(/\r?\n/).map(l => l.replace(/^[-*•\d.\s]+/, "").trim()).filter(Boolean);
  const posts = [];
  for (const line of lines) {
    const platMatch = line.match(new RegExp(`\\b(${PLATFORM_TOKENS.join("|")})\\b`, "i"));
    const timeMatch = line.match(/\b(\d{1,2}(:\d{2})?\s*(am|pm|AM|PM))\b/);
    const platform = platMatch ? platMatch[1].toLowerCase() : null;
    const time = timeMatch ? timeMatch[1] : null;
    let content = line;
    if (platform) content = content.replace(new RegExp(`\\b${platform}\\b[:\\s—-]*`, "i"), "");
    if (time) content = content.replace(time, "");
    content = content.replace(/^[—:\-\s]+|[—:\-\s]+$/g, "").trim();
    if (content || platform) posts.push({ platform: platform || "linkedin", content, time: time || undefined });
  }
  return posts;
}

/**
 * Convert one of several common malformed shapes for content-calendar into
 * the canonical { calendar: [{date, posts: [{platform, content, time}]}] }.
 */
function coerceContentCalendar(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload.calendar) && payload.calendar.length) return payload;
  if (Array.isArray(payload.contentCalendar)) return { ...payload, calendar: payload.contentCalendar };

  // Top-level posts array → wrap into a single-day calendar entry.
  if (Array.isArray(payload.posts)) {
    const grouped = {};
    for (const p of payload.posts) {
      const date = p.date || p.day || "Day 1";
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({
        platform: (p.platform || p.channel || "linkedin").toLowerCase(),
        content: p.content || p.text || p.title || "",
        time: p.time || p.scheduledTime || undefined,
      });
    }
    return { ...payload, calendar: Object.entries(grouped).map(([date, posts]) => ({ date, posts })) };
  }

  // sections [{heading: "Mon May 4", body: "..."}] → calendar entries with extracted posts.
  if (Array.isArray(payload.sections) && payload.sections.length) {
    const calendar = payload.sections
      .map(s => {
        const heading = s.heading || s.title || s.day || s.date;
        const body = s.body || s.content || "";
        if (!heading) return null;
        const posts = extractPostsFromText(body);
        return { date: heading, posts: posts.length ? posts : [{ platform: "linkedin", content: body.slice(0, 240), time: undefined }] };
      })
      .filter(Boolean);
    if (calendar.length) return { ...payload, calendar };
  }

  // items / fields fallback — treat as single-day list.
  if (Array.isArray(payload.items) && payload.items.length) {
    return {
      ...payload,
      calendar: [{
        date: payload.title || "This week",
        posts: payload.items.map(it => ({
          platform: "linkedin",
          content: typeof it === "string" ? it : (it.content || it.title || JSON.stringify(it)),
        })),
      }],
    };
  }
  return payload;
}

/**
 * Coerce email-campaign payloads into { campaigns: [{subject, preview, status, recipients, openRate, clickRate}] }.
 */
function coerceEmailCampaign(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload.campaigns) && payload.campaigns.length) return payload;
  if (Array.isArray(payload.emails)) return { ...payload, campaigns: payload.emails };
  if (Array.isArray(payload.sequence)) {
    return {
      ...payload,
      campaigns: payload.sequence.map((e, i) => ({
        subject: e.subject || e.title || `Email ${i + 1}`,
        preview: e.preview || e.body?.slice?.(0, 120) || "",
        status: e.status || "draft",
        recipients: e.recipients || 0,
      })),
    };
  }
  if (Array.isArray(payload.sections)) {
    return {
      ...payload,
      campaigns: payload.sections.map((s, i) => ({
        subject: s.heading || s.title || `Email ${i + 1}`,
        preview: (s.body || "").slice(0, 160),
        status: "draft",
      })),
    };
  }
  if (Array.isArray(payload.fields)) {
    // Single campaign described as fields.
    const subject = payload.fields.find(f => /subject/i.test(f.label))?.value;
    const preview = payload.fields.find(f => /preview|teaser/i.test(f.label))?.value;
    if (subject) return { ...payload, campaigns: [{ subject, preview, status: "draft" }] };
  }
  return payload;
}

/**
 * Coerce real-estate-closing payloads into { closingData: {address, price, milestones, ...} }.
 */
function coerceRealEstateClosing(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.closingData && typeof payload.closingData === "object") return payload;

  // Top-level shape — wrap.
  const direct = {};
  for (const k of ["address", "price", "purchasePrice", "closingDate", "escrowAgent", "titleCompany", "milestones", "buyer", "seller"]) {
    if (payload[k] != null) direct[k] = payload[k];
  }
  if (direct.purchasePrice != null && direct.price == null) direct.price = direct.purchasePrice;
  if (Object.keys(direct).length > 0) return { ...payload, closingData: direct };

  // sections → milestones: heading=label, body has date + status hints.
  if (Array.isArray(payload.sections) && payload.sections.length) {
    const milestones = payload.sections.map(s => {
      const label = s.heading || s.title || "";
      const body = (s.body || "").toLowerCase();
      let status = "pending";
      if (/\b(done|complete|completed|closed)\b/.test(body)) status = "done";
      else if (/\b(active|in progress|in-progress|underway|started)\b/.test(body)) status = "active";
      const dateMatch = (s.body || "").match(/\b(\d{4}-\d{2}-\d{2}|\w+ \d{1,2},? \d{4})\b/);
      return { label, date: dateMatch ? dateMatch[1] : undefined, status };
    });
    return { ...payload, closingData: { address: payload.title || "Property", milestones } };
  }

  // fields → flat closing data.
  if (Array.isArray(payload.fields)) {
    const closingData = {};
    for (const f of payload.fields) {
      const label = (f.label || "").toLowerCase();
      if (/address/.test(label)) closingData.address = f.value;
      else if (/price/.test(label)) closingData.price = parseFloat(String(f.value).replace(/[^0-9.]/g, "")) || f.value;
      else if (/closing.*date|close.*date/.test(label)) closingData.closingDate = f.value;
      else if (/escrow/.test(label)) closingData.escrowAgent = f.value;
      else if (/title (co|company)/.test(label)) closingData.titleCompany = f.value;
    }
    if (Object.keys(closingData).length) return { ...payload, closingData };
  }

  return payload;
}

/**
 * Coerce balance-sheet payloads into { balanceSheet: {...} }.
 */
function coerceBalanceSheet(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.balanceSheet && typeof payload.balanceSheet === "object") return payload;
  const bs = {};
  for (const k of ["asOf", "currentAssets", "nonCurrentAssets", "currentLiabilities", "longTermLiabilities", "equity", "totalAssets", "totalLiabilities", "totalEquity"]) {
    if (payload[k] != null) bs[k] = payload[k];
  }
  if (Object.keys(bs).length) return { ...payload, balanceSheet: bs };
  return payload;
}

function coerceCashFlow(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.cashFlow && typeof payload.cashFlow === "object") return payload;
  const cf = {};
  for (const k of ["period", "beginningCash", "operating", "investing", "financing", "endingCash"]) {
    if (payload[k] != null) cf[k] = payload[k];
  }
  if (Object.keys(cf).length) return { ...payload, cashFlow: cf };
  return payload;
}

function coercePL(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.plData && typeof payload.plData === "object") return payload;
  // Model frequently emits the data under `profitLoss` (its own naming choice).
  // Lift those fields to top-level so renderers see them, and also keep a
  // `plData` mirror for the legacy path.
  if (payload.profitLoss && typeof payload.profitLoss === "object") {
    const lifted = { ...payload, ...payload.profitLoss };
    return { ...lifted, plData: payload.profitLoss };
  }
  const pl = {};
  for (const k of ["period", "revenue", "expenses", "netIncome", "grossProfit", "operatingIncome", "categories"]) {
    if (payload[k] != null) pl[k] = payload[k];
  }
  if (Object.keys(pl).length) return { ...payload, plData: pl };
  return payload;
}

/**
 * Chart cards (49.32) — accept several shapes the model commonly emits and
 * normalize to {chartType, data: [{label,value} | {label,count,value} | {row,column,value}]}.
 */
function coerceChart(type, payload) {
  if (!payload || typeof payload !== "object") return payload;
  const inferred = type.includes("funnel") ? "funnel" : type.includes("heatmap") ? "heatmap" : "bar";
  const chartType = payload.chartType || inferred;

  // Already in the canonical shape.
  if (Array.isArray(payload.data) && payload.data.length) return { ...payload, chartType };

  // Common alternates.
  if (Array.isArray(payload.series)) return { ...payload, chartType, data: payload.series };
  if (Array.isArray(payload.cells)) return { ...payload, chartType, data: payload.cells };
  if (Array.isArray(payload.bars)) return { ...payload, chartType, data: payload.bars };
  if (Array.isArray(payload.stages)) return { ...payload, chartType: "funnel", data: payload.stages };

  // Object map: { "Direct": 18500, "Affiliate": 11200 } → bar data.
  const objKeys = Object.keys(payload).filter(k => !["title", "subtitle", "summary", "chartType", "rows", "columns"].includes(k));
  const looksLikeObjMap = objKeys.length >= 2 && objKeys.every(k => typeof payload[k] === "number");
  if (looksLikeObjMap) {
    return { ...payload, chartType, data: objKeys.map(label => ({ label, value: payload[label] })) };
  }

  // sections [{heading, body}] with body containing a number → bar data.
  if (Array.isArray(payload.sections)) {
    const data = payload.sections.map(s => {
      const body = String(s.body || "");
      const numMatch = body.match(/\$?([\d,]+(?:\.\d+)?)\s*([kKmM])?/);
      let value = 0;
      if (numMatch) {
        value = parseFloat(numMatch[1].replace(/,/g, ""));
        if (numMatch[2] && /[kK]/.test(numMatch[2])) value *= 1000;
        if (numMatch[2] && /[mM]/.test(numMatch[2])) value *= 1_000_000;
      }
      return { label: s.heading || s.title || "", value };
    }).filter(d => d.label);
    if (data.length) return { ...payload, chartType, data };
  }

  return { ...payload, chartType };
}

/**
 * Dispatch table — apply the right coercer for each known type. Unknown
 * types pass through unchanged.
 */
function coerceCanvasPayload(type, payload) {
  if (!payload || typeof payload !== "object") return payload || {};
  switch (type) {
    case "card:marketing-content-calendar": return coerceContentCalendar(payload);
    case "card:marketing-email": return coerceEmailCampaign(payload);
    case "card:real-estate-closing": return coerceRealEstateClosing(payload);
    case "card:accounting-balance-sheet": return coerceBalanceSheet(payload);
    case "card:accounting-cashflow": return coerceCashFlow(payload);
    case "card:accounting-pl": return coercePL(payload);
    case "card:chart-bar":
    case "card:chart-funnel":
    case "card:chart-heatmap":
      return coerceChart(type, payload);
    default: return payload;
  }
}

/**
 * Pull all canvas render markers out of an AI response.
 * @param {string} text — raw AI response
 * @returns {{ cleanText: string, canvasRenders: Array<{type: string, payload: object}> }}
 */
function extractCanvasRenders(text) {
  if (!text || typeof text !== "string") return { cleanText: text || "", canvasRenders: [] };

  const renders = [];
  let cleanText = text.replace(MARKER_RE, (_match, body) => {
    try {
      const obj = JSON.parse(body);
      if (obj && typeof obj === "object" && obj.type) {
        const type = String(obj.type);
        const rawPayload = obj.payload || {};
        const coerced = coerceCanvasPayload(type, rawPayload);
        // Diagnostic — record both raw and coerced key sets so we can see
        // when the model emits the wrong shape and what we coerced it to.
        try {
          const rawKeys = Object.keys(rawPayload).slice(0, 12).join(",");
          const newKeys = Object.keys(coerced || {}).slice(0, 12).join(",");
          if (rawKeys !== newKeys) {
            console.log(`[canvasMarkers] type=${type} coerced payload keys [${rawKeys}] -> [${newKeys}]`);
          } else {
            console.log(`[canvasMarkers] type=${type} payload keys=[${rawKeys}]`);
          }
        } catch (_) { /* ignore logging errors */ }
        renders.push({ type, payload: coerced });
      }
    } catch (parseErr) {
      console.warn("[canvasMarkers] Failed to parse CANVAS_RENDER payload:", parseErr.message);
    }
    return "";
  });

  // Fallback pass — handle unterminated markers (model truncated mid-JSON
  // or omitted the END tag). Strip the opening marker + everything after
  // it, and best-effort recover any complete JSON object inside.
  const orphanMatch = cleanText.match(ORPHAN_OPEN_RE);
  if (orphanMatch) {
    const orphanBody = orphanMatch[1] || "";
    // Try to extract the first balanced JSON object via brace-counting so
    // partial JSON tails don't crash JSON.parse. Recovers payloads even
    // from truncated responses when the JSON itself is intact.
    const firstBrace = orphanBody.indexOf("{");
    if (firstBrace >= 0) {
      let depth = 0;
      let endIdx = -1;
      for (let i = firstBrace; i < orphanBody.length; i++) {
        const ch = orphanBody[i];
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        }
      }
      if (endIdx > firstBrace) {
        try {
          const obj = JSON.parse(orphanBody.slice(firstBrace, endIdx + 1));
          if (obj && typeof obj === "object" && obj.type) {
            const type = String(obj.type);
            const coerced = coerceCanvasPayload(type, obj.payload || {});
            renders.push({ type, payload: coerced });
            console.log(`[canvasMarkers] recovered orphan CANVAS_RENDER type=${type}`);
          }
        } catch (_) {
          console.warn("[canvasMarkers] orphan CANVAS_RENDER JSON unparseable; stripping anyway");
        }
      }
    }
    cleanText = cleanText.slice(0, orphanMatch.index);
  }
  // Belt-and-suspenders: strip any stray END markers and any literal
  // "|||CANVAS_RENDER|||" tokens that might have leaked.
  cleanText = cleanText.replace(ORPHAN_END_ONLY_RE, "").replace(/\|\|\|CANVAS_RENDER\|\|\|/g, "");

  cleanText = cleanText.replace(/\n{3,}/g, "\n\n").trim();

  // If stripping markers left chat completely empty BUT we recovered at least
  // one canvas render, synthesize a brief chat reply pointing at it. This
  // prevents the "No response received." UI when the model put everything
  // inside a marker (2026-05-12 — Sean caught this on the Marketing worker).
  if (!cleanText && renders.length > 0) {
    const titles = renders
      .map(r => r.payload?.title || r.payload?.subject || r.payload?.heading)
      .filter(Boolean);
    if (titles.length === 1) {
      cleanText = `Updated the canvas on the right with ${titles[0]}.`;
    } else if (titles.length > 1) {
      cleanText = `Updated the canvas on the right with ${titles.length} new cards: ${titles.join(", ")}.`;
    } else {
      cleanText = "Updated the canvas on the right.";
    }
  }

  // 2026-05-22 — Belt-and-suspenders enforcement of the canvas-claim phrase
  // blocklist. The prompt-level guardrail in augmentPromptWithChatContext
  // tells the model NEVER to say "on the right" / "on the canvas" / similar
  // unless a CANVAS_RENDER marker was actually emitted. Models break this
  // rule reliably enough that Sean caught a live instance during testing
  // (the "P&L structure is on the right" hallucination, Accounting worker,
  // 2026-05-22). This post-process strips those phrases server-side when
  // no markers were extracted in the turn, guaranteeing the chat text
  // cannot lie about what's rendered. Only strips the high-specificity
  // phrases where false-positive risk is near-zero — "on the canvas",
  // "to your right", etc. are unambiguous canvas claims; phrases like
  // "I've drafted" are too generic to safely strip.
  if (renders.length === 0 && cleanText) {
    cleanText = stripCanvasClaimPhrases(cleanText);
  }

  return { cleanText, canvasRenders: renders };
}

// Rewrites high-specificity canvas-claim phrases to neutral text. Called only
// when no CANVAS_RENDER marker was emitted in the current turn. Each phrase
// is matched case-insensitively. Rewrites preserve sentence flow rather than
// strip wholesale (a sentence with a dangling reference reads worse than a
// rewritten one).
function stripCanvasClaimPhrases(text) {
  if (!text) return text;
  let out = text;
  // Order matters: most-specific patterns first; the catch-all comes last.
  // Each pattern consumes the FULL canvas-position phrase including trailing
  // qualifiers (e.g. "side of your screen") to avoid leaving dangling text.
  const rewrites = [
    // Compound trailing phrases — consume the whole position descriptor.
    { re: /\b(?:on|to) (?:the |your )?right(?:[-\s]?hand)?(?:\s+side)?(?:\s+(?:of|in)\s+(?:your |the )?(?:screen|page|app|chat|workspace))?\b/gi, sub: "in the workspace" },
    { re: /\b(?:rendered|drafted|prepared|created) (?:on|to) (?:the |your )?(?:right(?:[-\s]?hand)?(?:\s+side)?|canvas)\b/gi, sub: "saved" },
    { re: /\bsnapshot (?:is|appears) (?:on|to) (?:the |your )?(?:right|canvas)\b/gi, sub: "is saved" },
    { re: /\b(?:is|appears) on the right\b/gi, sub: "is ready" },
    { re: /\bin (?:the |your )?canvas\b/gi, sub: "in the workspace" },
    { re: /\bon (?:the |your )?canvas\b/gi, sub: "in the workspace" },
    { re: /\bavailable on the canvas\b/gi, sub: "available now" },
    { re: /\bI('ve| have) (?:drafted|prepared|created) (?:it |the )?(?:for you )?on the canvas\b/gi, sub: "I have it ready" },
  ];
  for (const r of rewrites) {
    out = out.replace(r.re, r.sub);
  }
  // Collapse any awkward repetition introduced by rewrites.
  out = out.replace(/\b(ready|saved|available|workspace)\s+\1\b/gi, "$1");
  // "in the workspace in the workspace" → "in the workspace"
  out = out.replace(/\b(in the workspace)\s+\1\b/gi, "$1");
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1");
  return out;
}

module.exports = { extractCanvasRenders, coerceCanvasPayload, stripCanvasClaimPhrases };
