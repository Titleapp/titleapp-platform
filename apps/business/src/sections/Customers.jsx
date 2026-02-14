import React from "react";

export default function Customers() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Customers</h1>
          <p className="subtle">CRM and customer relationship management</p>
        </div>
        <button className="iconBtn">+ Add Customer</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>👥 No customers yet. Add your first customer to get started.</p>
        </div>
      </div>
    </div>
  );
}
