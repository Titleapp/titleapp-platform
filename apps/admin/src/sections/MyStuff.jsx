import React from "react";

export default function MyStuff() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Stuff</h1>
          <p className="subtle">Digital Title Certificates for your owned assets</p>
        </div>
        <button className="iconBtn">+ New DTC</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>🎯 No DTCs yet. Create your first Digital Title Certificate to get started.</p>
        </div>
      </div>
    </div>
  );
}
