import React, { useEffect, useState } from "react";
import { CAMPAIGN_ROUTES, CREATOR_SLUG_TO_CAMPAIGN } from "../lib/campaignRouting";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

// CreatorGallery — generic /creator landing.
// Use case: IG bio link, generic post URLs, traffic that didn't come from
// a specific character ad. Shows a grid of creators with their video
// thumbnails. Click → routes to /creator/<slug>.
//
// Black background to match the character landings; the videos pop.

const COLORS = {
  bg: "#000",
  panel: "#0B0E14",
  border: "#1F2530",
  text: "#E8ECF1",
  textDim: "#8B96A8",
  accent: "#7C3AED",
};

const VIDEO_PATHS = {
  michael: "/launch-creative/of-michael-video-01.mp4",
  maria: "/launch-creative/of-maria-video-01.mp4",
  julia: "/launch-creative/of-julia-video-01.mp4",
  brad: "/launch-creative/of-brad-video-01.mp4",
  brandon: "/launch-creative/of-brandon-video-01.mp4",
  clint: "/launch-creative/of-clint-video-01.mp4",
  darnell: "/launch-creative/of-darnell-video-01.mp4",
  dietrich: "/launch-creative/of-dietrich-video-01.mp4",
  katarzyna: "/launch-creative/of-katarzyna-video-01.mp4",
  katie: "/launch-creative/of-katie-video-01.mp4",
  lisa: "/launch-creative/of-captain-lisa-video-01.mp4",
  madison: "/launch-creative/of-madison-video-01.mp4",
  manpreet: "/launch-creative/of-manpreet-video-01.mp4",
  monty: "/launch-creative/of-monty-video-01.mp4",
  randy: "/launch-creative/of-randy-video-01.mp4",
};

// OF for Smart People expert lineup. Order = how we'd want a first-time
// visitor to scan them — most universally familiar verticals first.
const OF_LINEUP = [
  "fred", "maria", "michael", "katie", "madison",
  "darnell", "brandon", "manpreet", "julia", "dietrich",
  "monty", "clint", "randy", "brad", "lisa", "katarzyna",
];

export default function CreatorGallery() {
  return (
    <div style={wrap}>
      <Header />
      <Pitch />
      <Grid />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header style={header}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={sociiiMarkUrl} alt="SOCIII" style={{ width: 32, height: 32 }} />
        <span style={{ color: COLORS.text, fontSize: 20, fontWeight: 600, letterSpacing: 0.3 }}>sociii</span>
      </div>
      <a href="https://sociii.ai/build" style={{ color: COLORS.textDim, fontSize: 13, textDecoration: "none" }}>
        Build your own →
      </a>
    </header>
  );
}

function Pitch() {
  return (
    <section style={pitch}>
      <h1 style={{ color: COLORS.text, fontSize: 34, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.15 }}>
        OF for Smart People
      </h1>
      <p style={{ color: COLORS.textDim, fontSize: 16, lineHeight: 1.5, maxWidth: 560, margin: 0 }}>
        Domain experts you'd pay $500/hour to consult — packaged as digital workers for $29/month.
        Pick one. Try free for 7 days. Cancel from chat.
      </p>
    </section>
  );
}

function Grid() {
  return (
    <section style={grid}>
      {OF_LINEUP.map(slug => {
        const campaignId = CREATOR_SLUG_TO_CAMPAIGN[slug];
        const route = campaignId ? CAMPAIGN_ROUTES[campaignId] : null;
        if (!route) return null;
        return (
          <CreatorTile
            key={slug}
            slug={slug}
            character={route.character}
            subject={route.workerDisplayName}
            videoSrc={VIDEO_PATHS[slug]}
          />
        );
      })}
    </section>
  );
}

function CreatorTile({ slug, character, subject, videoSrc }) {
  const [hovered, setHovered] = useState(false);
  function go() { window.location.href = `/creator/${slug}`; }
  return (
    <a
      href={`/creator/${slug}`}
      onClick={e => { e.preventDefault(); go(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...tile,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 36px rgba(124, 58, 237, 0.25)" : "none",
      }}
    >
      <div style={tileVideo}>
        {videoSrc ? (
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: COLORS.panel, display: "grid", placeItems: "center", color: COLORS.textDim, fontSize: 12 }}>
            (coming soon)
          </div>
        )}
      </div>
      <div style={tileMeta}>
        <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 600 }}>{character}</div>
        <div style={{ color: COLORS.textDim, fontSize: 12.5, marginTop: 2 }}>{subject}</div>
        <div style={{ color: COLORS.text, fontSize: 13, marginTop: 6, fontWeight: 500 }}>$29/mo</div>
      </div>
    </a>
  );
}

function Footer() {
  return (
    <footer style={footer}>
      <div>Built between flights · <a href="/build" style={{ color: COLORS.text }}>Become a creator</a></div>
      <div style={{ marginTop: 6 }}>sociii.ai</div>
    </footer>
  );
}

// ── styles ─────────────────────────────────────────────────────────
const wrap = {
  background: COLORS.bg,
  color: COLORS.text,
  minHeight: "100vh",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: 0,
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 32px",
  borderBottom: `1px solid ${COLORS.border}`,
};

const pitch = {
  padding: "40px 32px 28px",
  maxWidth: 1200,
  margin: "0 auto",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 20,
  padding: "0 32px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

const tile = {
  display: "block",
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  overflow: "hidden",
  textDecoration: "none",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const tileVideo = {
  width: "100%",
  aspectRatio: "9 / 16",
  background: "#000",
  overflow: "hidden",
};

const tileMeta = {
  padding: "12px 14px 14px",
};

const footer = {
  padding: "24px 32px 40px",
  borderTop: `1px solid ${COLORS.border}`,
  color: COLORS.textDim,
  fontSize: 12.5,
  textAlign: "center",
  maxWidth: 1200,
  margin: "0 auto",
};
