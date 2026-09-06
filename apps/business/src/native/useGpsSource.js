/**
 * useGpsSource.js — unified GPS position hook for the aviation cockpit view
 * and backup instrument mode (CODEX 64 GPS strip: "🟢 SENTRY · 8 sats ·
 * 12ft accuracy" / "🟡 SENTRY · searching…" / "🔴 NO GPS · map only —
 * position not available").
 *
 * Source priority:
 *   1. Paired BLE GPS puck (bleGps.js) — the CODEX 64-mandated primary
 *      source, since most kneeboard iPads are Wi-Fi-only with no GPS chip.
 *   2. Background geolocation (backgroundGps.js) — device GPS chip, only
 *      present on cellular-model iPads or Android. Used only when no puck
 *      is paired, so it never silently overrides a connected puck's fix.
 *   3. None — status "none", no position. The map still renders; there is
 *      simply no position dot, exactly per spec ("NO GPS · map only").
 *
 * On a plain web build (dev server, no Capacitor native shell), both
 * sources reject immediately — status stays "none" the whole time, which
 * is the correct, honest behavior for a browser tab with no BLE/CoreLocation
 * background access.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { scanForDevices, connectAndStream, isBleSupportEnvironment } from "./bleGps";
import { startBackgroundTracking, stopBackgroundTracking } from "./backgroundGps";

const STALE_MS = 5000; // no fix in 5s → drop back to "searching"

export default function useGpsSource({ autoStartDeviceGps = true } = {}) {
  const [fix, setFix] = useState(null); // last fix from whichever source is active
  const [source, setSource] = useState("none"); // "ble" | "device" | "none"
  const [bleDeviceName, setBleDeviceName] = useState(null);
  const [bleConnecting, setBleConnecting] = useState(false);
  const [bleError, setBleError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const bleHandleRef = useRef(null);
  const staleTimerRef = useRef(null);

  const applyFix = useCallback((newFix, src) => {
    setFix(newFix);
    setSource(src);
    clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => {
      // No new fix in STALE_MS — signal "searching" without discarding the
      // last known position (still useful context, just marked stale).
      setFix((prev) => (prev ? { ...prev, stale: true } : prev));
    }, STALE_MS);
  }, []);

  // Device GPS fallback — only runs if no BLE puck is connected.
  useEffect(() => {
    if (!autoStartDeviceGps || bleHandleRef.current) return undefined;
    let cancelled = false;
    startBackgroundTracking(
      (loc) => { if (!cancelled && !bleHandleRef.current) applyFix(loc, "device"); },
      () => { /* device has no GPS chip / permission denied — stay "none" */ }
    ).catch(() => { /* web build or plugin unavailable — expected, stay "none" */ });
    return () => { cancelled = true; };
  }, [autoStartDeviceGps, applyFix]);

  useEffect(() => () => {
    clearTimeout(staleTimerRef.current);
    stopBackgroundTracking();
    bleHandleRef.current?.disconnect?.();
  }, []);

  const scan = useCallback(async () => {
    setBleError(null);
    setScanning(true);
    try {
      const found = await scanForDevices({ timeoutMs: 8000 });
      setDevices(found);
    } catch (e) {
      setBleError(isBleSupportEnvironment() ? (e.message || "Scan failed") : "Bluetooth pairing requires the native app (not available in a browser tab).");
    } finally {
      setScanning(false);
    }
  }, []);

  const connect = useCallback(async (deviceId, deviceName) => {
    setBleConnecting(true);
    setBleError(null);
    try {
      // Stop device GPS while a puck takes over — avoids two sources
      // fighting over `fix` and makes the strip's source label unambiguous.
      await stopBackgroundTracking();
      const handle = await connectAndStream(
        deviceId,
        (loc) => applyFix(loc, "ble"),
        { onDisconnect: () => { bleHandleRef.current = null; setBleDeviceName(null); setSource("none"); } }
      );
      bleHandleRef.current = handle;
      setBleDeviceName(deviceName || "GPS device");
    } catch (e) {
      setBleError(e.message || "Connect failed");
    } finally {
      setBleConnecting(false);
    }
  }, [applyFix]);

  const disconnectBle = useCallback(async () => {
    await bleHandleRef.current?.disconnect?.();
    bleHandleRef.current = null;
    setBleDeviceName(null);
    setSource("none");
    setFix(null);
  }, []);

  // Status derivation per CODEX 64's exact three states.
  let status = "none";
  if (source === "ble" || source === "device") {
    status = fix && !fix.stale && fix.lat != null ? "connected" : "searching";
  }

  return {
    status,           // "connected" | "searching" | "none"
    source,           // "ble" | "device" | "none"
    fix,              // { lat, lon, altitudeFt, groundspeedKts, trackDeg, accuracyFt, satellites?, stale? }
    bleDeviceName,
    bleConnecting,
    bleError,
    scanning,
    devices,
    scan,
    connect,
    disconnectBle,
  };
}
