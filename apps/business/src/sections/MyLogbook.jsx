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
          <p className="subtle">Your permanent activity timeline and Digital Title Certificate records</p>
        </div>
      </div>

      {/* DTC Explanation */}
      <div className="card" style={{ marginBottom: "16px", padding: "20px", background: "#faf5ff", border: "1px solid #e9d5ff" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
          What is a Digital Title Certificate?
        </div>
        <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.7" }}>
          A Digital Title Certificate (DTC) is a verified, timestamped record of ownership or attestation for your assets. Every time you add a vehicle, property, credential, or important document to your Vault, TitleApp creates a DTC that serves as permanent proof of that record. Your Logbook is where every DTC and every action you take -- additions, updates, verifications, transfers -- appears automatically as a permanent timeline.
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading logbook...
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>
            No logbook entries yet
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: "0 auto", lineHeight: "1.6" }}>
            Add a vehicle, property, or document to get started. Your DTC records and all activity will appear here automatically as a permanent timeline.
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
