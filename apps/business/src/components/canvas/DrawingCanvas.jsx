/**
 * DrawingCanvas.jsx — reusable freehand-ink primitive, ForeFlight-style.
 * Pointer Events (not mouse-only) so a real finger or stylus on an iPad
 * draws exactly like a mouse-drag does here. Screen-space strokes (plain
 * canvas pixels) — this is the right model for a blank notepad (Scratch
 * Pad); it is NOT used for the map's own "Scribble" layer, which is
 * lat/lon-anchored so ink stays pinned to the chart through pan/zoom
 * (see AviationMap.jsx's existing DrawLayer/strokes — a different,
 * already-correct architecture for that specific case).
 *
 * Fully controlled-content, uncontrolled-interaction: strokes live in this
 * component's own state; a parent that wants persistence passes
 * `storageKey` and this component owns loading/saving that key itself.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

const COLORS = [
  { key: "black", value: "#0f172a" },
  { key: "red", value: "#ef4444" },
  { key: "blue", value: "#2563eb" },
  { key: "yellow", value: "#eab308" },
];

function loadStrokes(storageKey) {
  if (!storageKey) return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStrokes(storageKey, strokes) {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(strokes));
  } catch {
    /* ignore quota/serialization errors — not worth surfacing to the pilot */
  }
}

export default function DrawingCanvas({ storageKey, background = "#ffffff", height = "100%" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [strokes, setStrokes] = useState(() => loadStrokes(storageKey));
  const [color, setColor] = useState(COLORS[0].value);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  // Re-load if a different storageKey is mounted into the same component
  // instance (not expected today — each mount point uses a fixed key — but
  // safe rather than silently keeping stale ink if that ever changes).
  useEffect(() => {
    setStrokes(loadStrokes(storageKey));
  }, [storageKey]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      if (!stroke || !stroke.points || stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 3;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes]);

  // Size the backing canvas to its actual rendered box (device-pixel aware)
  // so strokes are crisp and pointer coordinates map 1:1 to canvas pixels.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { saveStrokes(storageKey, strokes); }, [storageKey, strokes]);

  const pointFromEvent = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = { color, points: [pointFromEvent(e)] };
  }, [color, pointFromEvent]);

  const handlePointerMove = useCallback((e) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(pointFromEvent(e));
    // Live-draw the in-progress stroke directly (cheap incremental line
    // segment) rather than re-running the full redraw on every move —
    // keeps a long stroke smooth instead of laggy.
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pts = currentStrokeRef.current.points;
    const n = pts.length;
    if (n < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = currentStrokeRef.current.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(pts[n - 2].x, pts[n - 2].y);
    ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
    ctx.stroke();
  }, []);

  const finishStroke = useCallback(() => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    drawingRef.current = false;
    // 2026-09-09 — live bug ("can scribble but doesn't hold"): capture the
    // completed stroke into a local BEFORE nulling the ref. setStrokes's
    // updater function reads whatever currentStrokeRef.current is at the
    // time React actually invokes it, not at the time setStrokes was
    // called — nulling the ref immediately after used to mean the updater
    // always saw null, so every stroke got recorded as `null` instead of
    // real point data (silently skipped by redraw(), and by saveStrokes
    // faithfully persisting `[null]` to localStorage — the save "worked,"
    // it just never had real data to save).
    const completedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (completedStroke.points.length > 1) {
      setStrokes(prev => [...prev, completedStroke]);
    }
  }, []);

  const undo = useCallback(() => setStrokes(prev => prev.slice(0, -1)), []);
  const clear = useCallback(() => setStrokes([]), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
        {COLORS.map(c => (
          <button
            key={c.key}
            type="button"
            aria-label={`Pen color ${c.key}`}
            title={c.key}
            onClick={() => setColor(c.value)}
            style={{
              width: 24, height: 24, borderRadius: "50%", padding: 0, cursor: "pointer",
              background: c.value,
              border: color === c.value ? "2.5px solid #0f172a" : "1.5px solid #cbd5e1",
              boxShadow: color === c.value ? "0 0 0 2px #fff inset" : "none",
            }}
          />
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={undo}
          disabled={strokes.length === 0}
          style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", color: strokes.length ? "#0f172a" : "#94a3b8", cursor: strokes.length ? "pointer" : "default" }}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={strokes.length === 0}
          style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: strokes.length ? "#b91c1c" : "#94a3b8", cursor: strokes.length ? "pointer" : "default" }}
        >
          Clear
        </button>
      </div>
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, position: "relative", background, touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
          style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair", touchAction: "none" }}
        />
      </div>
    </div>
  );
}
