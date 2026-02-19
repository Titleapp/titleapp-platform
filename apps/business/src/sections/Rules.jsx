import React, { useState, useEffect } from "react";

const AUTONOMY_LEVELS = [
  { level: 1, name: "Draft Only", description: "AI prepares everything for your review. No actions taken without your explicit approval." },
  { level: 2, name: "Low Autonomy", description: "AI handles routine tasks automatically (under set thresholds). High-value decisions require your approval." },
  { level: 3, name: "High Autonomy", description: "AI manages day-to-day operations. You review weekly summaries and approve major decisions." },
  { level: 4, name: "Full Autopilot", description: "AI runs all operations autonomously. You receive daily briefings and can override at any time." },
];

const DEFAULT_RULES = {
  globalLevel: 1,
  sales: {
    respondToLeads: 1,
    sendOutboundOffers: 1,
    negotiatePricing: 1,
    maxDiscount: 500,
    scheduleTestDrives: 1,
    generateBuyersOrders: 1,
    maxAutonomousDealValue: 35000,
  },
  service: {
    bookAppointments: 1,
    authorizeWarrantyWork: 1,
    maxWarrantyValue: 500,
    sendServiceReminders: 1,
    recommendUpsells: 1,
    scheduleRecallNotifications: 1,
  },
  communication: {
    sendEmails: true,
    emailLevel: 1,
    sendTexts: true,
    textLevel: 1,
    makePhoneCalls: false,
    dailyMessageLimit: 50,
    disclaimerText: "This message was sent by an AI assistant on behalf of {dealership name}",
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
  },
  marketing: {
    createCampaigns: 1,
    maxCampaignBudget: 250,
    submitCoopClaims: 1,
    manageBudgetReallocation: 1,
  },
  fi: {
    recommendProducts: 1,
    modelFinancing: 1,
    generateDisclosures: 1,
    maxBundleValue: 5000,
  },
};

function LevelSelector({ value, onChange, size = "normal" }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4].map(l => (
        <button
          key={l}
          onClick={() => onChange(l)}
          style={{
            width: size === "small" ? "28px" : "32px",
            height: size === "small" ? "28px" : "32px",
            borderRadius: "6px",
            border: value === l ? "2px solid #7c3aed" : "1px solid #e2e8f0",
            background: value === l ? "#f3e8ff" : "white",
            color: value === l ? "#7c3aed" : "#64748b",
            fontWeight: 700,
            fontSize: size === "small" ? "12px" : "13px",
            cursor: "pointer",
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function PermissionRow({ label, levelValue, onLevelChange, extraLabel, extraValue, onExtraChange, extraType }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>{label}</div>
      <LevelSelector value={levelValue} onChange={onLevelChange} size="small" />
      {extraLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{extraLabel}</span>
          {extraType === "toggle" ? (
            <button
              onClick={() => onExtraChange(!extraValue)}
              style={{
                width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer",
                background: extraValue ? "#7c3aed" : "#e2e8f0",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%", background: "white",
                position: "absolute", top: "2px", left: extraValue ? "20px" : "2px", transition: "left 0.2s",
              }} />
            </button>
          ) : (
            <input
              type={extraType === "number" ? "number" : "text"}
              value={extraValue}
              onChange={(e) => onExtraChange(extraType === "number" ? Number(e.target.value) : e.target.value)}
              style={{ width: "80px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", textAlign: "right" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TogglePermissionRow({ label, enabled, onToggle, levelValue, onLevelChange, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>
        {label}
        {badge && <span style={{ marginLeft: "8px", fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: "#f1f5f9", color: "#94a3b8" }}>{badge}</span>}
      </div>
      <button
        onClick={onToggle}
        disabled={badge === "Coming Soon"}
        style={{
          width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: badge ? "not-allowed" : "pointer",
          background: enabled ? "#7c3aed" : "#e2e8f0", opacity: badge ? 0.5 : 1,
          position: "relative", transition: "background 0.2s",
        }}
      >
        <div style={{
          width: "18px", height: "18px", borderRadius: "50%", background: "white",
          position: "absolute", top: "2px", left: enabled ? "20px" : "2px", transition: "left 0.2s",
        }} />
      </button>
      {enabled && !badge && <LevelSelector value={levelValue} onChange={onLevelChange} size="small" />}
    </div>
  );
}

function CollapsibleSection({ title, accent, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: "12px", borderLeft: `4px solid ${accent}` }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>{title}</div>
        <span style={{ fontSize: "18px", color: "#94a3b8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>v</span>
      </div>
      {open && <div style={{ padding: "0 20px 20px" }}>{children}</div>}
    </div>
  );
}

export default function Rules() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "FL";
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateRules(path, value) {
    setRules(prev => {
      const next = { ...prev };
      const parts = path.split(".");
      if (parts.length === 1) {
        next[parts[0]] = value;
      } else {
        next[parts[0]] = { ...next[parts[0]], [parts[1]]: value };
      }
      return next;
    });
    setSaved(false);
  }

  async function saveRules() {
    setSaving(true);
    try {
      const wsId = localStorage.getItem("WORKSPACE_ID") || localStorage.getItem("TENANT_ID");
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      await fetch(`${apiBase}/api?path=/v1/workspace:updateRules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-tenant-id": wsId },
        body: JSON.stringify({ rules }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save rules:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Rules</h1>
          <p className="subtle">Configure AI autonomy levels and operational permissions</p>
        </div>
        <button
          className="iconBtn"
          onClick={saveRules}
          disabled={saving}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save Rules"}
        </button>
      </div>

      {/* Global Autonomy Level */}
      <div className="card" style={{ marginBottom: "20px", padding: "24px" }}>
        <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Global Autonomy Level</div>
        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Set the default behavior for all AI operations. Area-specific settings below can override this.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {AUTONOMY_LEVELS.map(al => (
            <div
              key={al.level}
              onClick={() => updateRules("globalLevel", al.level)}
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: rules.globalLevel === al.level ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                background: rules.globalLevel === al.level ? "#faf5ff" : "white",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: rules.globalLevel === al.level ? "#7c3aed" : "#f1f5f9",
                  color: rules.globalLevel === al.level ? "white" : "#64748b",
                  fontWeight: 700, fontSize: "13px",
                }}>
                  {al.level}
                </div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: rules.globalLevel === al.level ? "#7c3aed" : "#1e293b" }}>{al.name}</div>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>{al.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sales Permissions */}
      <CollapsibleSection title="Sales Permissions" accent="#16a34a" defaultOpen={true}>
        <PermissionRow label="Respond to inbound leads" levelValue={rules.sales.respondToLeads} onLevelChange={v => updateRules("sales.respondToLeads", v)} />
        <PermissionRow label="Send outbound offers" levelValue={rules.sales.sendOutboundOffers} onLevelChange={v => updateRules("sales.sendOutboundOffers", v)} />
        <PermissionRow label="Negotiate pricing" levelValue={rules.sales.negotiatePricing} onLevelChange={v => updateRules("sales.negotiatePricing", v)} extraLabel="Max discount: $" extraValue={rules.sales.maxDiscount} onExtraChange={v => updateRules("sales.maxDiscount", v)} extraType="number" />
        <PermissionRow label="Schedule test drives" levelValue={rules.sales.scheduleTestDrives} onLevelChange={v => updateRules("sales.scheduleTestDrives", v)} />
        <PermissionRow label="Generate buyer's orders" levelValue={rules.sales.generateBuyersOrders} onLevelChange={v => updateRules("sales.generateBuyersOrders", v)} />
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
          <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>Max autonomous deal value</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>$</span>
            <input type="number" value={rules.sales.maxAutonomousDealValue} onChange={e => updateRules("sales.maxAutonomousDealValue", Number(e.target.value))} style={{ width: "100px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", textAlign: "right" }} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Service Permissions */}
      <CollapsibleSection title="Service Permissions" accent="#2563eb">
        <PermissionRow label="Book service appointments" levelValue={rules.service.bookAppointments} onLevelChange={v => updateRules("service.bookAppointments", v)} />
        <PermissionRow label="Authorize warranty work" levelValue={rules.service.authorizeWarrantyWork} onLevelChange={v => updateRules("service.authorizeWarrantyWork", v)} extraLabel="Max value: $" extraValue={rules.service.maxWarrantyValue} onExtraChange={v => updateRules("service.maxWarrantyValue", v)} extraType="number" />
        <PermissionRow label="Send service reminders" levelValue={rules.service.sendServiceReminders} onLevelChange={v => updateRules("service.sendServiceReminders", v)} />
        <PermissionRow label="Recommend upsells during service" levelValue={rules.service.recommendUpsells} onLevelChange={v => updateRules("service.recommendUpsells", v)} />
        <PermissionRow label="Schedule recall notifications" levelValue={rules.service.scheduleRecallNotifications} onLevelChange={v => updateRules("service.scheduleRecallNotifications", v)} />
      </CollapsibleSection>

      {/* Communication Permissions */}
      <CollapsibleSection title="Communication Permissions" accent="#d97706">
        <TogglePermissionRow label="Send emails" enabled={rules.communication.sendEmails} onToggle={() => updateRules("communication.sendEmails", !rules.communication.sendEmails)} levelValue={rules.communication.emailLevel} onLevelChange={v => updateRules("communication.emailLevel", v)} />
        <TogglePermissionRow label="Send text messages" enabled={rules.communication.sendTexts} onToggle={() => updateRules("communication.sendTexts", !rules.communication.sendTexts)} levelValue={rules.communication.textLevel} onLevelChange={v => updateRules("communication.textLevel", v)} />
        <TogglePermissionRow label="Make phone calls" enabled={rules.communication.makePhoneCalls} onToggle={() => {}} badge="Coming Soon" />
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>Daily outbound message limit</div>
          <input type="number" value={rules.communication.dailyMessageLimit} onChange={e => updateRules("communication.dailyMessageLimit", Number(e.target.value))} style={{ width: "80px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", textAlign: "right" }} />
        </div>
        <div style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "14px", color: "#334155", marginBottom: "6px" }}>Required disclaimer text</div>
          <textarea value={rules.communication.disclaimerText} onChange={e => updateRules("communication.disclaimerText", e.target.value)} rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
          <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>Quiet hours (no outbound)</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input type="time" value={rules.communication.quietHoursStart} onChange={e => updateRules("communication.quietHoursStart", e.target.value)} style={{ padding: "4px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
            <span style={{ color: "#94a3b8" }}>to</span>
            <input type="time" value={rules.communication.quietHoursEnd} onChange={e => updateRules("communication.quietHoursEnd", e.target.value)} style={{ padding: "4px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Marketing Permissions */}
      <CollapsibleSection title="Marketing Permissions" accent="#ec4899">
        <PermissionRow label="Create ad campaigns" levelValue={rules.marketing.createCampaigns} onLevelChange={v => updateRules("marketing.createCampaigns", v)} />
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>Max campaign budget without approval</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>$</span>
            <input type="number" value={rules.marketing.maxCampaignBudget} onChange={e => updateRules("marketing.maxCampaignBudget", Number(e.target.value))} style={{ width: "80px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", textAlign: "right" }} />
          </div>
        </div>
        <PermissionRow label="Submit co-op reimbursement claims" levelValue={rules.marketing.submitCoopClaims} onLevelChange={v => updateRules("marketing.submitCoopClaims", v)} />
        <PermissionRow label="Manage channel budget reallocation" levelValue={rules.marketing.manageBudgetReallocation} onLevelChange={v => updateRules("marketing.manageBudgetReallocation", v)} />
      </CollapsibleSection>

      {/* F&I Permissions */}
      <CollapsibleSection title="F&I Permissions" accent="#7c3aed">
        <PermissionRow label="Recommend F&I products to customers" levelValue={rules.fi.recommendProducts} onLevelChange={v => updateRules("fi.recommendProducts", v)} />
        <PermissionRow label="Model financing options" levelValue={rules.fi.modelFinancing} onLevelChange={v => updateRules("fi.modelFinancing", v)} />
        <PermissionRow label="Generate F&I disclosure documents" levelValue={rules.fi.generateDisclosures} onLevelChange={v => updateRules("fi.generateDisclosures", v)} />
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
          <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>Max F&I product bundle value to present</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>$</span>
            <input type="number" value={rules.fi.maxBundleValue} onChange={e => updateRules("fi.maxBundleValue", Number(e.target.value))} style={{ width: "80px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", textAlign: "right" }} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Current Configuration */}
      <div className="card" style={{ padding: "20px", marginTop: "8px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "12px" }}>Current Configuration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
          <div style={{ color: "#64748b" }}>Vertical</div>
          <div style={{ fontWeight: 600 }}>{vertical}</div>
          <div style={{ color: "#64748b" }}>Jurisdiction</div>
          <div style={{ fontWeight: 600 }}>{jurisdiction}</div>
          <div style={{ color: "#64748b" }}>Active RAAS rule files</div>
          <div style={{ fontWeight: 600 }}>{vertical}/{jurisdiction}/README.md, data-model.md, ownership.md</div>
          <div style={{ color: "#64748b" }}>Custom rules</div>
          <div style={{ fontWeight: 600, color: "#94a3b8" }}>None set</div>
        </div>
      </div>
    </div>
  );
}
