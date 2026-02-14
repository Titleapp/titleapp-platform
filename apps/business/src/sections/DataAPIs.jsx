import React from "react";

export default function DataAPIs() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Data & APIs</h1>
          <p className="subtle">Third-party integrations (Salesforce, ForeFlight, etc.)</p>
        </div>
        <button className="iconBtn">+ Add Integration</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>🔌 No integrations configured. Connect your business tools.</p>
        </div>
      </div>
    </div>
  );
}
