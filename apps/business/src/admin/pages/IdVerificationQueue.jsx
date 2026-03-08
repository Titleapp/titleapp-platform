import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

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
  tab: (active) => ({
    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "#7c3aed" : "#1e1e2e",
    color: active ? "white" : "#94a3b8",
    border: active ? "1px solid #7c3aed" : "1px solid #2a2a3a",
  }),
};

function statusBadge(status) {
  const map = {
    pending: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Pending" },
    approved: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Approved" },
    rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return <span style={S.badge(s.color, s.bg)}>{s.label}</span>;
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts._seconds ? new Date(ts._seconds * 1000)
    : ts.seconds ? new Date(ts.seconds * 1000)
    : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeElapsed(ts) {
  if (!ts) return "";
  const submitted = ts._seconds ? ts._seconds * 1000
    : ts.seconds ? ts.seconds * 1000
    : new Date(ts).getTime();
  if (isNaN(submitted)) return "";
  const diff = Date.now() - submitted;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${mins}m ago`;
  return `${mins}m ago`;
}

export default function IdVerificationQueue() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // Real-time Firestore listener
  useEffect(() => {
    setLoading(true);
    setSelected(null);
    setPhotoUrl(null);

    const q = tab === "pending"
      ? query(
          collection(db, "adminQueue"),
          where("type", "==", "id_verification"),
          where("status", "==", "pending"),
          orderBy("submittedAt", "asc")
        )
      : query(
          collection(db, "adminQueue"),
          where("type", "==", "id_verification"),
          where("status", "in", ["approved", "rejected"]),
          orderBy("submittedAt", "desc")
        );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore listener error:", err);
      // Fallback to API
      loadViaApi();
    });

    return () => unsub();
  }, [tab]);

  async function loadViaApi() {
    try {
      const status = tab === "pending" ? "pending" : undefined;
      const endpoint = status ? `admin:verify:id:queue?status=${status}` : "admin:verify:id:queue";
      const res = await adminApi("GET", endpoint);
      if (res.ok) {
        const filtered = tab === "pending"
          ? (res.items || []).filter(i => i.status === "pending")
          : (res.items || []).filter(i => ["approved", "rejected"].includes(i.status));
        setItems(filtered);
      }
    } catch (e) {
      console.error("Failed to load queue:", e);
    }
    setLoading(false);
  }

  async function handleApprove(userId) {
    setActing(true);
    try {
      await adminApi("PUT", "admin:verify:id:approve", { userId });
    } catch (e) {
      console.error("Approve failed:", e);
    }
    setActing(false);
    setSelected(null);
  }

  async function handleReject(userId) {
    if (!rejectReason.trim()) {
      alert("Rejection reason is required.");
      return;
    }
    setActing(true);
    try {
      await adminApi("PUT", "admin:verify:id:reject", { userId, reason: rejectReason });
      setRejectReason("");
    } catch (e) {
      console.error("Reject failed:", e);
    }
    setActing(false);
    setSelected(null);
  }

  async function handleViewPhoto(requestId) {
    setPhotoLoading(true);
    try {
      const res = await adminApi("GET", `admin:verify:id:photo?requestId=${requestId}`);
      if (res.ok && res.url) {
        setPhotoUrl(res.url);
      } else {
        alert("Could not load photo: " + (res.error || "Unknown error"));
      }
    } catch (e) {
      console.error("Photo load failed:", e);
    }
    setPhotoLoading(false);
  }

  const pendingCount = tab === "pending" ? items.length : 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          ID Verification Queue
        </h2>
        {pendingCount > 0 && tab === "pending" && (
          <span style={S.badge("#f59e0b", "rgba(245,158,11,0.12)")}>{pendingCount}</span>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={S.tab(tab === "pending")} onClick={() => setTab("pending")}>
          Pending
        </button>
        <button style={S.tab(tab === "processed")} onClick={() => setTab("processed")}>
          Processed
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading...</p>
      ) : items.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            {tab === "pending" ? "No pending ID verifications." : "No processed verifications yet."}
          </p>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                ...S.card,
                cursor: "pointer",
                borderColor: selected?.id === item.id ? "#7c3aed" : "#2a2a3a",
              }}
              onClick={() => { setSelected(selected?.id === item.id ? null : item); setRejectReason(""); setPhotoUrl(null); }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{item.name || "Unknown"}</span>
                  <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 8 }}>{item.email || ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {statusBadge(item.status)}
                  {item.status === "pending" && (
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{timeElapsed(item.submittedAt)}</span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                Submitted: {formatDate(item.submittedAt)}
              </div>

              {/* Expanded detail when selected */}
              {selected?.id === item.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a3a" }}>
                  {/* Photo ID viewer */}
                  <div style={{ marginBottom: 12 }}>
                    <span style={S.label}>Photo ID</span>
                    {photoUrl ? (
                      <div style={{ marginTop: 8 }}>
                        <img
                          src={photoUrl}
                          alt="Photo ID"
                          style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid #2a2a3a" }}
                        />
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                          Signed URL expires in 5 minutes
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewPhoto(item.id); }}
                        style={{ ...S.btnPrimary, background: "#1e1e2e", color: "#7c3aed", border: "1px solid #2a2a3a", marginTop: 4 }}
                        disabled={photoLoading}
                      >
                        {photoLoading ? "Loading..." : "View ID"}
                      </button>
                    )}
                  </div>

                  {item.status === "pending" && (
                    <>
                      {/* Rejection reason */}
                      <div style={{ marginBottom: 12 }}>
                        <span style={S.label}>Rejection Reason (required for reject)</span>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. Photo is blurry, ID is expired"
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
                          onClick={(e) => { e.stopPropagation(); handleApprove(item.userId); }}
                        >
                          {acting ? "..." : "Approve"}
                        </button>
                        <button
                          style={S.btnDanger}
                          disabled={acting}
                          onClick={(e) => { e.stopPropagation(); handleReject(item.userId); }}
                        >
                          {acting ? "..." : "Reject"}
                        </button>
                      </div>
                    </>
                  )}

                  {item.status === "rejected" && item.rejectionReason && (
                    <div>
                      <span style={S.label}>Rejection Reason</span>
                      <span style={{ fontSize: 13, color: "#ef4444" }}>{item.rejectionReason}</span>
                    </div>
                  )}

                  {item.status === "approved" && (
                    <div>
                      <span style={S.label}>Approved</span>
                      <span style={{ fontSize: 13, color: "#10b981" }}>{formatDate(item.approvedAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
