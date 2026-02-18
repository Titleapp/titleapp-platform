import React from "react";

export default function MyCertifications() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Certifications</h1>
          <p className="subtle">Professional certifications, licenses, and credentials</p>
        </div>
      </div>

      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>&#x1F4DC;</div>
        <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
          No certifications yet
        </div>
        <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
          Add your first certification by chatting with the AI assistant. Say "Add a credential" to get started.
        </div>
      </div>
    </div>
  );
}
