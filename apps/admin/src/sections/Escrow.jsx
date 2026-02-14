import React from "react";

export default function Escrow() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Escrow</h1>
          <p className="subtle">Secure escrow locker transactions with AI verification</p>
        </div>
        <button className="iconBtn">+ New Escrow</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>🔒 No escrow transactions yet. Create your first secure transaction.</p>
        </div>
      </div>
    </div>
  );
}
