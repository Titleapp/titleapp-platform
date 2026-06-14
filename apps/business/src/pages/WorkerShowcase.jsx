// WorkerShowcase — the visual front door to building a worker (S52.64).
//
// Sean's call (2026-06-13): the sandbox is a tax form — people walk in with no
// idea what a Digital Worker is, let alone what a GOOD one looks like. This is
// the Trump Rule fix: SHOW the outcome first. Not a sandbox rebuild — an
// additive gallery of our real, visually-rich examples (a live map, a video
// expert, a living record). "Build yours →" drops into the existing 9-step
// flow untouched.
//
// Reuses what we already have: the Google Maps satellite embed (every RE worker
// shows a map), the OF-for-Smart-People creator videos, and the Academic Record
// passport. Whether each worker fully does what we coded is beside the point —
// this sells the visual promise.

import React from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const C = {
  bg: "#0B0E14",
  panel: "#11161F",
  border: "#1F2530",
  text: "#E8ECF1",
  dim: "#8B96A8",
  accent: "#7C3AED",
  green: "#22c55e",
};

function go(href) { window.location.href = href; }

function BuildButton({ big }) {
  return (
    <a
      href="/sandbox/worker"
      onClick={(e) => { e.preventDefault(); go("/sandbox/worker"); }}
      style={{
        display: "inline-block", background: C.accent, color: "#fff", textDecoration: "none",
        padding: big ? "16px 32px" : "11px 20px", borderRadius: 12,
        fontSize: big ? 17 : 14.5, fontWeight: 700, letterSpacing: 0.2,
        boxShadow: "0 6px 20px rgba(124,58,237,0.35)",
      }}
    >
      Build your own →
    </a>
  );
}

// Card 1 — REAL ESTATE: a live satellite map (every RE worker shows a map).
function MapCard() {
  const mapUrl = MAPS_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent("Lahaina, Maui, Hawaii")}&maptype=satellite&zoom=16`
    : null;
  return (
    <ShowcaseCard
      eyebrow="Real estate"
      title="Site Recon & Land Use"
      desc="Walks any parcel — zoning, comps, flood risk, buildability — on a live map, then hands the file to Title Abstract."
      tag="Map · Parcels · Street View"
      onExplore={() => go("/sandbox/worker")}
      visual={
        mapUrl ? (
          <iframe
            title="Live parcel map"
            src={mapUrl}
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#143d2b,#0e2a3a)", color: "#9fe6c2", fontSize: 30 }}>🗺️ 📍</div>
        )
      }
    />
  );
}

// Card 2 — OF FOR SMART PEOPLE: a real autoplay creator video.
function VideoExpertCard() {
  return (
    <ShowcaseCard
      eyebrow="OF for Smart People"
      title="Katarzyna — EU Digital Product Passport"
      desc="A $500/hour expert, packaged as a $29/mo Digital Worker. Sixteen experts are live in the gallery — each one a creator earning 75%."
      tag="See all experts →"
      onExplore={() => go("/work")}
      visual={
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <video
            src="/launch-creative/of-katarzyna-video-01.mp4"
            autoPlay loop muted playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      }
    />
  );
}

// Card 3 — VAULT: the Academic Record passport (a living, owned record).
function RecordCard() {
  return (
    <ShowcaseCard
      eyebrow="Vault · Academic Record"
      title="A record you own forever"
      desc="One portable record across every school, certification, and course — hashed, student-controlled, impossible to lose. The substrate every learning worker feeds."
      tag="Institutions · Courses · Sign-offs"
      onExplore={() => go("/sandbox/worker")}
      visual={
        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1e1b4b 0%,#4c1d95 100%)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: 0.6 }}>Academic Record</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", marginTop: 4 }}>Sarah Kahale</div>
            <div style={{ fontSize: 11.5, color: "#ddd6fe", marginTop: 2 }}>3 programs · 12 entries</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#86efac", marginTop: 6 }}>✓ Identity verified (KYC-1)</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ m: "UH", c: "#024731" }, { m: "KS", c: "#8A1538" }, { m: "AD", c: "#0E7490" }].map((x) => (
              <div key={x.m} style={{ width: 34, height: 34, borderRadius: 8, background: x.c, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>{x.m}</div>
            ))}
          </div>
        </div>
      }
    />
  );
}

function ShowcaseCard({ eyebrow, title, desc, tag, visual, onExplore }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover ? "0 16px 40px rgba(124,58,237,0.22)" : "none",
        transition: "transform .15s, box-shadow .15s",
      }}
    >
      <div style={{ height: 200, background: "#000", position: "relative" }}>{visual}</div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: 0.6 }}>{eyebrow}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{title}</div>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5, flex: 1 }}>{desc}</div>
        <button
          onClick={onExplore}
          style={{ alignSelf: "flex-start", marginTop: 6, background: "transparent", border: "none", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          {tag}
        </button>
      </div>
    </div>
  );
}

// A little OS-window mockup so creators SEE the four-window setup before they
// live it — Sandbox / Code / Claude / GitHub, each with its job.
function TeamWindow({ chromeTitle, href, dark, role, desc, children }) {
  const tabBg = dark ? "#0b0e14" : "#fff";
  return (
    <div>
      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: tabBg, height: 148, display: "flex", flexDirection: "column" }}>
        {/* Browser chrome — a real tab with a working link */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "7px 9px 0", background: dark ? "#11161f" : "#e2e8f0" }}>
          <div style={{ display: "flex", gap: 5, paddingBottom: 6, flexShrink: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e" }} />
          </div>
          <a href={href} target="_blank" rel="noopener noreferrer"
            title={`Open ${chromeTitle}`}
            style={{ display: "flex", alignItems: "center", gap: 6, background: tabBg, border: `1px solid ${C.border}`, borderBottom: "none", borderRadius: "8px 8px 0 0", padding: "5px 10px", fontSize: 10, color: dark ? "#cbd5e1" : "#334155", fontWeight: 600, textDecoration: "none", maxWidth: "78%", overflow: "hidden", whiteSpace: "nowrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{chromeTitle}</span>
            <span style={{ color: C.dim, flexShrink: 0 }}>↗</span>
          </a>
        </div>
        <div style={{ flex: 1, padding: 10, overflow: "hidden" }}>{children}</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: C.dim, textAlign: "center", lineHeight: 1.4 }}>
        <strong style={{ color: C.text }}>{role}</strong> — {desc}
      </div>
    </div>
  );
}

function MeetYourTeam() {
  return (
    <section style={{ maxWidth: 1140, margin: "0 auto", padding: "8px 24px 28px" }}>
      <h2 style={{ fontSize: 27, fontWeight: 800, textAlign: "center", margin: "0 0 6px" }}>Meet your team</h2>
      <p style={{ fontSize: 15, color: C.dim, textAlign: "center", margin: "0 0 22px" }}>
        Four windows open. Each has a job. This is what building actually looks like.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        <TeamWindow chromeTitle="sociii.ai/sandbox" href="/sandbox/worker" role="Sandbox" desc="Alex facilitates — shapes the idea, no code">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
            <div style={{ background: "#7c3aed", color: "#fff", fontSize: 9, fontWeight: 700, padding: "4px 7px", borderRadius: 5 }}>Alex · Chief of Staff</div>
            <div style={{ display: "flex", gap: 4 }}>{["#c7d2fe", "#bbf7d0", "#fde68a"].map((c, i) => <div key={i} style={{ flex: 1, height: 18, borderRadius: 4, background: c }} />)}</div>
            <div style={{ flex: 1, borderRadius: 4, background: "#eef2ff" }} />
          </div>
        </TeamWindow>
        <TeamWindow chromeTitle="Terminal — claude" href="https://claude.ai" dark role="Code" desc="Does the heavy lifting — builds the worker">
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, lineHeight: 1.7 }}>
            <div style={{ color: "#22c55e" }}>$ claude</div>
            <div style={{ color: "#8b96a8" }}>› building re-ce-hawaii…</div>
            <div style={{ color: "#e5e7eb" }}><span style={{ color: "#c4b5fd" }}>const</span> worker = <span style={{ color: "#86efac" }}>"CE"</span></div>
            <div style={{ color: "#8b96a8" }}>✓ WORKER-SPEC.md</div>
            <div style={{ color: "#8b96a8" }}>✓ canvas-tabs.json</div>
          </div>
        </TeamWindow>
        <TeamWindow chromeTitle="claude.ai" href="https://claude.ai" role="Claude" desc="Your thinking partner — ask, refine, debug">
          <div style={{ display: "flex", flexDirection: "column", gap: 7, justifyContent: "center", height: "100%" }}>
            <div style={{ alignSelf: "flex-start", width: "72%", height: 13, borderRadius: 8, background: "#e2e8f0" }} />
            <div style={{ alignSelf: "flex-end", width: "60%", height: 13, borderRadius: 8, background: "#ddd6fe" }} />
            <div style={{ alignSelf: "flex-start", width: "50%", height: 13, borderRadius: 8, background: "#e2e8f0" }} />
          </div>
        </TeamWindow>
        <TeamWindow chromeTitle="github.com/sociii" href="https://github.com/sociii" role="GitHub" desc="Your holy grail — where the worker lives forever">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
            <div style={{ fontSize: 22, textAlign: "center" }}>🐙</div>
            <div style={{ fontSize: 9, color: "#64748b" }}>⎇ <strong>main</strong></div>
            {[0, 1, 2].map(i => <div key={i} style={{ display: "flex", gap: 5, alignItems: "center" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} /><div style={{ flex: 1, height: 5, borderRadius: 3, background: "#e2e8f0" }} /></div>)}
          </div>
        </TeamWindow>
      </div>
    </section>
  );
}

export default function WorkerShowcase() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "system-ui, -apple-system, sans-serif", color: C.text }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", maxWidth: 1140, margin: "0 auto" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src={sociiiMarkUrl} alt="SOCIII" style={{ width: 30, height: 30 }} />
          <span style={{ color: C.text, fontSize: 19, fontWeight: 600 }}>sociii</span>
        </a>
        <BuildButton />
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 8px", textAlign: "center" }}>
        <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.12, margin: "0 0 14px" }}>
          This is what a Digital Worker looks like.
        </h1>
        <p style={{ fontSize: 17, color: C.dim, lineHeight: 1.55, margin: 0 }}>
          Not a form — a finished thing. A live map. A video expert. A record you own.
          See the bar, then build yours in minutes with Alex walking you through it.
        </p>
      </section>

      {/* Gallery */}
      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <MapCard />
        <VideoExpertCard />
        <RecordCard />
      </section>

      {/* Meet your team — the four-window setup */}
      <MeetYourTeam />

      {/* Footer CTA */}
      <section style={{ textAlign: "center", padding: "16px 24px 64px" }}>
        <BuildButton big />
        <div style={{ fontSize: 13, color: C.dim, marginTop: 12 }}>Nine guided steps. You mark what's done as you go.</div>
      </section>
    </div>
  );
}
