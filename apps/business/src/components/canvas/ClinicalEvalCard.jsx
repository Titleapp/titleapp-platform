/**
 * ClinicalEvalCard.jsx — CLINICAL-EVALUATION-001, the signed-Vault loop (§10).
 * Signal: card:clinical-eval   Data: live
 *
 * The "click and watch it work" moment: an instructor fills a clinical
 * evaluation, hits Approve & Sign, and it is digitally signed → written as an
 * append-only record into the STUDENT'S Vault → anchored → provable.
 *   POST /v1/edu:evaluation:sign   GET /v1/edu:evaluations (verified on read)
 * payload.view = sign | records
 */

import React, { useState } from "react";
import CanvasCardShell from "./CanvasCardShell";
import { liveApiFetch } from "./liveData";

const OUTCOMES = ["Met", "Not Met", "Pass", "Needs Improvement"];
const short = (h) => (h ? String(h).slice(0, 18) + "…" : "—");

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}
const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 11px", fontSize: 14, color: "#1e293b", fontFamily: "inherit" };

function SignedReceipt({ result, onAnother }) {
  const sig = result.signature || {};
  return (
    <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d", marginBottom: 10 }}>✓ Signed & written to the student's Vault</div>
      <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#334155" }}>
        <Row k="Attested by" v={`${sig.signer?.name || "—"}${sig.signer?.credential ? `, ${sig.signer.credential}` : ""}`} />
        <Row k="Signed at" v={(sig.signedAt || "").replace("T", " ").slice(0, 19) + " UTC"} />
        <Row k="Signature" v={short(sig.finalHash)} mono />
        <Row k="Record hash" v={short(result.contentHash)} mono />
        <Row k="Anchor" v={result.anchor || "anchored in next daily batch"} />
        <Row k="Vault record" v={result.dtcId || "—"} mono />
      </div>
      <div style={{ fontSize: 12, color: "#16a34a", marginTop: 12, fontWeight: 600 }}>
        The student can now open their Vault and see this verified competency — portable for life.
      </div>
      <button onClick={onAnother} style={{ marginTop: 14, background: "#0f172a", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        Sign another
      </button>
    </div>
  );
}
function Row({ k, v, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
      <span style={{ color: "#94a3b8" }}>{k}</span>
      <span style={{ fontWeight: 600, textAlign: "right", fontFamily: mono ? "ui-monospace,Menlo,monospace" : "inherit", fontSize: mono ? 12 : 13, wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}

function SignForm() {
  const [f, setF] = useState({
    student_name: "Alex Torres", competency: "Medication Administration — Five Rights",
    course: "Clinical Practicum", clinical_site: "", outcome: "Met", score: "",
    narrative: "", signerName: "Dr. Maya Chen", signerCredential: "DVM",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const out = await liveApiFetch("/v1/edu:evaluation:sign", {
        method: "POST",
        body: JSON.stringify({
          evaluation: {
            competency: f.competency, course: f.course, clinical_site: f.clinical_site,
            outcome: f.outcome, score: f.score === "" ? null : Number(f.score),
            narrative: f.narrative, student_name: f.student_name,
          },
          signer: { name: f.signerName, credential: f.signerCredential },
        }),
      });
      if (!out || out.ok === false) throw new Error((out && out.error) || "Sign failed");
      setResult(out);
      try { window.dispatchEvent(new CustomEvent("ta:reland-canvas")); } catch (_) {}
    } catch (e) { setErr(e.message || "Sign failed"); }
    setBusy(false);
  }

  if (result) return <SignedReceipt result={result} onAnother={() => setResult(null)} />;

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Complete the evaluation, then <b>Approve &amp; Sign</b>. It is digitally signed and written to the student's Vault — append-only and anchored.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Student"><input style={inputStyle} value={f.student_name} onChange={set("student_name")} /></Field>
        <Field label="Course"><input style={inputStyle} value={f.course} onChange={set("course")} /></Field>
      </div>
      <Field label="Competency"><input style={inputStyle} value={f.competency} onChange={set("competency")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
        <Field label="Clinical site"><input style={inputStyle} value={f.clinical_site} onChange={set("clinical_site")} placeholder="e.g. Queen's Medical Center" /></Field>
        <Field label="Outcome">
          <select style={inputStyle} value={f.outcome} onChange={set("outcome")}>
            {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Score (%)"><input style={inputStyle} type="number" min="0" max="100" value={f.score} onChange={set("score")} placeholder="optional" /></Field>
      </div>
      <Field label="Narrative"><textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={f.narrative} onChange={set("narrative")} placeholder="What the student demonstrated…" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Instructor (signer)"><input style={inputStyle} value={f.signerName} onChange={set("signerName")} /></Field>
        <Field label="Credential"><input style={inputStyle} value={f.signerCredential} onChange={set("signerCredential")} placeholder="e.g. PhD, RN, CNE" /></Field>
      </div>
      {err && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 10 }}>⚠ {err}</div>}
      <button onClick={submit} disabled={busy || !f.competency || !f.signerName} style={{
        background: busy ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", borderRadius: 10,
        padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", marginTop: 4,
      }}>
        {busy ? "Signing…" : "Approve & Sign"}
      </button>
    </div>
  );
}

function VerifiedBadge({ v }) {
  const ok = v && v.valid;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: ok ? "#16a34a" : "#dc2626", background: ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${ok ? "#16a34a" : "#dc2626"}22`, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {ok ? "✓ Signature verified" : "✗ Unverified"}
    </span>
  );
}

function RecordsList({ payload }) {
  const rows = payload.evaluations || [];
  if (!rows.length) return <div style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>No signed evaluations yet — sign one on the first tab and it lands here (and in the student's Vault).</div>;
  return (
    <>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{rows.length} signed evaluation{rows.length === 1 ? "" : "s"} — each verified by recomputing its signature</div>
      {rows.map((e) => (
        <div key={e.dtcId} style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{e.competency || e.title}</div>
            <VerifiedBadge v={e.verification} />
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            {e.outcome ? `${e.outcome}${e.score != null ? ` · ${e.score}%` : ""} · ` : ""}{e.course || ""}
            {e.attested_by ? ` · attested by ${e.attested_by}${e.attested_credential ? `, ${e.attested_credential}` : ""}` : ""}
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 11, color: "#94a3b8", fontFamily: "ui-monospace,Menlo,monospace" }}>
            <span>signed {(e.signedAt || "").slice(0, 10)}</span>
            <span>hash {short(e.contentHash)}</span>
            <span>anchor: {e.anchorStatus}</span>
          </div>
        </div>
      ))}
    </>
  );
}

export default function ClinicalEvalCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const view = p.view || "sign";
  return (
    <CanvasCardShell title={p.title || "Clinical Evaluation"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      {view === "records" ? <RecordsList payload={p} /> : <SignForm />}
    </CanvasCardShell>
  );
}
