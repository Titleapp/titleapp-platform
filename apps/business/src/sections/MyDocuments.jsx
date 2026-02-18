import React, { useState, useEffect } from "react";
import * as api from "../api/client";

export default function MyDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      // General important documents — NOT credentials/certifications (those have their own section)
      setDocuments(all.filter((i) =>
        i.type === "document" || i.type === "general" ||
        (i.metadata?.documentType && !i.metadata?.credentialName && !i.metadata?.school)
      ));
    } catch (e) {
      console.error("Failed to load documents:", e);
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
          <h1 className="h1">My Important Stuff</h1>
          <p className="subtle">Birth certificates, passports, wills, insurance policies, tax records, contracts, and more</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "28px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>
            Your important documents, all in one place
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Store and manage the documents that matter most -- IDs, certificates, contracts, tax records, insurance policies, and anything else you need to keep safe and accessible.
          </div>
          <button
            onClick={() => openChat("I want to add an important document to my vault")}
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
            Add Document
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {documents.map((d) => (
            <div key={d.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                    {d.metadata?.documentName || d.metadata?.title || "Document"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                    {d.metadata?.documentType || ""}
                    {d.metadata?.issueDate && ` -- Issued ${d.metadata.issueDate}`}
                  </div>
                </div>
                <span className={`badge badge-${d.status || "draft"}`}>{d.status || "Draft"}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px" }}>
                Added {new Date(d.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
