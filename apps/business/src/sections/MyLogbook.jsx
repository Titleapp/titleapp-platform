import React, { useState, useEffect } from "react";
import * as api from "../api/client";

export default function MyLogbook() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogbook();
  }, []);

  async function loadLogbook() {
    try {
      const result = await api.getAIActivity({ vertical: "consumer", jurisdiction: "GLOBAL", limit: 50 });
      setEntries(result.activity || []);
    } catch (e) {
      console.error("Failed to load logbook:", e);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Logbook</h1>
          <p className="subtle">A timeline of every action, verification, and change across your records</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading logbook...
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>&#x1F4D3;</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
            No activity yet
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
            Your logbook will record every action you take -- adding records, verifying identity, uploading documents. Everything is timestamped and permanent.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="tdMuted" style={{ whiteSpace: "nowrap" }}>{formatDate(entry.createdAt)}</td>
                    <td className="tdStrong">{entry.workflowId || entry.type || "Activity"}</td>
                    <td>{entry.description || entry.summary || "--"}</td>
                    <td>
                      <span className={`badge badge-${entry.status || "completed"}`}>
                        {entry.status || "completed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
