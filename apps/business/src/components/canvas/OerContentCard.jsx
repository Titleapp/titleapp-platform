/**
 * OerContentCard.jsx — free, NCLEX-aligned open course content (the OER connector).
 * Signal: card:oer-content   Data: live (GET /v1/edu:content?q=…)
 *
 * Shows real, openly-licensed nursing textbooks (OpenStax O.N.E. + Open RN) with
 * canonical links and the CC-BY attribution to carry. Search narrows by topic.
 * payload: { title, results:[{provider,title,license,nclex,url,attribution}], note }
 */

import React, { useState } from "react";
import CanvasCardShell from "./CanvasCardShell";
import { liveApiFetch } from "./liveData";

function LicenseTag({ text }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", background: "#f0f9ff", border: "1px solid #0369a122", padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{text}</span>;
}

function Item({ e }) {
  return (
    <div style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
        <a href={e.url} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", textDecoration: "none" }}>{e.title} ↗</a>
        <LicenseTag text={e.license || "Open"} />
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{e.provider}{e.nclex ? ` · ${e.nclex}` : ""}</div>
      {e.attribution && <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>Cite: {e.attribution}</div>}
    </div>
  );
}

export default function OerContentCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(p.results || []);
  const [note, setNote] = useState(p.note || "");
  const [busy, setBusy] = useState(false);

  async function search(term) {
    setBusy(true);
    try {
      const r = await liveApiFetch(`/v1/edu:content${term ? `?q=${encodeURIComponent(term)}` : ""}`);
      setRows((r && r.results) || []);
      setNote((r && r.note) || "");
    } catch { /* keep prior */ }
    setBusy(false);
  }

  return (
    <CanvasCardShell title={p.title || "Course Content"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        Free, current, NCLEX-aligned open textbooks (OpenStax &amp; Open RN). Search a topic to pull material for a lesson.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search(q)}
          placeholder="e.g. cardiac rhythms, pharmacology, OB"
          style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 11px", fontSize: 14, fontFamily: "inherit" }} />
        <button onClick={() => search(q)} disabled={busy} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "0 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {busy ? "…" : "Search"}
        </button>
      </div>
      {note && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>{note}</div>}
      {(rows || []).map((e, i) => <Item key={e.url + i} e={e} />)}
      {!busy && !(rows || []).length && <div style={{ fontSize: 13, color: "#94a3b8" }}>Search a topic to see open course material.</div>}
    </CanvasCardShell>
  );
}
