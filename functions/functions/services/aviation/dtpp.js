"use strict";

/**
 * dtpp.js — Real FAA d-TPP (digital Terminal Procedures Publication) chart lookup.
 *
 * Fixes a real bug: AviationCharts.jsx previously linked to
 * `https://aeronav.faa.gov/afd/2614/${icao}.PDF` — a hardcoded, stale AIRAC
 * cycle under a path ("afd") that no longer serves per-airport chart PDFs at
 * all. Verified 404 across cycles 2609-2616 this session, both under /afd/
 * and under a guessed /d-tpp/{cycle}/{ICAO}.PDF pattern.
 *
 * The real mechanism, confirmed by direct fetch this session:
 *   1. FAA's d-TPP charts are NOT retrievable by a simple {ICAO}.PDF filename.
 *      Every chart (including "AIRPORT DIAGRAM") has its own FAA-assigned
 *      pdf_name (e.g. PHNL's Airport Diagram is "00754AD.PDF", keyed off an
 *      internal numeric airport ID — "00754" — not the ICAO code) declared
 *      in a national metafile catalog, one entry per chart per airport.
 *   2. That catalog lives at a REAL cycle number, not the literal string
 *      "current" (also verified 404) — e.g.
 *      https://aeronav.faa.gov/d-tpp/2609/xml_data/d-tpp_Metafile.xml
 *      The cycle changes every 28 days and isn't predictable in advance;
 *      the only stable way found to discover it without guessing is to read
 *      it back out of FAA's own search page, which embeds a link to the
 *      current cycle's metafile.
 *   3. Once you have a chart's real pdf_name, the actual PDF is at
 *      https://aeronav.faa.gov/d-tpp/{cycle}/{pdf_name} — this was directly
 *      verified this session for PHNL's Airport Diagram (200, real PDF,
 *      263KB, 1 page).
 *
 * The metafile itself is ~16MB and national (every airport, every chart) —
 * cached for 24h (matches the AIRAC cycle's own real-world update cadence,
 * same TTL choice already used in avcharts.js for the same reason) and only
 * ever parsed for the one airport actually requested, never held in full.
 */

const EXTERNAL_APIS = require("../../config/externalApis");

const CYCLE_TTL_MS = 24 * 60 * 60 * 1000;
const CHARTS_TTL_MS = 24 * 60 * 60 * 1000;
let _cycleCache = null; // { at, cycle }
const _chartsCache = new Map(); // icao -> { at, charts }

async function fetchText(url) {
  const resp = await fetch(url, { headers: { "User-Agent": "SOCIII-Aviation/1.0 (support@titleapp.ai)" } });
  if (!resp.ok) throw new Error(`${resp.status} for ${url}`);
  return resp.text();
}

// www.faa.gov (unlike aeronav.faa.gov) actively blocks non-browser-looking
// User-Agents on the search page specifically — verified this session (403
// with a plain UA, 200 with a real browser UA). This is only used to read
// the current cycle number back out of a public page, not to bypass any
// auth or access anything non-public.
async function fetchTextAsBrowser(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
  });
  if (!resp.ok) throw new Error(`${resp.status} for ${url}`);
  return resp.text();
}

/**
 * Discover the current AIRAC cycle number by reading it out of FAA's own
 * search page — there is no "latest" alias on the metafile URL itself.
 */
async function getCurrentCycle() {
  if (_cycleCache && Date.now() - _cycleCache.at < CYCLE_TTL_MS) return _cycleCache.cycle;
  const html = await fetchTextAsBrowser(EXEC_SEARCH_URL());
  const m = html.match(/d-tpp\/(\d+)\/xml_data\/d-tpp_Metafile\.xml/);
  if (!m) throw new Error("Could not discover current d-TPP cycle from FAA search page — page structure may have changed again");
  const cycle = m[1];
  _cycleCache = { at: Date.now(), cycle };
  return cycle;
}

function EXEC_SEARCH_URL() {
  return EXTERNAL_APIS.DTPP_SEARCH_PAGE_URL;
}

/**
 * Fetch and parse the real chart list for one ICAO airport from the national
 * metafile — real pdf_name per chart, not a guessed filename.
 */
async function getChartsForIcao(icao) {
  const id = String(icao || "").trim().toUpperCase();
  if (!id) return { error: "icao is required" };

  const cached = _chartsCache.get(id);
  if (cached && Date.now() - cached.at < CHARTS_TTL_MS) return { ...cached.charts, cached: true };

  const cycle = await getCurrentCycle();
  const metafileUrl = EXTERNAL_APIS.DTPP_METAFILE_URL.replace("{cycle}", cycle);
  const xml = await fetchText(metafileUrl);

  // Metafile is huge (national) — slice to just this airport's <airport_name> block
  // rather than parsing the whole document with a full XML parser.
  const airportMatch = xml.match(new RegExp(`<airport_name ID="[^"]*" military="[^"]*" apt_ident="[^"]*" icao_ident="${id}"[^>]*>([\\s\\S]*?)</airport_name>`));
  if (!airportMatch) {
    return { icao: id, cycle, charts: [], note: "No charts found for this ICAO in the current d-TPP metafile — verify the identifier or that this airport has published terminal procedures." };
  }

  const block = airportMatch[0];
  const charts = [];
  const recordRe = /<chart_name>(.*?)<\/chart_name>[\s\S]*?<pdf_name>(.*?)<\/pdf_name>/g;
  let m;
  while ((m = recordRe.exec(block))) {
    const chartName = m[1].trim();
    const pdfName = m[2].trim();
    if (!pdfName) continue;
    charts.push({
      name: chartName,
      pdfName,
      url: `${EXTERNAL_APIS.DTPP_PDF_BASE.replace("{cycle}", cycle)}/${pdfName}`,
    });
  }

  const out = { icao: id, cycle, charts };
  _chartsCache.set(id, { at: Date.now(), charts: out });
  if (_chartsCache.size > 200) {
    const oldest = [..._chartsCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) _chartsCache.delete(oldest[0]);
  }
  return { ...out, cached: false };
}

async function handleDtppCharts(req, res) {
  const icao = req.query?.icao || req.body?.icao;
  if (!icao) return res.status(400).json({ ok: false, error: "icao is required", code: "bad_request" });
  try {
    const result = await getChartsForIcao(icao);
    if (result.error) return res.status(400).json({ ok: false, ...result });
    return res.status(200).json({ ok: true, source: "aeronav.faa.gov d-TPP", ...result });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message, code: "upstream_error" });
  }
}


// Proxies a real FAA d-TPP chart PDF so the browser can fetch its bytes
// same-origin (aeronav.faa.gov sends no CORS headers, so a direct browser
// fetch is blocked — this exists only to unblock client-side PDF rendering,
// e.g. pdfjs-dist rasterizing an Airport Diagram for the GCP-calibration UI).
// Locked to aeronav.faa.gov URLs only — never an open proxy.
//
// Returns base64-wrapped JSON rather than a raw `application/pdf` body.
// Verified this session: the shared Cloudflare Frontdoor's generic
// `/api?path=` proxy (the only path browser clients go through — see
// docs/STATE.md) silently corrupts raw binary response bodies — a direct
// aeronav.faa.gov fetch of PHNL's Airport Diagram is a real, byte-exact
// 263,724-byte PDF, but the same bytes read back through the Frontdoor came
// back as 473,661 bytes, diverging from byte 11 on. pdf.js tolerated the
// corruption enough to still report a page/size (the PDF's outer xref/page
// structure is ASCII) but rendered a fully blank canvas (the corrupted
// content stream). Every other route in this system already returns JSON
// through that same proxy without issue, so matching that shape (base64
// inside a normal JSON envelope) sidesteps the corruption entirely rather
// than depending on a fix to infrastructure outside this repo.
async function handleDtppChartProxy(req, res) {
  const url = req.query?.url || req.body?.url;
  if (!url || typeof url !== "string" || !/^https:\/\/aeronav\.faa\.gov\/d-tpp\//.test(url)) {
    return res.status(400).json({ ok: false, error: "url must be a real aeronav.faa.gov /d-tpp/ chart URL", code: "bad_request" });
  }
  try {
    const upstream = await fetch(url, { headers: { Accept: "application/pdf", "User-Agent": "SOCIII-Aviation/1.0" } });
    if (!upstream.ok) return res.status(502).json({ ok: false, error: `upstream ${upstream.status}`, code: "upstream_error" });
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).json({ ok: true, contentType: "application/pdf", byteLength: buf.length, base64: buf.toString("base64") });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message, code: "upstream_error" });
  }
}

module.exports = { getCurrentCycle, getChartsForIcao, handleDtppCharts, handleDtppChartProxy };
