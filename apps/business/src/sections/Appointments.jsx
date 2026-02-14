import React from "react";

export default function Appointments() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Appointments</h1>
          <p className="subtle">Schedule and calendar management</p>
        </div>
        <button className="iconBtn">+ New Appointment</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>📅 No appointments scheduled. Create your first appointment.</p>
        </div>
      </div>
    </div>
  );
}
