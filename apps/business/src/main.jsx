import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// 47.9 HOTFIX: Service worker DISABLED. The register/unregister/reload cycle
// was causing infinite page reload loops on mobile. Disabling entirely until
// a proper update strategy is implemented. Also unregister any lingering SWs.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
