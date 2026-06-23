// versionCheck.js — S52.47 (auto-update) · hardened 2026-06-23.
// Long-lived SPA tabs never re-request index.html, so they run stale code across
// deploys no matter how good the cache headers are (index.html is already
// no-store; /assets/** are immutable + hashed). With 5-6 deploys/day a "click to
// reload" banner that a user dismisses once and never sees again isn't enough —
// they'll keep working in a stale build. So this:
//   1. AUTO-UPDATES on a backgrounded/refocused tab (transparent, safe).
//   2. Shows a PERSISTENT "new version" popup on a foreground tab that REAPPEARS
//      after dismissal until they reload (Sean: "always appears").
//
// No build step: we read the hashed bundle name from the running document and
// compare it to the one referenced by a freshly-fetched index.html. The fetch is
// CACHE-BUSTED with a unique query param so an intermediary/CDN edge cache can't
// serve a stale index.html and mask a new deploy (the most common silent failure).
// Loop-safe: updatePending only flips when the hashes actually differ; after a
// reload the running bundle equals the deployed one, so it can't re-trigger.

let runningBundle = null;
let updatePending = false;
let bannerShown = false;
let reloading = false;

function readRunningBundle() {
  const src = Array.from(document.querySelectorAll("script[src]"))
    .map((el) => el.getAttribute("src") || "")
    .find((s) => /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(s));
  const m = src && src.match(/index-[A-Za-z0-9_-]+\.js/);
  return m ? m[0] : null;
}

async function readDeployedBundle() {
  try {
    // Cache-bust: a unique URL bypasses any CDN/edge cache that might otherwise
    // serve a stale index.html and hide a fresh deploy. `no-store` covers the
    // browser cache; the query param covers everything in front of the origin.
    const html = await fetch(`/index.html?_cb=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    }).then((r) => r.text());
    const m = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function doReload() {
  if (reloading) return;
  reloading = true;
  window.location.reload();
}

function showBanner() {
  if (bannerShown) return;
  bannerShown = true;
  const bar = document.createElement("div");
  bar.setAttribute("role", "alert");
  bar.style.cssText =
    "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;" +
    "background:#0f172a;color:#fff;padding:11px 16px;border-radius:12px;" +
    "box-shadow:0 8px 28px rgba(15,23,42,0.32);display:flex;align-items:center;gap:12px;" +
    "font:600 13px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;max-width:92vw;" +
    "border:1px solid rgba(255,255,255,0.08);animation:sociiiVerSlide .28s ease-out;";
  // Monoline refresh glyph (Switzerland, not Disneyland — subtle stroked SVG).
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("width", "16"); icon.setAttribute("height", "16");
  icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "#a78bfa"); icon.setAttribute("stroke-width", "2");
  icon.setAttribute("stroke-linecap", "round"); icon.setAttribute("stroke-linejoin", "round");
  icon.innerHTML = '<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>';
  const msg = document.createElement("span");
  msg.textContent = "A new version of SOCIII is ready.";
  const btn = document.createElement("button");
  btn.textContent = "Refresh";
  btn.style.cssText =
    "background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:7px 15px;" +
    "font:600 13px system-ui,sans-serif;cursor:pointer;white-space:nowrap;";
  btn.onmouseenter = () => { btn.style.background = "#6d28d9"; };
  btn.onmouseleave = () => { btn.style.background = "#7c3aed"; };
  btn.onclick = doReload;
  const x = document.createElement("button");
  x.textContent = "✕";
  x.setAttribute("aria-label", "Dismiss");
  x.style.cssText = "background:transparent;color:#94a3b8;border:none;cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;";
  // Dismiss only hides for now — the popup REAPPEARS on the next check/refocus so
  // a stale tab can't be permanently ignored. (Sean: "always appears".)
  x.onclick = () => { bar.remove(); bannerShown = false; };
  if (!document.getElementById("sociii-ver-kf")) {
    const style = document.createElement("style");
    style.id = "sociii-ver-kf";
    style.textContent = "@keyframes sociiiVerSlide{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}";
    document.head.appendChild(style);
  }
  bar.append(icon, msg, btn, x);
  document.body.appendChild(bar);
}

async function check() {
  if (!runningBundle || reloading) return;
  if (!updatePending) {
    const deployed = await readDeployedBundle();
    if (deployed && deployed !== runningBundle) updatePending = true;
  }
  if (!updatePending) return;
  // Hidden tab → reload silently now; user returns to a fresh build.
  if (document.visibilityState === "hidden") { doReload(); return; }
  // Visible tab → (re)show the popup. Never yank an active user mid-task; let
  // them choose, but keep reminding them so they don't stay stale.
  showBanner();
}

export function initVersionCheck() {
  runningBundle = readRunningBundle();
  if (!runningBundle) return; // dev server / no hashed bundle — no-op

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (updatePending) doReload();
    } else {
      check();
    }
  });
  window.addEventListener("focus", check);
  window.addEventListener("online", check);
  window.addEventListener("pageshow", check); // bfcache restore
  setInterval(check, 60 * 1000); // poll every 60s (deploys land 5-6x/day)
  check(); // initial check on load
}
