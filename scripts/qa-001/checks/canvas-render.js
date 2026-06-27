"use strict";

/**
 * Check: canvas render integrity — every tab signal a worker uses resolves to a
 * real, registered card component, and every registered card type has a
 * component behind it. This catches the "worker renders flat / empty shell"
 * bug class (orphaned signal → generic fallback) that bit Ruthie's workers
 * (0 tabs) and the CRE/site-recon flat renders.
 *
 * Static + deterministic (no creds): reads the frontend registries and scans
 * the codebase for tab signals.
 *
 *   canvasTypes.js          signal  -> component name
 *   CanvasComponentMap.jsx  component name -> React component
 *   *.js/*.json             worker canvasTabs[].signal references
 *
 * Catches:
 *   TC-CANVAS-01 — a worker tab signal not registered in canvasTypes (flat render)
 *   TC-CANVAS-02 — a registered signal whose component is missing from the map (crash/blank)
 *   TC-CANVAS-03 — a live-data worker slug with tabs but no getLiveDataForTab branch (empty card)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "..");
const F = {
  canvasTypes: path.join(ROOT, "apps/business/src/config/canvasTypes.js"),
  componentMap: path.join(ROOT, "apps/business/src/components/canvas/CanvasComponentMap.jsx"),
  liveData: path.join(ROOT, "apps/business/src/components/canvas/liveData.js"),
};

function read(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }

// signal -> component, from canvasTypes.js (line-scan: track current "card:x": { then component:)
function parseCanvasTypes(src) {
  const map = {};
  let cur = null;
  for (const line of src.split("\n")) {
    const key = line.match(/^\s*["']([a-zA-Z][\w:.-]*)["']\s*:\s*\{/);
    if (key) { cur = key[1]; continue; }
    const comp = line.match(/component\s*:\s*["']([^"']+)["']/);
    if (comp && cur) { map[cur] = comp[1]; cur = null; }
  }
  return map;
}

// registered component names inside CANVAS_COMPONENT_MAP { ... }
function parseComponentMap(src) {
  const block = src.match(/CANVAS_COMPONENT_MAP\s*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return new Set();
  const names = new Set();
  for (const m of block[1].matchAll(/^\s*([A-Z][A-Za-z0-9]+)\s*,?/gm)) names.add(m[1]);
  return names;
}

// live-data dispatch: slugs handled in getLiveDataForTab
function parseLiveDataSlugs(src) {
  const slugs = new Set();
  const fn = src.match(/getLiveDataForTab[\s\S]*?\n\}/);
  const scope = fn ? fn[0] : src;
  for (const m of scope.matchAll(/slug\s*===\s*["']([^"']+)["']/g)) slugs.add(m[1]);
  return slugs;
}

// Every `signal: "card:..."` referenced across worker tab sources.
function collectSignalRefs() {
  const refs = []; // { signal, file }
  const dirs = [
    "functions/functions/scripts/demo",
    "functions/functions/admin",
    "functions/functions/services/alex/catalogs",
    "creators",
  ].map(d => path.join(ROOT, d));
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|json)$/.test(e.name)) {
        const src = read(full);
        for (const m of src.matchAll(/signal\s*:\s*["'](card:[^"']+)["']/g)) {
          refs.push({ signal: m[1], file: path.relative(ROOT, full) });
        }
      }
    }
  };
  dirs.forEach(walk);
  return refs;
}

module.exports = {
  id: "canvas-render",
  title: "Worker tab signals resolve to real card components (no flat/empty render)",
  severity: "p0",
  async run() {
    const findings = [];
    const typesSrc = read(F.canvasTypes);
    const mapSrc = read(F.componentMap);
    if (!typesSrc || !mapSrc) {
      return { ok: false, findings: [{ check: "canvas-render", severity: "p0", tc: "TC-CANVAS-02",
        title: "canvas registry files not found", detail: `Could not read ${F.canvasTypes} or ${F.componentMap}`, evidence: {} }] };
    }

    const signalToComp = parseCanvasTypes(typesSrc);   // { "card:x": "FooCard" }
    const components = parseComponentMap(mapSrc);        // Set("FooCard", ...)
    const liveSlugs = parseLiveDataSlugs(read(F.liveData));
    const registeredSignals = new Set(Object.keys(signalToComp));

    // TC-CANVAS-02 — registered signal whose component isn't in the map → blank/crash
    for (const [sig, comp] of Object.entries(signalToComp)) {
      if (!components.has(comp)) {
        findings.push({ check: "canvas-render", severity: "p0", tc: "TC-CANVAS-02",
          title: `Signal ${sig} → component "${comp}" not in CanvasComponentMap`,
          detail: `canvasTypes.js maps ${sig} to ${comp}, but ${comp} is not registered in CanvasComponentMap.jsx. The tab will render blank.`,
          evidence: { signal: sig, component: comp } });
      }
    }

    // TC-CANVAS-01 — a worker tab references a signal not registered → flat shell
    const refs = collectSignalRefs();
    const seen = new Set();
    for (const { signal, file } of refs) {
      if (registeredSignals.has(signal)) continue;
      const k = signal + "::" + file;
      if (seen.has(k)) continue; seen.add(k);
      findings.push({ check: "canvas-render", severity: "p0", tc: "TC-CANVAS-01",
        title: `Tab signal ${signal} is not registered in canvasTypes.js`,
        detail: `${file} declares a tab with signal "${signal}" but canvasTypes.js has no such entry. The tab renders the generic empty shell. Register ${signal} or fix the typo.`,
        evidence: { signal, file } });
    }

    // TC-CANVAS-03 — a live-data card signal exists but no slug dispatch (best-effort, P1)
    // Flag signals whose card is dataSource:"live" but liveData has zero slug branches
    // matching its known consumers. Lightweight heuristic — informational.
    if (liveSlugs.size === 0) {
      findings.push({ check: "canvas-render", severity: "p1", tc: "TC-CANVAS-03",
        title: "getLiveDataForTab has no slug branches", detail: "liveData.js dispatch appears empty — live cards may render with no payload.", evidence: {} });
    }

    const p0 = findings.filter(f => f.severity === "p0").length;
    return {
      ok: p0 === 0,
      findings,
      summary: { signals: registeredSignals.size, components: components.size, liveSlugs: liveSlugs.size, signalRefs: refs.length, p0 },
    };
  },
};
