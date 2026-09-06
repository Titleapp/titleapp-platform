/**
 * bleGps.js — BLE pairing + NMEA streaming for an external GPS puck
 * (Sentry, Bad Elf, Dual XGPS, or any NMEA-over-BLE device), per CODEX 64
 * ("GPS Chip — Sentry (or equivalent) Required, Not Device GPS").
 *
 * Uses @capacitor-community/bluetooth-le (real, maintained, v8) — works
 * only inside a native iOS/Android Capacitor shell. On web (`npm run dev`,
 * a browser tab) every call here rejects immediately; callers must treat
 * that as "no BLE available here," not a bug.
 *
 * ── HONESTY NOTE — read before wiring a specific pilot's hardware ──────────
 * Sentry/Bad Elf/Dual XGPS do not publish a single agreed-upon GATT service
 * UUID the way heart-rate monitors or generic BLE peripherals do — each
 * vendor uses its own proprietary service. I do not have a verified,
 * citable public source for Sentry's exact service/characteristic UUIDs to
 * hard-code with confidence, and hard-coding a *guessed* UUID would be
 * worse than not hard-coding one: it would silently fail to find real data
 * on real hardware while looking "done."
 *
 * So this file takes the honest fallback path the task explicitly allows:
 *   1. Scan for nearby BLE peripherals (no service filter — cast a wide net;
 *      most GPS pucks don't advertise a scan-response service UUID anyway).
 *   2. On connect, enumerate ALL services/characteristics on the device and
 *      look for a characteristic with the `notify` property under the
 *      well-known "Nordic UART Service" (NUS) UUID first — a widely reused
 *      pattern for serial-over-BLE devices, including several GPS pucks —
 *      and if that's not present, fall back to the FIRST notify-capable
 *      characteristic found on ANY service. This is a heuristic, not a
 *      confirmed spec match for any specific puck.
 *   3. Feed whatever bytes arrive into the NMEA stream parser (nmea.js),
 *      which IS a verified public standard — so once the right
 *      characteristic is found, sentence parsing is correct regardless of
 *      vendor.
 *
 * REAL HARDWARE IS REQUIRED to confirm which characteristic actually
 * carries a given puck's NMEA stream. If the generic notify characteristic
 * emits binary (not ASCII NMEA) data on a specific device, that means the
 * device uses a proprietary binary protocol instead of a raw NMEA passthrough
 * — a real per-device follow-up, not something this file can resolve without
 * that device in hand.
 */

import { NmeaStreamParser } from "./nmea";

// Nordic UART Service — a de facto standard for BLE-serial passthrough,
// reused by many aftermarket BLE-NMEA devices. Tried first as a shortcut;
// NOT confirmed specifically for Sentry/Bad Elf/Dual — see note above.
const NORDIC_UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_RX_CHAR = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify (device → app)

let BleClientMod = null;
async function getBleClient() {
  if (BleClientMod) return BleClientMod;
  try {
    const mod = await import("@capacitor-community/bluetooth-le");
    BleClientMod = mod.BleClient;
    return BleClientMod;
  } catch {
    throw new Error("bluetooth-le plugin not available (web build, or native platform not synced)");
  }
}

export function isBleSupportEnvironment() {
  // Only meaningful signal without actually calling into the plugin: are we
  // running inside a Capacitor native shell at all? BLE simply isn't
  // available in a plain browser tab regardless of plugin presence.
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch {
    return false;
  }
}

let initialized = false;
async function ensureInit() {
  const BleClient = await getBleClient();
  if (!initialized) {
    await BleClient.initialize({ androidNeverForLocation: true });
    initialized = true;
  }
  return BleClient;
}

/**
 * Scan for nearby BLE devices for a fixed window. Returns a de-duped list of
 * { deviceId, name, rssi }. Devices whose advertised name matches a known
 * GPS-puck naming convention are flagged `likelyGps: true` for UI sorting —
 * purely a display heuristic, not a filter (unnamed/unmatched devices still
 * show up, since plenty of real pucks advertise a generic/blank name).
 */
export async function scanForDevices({ timeoutMs = 8000 } = {}) {
  const BleClient = await ensureInit();
  const found = new Map();
  await BleClient.requestLEScan({}, (result) => {
    const name = result.device?.name || result.localName || "";
    found.set(result.device.deviceId, {
      deviceId: result.device.deviceId,
      name: name || "(unnamed device)",
      rssi: result.rssi ?? null,
      likelyGps: /sentry|bad ?elf|dual|xgps|gdl|stratus/i.test(name),
    });
  });
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await BleClient.stopLEScan();
  return [...found.values()].sort((a, b) => (b.likelyGps - a.likelyGps) || (b.rssi ?? -999) - (a.rssi ?? -999));
}

/**
 * Connect to a device, discover its NMEA notify characteristic (Nordic UART
 * first, then any notify characteristic found), and stream parsed fixes to
 * onFix. Returns a handle with .disconnect().
 */
export async function connectAndStream(deviceId, onFix, { onDisconnect } = {}) {
  const BleClient = await ensureInit();
  await BleClient.connect(deviceId, () => onDisconnect?.());

  const services = await BleClient.getServices(deviceId);
  let target = null;

  const nordic = services.find((s) => s.uuid.toLowerCase() === NORDIC_UART_SERVICE);
  if (nordic?.characteristics?.some((c) => c.uuid.toLowerCase() === NORDIC_UART_RX_CHAR)) {
    target = { service: NORDIC_UART_SERVICE, characteristic: NORDIC_UART_RX_CHAR };
  }
  if (!target) {
    for (const svc of services) {
      const notifyChar = (svc.characteristics || []).find((c) => c.properties?.notify);
      if (notifyChar) { target = { service: svc.uuid, characteristic: notifyChar.uuid }; break; }
    }
  }

  if (!target) {
    await BleClient.disconnect(deviceId).catch(() => {});
    throw new Error("No notify-capable characteristic found on this device — cannot confirm it streams NMEA data.");
  }

  const parser = new NmeaStreamParser(onFix);
  const decoder = new TextDecoder("ascii");
  await BleClient.startNotifications(deviceId, target.service, target.characteristic, (value) => {
    // `value` is a DataView of raw bytes for this notification packet.
    try {
      parser.push(decoder.decode(value.buffer));
    } catch { /* malformed packet — drop, wait for next */ }
  });

  return {
    usedService: target.service,
    usedCharacteristic: target.characteristic,
    usedKnownProfile: target.service === NORDIC_UART_SERVICE,
    async disconnect() {
      try { await BleClient.stopNotifications(deviceId, target.service, target.characteristic); } catch { /* ignore */ }
      try { await BleClient.disconnect(deviceId); } catch { /* ignore */ }
    },
  };
}
