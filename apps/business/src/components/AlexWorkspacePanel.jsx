import React from "react";

function VerticalSummaryCard({ vertical }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
          {vertical.icon} {vertical.name}
        </div>
        <span style={{
          background: "#f1f5f9", borderRadius: 10, padding: "2px 10px",
          fontSize: 11, color: "#64748B", fontWeight: 600,
        }}>
          {vertical.workerCount} worker{vertical.workerCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#64748B" }}>
        {vertical.slugs.slice(0, 3).map(s =>
          s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
        ).join(", ")}
        {vertical.slugs.length > 3 && ` +${vertical.slugs.length - 3} more`}
      </div>
    </div>
  );
}

export default function AlexWorkspacePanel({ verticals, focusedVertical, activeOutput }) {
  // If Alex has surfaced a specific output, show it
  if (activeOutput) {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto", background: "#fafbfc" }}>
        <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontWeight: 700 }}>
          Active Output
        </div>
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
          padding: 20, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: "#0f172a",
        }}>
          {activeOutput}
        </div>
      </div>
    );
  }

  // Focused vertical: show that vertical's details
  if (focusedVertical) {
    const v = verticals.find(vt => vt.name === focusedVertical);
    if (v) {
      return (
        <div style={{ padding: 24, height: "100vh", overflow: "auto", background: "#fafbfc" }}>
          <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontWeight: 700 }}>
            {v.icon} {v.name}
          </div>
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
            padding: 20, marginBottom: 12,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 12 }}>
              Active Workers ({v.workerCount})
            </div>
            {v.slugs.map(slug => (
              <div key={slug} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0", borderBottom: "1px solid #f1f5f9",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 4, background: "#22c55e", flexShrink: 0,
                }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                  {slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 20 }}>
            Ask Alex about this vertical to see outputs here
          </div>
        </div>
      );
    }
  }

  // Default: All Verticals overview
  return (
    <div style={{ padding: 24, height: "100vh", overflow: "auto", background: "#fafbfc" }}>
      <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontWeight: 700 }}>
        Your Verticals
      </div>

      {verticals.length > 0 ? (
        verticals.map(v => <VerticalSummaryCard key={v.name} vertical={v} />)
      ) : (
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
          padding: 40, textAlign: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
            No Active Subscriptions
          </div>
          <div style={{ fontSize: 13, color: "#64748B" }}>
            Subscribe to Digital Workers to see your verticals here. Alex synthesizes across all of them.
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 20 }}>
        Ask Alex anything — she sees across all your verticals
      </div>
    </div>
  );
}
