// /docs landing — overview of all sections with descriptions.
// Crawlable, sets canonical meta, ranks for "SOCIII SDK docs".
//
// Layout mirrors DocsShell so the left nav is consistent across the
// index page and the inner pages (otherwise the index reads as a
// different surface and visitors lose orientation).

import React, { useEffect, useMemo, useState } from "react";
import { DOCS_MANIFEST } from "./docsManifest";
import sociiiMark from "../../assets/sociii-brand/icon/sociii-icon-mark.svg";

const S = {
  shell: { display: "flex", minHeight: "100vh", background: "#fff", color: "#0f172a", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  leftNav: { width: 280, borderRight: "1px solid #e5e7eb", padding: "20px 16px", background: "#fafafa", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
  brand: { display: "flex", alignItems: "center", gap: 8, marginBottom: 24, textDecoration: "none", color: "#0f172a" },
  brandMark: { width: 22, height: 22 },
  brandText: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" },
  brandTag: { fontSize: 11, color: "#7c3aed", fontWeight: 600, marginLeft: 4, textTransform: "uppercase", letterSpacing: "0.5px" },
  searchBox: { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, marginBottom: 20, fontFamily: "inherit", boxSizing: "border-box" },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 18, marginBottom: 6, padding: "0 6px" },
  navItem: { display: "block", padding: "6px 10px", borderRadius: 6, fontSize: 13, color: "#334155", textDecoration: "none", marginBottom: 1 },
  navItemOverview: { background: "#ede9fe", color: "#6d28d9", fontWeight: 600 },
  content: { flex: 1, padding: "48px 56px", maxWidth: 920, minWidth: 0 },
};

export default function DocsIndex() {
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "SOCIII Docs — Open SDK for Digital Workers";
    const desc = "Documentation for SOCIII — the open SDK and marketplace for Digital Workers. Build a worker in Claude Code, ship it via GitHub, list on sociii.ai, earn 75% of net revenue.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = desc;
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = "https://sociii.ai/docs";
  }, []);

  const filteredManifest = useMemo(() => {
    if (!search.trim()) return DOCS_MANIFEST;
    const q = search.toLowerCase();
    return DOCS_MANIFEST.map(sec => ({
      ...sec,
      pages: sec.pages.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.slug.includes(q)
      ),
    })).filter(sec => sec.pages.length > 0);
  }, [search]);

  return (
    <div style={S.shell}>
      {/* Left nav — same shape as DocsShell so the surface reads as one site */}
      <aside style={S.leftNav}>
        <a href="/" style={S.brand}>
          <img src={sociiiMark} alt="" style={S.brandMark} />
          <span style={S.brandText}>SOCIII</span>
          <span style={S.brandTag}>Docs</span>
        </a>
        <input
          type="text"
          placeholder="Search docs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={S.searchBox}
        />
        <a href="/docs" style={{ ...S.navItem, ...S.navItemOverview }}>Overview</a>
        {filteredManifest.map(sec => (
          <div key={sec.section}>
            <div style={S.sectionLabel}>{sec.section}</div>
            {sec.pages.map(p => (
              <a key={p.slug} href={`/docs/${p.slug}`} style={S.navItem}>
                {p.title}
              </a>
            ))}
          </div>
        ))}
      </aside>

      {/* Content */}
      <main style={S.content}>
        <h1 style={{ fontSize: 40, fontWeight: 800, marginTop: 0, marginBottom: 12, letterSpacing: "-0.8px" }}>
          The SOCIII Docs
        </h1>
        <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.6, marginBottom: 36 }}>
          SOCIII is an open SDK and marketplace for Digital Workers — AI-governed services built by domain experts.
          The platform is built so a creator who's never written code can author and ship a worker by talking to Claude Code in their terminal.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 48, flexWrap: "wrap" }}>
          <a href="/docs/what-is-sociii" style={primaryBtn}>Start here →</a>
          <a href="/docs/install" style={secondaryBtn}>Install the tools</a>
          <a href="/whitepaper" style={secondaryBtn}>Read the whitepaper</a>
        </div>

        {DOCS_MANIFEST.map(sec => (
          <section key={sec.section} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: 16 }}>
              {sec.section}
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {sec.pages.map(p => (
                <a
                  key={p.slug}
                  href={`/docs/${p.slug}`}
                  style={{
                    display: "block", padding: "16px 20px", border: "1px solid #e5e7eb", borderRadius: 8,
                    textDecoration: "none", color: "#0f172a", transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>{p.description}</div>
                </a>
              ))}
            </div>
          </section>
        ))}

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid #e5e7eb", fontSize: 12, color: "#94a3b8" }}>
          <p>
            All docs are also available as raw Markdown at <code>sociii.ai/docs/&lt;slug&gt;.md</code> for LLM consumption.
            Source lives in <code>apps/business/public/docs/</code> in the SOCIII repo.
          </p>
        </footer>
      </main>
    </div>
  );
}

const primaryBtn = {
  padding: "10px 20px", background: "#7c3aed", color: "white", textDecoration: "none",
  borderRadius: 8, fontWeight: 600, fontSize: 14,
};
const secondaryBtn = {
  padding: "10px 20px", background: "#f1f5f9", color: "#0f172a", textDecoration: "none",
  borderRadius: 8, fontWeight: 600, fontSize: 14, border: "1px solid #e5e7eb",
};
