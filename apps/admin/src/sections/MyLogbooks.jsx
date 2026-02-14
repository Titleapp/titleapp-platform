import React from "react";

export default function MyLogbooks() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Logbooks</h1>
          <p className="subtle">Activity logs that keep your DTCs current and dynamic</p>
        </div>
      </div>

      <div className="card">
        <div className="empty">
          <p>📝 No logbook entries yet. Add entries to track updates to your assets.</p>
        </div>
      </div>
    </div>
  );
}
