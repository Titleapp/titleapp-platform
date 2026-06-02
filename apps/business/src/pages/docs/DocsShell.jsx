// GitBook-style docs shell: left TOC + content area + right in-page TOC.
// Public (no auth). Crawlable. Each page renders its corresponding Markdown
// from /docs/<slug>.md served raw from public/docs.

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { DOCS_MANIFEST, findPage, adjacentPages } from "./docsManifest";
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
  navItemActive: { background: "#ede9fe", color: "#6d28d9", fontWeight: 600 },
  content: { flex: 1, padding: "32px 56px", maxWidth: 920, minWidth: 0 },
  breadcrumb: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  pageTitle: { fontSize: 32, fontWeight: 800, color: "#0f172a", marginTop: 0, marginBottom: 8, letterSpacing: "-0.5px" },
  pageDesc: { fontSize: 16, color: "#64748b", marginTop: 0, marginBottom: 32, lineHeight: 1.5 },
  prose: { fontSize: 15, lineHeight: 1.7, color: "#0f172a" },
  prevNext: { display: "flex", gap: 16, marginTop: 48, paddingTop: 24, borderTop: "1px solid #e5e7eb" },
  prevNextCard: { flex: 1, padding: "14px 18px", border: "1px solid #e5e7eb", borderRadius: 8, textDecoration: "none", color: "#0f172a" },
  prevNextLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 },
  prevNextTitle: { fontSize: 14, fontWeight: 600 },
  rightToc: { width: 220, padding: "32px 20px", borderLeft: "1px solid #e5e7eb", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto", fontSize: 13 },
  rightTocLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 },
  rightTocItem: { display: "block", padding: "4px 0", color: "#475569", textDecoration: "none" },
  rightTocItemH3: { paddingLeft: 14, fontSize: 12 },
  loading: { padding: 80, textAlign: "center", color: "#94a3b8" },
  error: { padding: 40, color: "#dc2626" },
};

function setMeta(page) {
  if (!page) return;
  document.title = `${page.title} · SOCIII Docs`;
  const desc = page.description || "SOCIII docs — open SDK for Digital Workers.";
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
  m.content = desc;
  // OG tags
  const og = [
    ["og:title", `${page.title} · SOCIII Docs`],
    ["og:description", desc],
    ["og:type", "article"],
    ["og:url", `https://sociii.ai/docs/${page.slug}`],
    ["twitter:card", "summary"],
    ["twitter:title", `${page.title} · SOCIII Docs`],
    ["twitter:description", desc],
  ];
  for (const [prop, val] of og) {
    let tag = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      if (prop.startsWith("og:")) tag.setAttribute("property", prop);
      else tag.setAttribute("name", prop);
      document.head.appendChild(tag);
    }
    tag.content = val;
  }
  // Canonical
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
  canon.href = `https://sociii.ai/docs/${page.slug}`;
  // JSON-LD structured data
  let ld = document.querySelector('script[type="application/ld+json"][data-docs="1"]');
  if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.setAttribute("data-docs", "1"); document.head.appendChild(ld); }
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: desc,
    url: `https://sociii.ai/docs/${page.slug}`,
    publisher: { "@type": "Organization", name: "SOCIII Inc.", url: "https://sociii.ai" },
  });
}

function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function DocsShell({ slug }) {
  const activeSlug = slug || "what-is-sociii";
  const page = findPage(activeSlug);
  const { prev, next } = adjacentPages(activeSlug);

  const [content, setContent] = useState({ loading: true, md: "", error: null });
  const [search, setSearch] = useState("");
  const [headings, setHeadings] = useState([]);

  useEffect(() => {
    // findPage returns a fresh object every render, so depending on `page`
    // here creates an infinite loop (setState → re-render → new page
    // reference → effect re-fires → ...). Compute page inside the effect
    // and depend on activeSlug only.
    const p = findPage(activeSlug);
    setMeta(p);
    setContent({ loading: true, md: "", error: null });
    fetch(`/docs/${activeSlug}.md`)
      .then(r => r.ok ? r.text() : Promise.reject(`${r.status}`))
      .then(md => {
        setContent({ loading: false, md, error: null });
        // Extract h2/h3 for right TOC
        const h = [];
        for (const line of md.split("\n")) {
          if (/^##\s+/.test(line)) h.push({ level: 2, text: line.replace(/^##\s+/, "").trim() });
          else if (/^###\s+/.test(line)) h.push({ level: 3, text: line.replace(/^###\s+/, "").trim() });
        }
        setHeadings(h);
      })
      .catch(err => setContent({ loading: false, md: "", error: String(err) }));
  }, [activeSlug]);

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
      {/* Left nav */}
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
        {filteredManifest.map(sec => (
          <div key={sec.section}>
            <div style={S.sectionLabel}>{sec.section}</div>
            {sec.pages.map(p => {
              const active = p.slug === activeSlug;
              return (
                <a
                  key={p.slug}
                  href={`/docs/${p.slug}`}
                  style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }}
                >
                  {p.title}
                </a>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 32, padding: "12px 10px", fontSize: 11, color: "#94a3b8", borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          Source: <a href={`/docs/${activeSlug}.md`} style={{ color: "#7c3aed" }}>raw Markdown ↗</a>
        </div>
      </aside>

      {/* Content */}
      <main style={S.content}>
        {page && (
          <>
            <div style={S.breadcrumb}>
              <a href="/docs" style={{ color: "#64748b", textDecoration: "none" }}>Docs</a>
              {" / "}
              <span>{page.section}</span>
            </div>
            <h1 style={S.pageTitle}>{page.title}</h1>
            <p style={S.pageDesc}>{page.description}</p>
          </>
        )}
        <div style={S.prose}>
          {content.loading && <div style={S.loading}>Loading…</div>}
          {content.error && (
            <div style={S.error}>
              Failed to load this page (status {content.error}). The Markdown source may not be deployed yet.
            </div>
          )}
          {!content.loading && !content.error && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h2: ({node, children}) => <h2 id={slugify(children?.toString())} style={{ fontSize: 24, fontWeight: 700, marginTop: 40, marginBottom: 12, scrollMarginTop: 20 }}>{children}</h2>,
                h3: ({node, children}) => <h3 id={slugify(children?.toString())} style={{ fontSize: 18, fontWeight: 600, marginTop: 28, marginBottom: 10, scrollMarginTop: 20 }}>{children}</h3>,
                p:  ({children}) => <p style={{ marginTop: 0, marginBottom: 16 }}>{children}</p>,
                a:  ({href, children}) => <a href={href} style={{ color: "#7c3aed", textDecoration: "underline" }}>{children}</a>,
                code: ({inline, children}) => inline
                  ? <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{children}</code>
                  : <code style={{ display: "block", background: "#0f172a", color: "#e2e8f0", padding: 16, borderRadius: 8, fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "auto", lineHeight: 1.6 }}>{children}</code>,
                pre: ({children}) => <pre style={{ margin: "16px 0" }}>{children}</pre>,
                blockquote: ({children}) => <blockquote style={{ borderLeft: "3px solid #7c3aed", paddingLeft: 16, margin: "16px 0", color: "#475569", fontStyle: "italic" }}>{children}</blockquote>,
                ul: ({children}) => <ul style={{ paddingLeft: 22, marginBottom: 16 }}>{children}</ul>,
                ol: ({children}) => <ol style={{ paddingLeft: 22, marginBottom: 16 }}>{children}</ol>,
                li: ({children}) => <li style={{ marginBottom: 6 }}>{children}</li>,
                table: ({children}) => <table style={{ borderCollapse: "collapse", marginBottom: 16, width: "100%" }}>{children}</table>,
                th: ({children}) => <th style={{ border: "1px solid #e5e7eb", padding: "8px 12px", textAlign: "left", background: "#f8fafc", fontWeight: 600, fontSize: 13 }}>{children}</th>,
                td: ({children}) => <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", fontSize: 14 }}>{children}</td>,
              }}
            >
              {content.md}
            </ReactMarkdown>
          )}
        </div>

        {/* Prev / Next */}
        {(prev || next) && (
          <div style={S.prevNext}>
            {prev ? (
              <a href={`/docs/${prev.slug}`} style={{ ...S.prevNextCard, textAlign: "left" }}>
                <div style={S.prevNextLabel}>← Previous</div>
                <div style={S.prevNextTitle}>{prev.title}</div>
              </a>
            ) : <div style={{ flex: 1 }} />}
            {next ? (
              <a href={`/docs/${next.slug}`} style={{ ...S.prevNextCard, textAlign: "right" }}>
                <div style={S.prevNextLabel}>Next →</div>
                <div style={S.prevNextTitle}>{next.title}</div>
              </a>
            ) : <div style={{ flex: 1 }} />}
          </div>
        )}
      </main>

      {/* Right in-page TOC */}
      {headings.length > 0 && (
        <aside style={S.rightToc}>
          <div style={S.rightTocLabel}>On this page</div>
          {headings.map((h, i) => (
            <a
              key={i}
              href={`#${slugify(h.text)}`}
              style={{ ...S.rightTocItem, ...(h.level === 3 ? S.rightTocItemH3 : {}) }}
            >
              {h.text}
            </a>
          ))}
        </aside>
      )}
    </div>
  );
}
