import React, { useState } from "react";

// Pricing tiers from config/pricing.js (read-only display)
const TIERS = [
  { id: 1, label: "Tier 1", price: 29, credits: 500 },
  { id: 2, label: "Tier 2", price: 49, credits: 1500 },
  { id: 3, label: "Tier 3", price: 79, credits: 3000 },
];

function earningsProjection(tierPrice, subscriberCount) {
  const subRevenue = tierPrice * subscriberCount * 0.75;
  return { monthly: subRevenue, perSubscriber: tierPrice * 0.75 };
}

export default function WorkerCard({ data, comparables, onApprove, onEdit }) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ ...data });
  const [selectedTier, setSelectedTier] = useState(data.pricingTier || 2);
  const [projectedSubs, setProjectedSubs] = useState(10);

  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[1];
  const projection = earningsProjection(tier.price, projectedSubs);

  function handleApprove() {
    const finalData = editMode ? editData : data;
    onApprove({ ...finalData, pricingTier: selectedTier });
  }

  function handleEdit(field, value) {
    setEditData(prev => ({ ...prev, [field]: value }));
  }

  const cardStyle = {
    background: "#16161e", border: "1px solid #2a2a3a", borderRadius: 12,
    overflow: "hidden", maxWidth: 600,
  };
  const sectionStyle = { padding: "16px 20px", borderBottom: "1px solid #2a2a3a" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 };
  const valueStyle = { fontSize: 14, color: "#e2e8f0", lineHeight: 1.6 };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Worker Card</div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>
        Review what Alex built from your conversation. Edit anything, then approve to start building.
      </div>

      <div style={cardStyle}>
        {/* Header */}
        <div style={{ padding: "24px 20px", background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" }}>
          {editMode ? (
            <input
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 18, fontWeight: 700, width: "100%", outline: "none" }}
              value={editData.name}
              onChange={e => handleEdit("name", e.target.value)}
            />
          ) : (
            <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{data.name}</div>
          )}
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
            {data.vertical} / {data.jurisdiction}
          </div>
        </div>

        {/* What it does */}
        <div style={sectionStyle}>
          <div style={labelStyle}>What it does</div>
          {editMode ? (
            <textarea
              style={{ width: "100%", background: "#0f0f14", border: "1px solid #2a2a3a", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", resize: "vertical", minHeight: 60, lineHeight: 1.6 }}
              value={editData.description}
              onChange={e => handleEdit("description", e.target.value)}
            />
          ) : (
            <div style={valueStyle}>{data.description}</div>
          )}
        </div>

        {/* Who it's for */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Who it's for</div>
          {editMode ? (
            <input
              style={{ width: "100%", background: "#0f0f14", border: "1px solid #2a2a3a", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 14, outline: "none" }}
              value={editData.targetUser}
              onChange={e => handleEdit("targetUser", e.target.value)}
            />
          ) : (
            <div style={valueStyle}>{data.targetUser}</div>
          )}
        </div>

        {/* Compliance */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Compliance rules</div>
          <div style={valueStyle}>{data.complianceRules || "Standard platform compliance (Tier 0 + Tier 1 auto-applied)"}</div>
          {data.mdGateRequired && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>Medical Director co-sign required</span>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Subscription tier</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {TIERS.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                style={{
                  flex: 1, padding: "10px 8px", textAlign: "center", cursor: "pointer", borderRadius: 8,
                  background: selectedTier === t.id ? "rgba(124,58,237,0.15)" : "#0f0f14",
                  border: `1px solid ${selectedTier === t.id ? "#7c3aed" : "#2a2a3a"}`,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: selectedTier === t.id ? "#7c3aed" : "#e2e8f0" }}>${t.price}/mo</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{t.credits} credits</div>
              </div>
            ))}
          </div>

          {/* Market comparables */}
          {comparables && comparables.length > 0 && (
            <div style={{ padding: "10px 12px", background: "#0f0f14", borderRadius: 8, border: "1px solid #2a2a3a", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Similar workers in marketplace</div>
              {comparables.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>${c.price}/mo</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Earnings projection */}
        <div style={{ ...sectionStyle, background: "rgba(16,185,129,0.03)" }}>
          <div style={labelStyle}>Your earnings projection</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>At</span>
            <input
              type="number" min={1} max={1000} value={projectedSubs}
              onChange={e => setProjectedSubs(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 60, padding: "4px 8px", background: "#0f0f14", border: "1px solid #2a2a3a", borderRadius: 6, color: "#e2e8f0", fontSize: 14, fontWeight: 600, textAlign: "center", outline: "none" }}
            />
            <span style={{ fontSize: 13, color: "#94a3b8" }}>subscribers on {tier.label} (${tier.price}/mo)</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "12px 16px", background: "#0f0f14", borderRadius: 8, border: "1px solid #2a2a3a" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>75% of subscription revenue</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>${projection.monthly.toFixed(0)}/mo</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>${projection.perSubscriber.toFixed(2)} per subscriber</div>
            </div>
            <div style={{ padding: "12px 16px", background: "#0f0f14", borderRadius: 8, border: "1px solid #2a2a3a" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>20% of TitleApp inference margin on overage</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", marginTop: 8 }}>Varies by usage</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Heavy users generate additional earnings</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginTop: 10, lineHeight: 1.5 }}>
            At {projectedSubs} subscribers on {tier.label} (${tier.price}/mo), you earn approximately ${projection.monthly.toFixed(0)}/mo from subscriptions. Heavy users generate additional overage earnings.
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "16px 20px", display: "flex", gap: 12 }}>
          <button
            style={{
              padding: "12px 24px", background: editMode ? "#2a2a3a" : "none", color: "#94a3b8",
              border: "1px solid #2a2a3a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
            onClick={() => {
              if (editMode) {
                onEdit(editData);
                setEditMode(false);
              } else {
                setEditMode(true);
              }
            }}
          >
            {editMode ? "Save edits" : "Edit"}
          </button>
          <button
            style={{
              flex: 1, padding: "12px 24px", background: "#7c3aed", color: "white",
              border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}
            onClick={handleApprove}
          >
            Approve — start building
          </button>
        </div>
      </div>
    </div>
  );
}
