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
  card: { background: "#16161e", borderRadius: 10, padding: 16, border: "1px solid #2a2a3a", marginBottom: 10 },
  badge: (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, color, background: bg }),
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" },
  btnPrimary: { padding: "8px 16px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnDanger: { padding: "8px 16px", background: "#dc2626", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "8px 16px", background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  tab: (active) => ({
    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "#7c3aed" : "#1e1e2e",
    color: active ? "white" : "#94a3b8",
    border: active ? "1px solid #7c3aed" : "1px solid #2a2a3a",
  }),
};

function statusBadge(status, faaStatus) {
  const map = {
    pending: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Pending" },
    cert_verified: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Cert Verified" },
    manual_review: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Manual Review" },
    approved: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Approved" },
    rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return <span style={S.badge(s.color, s.bg)}>{s.label}</span>;
}

function faaStatusBadge(status) {
  if (!status) return null;
  const map = {
    verified: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "FAA Verified" },
    not_found: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "FAA Not Found" },
    no_cfi_rating: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "No CFI Rating" },
    unavailable: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "FAA Unavailable" },
  };
  const s = map[status] || { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: status };
  return <span style={{ ...S.badge(s.color, s.bg), marginLeft: 6 }}>{s.label}</span>;
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function VerificationQueue() {
  const [tab, setTab] = useState("student");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => { loadQueue(); }, [tab]);

  async function loadQueue() {
    setLoading(true);
    setSelected(null);
    try {
      const endpoint = tab === "student" ? "admin:verify:student:queue" : "admin:verify:cfi:queue";
      const res = await adminApi("GET", endpoint);
      if (res.ok) setItems(res.items || []);
      else setItems([]);
    } catch (e) {
      console.error("Failed to load queue:", e);
      setItems([]);
    }
    setLoading(false);
  }

  async function handleApprove(userId) {
    setActing(true);
    try {
      const endpoint = tab === "student" ? "admin:verify:student:approve" : "admin:verify:cfi:approve";
      await adminApi("PUT", endpoint, { userId });
      await loadQueue();
    } catch (e) {
      console.error("Approve failed:", e);
    }
    setActing(false);
  }

  async function handleReject(userId) {
    if (!confirm("Reject this verification? The user will be notified.")) return;
    setActing(true);
    try {
      const endpoint = tab === "student" ? "admin:verify:student:reject" : "admin:verify:cfi:reject";
      await adminApi("PUT", endpoint, { userId, reason: rejectReason });
      setRejectReason("");
      await loadQueue();
    } catch (e) {
      console.error("Reject failed:", e);
    }
    setActing(false);
  }

  const pending = items.filter(i => ["pending", "manual_review", "cert_verified"].includes(i.status));
  const resolved = items.filter(i => ["approved", "rejected"].includes(i.status));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>
        Verification Queue
      </h2>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={S.tab(tab === "student")} onClick={() => setTab("student")}>
          Student Pilots
        </button>
        <button style={S.tab(tab === "cfi")} onClick={() => setTab("cfi")}>
          CFI/CFII Instructors
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading...</p>
      ) : items.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>No {tab === "student" ? "student" : "CFI"} verifications in queue.</p>
        </div>
      ) : (
        <>
          {/* Pending section */}
          {pending.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Pending Review ({pending.length})
              </h3>
              {pending.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...S.card,
                    cursor: "pointer",
                    borderColor: selected?.id === item.id ? "#7c3aed" : "#2a2a3a",
                  }}
                  onClick={() => { setSelected(item); setRejectReason(""); }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{item.name}</span>
                      <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 8 }}>{item.email}</span>
                    </div>
                    <div>
                      {statusBadge(item.status)}
                      {tab === "cfi" && faaStatusBadge(item.faa_check_status)}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>{tab === "student" ? item.school : item.academy}</span>
                    {tab === "cfi" && item.cert_number && <span>Cert: {item.cert_number}</span>}
                    {tab === "cfi" && item.ratings && <span>Ratings: {item.ratings.join(", ")}</span>}
                    <span>Submitted: {formatDate(item.submitted_at)}</span>
                  </div>

                  {/* Expanded detail when selected */}
                  {selected?.id === item.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a3a" }}>
                      {item.photo_url && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={S.label}>ID Photo</span>
                          <a
                            href={item.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#7c3aed", fontSize: 13 }}
                          >
                            View Photo
                          </a>
                        </div>
                      )}

                      {tab === "student" && item.enrollment_type && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={S.label}>Enrollment Type</span>
                          <span style={{ fontSize: 13, color: "#e2e8f0" }}>
                            {item.enrollment_type.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}

                      {/* Reject reason input */}
                      <div style={{ marginBottom: 12 }}>
                        <span style={S.label}>Rejection Reason (optional)</span>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. Could not verify enrollment"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: 8,
                            border: "1px solid #2a2a3a", background: "#1e1e2e",
                            color: "#e2e8f0", fontSize: 13, boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={S.btnPrimary}
                          disabled={acting}
                          onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                        >
                          {acting ? "..." : "Approve"}
                        </button>
                        <button
                          style={S.btnDanger}
                          disabled={acting}
                          onClick={(e) => { e.stopPropagation(); handleReject(item.id); }}
                        >
                          {acting ? "..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Resolved section */}
          {resolved.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", marginBottom: 10, marginTop: 24, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Resolved ({resolved.length})
              </h3>
              {resolved.map((item) => (
                <div key={item.id} style={{ ...S.card, opacity: 0.7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{item.name}</span>
                      <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 8 }}>
                        {tab === "student" ? item.school : item.academy}
                      </span>
                    </div>
                    {statusBadge(item.status)}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
