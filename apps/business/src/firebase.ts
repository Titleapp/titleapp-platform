import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckToken } from "firebase/app-check";
import { Capacitor } from "@capacitor/core";

// NOTE: Web config for Firebase project: title-app-alpha
// Values come from Firebase Console → Project settings → Your apps → SDK setup & configuration
const firebaseConfig = {
  apiKey: "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY",
  authDomain: "title-app-alpha.firebaseapp.com",
  projectId: "title-app-alpha",
  storageBucket: "title-app-alpha.firebasestorage.app",
  messagingSenderId: "496560182504",
  appId: "1:496560182504:web:d3c393bd7d4898a891e55d",
  measurementId: "G-REDNYLES89",
};

// Initialize Firebase exactly once
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// getAuth(app)'s default persistence auto-detection has a known real failure
// mode inside a Capacitor native shell: it runs under the `capacitor://localhost`
// origin, not a normal `https://` one, and its IndexedDB-availability probe can
// hang indefinitely there — silently, no thrown error, no network call ever
// made, since Auth queues every real request behind that probe resolving.
// (Reproduced 2026-09-04: sign-in stuck on "Signing in..." forever, empty
// console, zero requests to identitytoolkit.googleapis.com in the network
// inspector — consistent with the probe itself never resolving.)
// Fix: skip auto-detection entirely inside the native shell and go straight
// to indexedDBLocalPersistence, matching Firebase's own guidance for
// Capacitor/Cordova apps. Regular web (non-native) keeps auto-detection.
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] })
  : getAuth(app);

export const db = getFirestore(app);

// App Check — ties requests to the deployed app binary.
// Set VITE_RECAPTCHA_SITE_KEY in .env to activate (requires Firebase Console setup).
const _reCaptchaKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY as string | undefined;
const _appCheck = _reCaptchaKey
  ? initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(_reCaptchaKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;

export async function getAppCheckHeader(): Promise<Record<string, string>> {
  if (!_appCheck) return {};
  try {
    const result = await getAppCheckToken(_appCheck, false);
    return { "X-Firebase-AppCheck": result.token };
  } catch {
    return {};
  }
}
