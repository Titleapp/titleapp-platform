import React from "react";

export default function Profile() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Profile</h1>
          <p className="subtle">User settings and preferences</p>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">Account Settings</div>
        </div>
        <div className="detail">
          <div className="kvRow">
            <div className="k">Email</div>
            <div className="v">user@example.com</div>
          </div>
          <div className="kvRow">
            <div className="k">Account Type</div>
            <div className="v">Consumer</div>
          </div>
          <div className="kvRow">
            <div className="k">Member Since</div>
            <div className="v">February 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}
