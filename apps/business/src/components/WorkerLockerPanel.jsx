"use strict";
import React, { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
const PURPLE = "#6C47FF";

async function apiCall(method, path, body, token, tenantId) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (tenantId) headers["x-tenant-id"] = tenantId;
  const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

function DocRow({ doc, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const isSystem = doc.readOnly === true || doc.type === "system";
  const typeLabel = isSystem ? "System · Read-only" : doc.type === "paste" ? "Pasted text" : "Uploaded file";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F1F5F9", opacity: isSystem ? 0.85 : 1 }}>
      {isSystem && (
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6C47FF", flexShrink: 0, marginTop: 1 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name || "Untitled"}</div>
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
          {typeLabel} · {doc.charCount ? `${doc.charCount.toLocaleString()} chars` : ""}{doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString()}` : ""}
        </div>
      </div>
      {!isSystem && (
        <button
          onClick={async () => { setDeleting(true); await onDelete(doc.id); }}
          disabled={deleting}
          style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 4, opacity: deleting ? 0.4 : 1 }}
        >
          {deleting ? "…" : "Remove"}
        </button>
      )}
    </div>
  );
}

export default function WorkerLockerPanel({ worker, onClose, token, tenantId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("docs"); // docs | paste | upload
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const fileRef = useRef(null);

  const workerId = worker?.slug || worker?.workerId || worker?.id;

  async function load() {
    if (!workerId) return;
    setLoading(true);
    const r = await apiCall("GET", `/v1/worker:locker:list?workerId=${encodeURIComponent(workerId)}`, null, token, tenantId);
    setLoading(false);
    if (r.ok) setDocs(r.documents || []);
  }

  useEffect(() => { load(); }, [workerId]); // eslint-disable-line

  async function handlePaste() {
    if (!pasteText.trim()) return;
    setBusy(true); setError(null);
    const r = await apiCall("POST", "/v1/worker:locker:ingest", {
      workerId, name: pasteName.trim() || "Pasted note", text: pasteText.trim(), type: "paste",
    }, token, tenantId);
    setBusy(false);
    if (!r.ok) { setError(r.error || "Save failed"); return; }
    setPasteText(""); setPasteName(""); setTab("docs"); load();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const r = await apiCall("POST", "/v1/worker:locker:ingest", { workerId, base64, fileName: file.name, type: "upload" }, token, tenantId);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) { setError(r.error || "Upload failed"); return; }
    setTab("docs"); load();
  }

  async function handleDelete(docId) {
    await apiCall("DELETE", "/v1/worker:locker:doc", { workerId, docId }, token, tenantId);
    load();
  }

  const userDocs = docs.filter(d => !d.readOnly && d.type !== "system");
  const totalChars = userDocs.reduce((s, d) => s + (d.charCount || 0), 0);
  const systemDocCount = docs.length - userDocs.length;
  const charLimit = 600000;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      {/* Panel */}
      <div style={{
        position: "relative", width: 420, maxWidth: "95vw", height: "100vh",
        background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column", overflowY: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 0", borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, letterSpacing: "0.08em", textTransform: "uppercase" }}>Studio Locker</div>
            <button onClick={onClose} style={{ fontSize: 18, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: 2 }}>×</button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{worker?.name || worker?.display_name || "Worker"}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
            Documents you add here are injected into this worker's knowledge for your workspace only. Other tenants cannot see or access your locker.
          </div>
          {/* Capacity bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
              <span>{userDocs.length} document{userDocs.length !== 1 ? "s" : ""}{systemDocCount > 0 ? ` + ${systemDocCount} system` : ""}</span>
              <span>{totalChars.toLocaleString()} / {charLimit.toLocaleString()} chars</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "#E2E8F0", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, (totalChars / charLimit) * 100)}%`, background: totalChars > charLimit * 0.9 ? "#DC2626" : PURPLE, transition: "width 0.3s" }} />
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", padding: "0 20px" }}>
          {[["docs", "Documents"], ["paste", "Add text"], ["upload", "Upload file"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              fontSize: 12, fontWeight: tab === id ? 700 : 500,
              color: tab === id ? PURPLE : "#64748B",
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 12px 10px 0", marginRight: 4,
              borderBottom: tab === id ? `2px solid ${PURPLE}` : "2px solid transparent",
            }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {error && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 12, padding: 10, background: "#FEF2F2", borderRadius: 6 }}>{error}</div>}

          {tab === "docs" && (
            loading ? (
              <div style={{ fontSize: 13, color: "#94A3B8", paddingTop: 20, textAlign: "center" }}>Loading…</div>
            ) : (
              <>
                {docs.map(doc => <DocRow key={doc.id} doc={doc} onDelete={handleDelete} />)}
                {userDocs.length === 0 && (
                  <div style={{ textAlign: "center", paddingTop: systemDocCount > 0 ? 20 : 32 }}>
                    {systemDocCount === 0 && <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>}
                    <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                      {systemDocCount > 0
                        ? "Add your own context — policies, procedures, or notes — to supplement the system rules above."
                        : "Paste notes or upload files to ground this worker in your organization's context."}
                    </div>
                  </div>
                )}
              </>
            )
          )}

          {tab === "paste" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>Document name</div>
              <input
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: "border-box" }}
                placeholder='e.g. "Operator accreditation standards 2026"'
                value={pasteName} onChange={e => setPasteName(e.target.value)}
              />
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>Content</div>
              <textarea
                style={{ width: "100%", height: 240, padding: "10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                placeholder="Paste your policies, procedures, context, or any reference material the worker should know about your organization…"
                value={pasteText} onChange={e => setPasteText(e.target.value)}
              />
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, marginBottom: 12 }}>{pasteText.length.toLocaleString()} chars</div>
              <button
                onClick={handlePaste}
                disabled={busy || !pasteText.trim()}
                style={{ width: "100%", padding: "10px", background: PURPLE, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: busy || !pasteText.trim() ? "not-allowed" : "pointer", opacity: busy || !pasteText.trim() ? 0.5 : 1 }}
              >{busy ? "Saving…" : "Save to locker"}</button>
            </div>
          )}

          {tab === "upload" && (
            <div>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
                Upload a PDF, Word document, or text file. The text will be extracted and injected into the worker's knowledge for your workspace.
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: "2px dashed #CBD5E1", borderRadius: 10, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: "#F8FAFC" }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>⬆️</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>Click to upload</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>PDF · DOCX · TXT · MD</div>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={handleFile} style={{ display: "none" }} />
              {busy && <div style={{ fontSize: 13, color: PURPLE, textAlign: "center", marginTop: 16 }}>Uploading and extracting text…</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
