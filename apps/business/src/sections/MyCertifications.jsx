import React, { useState, useEffect } from "react";
import * as api from "../api/client";

export default function MyCertifications() {
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertifications();
  }, []);

  async function loadCertifications() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setCertifications(all.filter((i) =>
        i.metadata?.credentialName || i.metadata?.school || i.metadata?.issuer ||
        i.type === "credential" || i.type === "education" || i.type === "certification"
      ));
    } catch (e) {
      console.error("Failed to load certifications:", e);
    } finally {
      setLoading(false);
    }
  }

  function openChat(prompt) {
    window.dispatchEvent(
      new CustomEvent("ta:chatPrompt", {
        detail: { message: prompt },
      })
    );
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Student Records & Certifications</h1>
          <p className="subtle">Academic transcripts, degrees, professional licenses, industry certifications, and credentials</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading certifications...
        </div>
      ) : certifications.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>
            Track your education and credentials
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Academic records, degrees, professional licenses, industry certifications -- keep them all current with expiration tracking and renewal reminders.
          </div>
          <button
            onClick={() => openChat("I want to add a record to my vault")}
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add Record
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {certifications.map((d) => (
            <div key={d.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                    {d.metadata?.credentialName || d.metadata?.school || d.metadata?.issuer || "Certification"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                    {d.metadata?.program || d.metadata?.issuer || ""}
                    {d.metadata?.issueDate && ` -- Issued ${d.metadata.issueDate}`}
                  </div>
                  {d.metadata?.expiryDate && (
                    <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>
                      Expires: {d.metadata.expiryDate}
                    </div>
                  )}
                </div>
                <span className={`badge badge-${d.status || "draft"}`}>{d.status || "Draft"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
