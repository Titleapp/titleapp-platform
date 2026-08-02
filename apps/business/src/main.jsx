import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initVersionCheck } from "./utils/versionCheck.js";

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
