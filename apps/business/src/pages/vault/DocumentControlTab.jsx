import React, { useState, useEffect, useCallback } from "react";
import DocumentUploadModal from "./DocumentUploadModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import AcknowledgmentStatusPanel from "./AcknowledgmentStatusPanel";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const STATUS_COLORS = {
  active: { bg: "#dcfce7", color: "#166534", label: "Active" },
  expired: { bg: "#fee2e2", color: "#991b1b", label: "Expired" },
  superseded: { bg: "#f1f5f9", color: "#475569", label: "Superseded" },
  pending_review: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
};

const S = {
  wrap: { padding: "24px 0" },
  banner: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, marginBottom: 24, fontSize: 14, fontWeight: 600 },
  bannerEnforced: { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
  bannerAdvisory: { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" },
  emptyWrap: { textAlign: "center", padding: "64px 24px" },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  emptyTitle: { fontSize: 17, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 },
  emptyBody: { fontSize: 14, color: "#94a3b8", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 24px" },
  uploadBtn: { padding: "12px 28px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  docRow: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, marginBottom: 8, cursor: "pointer" },
  docName: { fontSize: 14, fontWeight: 600, color: "#e2e8f0" },
  docMeta: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  badge: { display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 },
  actions: { display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0 },
  actionBtn: { padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, cursor: "pointer" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
};

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default function DocumentControlTab({ workerId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null); // "history" | "ack"

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=/v1/docControl:list&workerId=${encodeURIComponent(workerId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
    setLoading(false);
  }, [workerId]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  function handleUploadComplete() {
    setShowUpload(false);
    setRevisionTarget(null);
    loadDocuments();
  }

  function handleNewRevision(doc) {
    setRevisionTarget(doc);
    setShowUpload(true);
  }

  function togglePanel(docId, panel) {
    if (expandedDoc === docId && expandedPanel === panel) {
      setExpandedDoc(null);
      setExpandedPanel(null);
    } else {
      setExpandedDoc(docId);
      setExpandedPanel(panel);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading documents...</div>;
  }

  const hasDocuments = documents.length > 0;

  return (
    <div style={S.wrap}>
      {hasDocuments ? (
        <>
          <div style={{ ...S.banner, ...S.bannerEnforced }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            Document Control Active — RAAS enforced
          </div>

          <div style={S.headerRow}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{documents.length} document{documents.length !== 1 ? "s" : ""}</div>
            <button onClick={() => setShowUpload(true)} style={S.uploadBtn}>Upload Document</button>
          </div>

          {documents.map(doc => {
            const statusStyle = STATUS_COLORS[doc.status] || STATUS_COLORS.active;
            const isExpanded = expandedDoc === doc.docId;
            return (
              <div key={doc.docId}>
                <div style={S.docRow} onClick={() => togglePanel(doc.docId, expandedPanel || "history")}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.docName}>{doc.fileName}</div>
                    <div style={S.docMeta}>
                      {doc.docTypeLabel || doc.docType}
                      {doc.revisionNumber && <> &middot; Rev {doc.revisionNumber}</>}
                      {doc.effectiveDate && <> &middot; Effective {new Date(doc.effectiveDate).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <span style={{ ...S.badge, background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                  <div style={S.actions}>
                    <button style={S.actionBtn} onClick={(e) => { e.stopPropagation(); togglePanel(doc.docId, "history"); }}>History</button>
                    {doc.requiresAcknowledgment && (
                      <button style={S.actionBtn} onClick={(e) => { e.stopPropagation(); togglePanel(doc.docId, "ack"); }}>Acks</button>
                    )}
                    <button style={S.actionBtn} onClick={(e) => { e.stopPropagation(); handleNewRevision(doc); }}>New Rev</button>
                  </div>
                </div>
                {isExpanded && expandedPanel === "history" && (
                  <VersionHistoryPanel workerId={workerId} docType={doc.docType} />
                )}
                {isExpanded && expandedPanel === "ack" && (
                  <AcknowledgmentStatusPanel docId={doc.docId} />
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div style={S.emptyWrap}>
          <div style={S.emptyIcon}><UploadIcon /></div>
          <div style={S.emptyTitle}>No documents loaded for this worker</div>
          <div style={S.emptyBody}>
            Upload your operator documents to enable enforced, version-tracked responses. Without documents, this worker runs on platform baseline rules only and responses are advisory.
          </div>
          <button onClick={() => setShowUpload(true)} style={S.uploadBtn}>Upload Documents</button>
        </div>
      )}

      {!hasDocuments && (
        <div style={{ ...S.banner, ...S.bannerAdvisory, marginTop: 24 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          Advisory Only — upload operator documents to enable RAAS enforcement
        </div>
      )}

      {showUpload && (
        <DocumentUploadModal
          workerId={workerId}
          revisionTarget={revisionTarget}
          onClose={() => { setShowUpload(false); setRevisionTarget(null); }}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
