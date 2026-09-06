/**
 * backgroundGps.js — continuous GPS via @transistorsoft/capacitor-background-geolocation
 * (real, maintained, v9), for the case CODEX 64 calls out explicitly: a
 * moving map that keeps updating with the screen off/backgrounded, which
 * plain browser geolocation (and even Capacitor's own @capacitor/geolocation)
 * cannot sustain — no background-location entitlement, no wake behavior.
 *
 * This is the FALLBACK/secondary GPS source behind the BLE puck (bleGps.js).
 * CODEX 64's own ruling is that most kneeboard iPads are Wi-Fi-only and have
 * no GPS chip at all — background geolocation only produces real fixes on a
 * cellular-model iPad (or any Android device) with a GPS chip. On a Wi-Fi
 * iPad with no puck paired, this plugin will report `hasHardwareGps: false`-
 * shaped results (no fix, ever) — that is expected, not a bug, and is why
 * the GPS status strip must show "NO GPS" rather than silently pretending
 * a position exists.
 *
 * ── REAL COST NOTE — not just a technical integration ───────────────────────
 * @transistorsoft/capacitor-background-geolocation is dual-licensed: free
 * for local development/evaluation, but a paid commercial license
 * (transistorsoft.com) is required to ship a production commercial app using
 * it. This is a real budget line, not a config toggle — flag to Sean before
 * this ships to the App Store.
 */

let BackgroundGeolocationMod = null;
async function getPlugin() {
  if (BackgroundGeolocationMod) return BackgroundGeolocationMod;
  try {
    const mod = await import("@transistorsoft/capacitor-background-geolocation");
    BackgroundGeolocationMod = mod.default || mod.BackgroundGeolocation || mod;
    return BackgroundGeolocationMod;
  } catch {
    throw new Error("background-geolocation plugin not available (web build, or native platform not synced)");
  }
}

let readyPromise = null;

/**
 * Start continuous tracking. onLocation receives
 * { lat, lon, altitudeFt, groundspeedKts, trackDeg, accuracyFt, receivedAt }
 * shaped the same way bleGps.js's onFix is, so useGpsSource.js can treat
 * either source identically.
 */
export async function startBackgroundTracking(onLocation, onError) {
  const BackgroundGeolocation = await getPlugin();

  if (!readyPromise) {
    readyPromise = BackgroundGeolocation.ready({
      // Navigation-grade accuracy — this is a moving-map instrument, not a
      // step-counter; the higher power draw is the correct tradeoff here.
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_NAVIGATION,
      distanceFilter: 0, // time-based, not distance-based — 1Hz-ish updates
      locationUpdateInterval: 1000,
      fastestLocationUpdateInterval: 1000,
      stopOnTerminate: false,
      startOnBoot: false,
      pausesLocationUpdatesAutomatically: false,
      preventSuspend: true, // keep updating with the screen off — the whole point
      showsBackgroundLocationIndicator: true, // iOS blue pill — be honest with the pilot that tracking is live
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_ERROR,
    });
  }
  await readyPromise;

  BackgroundGeolocation.onLocation(
    (location) => {
      const c = location.coords || {};
      onLocation?.({
        lat: c.latitude,
        lon: c.longitude,
        altitudeFt: c.altitude != null ? c.altitude * 3.28084 : null,
        groundspeedKts: c.speed != null && c.speed >= 0 ? c.speed * 1.94384 : null, // m/s → kt
        trackDeg: c.heading != null && c.heading >= 0 ? c.heading : null,
        accuracyFt: c.accuracy != null ? c.accuracy * 3.28084 : null,
        receivedAt: Date.now(),
      });
    },
    (error) => onError?.(error)
  );

  await BackgroundGeolocation.start();
}

export async function stopBackgroundTracking() {
  try {
    const BackgroundGeolocation = await getPlugin();
    await BackgroundGeolocation.stop();
  } catch { /* not running / not native — nothing to stop */ }
}
