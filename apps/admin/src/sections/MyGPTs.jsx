import React from "react";

export default function MyGPTs() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My GPTs</h1>
          <p className="subtle">Personal AI assistants and conversation history</p>
        </div>
        <button className="iconBtn">+ Create GPT</button>
      </div>

      <div className="card">
        <div className="empty">
          <p>🤖 No custom GPTs yet. Create your first AI assistant.</p>
        </div>
      </div>
    </div>
  );
}
