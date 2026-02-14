import React from "react";

export default function StudentRecords() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Student & Professional Records</h1>
          <p className="subtle">Education credentials and professional certifications</p>
        </div>
        <button className="iconBtn">+ Add Credential</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>🎓 No credentials yet. Add your education and professional records.</p>
        </div>
      </div>
    </div>
  );
}
