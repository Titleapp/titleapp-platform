import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import useAdminAuth from "../hooks/useAdminAuth";

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function EscalationLog() {
  const { user } = useAdminAuth();
  const [escalations, setEscalations] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "escalations"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setEscalations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function resolve(escId) {
    await updateDoc(doc(db, "escalations", escId), {
      resolved: true,
      resolvedAt: serverTimestamp(),
      resolvedBy: user?.email || "admin",
      resolution: resolution || "Resolved by admin",
    });
    setResolvingId(null);
    setResolution("");
  }

  return (
    <div>
      {escalations.length === 0 && (
        <div className="ac-empty">No escalations.</div>
      )}
      <table className="ac-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Domain</th>
            <th>Reason</th>
            <th>Context</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {escalations.map((esc) => (
            <tr key={esc.id}>
              <td style={{ whiteSpace: "nowrap" }}>{timeAgo(esc.timestamp)}</td>
              <td>
                <span className="ac-badge">{esc.domain}</span>
              </td>
              <td style={{ fontWeight: 600 }}>{esc.reason}</td>
              <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {esc.context}
              </td>
              <td>
                {esc.resolved ? (
                  <span className="ac-badge ac-badge-success">Resolved</span>
                ) : (
                  <span className="ac-badge ac-badge-warning">Open</span>
                )}
              </td>
              <td>
                {!esc.resolved && (
                  resolvingId === esc.id ? (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        className="ac-input"
                        style={{ width: "160px", fontSize: "12px" }}
                        placeholder="Resolution note..."
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                      />
                      <button className="ac-btn ac-btn-sm ac-btn-primary" onClick={() => resolve(esc.id)}>
                        Save
                      </button>
                      <button className="ac-btn ac-btn-sm" onClick={() => setResolvingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="ac-btn ac-btn-sm" onClick={() => setResolvingId(esc.id)}>
                      Resolve
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
