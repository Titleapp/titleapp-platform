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
  card: { background: "#16161e", borderRadius: 10, padding: 20, border: "1px solid #2a2a3a", marginBottom: 12, cursor: "pointer", transition: "border-color 0.2s" },
  badge: (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, color, background: bg }),
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" },
  btnPrimary: { padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnDanger: { padding: "10px 20px", background: "#dc2626", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 20px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

export default function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);

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
    setLoadingDetail(true);
    try {
      // Load full worker details
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
    setActing(true);
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
      }
    } catch (e) {
      console.error("Review action failed:", e);
    }
    setActing(false);
  }

  if (selected) {
    return (
      <div style={{ maxWidth: 800 }}>
        <button style={{ ...S.btnSecondary, marginBottom: 20 }} onClick={() => { setSelected(null); setWorkerDetail(null); }}>
          &#8592; Back to queue
        </button>

        <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{selected.workerName}</div>
        <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
          {selected.vertical} / {selected.jurisdiction} — submitted by {selected.creatorEmail}
        </div>

        {loadingDetail ? (
          <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading worker details...</div>
        ) : workerDetail ? (
          <>
            {/* Pre-publish score */}
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Pre-Publish Score</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: selected.prePublishScore >= 6 ? "#10b981" : "#f59e0b" }}>
                {selected.prePublishScore}/7
              </div>
              {(workerDetail.prePublishCheck?.checks || []).map((check, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: check.status === "pass" ? "#10b981" : check.status === "warning" ? "#f59e0b" : "#f87171" }} />
                  <span style={{ fontSize: 13, color: "#e2e8f0" }}>{check.name}</span>
                  <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>{check.status}</span>
                </div>
              ))}
            </div>

            {/* Rules Library */}
            {workerDetail.raasLibrary && (
              <div style={S.card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Rules Library</div>
                {[
                  { label: "Tier 0 — Platform", rules: workerDetail.raasLibrary.tier0, color: "#64748b" },
                  { label: "Tier 1 — Regulatory", rules: workerDetail.raasLibrary.tier1, color: "#f87171" },
                  { label: "Tier 2 — Best Practices", rules: workerDetail.raasLibrary.tier2, color: "#f59e0b" },
                  { label: "Tier 3 — Creator SOPs", rules: workerDetail.raasLibrary.tier3, color: "#10b981" },
                ].map(({ label, rules, color }) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 6 }}>{label} ({(rules || []).length})</div>
                    {(rules || []).map((r, i) => (
                      <div key={i} style={{ fontSize: 13, color: "#94a3b8", padding: "4px 0 4px 16px", borderLeft: `2px solid ${color}` }}>{r}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Compliance Brief */}
            {workerDetail.complianceBrief && (
              <div style={S.card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Compliance Brief</div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{workerDetail.complianceBrief.summary}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Could not load worker details.</div>
        )}

        {/* Decision */}
        <div style={{ ...S.card, borderColor: "#7c3aed" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Decision</div>
          <textarea
            style={{ width: "100%", minHeight: 80, padding: 12, background: "#0f0f14", border: "1px solid #2a2a3a", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", resize: "vertical", marginBottom: 12 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the creator..."
          />
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
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>Review Queue</div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 2 }}>Digital Workers pending review before marketplace publication.</div>
        </div>
        <button style={S.btnSecondary} onClick={loadQueue}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>No pending reviews</div>
          <div style={{ fontSize: 14 }}>When creators submit Digital Workers for publication, they will appear here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={S.card}
              onClick={() => selectItem(item)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a3a"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{item.workerName}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                    {item.vertical} / {item.jurisdiction} — {item.creatorEmail}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={S.badge(item.prePublishScore >= 6 ? "#065f46" : "#92400e", item.prePublishScore >= 6 ? "#d1fae5" : "#fef3c7")}>
                    {item.prePublishScore}/7
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
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
