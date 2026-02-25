import React from "react";
import useAdminAuth from "../hooks/useAdminAuth";

export default function Settings() {
  const { user, role } = useAdminAuth();

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Settings</h1>
        <p className="ac-page-subtitle">Admin configuration</p>
      </div>
      <div className="ac-card">
        <div className="ac-card-header">
          <span className="ac-card-title">Current Session</span>
        </div>
        <div className="ac-card-body">
          <div style={{ fontSize: "13px", lineHeight: "2" }}>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>UID:</strong> {user?.uid}</div>
            <div><strong>Role:</strong> {role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
