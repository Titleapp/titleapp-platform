import React, { useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const DOC_TYPES = [
  { value: "poh", label: "POH/AFM (Pilot Operating Handbook)" },
  { value: "qrh", label: "QRH (Quick Reference Handbook)" },
  { value: "gom", label: "GOM (General Operations Manual)" },
  { value: "mel", label: "MEL (Minimum Equipment List)" },
  { value: "opspecs", label: "OpSpecs (Operations Specifications)" },
  { value: "training", label: "Training Records" },
  { value: "wb", label: "W&B (Weight & Balance)" },
  { value: "maintenance", label: "Maintenance Documents" },
  { value: "sop", label: "SOP (Standard Operating Procedures)" },
  { value: "other", label: "Other Document" },
];

const S = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" },
  header: { padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: 700, color: "#e2e8f0" },
  closeBtn: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, padding: 4 },
  body: { padding: 24 },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 6 },
  select: { width: "100%", padding: "10px 12px", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8, fontSize: 14, outline: "none" },
  input: { width: "100%", padding: "10px 12px", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  dropZone: { border: "2px dashed #334155", borderRadius: 10, padding: "32px 16px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s" },
  dropZoneActive: { borderColor: "#7c3aed" },
  fileName: { fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginTop: 8 },
  toggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" },
  toggleLabel: { fontSize: 14, color: "#e2e8f0" },
  toggleSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, background: "#334155", position: "relative", cursor: "pointer", border: "none", padding: 0, transition: "background 0.2s" },
  toggleOn: { background: "#7c3aed" },
  toggleDot: { width: 20, height: 20, borderRadius: 10, background: "white", position: "absolute", top: 2, left: 2, transition: "transform 0.2s" },
  toggleDotOn: { transform: "translateX(20px)" },
  footer: { padding: "16px 24px", borderTop: "1px solid #1e293b", display: "flex", gap: 12, justifyContent: "flex-end" },
  cancelBtn: { padding: "10px 20px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, fontSize: 14, cursor: "pointer" },
  submitBtn: { padding: "10px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { fontSize: 13, color: "#ef4444", marginTop: 8 },
  conflictBox: { background: "#1e293b", border: "1px solid #f59e0b", borderRadius: 10, padding: 16, marginTop: 12 },
  conflictText: { fontSize: 14, color: "#fbbf24", marginBottom: 12 },
  conflictBtns: { display: "flex", gap: 8 },
};

export default function DocumentUploadModal({ workerId, revisionTarget, onClose, onComplete }) {
  const [docType, setDocType] = useState(revisionTarget?.docType || "");
  const [file, setFile] = useState(null);
  const [revision, setRevision] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [requiresAck, setRequiresAck] = useState(false);
  const [ackType, setAckType] = useState("checkbox");
  const [blockchainRecord, setBlockchainRecord] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type === "application/pdf") setFile(f);
    else setError("Only PDF files are supported");
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(null); }
  }

  async function handleSubmit() {
    if (!docType) { setError("Select a document type"); return; }
    if (!file) { setError("Select a file to upload"); return; }
    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=/v1/docControl:upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workerId,
          docType,
          fileName: file.name,
          revisionNumber: revision || undefined,
          effectiveDate: effectiveDate || undefined,
          acknowledgmentType: requiresAck ? ackType : "none",
          blockchainEnabled: blockchainRecord,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.existingDoc) {
        setConflict(data);
        setUploading(false);
        return;
      }

      if (!data.ok) {
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      onComplete();
    } catch {
      setError("Connection error. Try again.");
    }
    setUploading(false);
  }

  async function handleConfirmRevision() {
    setUploading(true);
    setError(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=/v1/docControl:confirmRevision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workerId,
          docType,
          fileName: file.name,
          revisionNumber: revision || undefined,
          effectiveDate: effectiveDate || undefined,
          acknowledgmentType: requiresAck ? ackType : "none",
          blockchainEnabled: blockchainRecord,
          supersedes: conflict.existingDoc.docId,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Revision failed"); setUploading(false); return; }
      onComplete();
    } catch {
      setError("Connection error. Try again.");
    }
    setUploading(false);
  }

  const isRevision = !!revisionTarget;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <div style={S.title}>{isRevision ? `New Revision: ${revisionTarget.docTypeLabel || revisionTarget.docType}` : "Upload Document"}</div>
          <button style={S.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={S.body}>
          {!isRevision && (
            <div style={S.field}>
              <label style={S.label}>Document Type</label>
              <select style={S.select} value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="">Select type...</option>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>File (PDF)</label>
            <div
              style={{ ...S.dropZone, ...(dragOver ? S.dropZoneActive : {}) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileSelect} />
              {file ? (
                <div style={S.fileName}>{file.name}</div>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Drop a PDF here or click to browse</div>
              )}
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Revision Number (optional)</label>
            <input style={S.input} type="text" placeholder="e.g. Rev 3, v2.1" value={revision} onChange={e => setRevision(e.target.value)} />
          </div>

          <div style={S.field}>
            <label style={S.label}>Effective Date (optional)</label>
            <input style={S.input} type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </div>

          <div style={S.toggleRow}>
            <div>
              <div style={S.toggleLabel}>Requires Acknowledgment</div>
              <div style={S.toggleSub}>Track who has reviewed this document</div>
            </div>
            <button style={{ ...S.toggle, ...(requiresAck ? S.toggleOn : {}) }} onClick={() => setRequiresAck(!requiresAck)}>
              <div style={{ ...S.toggleDot, ...(requiresAck ? S.toggleDotOn : {}) }} />
            </button>
          </div>

          {requiresAck && (
            <div style={{ ...S.field, paddingLeft: 16 }}>
              <label style={S.label}>Acknowledgment Type</label>
              <select style={S.select} value={ackType} onChange={e => setAckType(e.target.value)}>
                <option value="checkbox">Checkbox</option>
                <option value="dropbox_sign">Signature (Dropbox Sign)</option>
              </select>
            </div>
          )}

          <div style={S.toggleRow}>
            <div>
              <div style={S.toggleLabel}>Blockchain Record</div>
              <div style={S.toggleSub}>Tamper-proof proof-of-acknowledgment ($1 per record)</div>
            </div>
            <button style={{ ...S.toggle, ...(blockchainRecord ? S.toggleOn : {}) }} onClick={() => setBlockchainRecord(!blockchainRecord)}>
              <div style={{ ...S.toggleDot, ...(blockchainRecord ? S.toggleDotOn : {}) }} />
            </button>
          </div>

          {conflict && (
            <div style={S.conflictBox}>
              <div style={S.conflictText}>
                A {DOC_TYPES.find(t => t.value === docType)?.label || docType} is already active. Upload as new revision?
              </div>
              <div style={S.conflictBtns}>
                <button style={S.submitBtn} onClick={handleConfirmRevision} disabled={uploading}>
                  {uploading ? "Uploading..." : "Confirm New Revision"}
                </button>
                <button style={S.cancelBtn} onClick={() => setConflict(null)}>Cancel</button>
              </div>
            </div>
          )}

          {error && <div style={S.error}>{error}</div>}
        </div>

        <div style={S.footer}>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
          {!conflict && (
            <button style={{ ...S.submitBtn, opacity: uploading ? 0.7 : 1 }} onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
