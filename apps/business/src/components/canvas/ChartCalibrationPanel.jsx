/**
 * ChartCalibrationPanel.jsx — Pixel-picking ground-control-point (GCP)
 * calibration UI for georeferencing an FAA Airport Diagram (or any d-TPP
 * chart) onto the Leaflet map.
 *
 * Flow: pick an airport → pick a chart (defaults to "AIRPORT DIAGRAM") →
 * rasterize its PDF via pdfjs-dist → click 2+ points on the image, each
 * matched to a real runway-threshold lat/lon (from `/v1/aviation:runways`,
 * the same GCP source already proven out by the "▭ Runways" map layer) →
 * solve a similarity transform → hand the georeferenced result (a rasterized
 * PNG data URL plus its three corner lat/lons) up to the parent, which
 * renders it via `L.imageOverlay.rotated` (RotatedImageOverlayLayer in
 * AviationMap.jsx).
 *
 * Click coordinates are read in the canvas's own pixel space (not CSS
 * pixels) — the canvas is rendered at its native raster size (no CSS
 * shrink), inside a scrollable box, so `offsetX/offsetY` need no
 * devicePixelRatio correction and stay exactly consistent with the pixel
 * coordinates baked into the PNG data URL applied to the overlay.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { solveSimilarityTransform } from "./chartGeoreference";

const RENDER_SCALE = 2; // pdf.js render scale — sharper than 1x, still light enough to toDataURL

let _pdfjsPromise = null;
function loadPdfjs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = import("pdfjs-dist").then(async (pdfjsLib) => {
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    });
  }
  return _pdfjsPromise;
}

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Fetched via the shared `apiGet` JSON helper, not a raw binary fetch — the
// Cloudflare Frontdoor's generic proxy corrupts raw binary bodies (see the
// note on handleDtppChartProxy in dtpp.js), so the backend wraps the PDF
// bytes as base64 inside a normal JSON response instead.
async function fetchProxiedPdfBytes(apiGet, chartUrl) {
  const result = await apiGet(`/v1/aviation:dtppChartProxy?url=${encodeURIComponent(chartUrl)}`);
  if (!result.ok || !result.base64) throw new Error(result.error || "chart proxy returned no data");
  return base64ToUint8Array(result.base64);
}

// Flattens FAA runway records into one GCP option per threshold end.
function buildThresholdOptions(icao, runways) {
  const opts = [];
  (runways || []).forEach((r, i) => {
    if (!r.thresholds?.endA || !r.thresholds?.endB) return;
    const legs = r.designator ? r.designator.split("/") : [null, null];
    opts.push({ key: `${icao}-${i}-A`, label: `Rwy ${legs[0] || "?"} threshold`, lat: r.thresholds.endA.lat, lon: r.thresholds.endA.lon });
    opts.push({ key: `${icao}-${i}-B`, label: `Rwy ${legs[1] || "?"} threshold`, lat: r.thresholds.endB.lat, lon: r.thresholds.endB.lon });
  });
  return opts;
}

export default function ChartCalibrationPanel({ defaultIcao, apiGet, existingOverlay, onApply, onClear, onClose }) {
  const [icao, setIcao] = useState((defaultIcao || "").toUpperCase());
  const [icaoInput, setIcaoInput] = useState((defaultIcao || "").toUpperCase());

  const [charts, setCharts] = useState([]);
  const [chartsState, setChartsState] = useState({ loading: false, error: null });
  const [selectedChartUrl, setSelectedChartUrl] = useState(null);

  const [thresholdOptions, setThresholdOptions] = useState([]);
  const [runwaysState, setRunwaysState] = useState({ loading: false, error: null });

  const [pdfState, setPdfState] = useState({ loading: false, error: null, dims: null });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [points, setPoints] = useState([]); // { px, py, thresholdKey, label, lat, lon }
  const [nextThresholdKey, setNextThresholdKey] = useState(null);
  const [fitResult, setFitResult] = useState(null); // { residualsFt } after a successful Apply

  // ── Load chart list + runway GCPs whenever the airport changes ──────────
  useEffect(() => {
    if (!icao) return;
    let cancelled = false;
    setChartsState({ loading: true, error: null });
    setCharts([]);
    setSelectedChartUrl(null);
    setPdfState({ loading: false, error: null, dims: null });
    setPoints([]);
    setFitResult(null);
    apiGet(`/v1/aviation:dtppCharts?icao=${icao}`)
      .then((d) => {
        if (cancelled) return;
        const list = d.charts || [];
        setCharts(list);
        setChartsState({ loading: false, error: list.length ? null : "No charts found for this airport." });
        const diagram = list.find((c) => /airport diagram/i.test(c.name));
        setSelectedChartUrl((diagram || list[0] || {}).url || null);
      })
      .catch((e) => !cancelled && setChartsState({ loading: false, error: e.message }));

    setRunwaysState({ loading: true, error: null });
    apiGet(`/v1/aviation:runways?icao=${icao}`)
      .then((d) => {
        if (cancelled) return;
        const opts = buildThresholdOptions(icao, d.runways);
        setThresholdOptions(opts);
        setNextThresholdKey(opts[0]?.key || null);
        setRunwaysState({ loading: false, error: opts.length ? null : "No runway ground-control-points available for this airport." });
      })
      .catch((e) => !cancelled && setRunwaysState({ loading: false, error: e.message }));

    return () => { cancelled = true; };
  }, [icao, apiGet]);

  // ── Rasterize the selected chart PDF ─────────────────────────────────────
  useEffect(() => {
    if (!selectedChartUrl) return;
    let cancelled = false;
    setPdfState({ loading: true, error: null, dims: null });
    setPoints([]);
    setFitResult(null);

    (async () => {
      try {
        const pdfjsLib = await loadPdfjs();
        const bytes = await fetchProxiedPdfBytes(apiGet, selectedChartUrl);
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setPdfState({ loading: false, error: null, dims: { width: canvas.width, height: canvas.height } });
      } catch (e) {
        if (!cancelled) setPdfState({ loading: false, error: e.message, dims: null });
      }
    })();

    return () => { cancelled = true; };
  }, [selectedChartUrl, apiGet]);

  const handleCanvasClick = useCallback((e) => {
    if (!pdfState.dims || !nextThresholdKey) return;
    const opt = thresholdOptions.find((o) => o.key === nextThresholdKey);
    if (!opt) return;
    const px = e.nativeEvent.offsetX;
    const py = e.nativeEvent.offsetY;
    setPoints((prev) => [...prev, { px, py, thresholdKey: opt.key, label: opt.label, lat: opt.lat, lon: opt.lon }]);
    // Advance the "next click" picker to the first not-yet-used threshold, if any.
    const used = new Set([...points.map((p) => p.thresholdKey), opt.key]);
    const remaining = thresholdOptions.find((o) => !used.has(o.key));
    setNextThresholdKey(remaining ? remaining.key : opt.key);
  }, [pdfState.dims, nextThresholdKey, thresholdOptions, points]);

  const removePoint = (idx) => setPoints((prev) => prev.filter((_, i) => i !== idx));

  const canApply = points.length >= 2 && pdfState.dims;

  const handleApply = () => {
    if (!canApply) return;
    try {
      const { fn, residualsM } = solveSimilarityTransform(points.map((p) => ({ px: p.px, py: p.py, lat: p.lat, lon: p.lon })));
      const { width, height } = pdfState.dims;
      const topLeft = fn(0, 0);
      const topRight = fn(width, 0);
      const bottomLeft = fn(0, height);
      const imageUrl = canvasRef.current.toDataURL("image/png");
      const residualsFt = residualsM.map((m) => m * 3.28084);
      setFitResult({ residualsFt });
      onApply({ icao, imageUrl, topLeft, topRight, bottomLeft, residualsFt, pointCount: points.length });
    } catch (e) {
      setFitResult({ error: e.message });
    }
  };

  return (
    <div style={{
      position: "absolute", top: 8, right: 8, bottom: 8, zIndex: 2000,
      width: 480, maxWidth: "calc(100% - 16px)",
      background: "rgba(15,23,42,0.97)", border: "1px solid #334155", borderRadius: 10,
      display: "flex", flexDirection: "column",
      boxShadow: "0 4px 16px rgba(0,0,0,0.5)", color: "#e2e8f0", fontSize: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid #334155" }}>
        <strong style={{ color: "#c084fc" }}>🗺 Diagram calibration</strong>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, minHeight: 0 }}>
        {/* Airport picker */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: "#94a3b8" }}>ICAO</span>
          <input
            value={icaoInput}
            onChange={(e) => setIcaoInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") setIcao(icaoInput.trim()); }}
            style={{ width: 70, background: "#0c1524", border: "1px solid #334155", borderRadius: 4, color: "#e2e8f0", padding: "3px 6px", fontFamily: "monospace" }}
          />
          <button
            onClick={() => setIcao(icaoInput.trim())}
            style={{ padding: "3px 8px", border: "1px solid #475569", borderRadius: 4, background: "#0c2235", color: "#60a5fa", cursor: "pointer" }}
          >Load</button>
        </div>

        {/* Chart picker */}
        {charts.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#94a3b8", flexShrink: 0 }}>Chart</span>
            <select
              value={selectedChartUrl || ""}
              onChange={(e) => setSelectedChartUrl(e.target.value)}
              style={{ flex: 1, background: "#0c1524", border: "1px solid #334155", borderRadius: 4, color: "#e2e8f0", padding: "3px 6px", minWidth: 0 }}
            >
              {charts.map((c) => <option key={c.url} value={c.url}>{c.name}</option>)}
            </select>
          </div>
        )}
        {chartsState.loading && <span style={{ color: "#94a3b8" }}>Loading chart list…</span>}
        {chartsState.error && <span style={{ color: "#f87171" }}>{chartsState.error}</span>}
        {runwaysState.error && <span style={{ color: "#f87171" }}>{runwaysState.error}</span>}

        {/* Next-click threshold picker */}
        {thresholdOptions.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#94a3b8", flexShrink: 0 }}>Next click =</span>
            <select
              value={nextThresholdKey || ""}
              onChange={(e) => setNextThresholdKey(e.target.value)}
              style={{ flex: 1, background: "#0c1524", border: "1px solid #fbbf24", borderRadius: 4, color: "#fde68a", padding: "3px 6px", minWidth: 0 }}
            >
              {thresholdOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}

        {/* Rasterized chart, click-to-pin */}
        <div
          ref={containerRef}
          style={{ position: "relative", overflow: "auto", border: "1px solid #334155", borderRadius: 6, height: 320, background: "#0c1524" }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ display: pdfState.dims ? "block" : "none", cursor: nextThresholdKey ? "crosshair" : "default" }}
          />
          {pdfState.dims && points.map((p, i) => (
            <div key={i} title={p.label} style={{
              position: "absolute", left: p.px - 6, top: p.py - 6, width: 12, height: 12,
              borderRadius: "50%", background: "#fbbf24", border: "2px solid #0f172a",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 700, color: "#0f172a", pointerEvents: "none",
            }}>{i + 1}</div>
          ))}
          {pdfState.loading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Rendering chart…</div>}
          {pdfState.error && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", padding: 10, textAlign: "center" }}>{pdfState.error}</div>}
        </div>

        {/* Placed points list */}
        {points.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {points.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fbbf24", color: "#0f172a", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{p.label} — px ({p.px.toFixed(0)}, {p.py.toFixed(0)})</span>
                <button onClick={() => removePoint(i)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Fit result */}
        {fitResult?.residualsFt && (
          <div style={{ fontSize: 11, color: Math.max(...fitResult.residualsFt) > 60 ? "#f87171" : "#34d399" }}>
            Fit residual{fitResult.residualsFt.length > 1 ? "s" : ""}: {fitResult.residualsFt.map((f) => `${f.toFixed(0)}ft`).join(", ")}
            {Math.max(...fitResult.residualsFt) > 60 ? " — check your point placements" : " — looks good"}
          </div>
        )}
        {fitResult?.error && <div style={{ color: "#f87171", fontSize: 11 }}>{fitResult.error}</div>}

        <div style={{ fontSize: 10, color: "#64748b" }}>
          Click at least 2 runway thresholds on the diagram, matching each to the real threshold selected above. More points (different runways) give a better fit.
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid #334155" }}>
        <button
          onClick={handleApply}
          disabled={!canApply}
          style={{ flex: 1, padding: "6px 10px", border: "1px solid #4ade80", borderRadius: 6, background: canApply ? "#0d2818" : "#0c1524", color: canApply ? "#4ade80" : "#475569", cursor: canApply ? "pointer" : "default", fontWeight: 600 }}
        >Compute &amp; apply overlay</button>
        {existingOverlay && (
          <button onClick={onClear} style={{ padding: "6px 10px", border: "1px solid #475569", borderRadius: 6, background: "#0c1524", color: "#94a3b8", cursor: "pointer" }}>Clear overlay</button>
        )}
      </div>
    </div>
  );
}
