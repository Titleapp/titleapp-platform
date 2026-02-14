import React from "react";

export default function Staff() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Staff</h1>
          <p className="subtle">Team member management and permissions</p>
        </div>
        <button className="iconBtn">+ Add Staff</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>👤 No staff members yet. Add team members to get started.</p>
        </div>
      </div>
    </div>
  );
}
