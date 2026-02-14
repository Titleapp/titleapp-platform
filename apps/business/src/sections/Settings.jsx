import React from "react";

export default function Settings() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="subtle">Business configuration and preferences</p>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Business Information</div>
        </div>
        <div className="detail">
          <div className="kvRow">
            <div className="k">Business Name</div>
            <div className="v">Velocity Motors</div>
          </div>
          <div className="kvRow">
            <div className="k">Type</div>
            <div className="v">Auto Dealer</div>
          </div>
          <div className="kvRow">
            <div className="k">Vertical</div>
            <div className="v">Auto (Illinois)</div>
          </div>
          <div className="kvRow">
            <div className="k">Member Since</div>
            <div className="v">January 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}
