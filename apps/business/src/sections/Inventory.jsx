import React from "react";

export default function Inventory() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Services & Inventory</h1>
          <p className="subtle">Manage products, services, and pricing</p>
        </div>
        <button className="iconBtn">+ Add Item</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>📦 No inventory items yet. Add your first product or service.</p>
        </div>
      </div>
    </div>
  );
}
