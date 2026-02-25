import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
} from "firebase/firestore";

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

const CHANNEL_ICON = { email: "E", sms: "S", chat: "C" };
const SENTIMENT_BADGE = {
  positive: "ac-badge-success",
  negative: "ac-badge-error",
  neutral: "",
};

export default function Communications() {
  const [tab, setTab] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);

  // All messages (inbound first)
  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Draft queue
  useEffect(() => {
    const q = query(
      collection(db, "draftMessages"),
      where("status", "==", "pending_review"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setDrafts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load thread when message selected
  useEffect(() => {
    if (!selected?.contactId) {
      setThread([]);
      return;
    }
    const q = query(
      collection(db, "messages"),
      where("contactId", "==", selected.contactId),
      orderBy("timestamp", "asc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setThread(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selected?.contactId]);

  const inbound = messages.filter((m) => m.direction === "inbound");

  const tabs = [
    { id: "inbox", label: "Unified Inbox" },
    { id: "threads", label: "Thread View" },
    { id: "drafts", label: `Draft Queue (${drafts.length})` },
    { id: "stats", label: "Stats" },
  ];

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Communications</h1>
        <p className="ac-page-subtitle">Unified inbox, threads, and draft queue</p>
      </div>

      <div className="ac-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`ac-tab ${tab === t.id ? "ac-tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Unified Inbox */}
      {tab === "inbox" && (
        <div className="ac-card">
          <div className="ac-card-body" style={{ padding: 0 }}>
            {inbound.length === 0 && (
              <div className="ac-empty">No inbound messages yet.</div>
            )}
            {inbound.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f2f8",
                  cursor: "pointer",
                  background: selected?.id === msg.id ? "rgba(124,58,237,0.04)" : "transparent",
                }}
                onClick={() => setSelected(msg)}
              >
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: msg.channel === "email" ? "rgba(59,130,246,0.1)" : "rgba(34,197,94,0.1)",
                  color: msg.channel === "email" ? "#3b82f6" : "#16a34a",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "11px",
                  fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {CHANNEL_ICON[msg.channel] || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>{msg.from}</span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>{timeAgo(msg.timestamp)}</span>
                  </div>
                  {msg.subject && (
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginTop: "2px" }}>{msg.subject}</div>
                  )}
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {msg.body?.slice(0, 120)}
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                    {msg.intent && <span className="ac-badge">{msg.intent}</span>}
                    {msg.sentiment && <span className={`ac-badge ${SENTIMENT_BADGE[msg.sentiment] || ""}`}>{msg.sentiment}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thread View */}
      {tab === "threads" && (
        <div className="ac-grid-2">
          <div className="ac-card">
            <div className="ac-card-header">
              <span className="ac-card-title">Contacts</span>
            </div>
            <div className="ac-card-body" style={{ padding: 0, maxHeight: "500px", overflowY: "auto" }}>
              {/* Deduplicate by contactId */}
              {[...new Map(messages.filter((m) => m.contactId).map((m) => [m.contactId, m])).values()].map((msg) => (
                <div
                  key={msg.contactId}
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #f0f2f8",
                    cursor: "pointer",
                    background: selected?.contactId === msg.contactId ? "rgba(124,58,237,0.04)" : "transparent",
                  }}
                  onClick={() => setSelected(msg)}
                >
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>{msg.from}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{msg.body?.slice(0, 60)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="ac-card">
            <div className="ac-card-header">
              <span className="ac-card-title">
                {selected ? `Thread — ${selected.from}` : "Select a contact"}
              </span>
            </div>
            <div className="ac-card-body" style={{ maxHeight: "500px", overflowY: "auto" }}>
              {thread.length === 0 && <div className="ac-empty">Select a contact to view thread.</div>}
              {thread.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid #f0f2f8",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: msg.direction === "inbound" ? "#3b82f6" : "#7c3aed" }}>
                      {msg.direction === "inbound" ? msg.from : "Alex (outbound)"}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>{timeAgo(msg.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#334155" }}>{msg.body}</div>
                  {msg.alexResponse && (
                    <div style={{ marginTop: "6px", padding: "8px", background: "rgba(124,58,237,0.04)", borderRadius: "6px", fontSize: "12px", color: "#6d28d9" }}>
                      Alex: {msg.alexResponse}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Draft Queue */}
      {tab === "drafts" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Alex's Draft Queue</span>
          </div>
          <div className="ac-card-body" style={{ padding: 0 }}>
            {drafts.length === 0 && (
              <div className="ac-empty">No drafts pending review.</div>
            )}
            {drafts.map((draft) => (
              <div key={draft.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f0f2f8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>To: {draft.to}</span>
                    <span className="ac-badge" style={{ marginLeft: "8px" }}>{draft.channel}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button className="ac-btn ac-btn-sm ac-btn-primary">Approve</button>
                    <button className="ac-btn ac-btn-sm">Edit</button>
                    <button className="ac-btn ac-btn-sm" style={{ color: "#ef4444" }}>Reject</button>
                  </div>
                </div>
                {draft.subject && <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>{draft.subject}</div>}
                <div style={{ fontSize: "13px", color: "#334155" }}>{draft.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {tab === "stats" && (
        <div className="ac-metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="ac-metric-card">
            <div className="ac-metric-label">Total Messages</div>
            <div className="ac-metric-value">{messages.length}</div>
          </div>
          <div className="ac-metric-card">
            <div className="ac-metric-label">Inbound</div>
            <div className="ac-metric-value">{inbound.length}</div>
          </div>
          <div className="ac-metric-card">
            <div className="ac-metric-label">Outbound</div>
            <div className="ac-metric-value">{messages.filter((m) => m.direction === "outbound").length}</div>
          </div>
          <div className="ac-metric-card">
            <div className="ac-metric-label">Pending Drafts</div>
            <div className="ac-metric-value">{drafts.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}
