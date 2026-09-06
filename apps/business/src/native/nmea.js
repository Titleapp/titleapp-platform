/**
 * nmea.js — NMEA-0183 sentence parsing for external GPS pucks (Sentry, Bad
 * Elf, Dual XGPS, etc.) delivered as ASCII text over a BLE serial-style
 * characteristic.
 *
 * This is the vendor-NEUTRAL part of the GPS puck integration: NMEA-0183 is
 * a public, standardized text protocol (not a vendor secret), so GGA/RMC
 * parsing here is correct regardless of which puck is connected. What is
 * NOT vendor-neutral — and NOT implemented with verified confidence — is
 * which exact BLE GATT service/characteristic UUID a given puck (Sentry,
 * Bad Elf, Dual) exposes its NMEA stream on. See bleGps.js for the honest
 * accounting of that gap.
 *
 * Sentence types handled:
 *   $--GGA — fix data: lat/lon, fix quality, satellite count, altitude, HDOP
 *   $--RMC — recommended minimum: lat/lon, ground speed, track, validity
 * (talker ID "--" varies: GP, GN, GL, GA depending on constellation.)
 */

// NMEA checksum is XOR of all bytes between "$" and "*". Returns true if the
// sentence is well-formed AND the checksum matches (protects against a torn
// BLE packet mid-sentence, which is common over unreliable serial-over-BLE).
export function verifyChecksum(sentence) {
  const m = /^\$([^*]*)\*([0-9A-Fa-f]{2})\s*$/.exec(sentence.trim());
  if (!m) return false;
  const [, body, hex] = m;
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum ^= body.charCodeAt(i);
  return sum === parseInt(hex, 16);
}

// "4916.45,N" → 49.27417 (decimal degrees). NMEA lat/lon is DDMM.MMMM /
// DDDMM.MMMM (degrees + decimal minutes), not decimal degrees.
function toDecimalDegrees(raw, hemisphere, lonMode) {
  if (!raw) return null;
  const degLen = lonMode ? 3 : 2;
  const deg = parseFloat(raw.slice(0, degLen));
  const min = parseFloat(raw.slice(degLen));
  if (Number.isNaN(deg) || Number.isNaN(min)) return null;
  let dd = deg + min / 60;
  if (hemisphere === "S" || hemisphere === "W") dd = -dd;
  return dd;
}

const FIX_QUALITY = {
  0: "none",
  1: "gps",
  2: "dgps",
  4: "rtk-fixed",
  5: "rtk-float",
  6: "estimated",
};

/**
 * Parse a single $--GGA sentence.
 * Returns null if not a GGA sentence or checksum fails.
 */
export function parseGGA(line) {
  if (!line || !/^\$G[A-Z]GGA/.test(line.trim())) return null;
  if (!verifyChecksum(line)) return null;
  const body = line.trim().split("*")[0];
  const f = body.split(",");
  // $GPGGA,time,lat,N,lon,W,fixQuality,numSats,hdop,alt,M,geoidSep,M,,*cs
  const lat = toDecimalDegrees(f[2], f[3], false);
  const lon = toDecimalDegrees(f[4], f[5], true);
  const fixQuality = f[6] !== "" ? parseInt(f[6], 10) : 0;
  const satellites = f[7] !== "" ? parseInt(f[7], 10) : null;
  const hdop = f[8] !== "" ? parseFloat(f[8]) : null;
  const altitudeM = f[9] !== "" ? parseFloat(f[9]) : null;
  if (lat == null || lon == null) return null;
  return {
    type: "gga",
    lat,
    lon,
    fixQuality,
    fixQualityLabel: FIX_QUALITY[fixQuality] || "unknown",
    satellites,
    hdop,
    altitudeM,
    altitudeFt: altitudeM != null ? altitudeM * 3.28084 : null,
    // Rough accuracy estimate from HDOP × typical GPS UERE (~5m) — a
    // standard, published approximation, not the puck's own vendor-reported
    // accuracy figure (most NMEA pucks don't transmit that separately).
    estimatedAccuracyFt: hdop != null ? hdop * 5 * 3.28084 : null,
  };
}

/**
 * Parse a single $--RMC sentence.
 * Returns null if not an RMC sentence, checksum fails, or fix is invalid (V).
 */
export function parseRMC(line) {
  if (!line || !/^\$G[A-Z]RMC/.test(line.trim())) return null;
  if (!verifyChecksum(line)) return null;
  const body = line.trim().split("*")[0];
  const f = body.split(",");
  // $GPRMC,time,status,lat,N,lon,W,speedKt,track,date,...*cs
  const status = f[2];
  const lat = toDecimalDegrees(f[3], f[4], false);
  const lon = toDecimalDegrees(f[5], f[6], true);
  const speedKt = f[7] !== "" ? parseFloat(f[7]) : null;
  const track = f[8] !== "" ? parseFloat(f[8]) : null;
  return {
    type: "rmc",
    valid: status === "A",
    lat,
    lon,
    groundspeedKts: speedKt,
    trackDeg: track,
  };
}

/**
 * NmeaStreamParser — feed it raw text chunks as they arrive from a BLE
 * notify characteristic (which delivers small byte fragments, not whole
 * lines); it buffers until it sees full CRLF-terminated sentences and
 * emits parsed fixes via onFix.
 */
export class NmeaStreamParser {
  constructor(onFix) {
    this.buffer = "";
    this.onFix = onFix;
    this.last = { gga: null, rmc: null };
  }

  push(chunk) {
    this.buffer += chunk;
    for (let idx = this.buffer.search(/\r?\n/); idx !== -1; idx = this.buffer.search(/\r?\n/)) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      this._handleLine(line);
    }
    // Guard against a wedged/garbage stream (no terminator ever arrives)
    // filling memory — NMEA sentences are short (<= 82 chars per spec).
    if (this.buffer.length > 2048) this.buffer = this.buffer.slice(-256);
  }

  _handleLine(line) {
    if (!line || line[0] !== "$") return;
    const gga = parseGGA(line);
    if (gga) { this.last.gga = gga; this._emit(); return; }
    const rmc = parseRMC(line);
    if (rmc) { this.last.rmc = rmc; this._emit(); return; }
  }

  _emit() {
    const { gga, rmc } = this.last;
    if (!gga && !rmc) return;
    this.onFix?.({
      lat: gga?.lat ?? rmc?.lat ?? null,
      lon: gga?.lon ?? rmc?.lon ?? null,
      altitudeFt: gga?.altitudeFt ?? null,
      satellites: gga?.satellites ?? null,
      accuracyFt: gga?.estimatedAccuracyFt ?? null,
      fixQuality: gga?.fixQualityLabel ?? (rmc?.valid ? "gps" : "none"),
      groundspeedKts: rmc?.groundspeedKts ?? null,
      trackDeg: rmc?.trackDeg ?? null,
      receivedAt: Date.now(),
    });
  }
}
