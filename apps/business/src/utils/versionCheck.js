// versionCheck.js — S52.45.
// Long-lived SPA tabs never re-request index.html, so they run stale code across
// deploys no matter how good the cache headers are (this is what bit us all day:
// the all-day meet-alex tab). This detects a newer deploy and offers a one-click
// reload. Fast immutable assets stay cached; the tab just can't go silently stale.
//
// No build step needed: we read the hashed bundle name from the running document
// and compare it to the one referenced by the freshly-fetched index.html.

let runningBundle = null;
let bannerShown = false;

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
  btn.onclick = () => window.location.reload();
  const x = document.createElement("button");
  x.textContent = "✕";
  x.setAttribute("aria-label", "Dismiss");
  x.style.cssText = "background:transparent;color:#94a3b8;border:none;cursor:pointer;font-size:14px;line-height:1;";
  x.onclick = () => { bar.remove(); bannerShown = false; };
  bar.append(msg, btn, x);
  document.body.appendChild(bar);
}

async function check() {
  if (!runningBundle || bannerShown) return;
  const deployed = await readDeployedBundle();
  if (deployed && deployed !== runningBundle) showBanner();
}

export function initVersionCheck() {
  runningBundle = readRunningBundle();
  if (!runningBundle) return; // dev server / no hashed bundle — no-op
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("focus", check);
  setInterval(check, 5 * 60 * 1000); // backstop poll every 5 min
}
