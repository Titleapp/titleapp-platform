import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function adminApi(method, endpoint, body) {
  const token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=/v1/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": "admin",
      "X-Vertical": "developer",
      "X-Jurisdiction": "GLOBAL",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const S = {
  card: { background: "#FFFFFF", borderRadius: 10, padding: 20, border: "1px solid #E2E8F0", marginBottom: 12, cursor: "pointer", transition: "border-color 0.2s" },
  badge: (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, color, background: bg }),
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" },
  btnPrimary: { padding: "10px 20px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnDanger: { padding: "10px 20px", background: "#dc2626", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 20px", background: "#FFFFFF", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

function GateDot({ passed }) {
  return <div style={{ width: 8, height: 8, borderRadius: 4, background: passed ? "#10b981" : "#dc2626", flexShrink: 0 }} />;
}

export default function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await adminApi("GET", "admin:workers:review:list");
      if (res.ok) setItems(res.items || []);
    } catch (e) {
      console.error("Failed to load review queue:", e);
    }
    setLoading(false);
  }

  async function selectItem(item) {
    setSelected(item);
    setNotes("");
    setError(null);
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=/v1/workers:list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": item.tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
      });
      const data = await res.json();
      if (data.ok && data.workers) {
        const w = data.workers.find(w => w.id === item.workerId);
        setWorkerDetail(w || null);
      }
    } catch {}
    setLoadingDetail(false);
  }

  async function handleDecision(decision) {
    if (!selected) return;

    // If money transmission flagged AND approving, require "legal review" in notes
    const isFlagged = selected.moneyTransmissionFlagged || workerDetail?.publishFlow?.moneyTransmissionFlagged;
    if (decision === "approved" && isFlagged && !notes.toLowerCase().includes("legal review")) {
      setError("This worker is flagged for money transmission. You must include 'legal review' in your notes to confirm legal review was completed.");
      return;
    }

    setActing(true);
    setError(null);
    try {
      const res = await adminApi("POST", "admin:worker:review", {
        workerId: selected.workerId,
        tenantId: selected.tenantId,
        decision,
        notes,
      });
      if (res.ok) {
        setSelected(null);
        setWorkerDetail(null);
        loadQueue();
      } else {
        setError(res.error || "Action failed. " + (res.failedGates ? `Failed gates: ${res.failedGates.join(", ")}` : ""));
      }
    } catch (e) {
      console.error("Review action failed:", e);
      setError("Connection error. Try again.");
    }
    setActing(false);
  }

  if (selected) {
    const isFlagged = selected.moneyTransmissionFlagged || workerDetail?.publishFlow?.moneyTransmissionFlagged;
    const gateResults = workerDetail?.publishFlow?.gateResults || [];

    return (
      <div style={{ maxWidth: 800 }}>
        <button style={{ ...S.btnSecondary, marginBottom: 20 }} onClick={() => { setSelected(null); setWorkerDetail(null); }}>
          &#8592; Back to queue
        </button>

        <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{selected.workerName}</div>
        <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
          {selected.vertical} / {selected.jurisdiction} — submitted by {selected.creatorEmail}
        </div>

        {/* Money Transmission Flag Banner */}
        {isFlagged && (
          <div style={{
            background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10,
            padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>&#9888;</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>Money Transmission Flag</div>
              <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
                This worker has been flagged for potential money transmission activity. Legal review is required before approval. Include "legal review" in your notes to confirm.
              </div>
            </div>
          </div>
        )}

        {loadingDetail ? (
          <div style={{ color: "#64748B", padding: 40, textAlign: "center" }}>Loading worker details...</div>
        ) : workerDetail ? (
          <>
            {/* Publish Gates Status */}
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 }}>Publish Gates</div>
              {gateResults.length > 0 ? (
                gateResults.map((gate, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <GateDot passed={gate.passed} />
                    <span style={{ fontSize: 13, color: "#1a1a2e", flex: 1 }}>{gate.label || gate.id}</span>
                    <span style={{ fontSize: 12, color: gate.passed ? "#10b981" : "#dc2626" }}>
                      {gate.passed ? "Passed" : gate.flagged ? "Flagged" : "Failed"}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <GateDot passed={!!workerDetail.publishFlow?.identityVerified} />
                    <span style={{ fontSize: 13, color: "#1a1a2e" }}>Identity Verification</span>
                    <span style={{ fontSize: 12, color: workerDetail.publishFlow?.identityVerified ? "#10b981" : "#dc2626", marginLeft: "auto" }}>
                      {workerDetail.publishFlow?.identityVerified ? "Verified" : "Not verified"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <GateDot passed={!!workerDetail.publishFlow?.waiverSigned} />
                    <span style={{ fontSize: 13, color: "#1a1a2e" }}>Liability Disclaimer</span>
                    <span style={{ fontSize: 12, color: workerDetail.publishFlow?.waiverSigned ? "#10b981" : "#dc2626", marginLeft: "auto" }}>
                      {workerDetail.publishFlow?.waiverSigned ? "Accepted" : "Not accepted"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pre-publish score */}
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Pre-Publish Score</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: selected.prePublishScore >= 6 ? "#10b981" : "#f59e0b" }}>
                {selected.prePublishScore}/7
              </div>
              {(workerDetail.prePublishCheck?.checks || []).map((check, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: check.status === "pass" ? "#10b981" : check.status === "warning" ? "#f59e0b" : "#f87171" }} />
                  <span style={{ fontSize: 13, color: "#1a1a2e" }}>{check.name}</span>
                  <span style={{ fontSize: 12, color: "#64748B", marginLeft: "auto" }}>{check.status}</span>
                </div>
              ))}
            </div>

            {/* Rules Library */}
            {workerDetail.raasLibrary && (
              <div style={S.card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Rules Library</div>
                {[
                  { label: "Tier 0 — Platform", rules: workerDetail.raasLibrary.tier0, color: "#64748B" },
                  { label: "Tier 1 — Regulatory", rules: workerDetail.raasLibrary.tier1, color: "#dc2626" },
                  { label: "Tier 2 — Best Practices", rules: workerDetail.raasLibrary.tier2, color: "#f59e0b" },
                  { label: "Tier 3 — Creator SOPs", rules: workerDetail.raasLibrary.tier3, color: "#10b981" },
                ].map(({ label, rules, color }) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 6 }}>{label} ({(rules || []).length})</div>
                    {(rules || []).map((r, i) => (
                      <div key={i} style={{ fontSize: 13, color: "#64748B", padding: "4px 0 4px 16px", borderLeft: `2px solid ${color}` }}>{r}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Compliance Brief */}
            {workerDetail.complianceBrief && (
              <div style={S.card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Compliance Brief</div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{workerDetail.complianceBrief.summary}</div>
              </div>
            )}
            {/* Conflict of Interest Flags */}
            {(workerDetail.conflictFlags?.length > 0 || selected.conflictFlags?.length > 0) && (
              <div style={{
                ...S.card, borderColor: "#f59e0b",
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#92400E", marginBottom: 8 }}>Conflict of Interest Flags</div>
                {(workerDetail.conflictFlags || selected.conflictFlags || []).map((flag, i) => (
                  <div key={i} style={{
                    fontSize: 13, color: "#92400E", padding: "6px 10px", background: "#FFFBEB",
                    borderRadius: 6, marginBottom: 4, lineHeight: 1.5,
                  }}>
                    {flag}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>
                  Per Section 9: TitleApp will not build workers that directly compete with creator-built workers in the same vertical and use case.
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "#64748B", padding: 40, textAlign: "center" }}>Could not load worker details.</div>
        )}

        {/* Decision */}
        <div style={{ ...S.card, borderColor: "#6B46C1" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Decision</div>
          <textarea
            style={{ width: "100%", minHeight: 80, padding: 12, background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 13, outline: "none", resize: "vertical", marginBottom: 12 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isFlagged ? 'Notes required — include "legal review" to confirm legal review was completed' : "Optional notes for the creator..."}
          />
          {error && (
            <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, padding: "8px 12px", background: "#FEF2F2", borderRadius: 6 }}>{error}</div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => handleDecision("approved")} disabled={acting}>
              {acting ? "Processing..." : "Approve & Publish"}
            </button>
            <button style={S.btnDanger} onClick={() => handleDecision("rejected")} disabled={acting}>
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Review Queue</div>
          <div style={{ fontSize: 14, color: "#64748B", marginTop: 2 }}>Digital Workers pending review before marketplace publication.</div>
        </div>
        <button style={S.btnSecondary} onClick={loadQueue}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ color: "#64748B", padding: 40, textAlign: "center" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>No pending reviews</div>
          <div style={{ fontSize: 14 }}>When creators submit Digital Workers for publication, they will appear here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={S.card}
              onClick={() => selectItem(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6B46C1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{item.workerName}</span>
                    {item.moneyTransmissionFlagged && (
                      <span style={S.badge("#92400E", "#FEF3C7")}>Money Transmission</span>
                    )}
                    {item.requiresLegalReview && (
                      <span style={S.badge("#dc2626", "#FEE2E2")}>Legal Review</span>
                    )}
                    {item.conflictFlags?.length > 0 && (
                      <span style={S.badge("#92400E", "#FEF3C7")}>COI Flag</span>
                    )}
                    {item.type === "low_rating_review" && (
                      <span style={S.badge("#dc2626", "#FEE2E2")}>Low Rating ({item.averageRating})</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                    {item.vertical} / {item.jurisdiction} — {item.creatorEmail}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={S.badge(item.prePublishScore >= 6 ? "#065f46" : "#92400e", item.prePublishScore >= 6 ? "#d1fae5" : "#fef3c7")}>
                    {item.prePublishScore}/7
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                    {item.submittedAt?.toDate ? item.submittedAt.toDate().toLocaleDateString() : "Just now"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
