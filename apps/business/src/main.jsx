import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initVersionCheck } from "./utils/versionCheck.js";

// Native app "flavors" (CODEX 85) load the bundled shell at "/" with no query
// string — rewrite straight into that flavor's persona route before App reads
// window.location, so the native shell never shows the marketing landing page.
const NATIVE_FLAVOR = import.meta.env.VITE_NATIVE_FLAVOR;
if (NATIVE_FLAVOR === "nursing" && window.location.pathname === "/" && !window.location.search) {
  window.history.replaceState(null, "", "/portal?company=uh-nursing&persona=student");
}

// "realestate" flavor — the Title & Real Estate customer app (buyer/seller
// following a closing, or a tenant managing their lease/maintenance).
// Deliberately NOT a copy of nursing's single-hardcoded-school pattern: this
// vertical genuinely serves more than one company (many title companies AND
// many property managers), so which company skins this build is a build-time
// env var, not a second hardcoded string — onboarding company #2 is a new
// .env.realestate, not new code.
//
// Persona defaults to "tenant", not "buyer"/"seller", and that's a deliberate
// choice, not an oversight: a tenant's identity resolves entirely from their
// signed-in uid (their own lease, no per-transaction token needed) — the
// exact shape nursing's student persona already proved works from a bare
// cold launch. Buyer/seller needs a real orderId, and an orderId is
// inherently per-transaction — it only ever exists because a title company
// sent a link for THIS specific closing. A cold app-icon launch has no way to
// invent one, so defaulting a "realestate" build to persona=buyer would
// silently fall back to the scripted demo instead of showing the real order
// the customer expects. That's why buyer/seller reaches real data through the
// deep-link listener below, not through this hardcoded default.
if (NATIVE_FLAVOR === "realestate" && window.location.pathname === "/" && !window.location.search) {
  const company = import.meta.env.VITE_NATIVE_RE_COMPANY || "merritt-capital";
  const persona = import.meta.env.VITE_NATIVE_RE_PERSONA || "tenant";
  window.history.replaceState(null, "", `/portal?company=${encodeURIComponent(company)}&persona=${encodeURIComponent(persona)}`);
}

// Deep links into a specific order/lease (e.g. a title company's "review
// your closing" text/email link, tapped on a phone that already has the
// native app installed). Capacitor does NOT auto-navigate the WebView on
// appUrlOpen/Universal Links — without this listener, tapping such a link
// would just reopen the app at its default flavor route above, losing the
// company/persona/orderId the link carried. Real for any flavor (not just
// realestate); a no-op on web (outside Capacitor.isNativePlatform(), and the
// App plugin's web shim never fires appUrlOpen anyway).
//
// STILL NEEDED before this actually fires for a tapped https:// link: Universal
// Links hosting (an apple-app-site-association file at the domain root) +
// the "Associated Domains" capability in the Xcode project — neither is
// server/entitlement config this pass could set up. A custom URL scheme
// (e.g. sociii://portal?company=...) works today once one is registered as a
// URL Type in Info.plist — that registration lives in the generated,
// gitignored ios/ project, so it isn't part of this diff either; add it when
// building the real native project.
//
// 2026-09-08 — real bug found via device testing: the ONLY URL scheme
// actually registered in Info.plist right now is Google Sign-In's
// REVERSED_CLIENT_ID (com.googleusercontent.apps.<...> — GoogleSignIn-iOS's
// documented, universal scheme format for returning from the system OAuth
// browser to the app). This listener's original "any URL with a query
// string is a portal deep link" check has no way to tell that callback
// apart from a real portal link, so a successful Google sign-in was
// triggering an unwanted reload to `/portal?<oauth-callback-params>` —
// discarding in-memory app state (including the aviation flavor's
// ta_redirect_page handshake below) mid-flow and landing the user on the
// generic default worker instead of SKYE. Real sign-in itself still
// completed correctly (the auth SDK's own internal handling of this same
// callback is separate from this listener), only the POST-sign-in
// navigation broke. Explicitly ignore any callback using that scheme
// family — it's Google's own documented convention, not a one-off guess.
import("@capacitor/core").then(({ Capacitor }) => {
  if (!Capacitor.isNativePlatform()) return;
  import("@capacitor/app").then(({ App: CapApp }) => {
    CapApp.addListener("appUrlOpen", ({ url }) => {
      try {
        const target = new URL(url);
        if (target.protocol.startsWith("com.googleusercontent.apps")) return;
        if (target.search) {
          window.history.replaceState(null, "", `/portal${target.search}`);
          window.location.reload();
        }
      } catch { /* malformed deep link — ignore, stay on current screen */ }
    });
  }).catch(() => {});
}).catch(() => {});

// Aviation flavor (CODEX 64/85) — routes into the internal, signed-in
// AdminShell workspace (not a public /portal persona like nursing above),
// landing on the Pilots role view (worker slug "av-copilot-001") via the
// same `ta_redirect_page` sessionStorage handshake App.jsx's AdminShell
// already honors elsewhere (SubscribeSuccess.jsx, WorkerSandbox.jsx) for
// "land here once authenticated" redirects. Detects a REAL iPad viewport
// (not just "not mobile" — see AppShell.jsx's single 768px breakpoint,
// which conflates phone and tablet) to choose between the full 60/40
// cockpit layout (CODEX 64) and the regular single-column Pilots canvas.
if (import.meta.env.VITE_NATIVE_FLAVOR === "aviation" && window.location.pathname === "/" && !window.location.search) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  // Classic iPad UA check, plus the post-iPadOS-13 case where Safari/WKWebView
  // reports as "Macintosh" — disambiguated by touch support, which no real Mac has.
  const isRealIPad = /iPad/.test(ua) || (
    typeof navigator !== "undefined" &&
    navigator.platform === "MacIntel" &&
    (navigator.maxTouchPoints || 0) > 1
  );
  try {
    sessionStorage.setItem("ta_redirect_page", isRealIPad ? "av-cockpit" : "av-copilot-001");
  } catch { /* ignore — worst case, lands on the default dashboard */ }
}

// Re-enable service worker with network-first strategy (safe from reload loops).
// Old aggressive-cache SW caused the 47.9 mobile loop — the new SW never reloads
// the page and uses network-first for navigation so stale shells can't get stuck.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// S52.45 — detect a newer deploy in a long-lived tab → one-click reload banner.
initVersionCheck();
