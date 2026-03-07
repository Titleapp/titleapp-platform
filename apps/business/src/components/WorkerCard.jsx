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

export default function WorkerCard({ data, comparables, onApprove, onEdit, isPublished }) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ ...data });
  const [selectedTier, setSelectedTier] = useState(data.pricingTier || 2);
  const [projectedSubs, setProjectedSubs] = useState(10);
  const [showOverageTip, setShowOverageTip] = useState(false);

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
    background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12,
    overflow: "hidden", maxWidth: 600,
  };
  const sectionStyle = { padding: "16px 20px", borderBottom: "1px solid #E2E8F0" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 };
  const valueStyle = { fontSize: 14, color: "#1a1a2e", lineHeight: 1.6 };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Worker Card</div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
        Review what Alex built from your conversation. Edit anything, then approve to start building.
      </div>

      <div style={cardStyle}>
        {/* Header */}
        <div style={{ padding: "24px 20px", background: "linear-gradient(135deg, #6B46C1 0%, #818cf8 100%)", position: "relative" }}>
          {/* DRAFT badge */}
          {!isPublished && (
            <div style={{
              position: "absolute", top: 12, right: 12,
              padding: "4px 10px", background: "#DC2626", color: "white",
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
              borderRadius: 4,
            }}>
              DRAFT
            </div>
          )}
          {editMode ? (
            <input
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 18, fontWeight: 700, width: "100%", outline: "none" }}
              value={editData.name}
              onChange={e => handleEdit("name", e.target.value)}
            />
          ) : (
            <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{data.name}</div>
          )}
          {!isPublished && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, fontStyle: "italic" }}>
              Review and approve to start building
            </div>
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
              style={{ width: "100%", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", fontSize: 14, outline: "none", resize: "vertical", minHeight: 60, lineHeight: 1.6 }}
              value={editData.description}
              onChange={e => handleEdit("description", e.target.value)}
            />
          ) : (
            <div style={valueStyle}>{data.description}</div>
          )}
        </div>

        {/* Problem it solves */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Problem it solves</div>
          {editMode ? (
            <textarea
              style={{ width: "100%", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", fontSize: 14, outline: "none", resize: "vertical", minHeight: 40, lineHeight: 1.6 }}
              value={editData.problemSolves || ""}
              onChange={e => handleEdit("problemSolves", e.target.value)}
            />
          ) : (
            <div style={valueStyle}>{data.problemSolves || "Not specified — Alex will derive this during the build."}</div>
          )}
        </div>

        {/* Who it's for */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Who it's for</div>
          {editMode ? (
            <input
              style={{ width: "100%", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", fontSize: 14, outline: "none" }}
              value={editData.targetUser}
              onChange={e => handleEdit("targetUser", e.target.value)}
            />
          ) : (
            <div style={valueStyle}>{data.targetUser || "Not yet specified"}</div>
          )}
        </div>

        {/* Compliance */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Compliance rules</div>
          <div style={valueStyle}>{data.complianceRules || "Standard platform compliance (Tier 0 + Tier 1 auto-applied)"}</div>
          {data.raasRules && (
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
              {data.raasRules}
            </div>
          )}
          {data.mdGateRequired && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6 }}>
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
                  background: selectedTier === t.id ? "rgba(107,70,193,0.08)" : "#F8F9FC",
                  border: `1px solid ${selectedTier === t.id ? "#6B46C1" : "#E2E8F0"}`,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: selectedTier === t.id ? "#6B46C1" : "#1a1a2e" }}>${t.price}/mo</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{t.credits} credits</div>
              </div>
            ))}
          </div>

          {/* Market comparables */}
          {comparables && comparables.length > 0 && (
            <div style={{ padding: "10px 12px", background: "#F8F9FC", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Similar workers in marketplace</div>
              {comparables.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <span style={{ fontSize: 13, color: "#64748B" }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>${c.price}/mo</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Earnings projection */}
        <div style={{ ...sectionStyle, background: "rgba(16,185,129,0.02)" }}>
          <div style={labelStyle}>Your earnings projection</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#64748B" }}>At</span>
            <input
              type="number" min={1} max={1000} value={projectedSubs}
              onChange={e => setProjectedSubs(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 60, padding: "4px 8px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 6, color: "#1a1a2e", fontSize: 14, fontWeight: 600, textAlign: "center", outline: "none" }}
            />
            <span style={{ fontSize: 13, color: "#64748B" }}>subscribers on {tier.label} (${tier.price}/mo)</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "12px 16px", background: "#F8F9FC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>75% of Subscription Revenue</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>${projection.monthly.toFixed(0)}/mo</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>You earn ${projection.perSubscriber.toFixed(2)} per subscriber per month, paid monthly.</div>
            </div>
            <div style={{ padding: "12px 16px", background: "#F8F9FC", borderRadius: 8, border: "1px solid #E2E8F0", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Bonus: Usage Earnings</div>
                <span
                  onClick={() => setShowOverageTip(!showOverageTip)}
                  style={{ cursor: "pointer", fontSize: 13, color: "#94A3B8", marginBottom: 4, userSelect: "none" }}
                  title="Click for example"
                >&#9432;</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginTop: 4 }}>
                When subscribers use more than their plan includes, TitleApp charges overage fees. You earn 20% of TitleApp's margin on those fees — typically $2–$8 per heavy user per month.
              </div>
              {showOverageTip && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                  marginTop: 4, padding: "12px 14px", background: "#1a1a2e", color: "#E2E8F0",
                  borderRadius: 8, fontSize: 12, lineHeight: 1.6, boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}>
                  Example: A subscriber on the ${tier.price}/mo plan uses 2,000 credits (500 over their limit). TitleApp charges $10 in overage. TitleApp's margin is ~85%, so you earn 20% of $8.50 = $1.70 from that one subscriber that month.
                  <div onClick={() => setShowOverageTip(false)} style={{ marginTop: 6, fontSize: 11, color: "#94A3B8", cursor: "pointer" }}>Dismiss</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 10, lineHeight: 1.5 }}>
            At {projectedSubs} subscribers on {tier.label} (${tier.price}/mo), you earn approximately ${projection.monthly.toFixed(0)}/mo from subscriptions plus bonus usage earnings from heavy users.
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "16px 20px", display: "flex", gap: 12 }}>
          <button
            style={{
              padding: "12px 24px", background: editMode ? "#F8F9FC" : "none", color: "#64748B",
              border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
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
              flex: 1, padding: "12px 24px", background: "#6B46C1", color: "white",
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
