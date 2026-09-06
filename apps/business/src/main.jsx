import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initVersionCheck } from "./utils/versionCheck.js";

// Native app "flavors" (CODEX 85) load the bundled shell at "/" with no query
// string — rewrite straight into that flavor's persona route before App reads
// window.location, so the native shell never shows the marketing landing page.
if (import.meta.env.VITE_NATIVE_FLAVOR === "nursing" && window.location.pathname === "/" && !window.location.search) {
  window.history.replaceState(null, "", "/portal?company=uh-nursing&persona=student");
}

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
