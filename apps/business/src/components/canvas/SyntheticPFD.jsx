/**
 * SyntheticPFD.jsx — Device-sensor-based backup flight display.
 * Attitude from DeviceOrientationEvent. Speed/alt/heading from GPS.
 * Independent of aircraft avionics — that independence IS the value.
 *
 * ⚠ NOT A CERTIFIED INSTRUMENT. For backup reference only.
 * Verify against aircraft instruments and printed QRH/AFM at all times.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

const DISCLAIMER = "⚠ NOT A CERTIFIED INSTRUMENT — FOR BACKUP REFERENCE ONLY. Verify against aircraft instruments.";

// Convert m/s → knots, meters → feet
const msToKt = v => (v != null ? v * 1.94384 : null);
const mToFt  = v => (v != null ? v * 3.28084 : null);
const ftPerMin = (prev, curr, dt) => prev != null && curr != null && dt > 0
  ? ((curr - prev) / dt) * 60 : 0;

// Draw the circular attitude indicator on a canvas element
function drawAI(canvas, pitch, bank) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(cx, cy) * 0.92;
  const PPD = R / 22; // pixels per degree of pitch

  ctx.clearRect(0, 0, W, H);

  // ── Clip to circle ─────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // ── Rotate canvas for bank ─────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-bank * Math.PI / 180);
  ctx.translate(-cx, -cy);

  const horizonY = cy + pitch * PPD;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, horizonY - R, 0, horizonY);
  skyGrad.addColorStop(0, "#0c1e3c");
  skyGrad.addColorStop(1, "#1a4a7a");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(cx - R, cy - R * 2, R * 2, R * 2 + (horizonY - cy));

  // Ground gradient
  const gndGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY + R);
  gndGrad.addColorStop(0, "#5c2e00");
  gndGrad.addColorStop(1, "#3a1a00");
  ctx.fillStyle = gndGrad;
  ctx.fillRect(cx - R, horizonY, R * 2, R * 2);

  // Horizon line
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - R, horizonY);
  ctx.lineTo(cx + R, horizonY);
  ctx.stroke();

  // Pitch ladder
  ctx.font = `bold ${Math.round(PPD * 0.9)}px monospace`;
  ctx.textBaseline = "middle";
  for (let deg = -40; deg <= 40; deg += 5) {
    if (deg === 0) continue;
    const y = horizonY - deg * PPD;
    const big = deg % 10 === 0;
    const lw = big ? R * 0.38 : R * 0.22;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = big ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx - lw / 2, y);
    ctx.lineTo(cx + lw / 2, y);
    ctx.stroke();
    if (big) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.abs(deg)), cx - lw / 2 - 5, y);
      ctx.textAlign = "left";
      ctx.fillText(String(Math.abs(deg)), cx + lw / 2 + 5, y);
    }
  }

  ctx.restore(); // undo bank rotation

  // ── Bank arc & ticks ───────────────────────────────────
  const arcR = R * 0.87;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, arcR, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();

  for (const [deg, w] of [[10,6],[20,6],[30,9],[45,6],[60,6]]) {
    for (const s of [-1, 1]) {
      const a = (s * deg - 90) * Math.PI / 180;
      const r1 = arcR - w;
      const r2 = arcR;
      ctx.lineWidth = deg === 30 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
      ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
      ctx.stroke();
    }
  }

  // Bank pointer triangle
  const bRad = (-bank - 90) * Math.PI / 180;
  const tR = arcR - 3;
  const perp = bRad + Math.PI / 2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(cx + tR * Math.cos(bRad), cy + tR * Math.sin(bRad));
  ctx.lineTo(cx + (tR - 10) * Math.cos(bRad) + 5 * Math.cos(perp),
             cy + (tR - 10) * Math.sin(bRad) + 5 * Math.sin(perp));
  ctx.lineTo(cx + (tR - 10) * Math.cos(bRad) - 5 * Math.cos(perp),
             cy + (tR - 10) * Math.sin(bRad) - 5 * Math.sin(perp));
  ctx.closePath();
  ctx.fill();

  // ── Fixed aircraft symbol ──────────────────────────────
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  // Left wing
  ctx.beginPath();
  ctx.moveTo(cx - R * 0.48, cy);
  ctx.lineTo(cx - R * 0.14, cy);
  ctx.stroke();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(cx + R * 0.14, cy);
  ctx.lineTo(cx + R * 0.48, cy);
  ctx.stroke();
  // Center
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // end clip

  // ── Circle border ──────────────────────────────────────
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
}

// ── Tape component (speed or altitude) ──────────────────────────────────────
function Tape({ value, label, unit, range = 200, step = 10, color = "#22d3ee", isAlt = false }) {
  const canvasRef = useRef(null);
  const H = 280, W = 80;
  const PPU = H / range; // pixels per unit

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    const v = value ?? 0;
    const cy = H / 2;

    // Background
    ctx.fillStyle = "rgba(10,15,30,0.92)";
    ctx.fillRect(0, 0, W, H);

    // Tick marks and labels
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = isAlt ? "left" : "right";

    const lo = v - range / 2 - step;
    const hi = v + range / 2 + step;
    for (let val = Math.floor(lo / step) * step; val <= hi; val += step) {
      const y = cy - (val - v) * PPU;
      if (y < -10 || y > H + 10) continue;
      const big = val % (step * 2) === 0;
      const tickW = big ? 14 : 7;
      ctx.lineWidth = big ? 1.5 : 0.8;
      if (isAlt) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(tickW, y);
        ctx.stroke();
        if (big) ctx.fillText(Math.round(val), tickW + 3, y + 4);
      } else {
        ctx.beginPath();
        ctx.moveTo(W, y);
        ctx.lineTo(W - tickW, y);
        ctx.stroke();
        if (big && val >= 0) ctx.fillText(Math.round(val), W - tickW - 4, y + 4);
      }
    }

    // Center indicator box
    const boxW = isAlt ? 66 : 56;
    const boxX = isAlt ? W - boxW : 0;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(boxX, cy - 14, boxW, 28);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, cy - 14, boxW, 28);
    ctx.fillStyle = color;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(value != null ? Math.round(value) : "---", boxX + boxW / 2, cy + 5);

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(unit, W / 2, isAlt ? 10 : H - 5);
  }, [value, range, step, color, isAlt]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, fontFamily: "monospace" }}>{label}</div>
      <canvas ref={canvasRef} width={W} height={H} style={{ display: "block" }} />
    </div>
  );
}

// ── Heading bar ──────────────────────────────────────────────────────────────
function HeadingBar({ heading }) {
  const W = 340, H = 40;
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(10,15,30,0.92)";
    ctx.fillRect(0, 0, W, H);

    const hdg = heading ?? 0;
    const PPD = W / 60; // pixels per degree, show ±30°

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";

    const COMPASS = { 0:"N", 45:"NE", 90:"E", 135:"SE", 180:"S", 225:"SW", 270:"W", 315:"NW" };
    for (let d = -35; d <= 35; d++) {
      const deg = ((hdg + d) % 360 + 360) % 360;
      const x = W / 2 + d * PPD;
      const big = deg % 10 === 0;
      const cardinal = COMPASS[deg];
      const tickH = cardinal ? 14 : big ? 10 : 5;
      ctx.lineWidth = cardinal ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x, H - tickH);
      ctx.stroke();
      if (cardinal || (big && !cardinal)) {
        ctx.fillStyle = cardinal ? "#a78bfa" : "rgba(255,255,255,0.7)";
        ctx.fillText(cardinal || deg, x, H - tickH - 3);
      }
    }

    // Center triangle / lubber line
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(W / 2, H);
    ctx.lineTo(W / 2 - 6, H - 10);
    ctx.lineTo(W / 2 + 6, H - 10);
    ctx.closePath();
    ctx.fill();

    // Heading readout
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(W / 2 - 22, 0, 44, 18);
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 22, 0, 44, 18);
    ctx.fillStyle = "#a78bfa";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(heading != null ? String(Math.round(heading)).padStart(3, "0") + "°" : "---", W / 2, 13);
  }, [heading]);

  return <canvas ref={canvasRef} width={W} height={H} style={{ display: "block" }} />;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SyntheticPFD() {
  const aiCanvasRef = useRef(null);
  const [attitude, setAttitude] = useState({ pitch: 0, bank: 0, permissionDenied: false, active: false });
  const [gps, setGps] = useState({ speed: null, altitude: null, heading: null, accuracy: null, lastAlt: null, vsi: 0 });
  const [status, setStatus] = useState("idle"); // idle | requesting | active | denied | nosensor
  const gpsWatchRef = useRef(null);
  const lastAltRef = useRef({ alt: null, time: null });

  // Draw AI whenever attitude changes
  useEffect(() => {
    const canvas = aiCanvasRef.current;
    if (!canvas) return;
    drawAI(canvas, attitude.pitch, attitude.bank);
  }, [attitude.pitch, attitude.bank]);

  // Request device orientation (iOS 13+ requires explicit permission)
  const requestSensors = useCallback(async () => {
    setStatus("requesting");

    // Geolocation
    if (navigator.geolocation) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { speed, altitude, heading, accuracy } = pos.coords;
          const now = Date.now();
          const kt = msToKt(speed);
          const ft = mToFt(altitude);

          // VSI from altitude delta
          let vsi = 0;
          if (lastAltRef.current.alt != null && lastAltRef.current.time != null) {
            const dt = (now - lastAltRef.current.time) / 1000;
            vsi = ftPerMin(lastAltRef.current.alt, ft, dt);
          }
          lastAltRef.current = { alt: ft, time: now };

          setGps({ speed: kt, altitude: ft, heading: heading ?? null, accuracy, vsi });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    }

    // Device orientation (attitude)
    if (typeof DeviceOrientationEvent === "undefined") {
      setStatus("nosensor");
      setAttitude(a => ({ ...a, active: false }));
      return;
    }

    // iOS 13+ requires requestPermission
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return;
        }
      } catch {
        setStatus("denied");
        return;
      }
    }

    window.addEventListener("deviceorientation", handleOrientation);
    setStatus("active");
    setAttitude(a => ({ ...a, active: true }));
  }, []);

  const handleOrientation = useCallback((evt) => {
    // beta = pitch (device tilt forward/back), gamma = roll (left/right)
    // When iPad mounted flat in portrait: beta ~= 0 when level, gamma ~= 0 when level
    // Adjust for landscape mounting by swapping beta/gamma if needed
    const rawPitch = evt.beta  ?? 0; // -180 to 180
    const rawBank  = evt.gamma ?? 0; // -90 to 90
    // Clamp pitch display to ±30 for readability
    setAttitude(a => ({
      ...a,
      pitch: Math.max(-30, Math.min(30, rawPitch)),
      bank:  Math.max(-60, Math.min(60, rawBank)),
    }));
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current);
    };
  }, []);

  const aiSize = 280;

  return (
    <div style={{ background: "#050a14", borderRadius: 12, overflow: "hidden", fontFamily: "monospace" }}>
      {/* Disclaimer — always visible, always first */}
      <div style={{
        background: "#7f1d1d", color: "#fca5a5", padding: "6px 14px",
        fontSize: 11, fontWeight: 700, textAlign: "center", letterSpacing: 0.5,
      }}>
        {DISCLAIMER}
      </div>

      {status === "idle" && (
        <div style={{ padding: 32, textAlign: "center" }}>
          <div style={{ color: "#94a3b8", marginBottom: 16, fontSize: 13 }}>
            Synthetic PFD uses your device's GPS and motion sensors — independent of aircraft avionics.
            This is your backup path if the panel goes dark.
          </div>
          <button
            onClick={requestSensors}
            style={{
              background: "#1e3a5f", color: "#60a5fa", border: "1.5px solid #2563eb",
              borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Activate Synthetic PFD
          </button>
          <div style={{ color: "#475569", fontSize: 10, marginTop: 10 }}>
            iOS: requires motion sensor permission · Android: works directly
          </div>
        </div>
      )}

      {status === "requesting" && (
        <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
          Requesting sensor access…
        </div>
      )}

      {status === "denied" && (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ color: "#f87171", marginBottom: 8, fontSize: 13 }}>Motion sensor permission denied.</div>
          <div style={{ color: "#64748b", fontSize: 11 }}>Enable in iOS Settings → Safari → Motion &amp; Orientation Access, then reload.</div>
          <div style={{ color: "#475569", fontSize: 10, marginTop: 12 }}>GPS speed and altitude still available without motion access.</div>
          <button onClick={requestSensors} style={{ marginTop: 12, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}

      {status === "nosensor" && (
        <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
          Motion sensors not available on this device. GPS data still active.
        </div>
      )}

      {(status === "active" || status === "nosensor") && (
        <div>
          {/* Main instrument cluster */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 8px 6px" }}>
            {/* Speed tape */}
            <Tape value={gps.speed} label="KIAS" unit="KT" range={120} step={10} color="#22c55e" isAlt={false} />

            {/* Attitude indicator */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <canvas
                ref={aiCanvasRef}
                width={aiSize}
                height={aiSize}
                style={{ display: "block", borderRadius: "50%", boxShadow: "0 0 20px rgba(0,0,0,0.8)" }}
              />
              {/* VSI */}
              <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#64748b" }}>
                <span>PITCH <span style={{ color: "#f1f5f9" }}>{attitude.pitch > 0 ? "+" : ""}{Math.round(attitude.pitch)}°</span></span>
                <span>BANK <span style={{ color: "#f1f5f9" }}>{Math.round(attitude.bank)}°</span></span>
                <span>VSI <span style={{ color: gps.vsi > 0 ? "#22c55e" : gps.vsi < -200 ? "#ef4444" : "#f1f5f9" }}>
                  {gps.vsi > 0 ? "+" : ""}{Math.round(gps.vsi)} fpm
                </span></span>
              </div>
            </div>

            {/* Altitude tape */}
            <Tape value={gps.altitude} label="ALT" unit="FT" range={2000} step={100} color="#22d3ee" isAlt={true} />
          </div>

          {/* Heading bar */}
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
            <HeadingBar heading={gps.heading} />
          </div>

          {/* GPS status footer */}
          <div style={{
            display: "flex", gap: 16, justifyContent: "center",
            padding: "6px 12px 10px", fontSize: 10, color: "#475569",
          }}>
            <span>SRC: GPS</span>
            {gps.accuracy != null && <span>ACC: ±{Math.round(gps.accuracy)}m</span>}
            <span style={{ color: "#fbbf24" }}>ATTITUDE: DEVICE SENSORS</span>
            <span style={{ color: "#ef4444" }}>NOT CERTIFIED</span>
          </div>
        </div>
      )}
    </div>
  );
}
