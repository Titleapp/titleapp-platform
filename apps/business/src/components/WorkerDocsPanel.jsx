// WorkerDocsPanel.jsx — "About this worker" slide-in panel shown from inside
// the workspace (ChatPanel header). Sean, 2026-08-21: users shouldn't have to
// leave the app to read a worker's "How to use" doc.
//
// IMPORTANT: this does NOT regenerate or reformat worker documentation — it
// fetches the exact same static file functions/functions/scripts/
// generateWorkerDocs.js already writes to apps/business/public/docs/
// worker-<id>.md (the same file the public /docs site serves) and renders it
// with the same Markdown pipeline DocsShell.jsx (the /docs site) uses:
// react-markdown + remark-gfm + rehype-raw. One source of truth, two views.
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const mdComponents = {
  h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", color: "#0f172a" }}>{children}</h1>,
  h2: ({ children }) => <h2 id={slugify(children?.toString())} style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 8, color: "#0f172a" }}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(children?.toString())} style={{ fontSize: 14, fontWeight: 600, marginTop: 18, marginBottom: 6, color: "#0f172a" }}>{children}</h3>,
  p: ({ children }) => <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.6, color: "#334155" }}>{children}</p>,
  a: ({ href, children }) => <a href={href} target={href?.startsWith("/") ? undefined : "_blank"} rel={href?.startsWith("/") ? undefined : "noreferrer"} style={{ color: "#7c3aed", textDecoration: "underline" }}>{children}</a>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: "0 0 12px", fontSize: 13, color: "#334155" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: "0 0 12px", fontSize: 13, color: "#334155" }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4, lineHeight: 1.5 }}>{children}</li>,
  code: ({ inline, children }) => inline
    ? <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{children}</code>
    : <code style={{ display: "block", background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 8, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "auto" }}>{children}</code>,
  pre: ({ children }) => <pre style={{ margin: "12px 0" }}>{children}</pre>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid #7c3aed", paddingLeft: 12, margin: "12px 0", color: "#475569", fontStyle: "italic" }}>{children}</blockquote>,
};

/**
 * @param {{ workerId: string, workerName?: string, onClose: () => void }} props
 * workerId is the digitalWorkers catalog id (same id generateWorkerDocs.js
 * uses to name apps/business/public/docs/worker-<id>.md).
 */
export default function WorkerDocsPanel({ workerId, workerName, onClose }) {
  const [content, setContent] = useState({ loading: true, md: "", error: null });

  useEffect(() => {
    if (!workerId) return;
    setContent({ loading: true, md: "", error: null });
    fetch(`/docs/worker-${workerId}.md`)
      .then(r => (r.ok ? r.text() : Promise.reject(String(r.status))))
      .then(md => setContent({ loading: false, md, error: null }))
      .catch(err => setContent({ loading: false, md: "", error: String(err) }));
  }, [workerId]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "92vw", background: "white", zIndex: 9999, boxShadow: "-4px 0 20px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>About this worker</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{workerName || "How to use this worker"}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", padding: 4, lineHeight: 1 }}>{"✕"}</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {content.loading && <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</div>}
          {content.error && (
            <div style={{ padding: "24px 0", color: "#dc2626", fontSize: 13 }}>
              Couldn't load this worker's guide (status {content.error}).
            </div>
          )}
          {!content.loading && !content.error && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={mdComponents}>
              {content.md}
            </ReactMarkdown>
          )}
        </div>

        {/* Footer */}
        {workerId && (
          <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
            <a
              href={`/docs/worker-${workerId}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}
            >
              Open full doc page &#8599;
            </a>
          </div>
        )}
      </div>
    </>
  );
}
