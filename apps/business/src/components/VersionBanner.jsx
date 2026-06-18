import React, { useEffect, useRef, useState } from "react";

// VersionBanner — detects when a NEW build of SOCIII has been deployed while the
// user is on an old (cached) one, and offers a one-click refresh. No service
// worker needed: it reads the hashed main bundle name out of index.html and
// compares it to the bundle this page loaded with. If they differ, a banner
// appears. Checks shortly after load, every few minutes, and on window focus.

function currentBundleHash() {
  // The Vite main entry is /assets/index-<hash>.js — grab the one this page ran.
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const main = scripts.map((s) => s.src).find((src) => /\/assets\/index-[^/]+\.js/.test(src));
  const m = main && main.match(/index-([^.]+)\.js/);
  return m ? m[1] : null;
}

async function latestBundleHash() {
  const res = await fetch(`/index.html?_v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/\/assets\/index-([^."']+)\.js/);
  return m ? m[1] : null;
}

export default function VersionBanner() {
  const [stale, setStale] = useState(false);
  const mine = useRef(null);

  useEffect(() => {
    mine.current = currentBundleHash();
    let alive = true;
    const check = async () => {
      if (!alive || !mine.current) return;
      try {
        const latest = await latestBundleHash();
        if (alive && latest && latest !== mine.current) setStale(true);
      } catch { /* offline / transient — ignore */ }
    };
    const t0 = setTimeout(check, 8000);          // shortly after load
    const iv = setInterval(check, 3 * 60 * 1000); // every 3 min
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; clearTimeout(t0); clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, []);

  if (!stale) return null;

  return (
    <div style={{
      position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 99999,
      display: "flex", alignItems: "center", gap: 14,
      background: "#0f172a", color: "#fff", borderRadius: 999,
      padding: "10px 14px 10px 18px", boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      border: "1px solid rgba(124,58,237,0.5)", fontSize: 13.5, fontWeight: 600,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "#7c3aed", flexShrink: 0 }} />
      A new version of SOCIII is available
      <button
        onClick={() => { try { window.location.reload(true); } catch { window.location.reload(); } }}
        style={{
          background: "#7c3aed", color: "#fff", border: "none", borderRadius: 999,
          padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}
      >
        Refresh ↻
      </button>
    </div>
  );
}
