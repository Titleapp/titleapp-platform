// CODEX 47.4 Phase B (T2) — Worker Build Log page.
//
// Renders the auto-generated markdown Build Log for a worker session and
// lets the creator append plain-text notes (append-only — every note is
// preserved, no edits, no deletes).
//
// Reachable from /sandbox/worker → "Build Log" button. URL carries
// ?sessionId=... so deep links work.

import React, { useEffect, useState } from "react";
import { getBuildLog, appendBuildLogNote } from "../api/sandboxWorkerApi";
import { PURPLE } from "../components/sandbox/worker/workerSteps";

// Minimal markdown → React renderer. We deliberately do NOT pull in a full
// markdown lib for this reference — the Build Log uses a small fixed subset
// (h1/h2/h3, paragraphs, lists, bold, hr) that we can render in ~30 lines.
function renderMarkdown(md) {
  if (!md) return null;
  const lines = md.split("\n");
  const out = [];
  let listBuffer = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} style={{ margin: "8px 0 16px 20px", padding: 0, color: "#1a1a2e", lineHeight: 1.6 }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        ))}
      </ul>
    );
    listBuffer = [];
  }

  function inlineFormat(s) {
    return s
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/_([^_]+)_/g, "<em>$1</em>");
  }

  for (const raw of lines) {
    const line = raw;
    if (line.startsWith("# ")) {
      flushList();
      out.push(<h1 key={out.length} style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "24px 0 8px" }}>{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(<h2 key={out.length} style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: "20px 0 6px", paddingTop: 8, borderTop: "1px solid #E2E8F0" }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flushList();
      out.push(<h3 key={out.length} style={{ fontSize: 14, fontWeight: 700, color: "#64748B", margin: "12px 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === "---") {
      flushList();
      // Heading borders cover this; we skip the explicit hr to keep visual rhythm clean.
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(
        <p key={out.length} style={{ fontSize: 14, color: "#1a1a2e", lineHeight: 1.6, margin: "0 0 12px" }}
           dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
  }
  flushList();
  return out;
}

export default function WorkerBuildLog() {
  const [sessionId, setSessionId] = useState(null);
  const [buildLog, setBuildLog] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sessionId") || localStorage.getItem("ta_worker_sandbox_session");
    if (!sid) {
      setError("No session id");
      setLoading(false);
      return;
    }
    setSessionId(sid);
    (async () => {
      const r = await getBuildLog(sid);
      setLoading(false);
      if (!r.ok) {
        setError(r.error || "Could not load Build Log");
        return;
      }
      setBuildLog(r.buildLog || null);
      setNotes(r.notes || []);
    })();
  }, []);

  async function addNote() {
    if (!newNote.trim() || !sessionId) return;
    setBusy(true);
    const r = await appendBuildLogNote({ sessionId, text: newNote });
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "Could not add note");
      return;
    }
    setNewNote("");
    // Reload to pick up the regenerated body
    const refreshed = await getBuildLog(sessionId);
    if (refreshed.ok) {
      setBuildLog(refreshed.buildLog || null);
      setNotes(refreshed.notes || []);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontFamily: "system-ui" }}>Loading Build Log…</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: "center", color: "#DC2626", fontFamily: "system-ui" }}>{error}</div>;
  }

  return (
    <div style={{
      maxWidth: 800, margin: "0 auto", padding: "32px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif", background: "#FFFFFF", minHeight: "100vh",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <a href="/sandbox/worker" style={{ color: PURPLE, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
          ← Back to sandbox
        </a>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "#94A3B8" }}>Auto-generated · Append-only</div>
      </div>

      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
        {buildLog?.markdown ? renderMarkdown(buildLog.markdown) : <div style={{ color: "#64748B" }}>Build Log is empty. Complete your first step to populate it.</div>}
      </div>

      <div style={{
        marginTop: 32, padding: 18,
        background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Add a creator note</div>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Something you decided, learned, or want to remember"
          style={{
            width: "100%", padding: 10, border: "1px solid #CBD5E1",
            borderRadius: 6, fontSize: 14, fontFamily: "inherit",
            minHeight: 70, resize: "vertical", boxSizing: "border-box",
            marginBottom: 8,
          }}
        />
        <button
          onClick={addNote}
          disabled={!newNote.trim() || busy}
          style={{
            background: PURPLE, color: "#FFFFFF", border: "none",
            borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: !newNote.trim() || busy ? "default" : "pointer",
            opacity: !newNote.trim() || busy ? 0.4 : 1,
          }}
        >
          Append note
        </button>
      </div>

      {notes.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 11, color: "#94A3B8" }}>
          {notes.length} note{notes.length === 1 ? "" : "s"} on file. Notes are append-only.
        </div>
      )}
    </div>
  );
}
