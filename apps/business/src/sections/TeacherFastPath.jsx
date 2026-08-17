import React, { useState } from "react";

/**
 * TeacherFastPath — CODEX S52.55.
 *
 * The upload-first front door: paste/upload course materials, answer two
 * plain-language questions, get a Course Worker + Evaluation Worker pair
 * derived and submitted for admin review — never auto-published live.
 *
 * Honest scope limit, stated plainly rather than pretended around: text
 * extraction here supports plain text/markdown only (paste, or a .txt/.md
 * file). PDF/DOCX extraction isn't built yet — the upload accepts them and
 * says so, rather than silently failing or fabricating content from a file
 * it can't actually read.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function authedHeaders() {
  const token = localStorage.getItem("ID_TOKEN");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const CLASS_COLOR = { clean: "#15803d", flagged: "#b45309", escalated: "#7c3aed", failed: "#b91c1c" };

export default function TeacherFastPath() {
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || null;
  const [materialsText, setMaterialsText] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState("");
  const [helpsWith, setHelpsWith] = useState("");
  const [redFlags, setRedFlags] = useState("");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name)) {
      setFileNote(`"${f.name}" isn't a supported format yet — this tool reads plain text/markdown only today. Paste the text content below instead, or save it as .txt.`);
      return;
    }
    setFileNote("");
    const reader = new FileReader();
    reader.onload = () => setMaterialsText((prev) => (prev ? prev + "\n\n" : "") + String(reader.result || ""));
    reader.readAsText(f);
  }

  async function build() {
    setBuilding(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/worker:fastpath:build")}`, {
        method: "POST", headers: authedHeaders(),
        body: JSON.stringify({ tenantId, materialsText, helpsWith, redFlags, subject, audience }),
      });
      const data = await res.json();
      if (data?.ok) setResult(data);
      else setError(data?.error || "Build failed");
    } catch (e) {
      setError(e.message || "Build failed");
    } finally {
      setBuilding(false);
    }
  }

  if (result) {
    const { spec, testPassed, testResults } = result;
    return (
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>Here's what I set up — does this look right?</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
          Nothing is live yet. This is submitted to your admin's review queue and only goes live once approved.
        </p>

        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>What I understood from your materials</div>
          <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{spec.knowledgeSummary}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0891b2", textTransform: "uppercase" }}>Course Worker</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginTop: 4 }}>{spec.courseWorkerName}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0891b2", textTransform: "uppercase" }}>Evaluation Worker</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginTop: 4 }}>{spec.evaluationWorkerName}</div>
          </div>
        </div>

        {spec.escalationRules.length > 0 && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 6 }}>Will flag a real adult when</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#78350f", lineHeight: 1.7 }}>
              {spec.escalationRules.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {spec.uncertain.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", marginBottom: 6 }}>Couldn't confidently figure out</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#991b1b", lineHeight: 1.7 }}>
              {spec.uncertain.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>Safety test — 5 questions, run automatically</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: testPassed ? "#15803d" : "#b91c1c" }}>{testPassed ? "Passed" : "Needs attention"}</div>
          </div>
          {testResults.map((r) => (
            <div key={r.id} style={{ padding: "8px 0", borderTop: "1px solid #f8fafc" }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>{r.category}</div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 4 }}>{r.answer.slice(0, 220)}{r.answer.length > 220 ? "…" : ""}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: CLASS_COLOR[r.classification] || "#64748b", textTransform: "uppercase" }}>{r.classification}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, color: "#64748b" }}>Submitted to the review queue — an admin will approve or reject before this goes live.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>Build your course helper</h1>
      <p style={{ fontSize: 15, color: "#64748b", marginBottom: 24, lineHeight: 1.5 }}>
        Upload or paste your course materials, answer two questions, and get a tutoring helper for your students plus a dashboard for you — no rules to write, no tools to configure.
      </p>

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. 5th grade science"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16 }} />

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Who's this for?</label>
      <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. my 5th grade class"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16 }} />

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Course materials (paste text, or upload a .txt/.md file)</label>
      <textarea value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} rows={8}
        placeholder="Paste your syllabus, lesson plans, or rubric here..."
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 8, fontFamily: "inherit" }} />
      <input type="file" accept=".txt,.md" onChange={onFile} style={{ marginBottom: 6 }} />
      {fileNote && <div style={{ fontSize: 12, color: "#b45309", marginBottom: 8 }}>{fileNote}</div>}

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, marginTop: 12 }}>What should this help students with?</label>
      <input value={helpsWith} onChange={(e) => setHelpsWith(e.target.value)} placeholder="e.g. understanding the concepts, not just getting answers"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16 }} />

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>What should count as a red flag you'd want to know about?</label>
      <input value={redFlags} onChange={(e) => setRedFlags(e.target.value)} placeholder="e.g. a student saying something concerning about home"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 24 }} />

      {error && <div style={{ padding: 12, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <button onClick={build} disabled={building || !materialsText.trim()}
        style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: building ? "#c4b5fd" : "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 15, cursor: building ? "default" : "pointer" }}>
        {building ? "Building…" : "Build my helpers"}
      </button>
    </div>
  );
}
