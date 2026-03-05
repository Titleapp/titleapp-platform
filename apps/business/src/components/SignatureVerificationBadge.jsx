import { useState } from "react";

export default function SignatureVerificationBadge({ signers, blockchain, requestId, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!signers || signers.length === 0) return null;

  const completedSigners = signers.filter(s => s.status === "signed");
  const allSigned = completedSigners.length === signers.length;

  function copyHash() {
    const hash = blockchain?.finalHash || blockchain?.preSignHash || "";
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatDate(d) {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (compact) {
    // Just show a small badge
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px",
        background: allSigned ? "#dcfce7" : "#fef3c7",
        color: allSigned ? "#16a34a" : "#d97706",
      }}>
        {allSigned ? "Signed" : `${completedSigners.length}/${signers.length} signed`}
      </span>
    );
  }

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginTop: "8px" }}>
      {/* Collapsed header — always visible */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 14px", background: allSigned ? "#f0fdf4" : "#fffbeb",
        border: "none", cursor: "pointer", textAlign: "left",
      }}>
        {/* Shield icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={allSigned ? "#16a34a" : "#d97706"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {allSigned && <polyline points="9 12 11 14 15 10" />}
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: allSigned ? "#16a34a" : "#d97706" }}>
            {allSigned ? "All signatures verified" : `${completedSigners.length} of ${signers.length} signatures captured`}
          </div>
          {completedSigners.length > 0 && (
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>
              Last signed by {completedSigners[completedSigners.length - 1].name}
              {completedSigners[completedSigners.length - 1].signedAt && ` — ${formatDate(completedSigners[completedSigners.length - 1].signedAt)}`}
            </div>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #e2e8f0", background: "#fff" }}>
          {/* Signer list */}
          {signers.map((signer, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0",
              borderBottom: i < signers.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700,
                background: signer.status === "signed" ? "#dcfce7" : signer.status === "declined" ? "#fef2f2" : "#f1f5f9",
                color: signer.status === "signed" ? "#16a34a" : signer.status === "declined" ? "#dc2626" : "#94a3b8",
              }}>
                {signer.status === "signed" ? "\u2713" : signer.status === "declined" ? "\u2717" : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                  {signer.name} <span style={{ fontWeight: 400, color: "#94a3b8" }}>({signer.role || "signer"})</span>
                </div>
                {signer.signedAt && (
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{formatDate(signer.signedAt)}</div>
                )}
              </div>
              <span style={{
                fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px",
                background: signer.status === "signed" ? "#dcfce7" : signer.status === "declined" ? "#fef2f2" : "#f1f5f9",
                color: signer.status === "signed" ? "#16a34a" : signer.status === "declined" ? "#dc2626" : "#94a3b8",
              }}>
                {signer.status}
              </span>
            </div>
          ))}

          {/* Blockchain hash */}
          {blockchain && (blockchain.finalHash || blockchain.preSignHash) && (
            <div style={{ marginTop: "10px", padding: "8px 10px", background: "#f8fafc", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                Blockchain Verification
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <code style={{ fontSize: "11px", color: "#334155", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(blockchain.finalHash || blockchain.preSignHash).slice(0, 16)}...{(blockchain.finalHash || blockchain.preSignHash).slice(-8)}
                </code>
                <button onClick={copyHash} style={{
                  fontSize: "11px", padding: "2px 8px", border: "1px solid #e2e8f0",
                  borderRadius: "4px", cursor: "pointer", background: "#fff", color: "#64748b",
                }}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
