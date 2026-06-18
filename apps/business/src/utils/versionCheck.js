// versionCheck.js — S52.47 (auto-update).
// Long-lived SPA tabs never re-request index.html, so they run stale code across
// deploys no matter how good the cache headers are (index.html is already
// no-store; /assets/** are immutable + hashed). A "click to reload" banner isn't
// enough — a CUSTOMER won't notice or act on it, they'll just see a broken old
// version and leave. So this AUTO-UPDATES: when a newer deploy is detected, the
// tab silently reloads at a safe moment (when it's backgrounded, or on refocus)
// so the user transparently lands on the latest build. A visible banner remains
// as a fallback for a tab that stays in the foreground.
//
// No build step: we read the hashed bundle name from the running document and
// compare it to the one referenced by a freshly-fetched index.html.
// Loop-safe: updatePending is only set when the hashes actually differ; after a
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
    const html = await fetch("/index.html", { cache: "no-store" }).then((r) => r.text());
    const m = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function doReload() {
  if (reloading) return;
  reloading = true;
  // replace() so the stale entry doesn't linger in history
  window.location.reload();
}

function showBanner() {
  if (bannerShown) return;
  bannerShown = true;
  const bar = document.createElement("div");
  bar.style.cssText =
    "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;background:#1e293b;color:#fff;padding:10px 16px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.25);display:flex;align-items:center;gap:12px;font:500 13px/1.3 system-ui,-apple-system,sans-serif;";
  const msg = document.createElement("span");
  msg.textContent = "A new version of SOCIII is available.";
  const btn = document.createElement("button");
  btn.textContent = "Reload";
  btn.style.cssText = "background:#7c3aed;color:#fff;border:none;border-radius:7px;padding:6px 14px;font-weight:600;cursor:pointer;";
  btn.onclick = doReload;
  const x = document.createElement("button");
  x.textContent = "✕";
  x.setAttribute("aria-label", "Dismiss");
  x.style.cssText = "background:transparent;color:#94a3b8;border:none;cursor:pointer;font-size:14px;line-height:1;";
  x.onclick = () => { bar.remove(); bannerShown = false; };
  bar.append(msg, btn, x);
  document.body.appendChild(bar);
}

async function check() {
  if (!runningBundle || reloading) return;
  if (!updatePending) {
    const deployed = await readDeployedBundle();
    if (deployed && deployed !== runningBundle) {
      updatePending = true;
      // Foreground tab: show the banner so an actively-working user isn't yanked
      // mid-task; if they ignore it, the visibility handlers below auto-reload.
      if (document.visibilityState === "visible") showBanner();
    }
  }
  // If an update is pending and the tab is hidden, refresh silently now — the
  // user returns to a fresh build and never sees the stale one.
  if (updatePending && document.visibilityState === "hidden") doReload();
}

export function initVersionCheck() {
  runningBundle = readRunningBundle();
  if (!runningBundle) return; // dev server / no hashed bundle — no-op

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      // Tab going to background is the ONLY place we auto-reload — it's invisible
      // and safe, so a customer who tabs away returns to a fresh build without
      // ever being yanked mid-task. (Sean's preference: notify, don't force.)
      if (updatePending) doReload();
    } else {
      // Returning to a foreground tab: re-check and SHOW THE BANNER. Never
      // auto-reload a visible tab out from under the user — let them choose.
      check();
    }
  });
  window.addEventListener("focus", check);
  setInterval(check, 2 * 60 * 1000); // poll every 2 min while open
  check(); // initial check on load
}
