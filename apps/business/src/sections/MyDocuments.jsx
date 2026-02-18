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
      // Credentials, certificates, education records, and other documents
      setDocuments(all.filter((i) =>
        i.metadata?.credentialName || i.metadata?.school || i.metadata?.issuer || i.type === "credential" || i.type === "education"
      ));
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  }

  function getDocIcon(doc) {
    if (doc.metadata?.school || doc.type === "education") return "&#x1F393;";
    if (doc.metadata?.credentialName || doc.type === "credential") return "&#x1F4DC;";
    return "&#x1F4C4;";
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Documents</h1>
          <p className="subtle">Credentials, certificates, and education records</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>&#x1F4C1;</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
            No documents yet
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
            Add credentials, education records, or certificates through the AI assistant. Try "Add a credential" or "Student records" to get started.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {documents.map((d) => (
            <div key={d.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "24px" }} dangerouslySetInnerHTML={{ __html: getDocIcon(d) }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                      {d.metadata?.credentialName || d.metadata?.school || d.metadata?.issuer || "Document"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      {d.metadata?.program || d.metadata?.issuer || ""}
                      {d.metadata?.issueDate && ` - Issued ${d.metadata.issueDate}`}
                    </div>
                  </div>
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
