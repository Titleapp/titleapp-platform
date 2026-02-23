import React, { useState, useEffect } from "react";

const AUTONOMY_LEVELS = [
  { level: 1, name: "Draft Only", description: "AI prepares everything for your review. No actions taken without your explicit approval." },
  { level: 2, name: "Low Autonomy", description: "AI handles routine tasks automatically (under set thresholds). High-value decisions require your approval." },
  { level: 3, name: "High Autonomy", description: "AI manages day-to-day operations. You review weekly summaries and approve major decisions." },
  { level: 4, name: "Full Autopilot", description: "AI runs all operations autonomously. You receive daily briefings and can override at any time." },
];

// ── Vertical-specific permission configs ──
const RULES_CONFIGS = {
  auto: {
    defaults: {
      globalLevel: 1,
      sales: { respondToLeads: 1, sendOutboundOffers: 1, negotiatePricing: 1, maxDiscount: 500, scheduleTestDrives: 1, generateBuyersOrders: 1, maxAutonomousDealValue: 35000 },
      service: { bookAppointments: 1, authorizeWarrantyWork: 1, maxWarrantyValue: 500, sendServiceReminders: 1, recommendUpsells: 1, scheduleRecallNotifications: 1 },
      communication: { sendEmails: true, emailLevel: 1, sendTexts: true, textLevel: 1, makePhoneCalls: false, dailyMessageLimit: 50, disclaimerText: "This message was sent by an AI assistant on behalf of {dealership name}", quietHoursStart: "21:00", quietHoursEnd: "08:00" },
      marketing: { createCampaigns: 1, maxCampaignBudget: 250, submitCoopClaims: 1, manageBudgetReallocation: 1 },
      fi: { recommendProducts: 1, modelFinancing: 1, generateDisclosures: 1, maxBundleValue: 5000 },
    },
    sections: [
      {
        key: "sales", title: "Sales Permissions", accent: "#16a34a", defaultOpen: true,
        rows: [
          { key: "respondToLeads", label: "Respond to inbound leads" },
          { key: "sendOutboundOffers", label: "Send outbound offers" },
          { key: "negotiatePricing", label: "Negotiate pricing", extra: { label: "Max discount: $", field: "maxDiscount", type: "number" } },
          { key: "scheduleTestDrives", label: "Schedule test drives" },
          { key: "generateBuyersOrders", label: "Generate buyer's orders" },
        ],
        footer: { label: "Max autonomous deal value", field: "maxAutonomousDealValue", prefix: "$" },
      },
      {
        key: "service", title: "Service Permissions", accent: "#2563eb",
        rows: [
          { key: "bookAppointments", label: "Book service appointments" },
          { key: "authorizeWarrantyWork", label: "Authorize warranty work", extra: { label: "Max value: $", field: "maxWarrantyValue", type: "number" } },
          { key: "sendServiceReminders", label: "Send service reminders" },
          { key: "recommendUpsells", label: "Recommend upsells during service" },
          { key: "scheduleRecallNotifications", label: "Schedule recall notifications" },
        ],
      },
      {
        key: "communication", title: "Communication Permissions", accent: "#d97706", type: "communication",
      },
      {
        key: "marketing", title: "Marketing Permissions", accent: "#ec4899",
        rows: [
          { key: "createCampaigns", label: "Create ad campaigns" },
        ],
        footer: { label: "Max campaign budget without approval", field: "maxCampaignBudget", prefix: "$" },
        postRows: [
          { key: "submitCoopClaims", label: "Submit co-op reimbursement claims" },
          { key: "manageBudgetReallocation", label: "Manage channel budget reallocation" },
        ],
      },
      {
        key: "fi", title: "F&I Permissions", accent: "#7c3aed",
        rows: [
          { key: "recommendProducts", label: "Recommend F&I products to customers" },
          { key: "modelFinancing", label: "Model financing options" },
          { key: "generateDisclosures", label: "Generate F&I disclosure documents" },
        ],
        footer: { label: "Max F&I product bundle value to present", field: "maxBundleValue", prefix: "$" },
      },
    ],
    playbookCategories: [
      "Sales Process", "Word Tracks / Scripts", "Objection Handling", "F&I Playbook",
      "Service Advisor Scripts", "Pricing Policies", "Trade-in Process", "Delivery Process",
      "Customer Communication Guidelines", "Other / General",
    ],
  },
  analyst: {
    defaults: {
      globalLevel: 1,
      research: { generateMemos: 1, updateModels: 1, monitorPortfolio: 1, sendMarketAlerts: 1 },
      clientLp: { draftUpdates: 1, sendQuarterlyLetters: 1, respondToInquiries: 1, scheduleMeetings: 1, maxCommunicationFrequency: 10 },
      trading: { generateRecommendations: 1, setPriceAlerts: 1, draftICMemos: 1, maxPositionSize: 1000000 },
      compliance: { preScreenCommunications: 1, flagRegulatoryIssues: 1, maintainComplianceLog: 1, reviewMarketingMaterials: 1 },
      communication: { sendEmails: true, emailLevel: 1, sendTexts: true, textLevel: 1, makePhoneCalls: false, dailyMessageLimit: 20, disclaimerText: "This message was sent by an AI assistant on behalf of {firm name}", quietHoursStart: "21:00", quietHoursEnd: "08:00" },
      marketing: { publishThoughtLeadership: 1, manageLinkedIn: 1, createEventMaterials: 1, maxCampaignBudget: 500 },
    },
    sections: [
      {
        key: "research", title: "Research Permissions", accent: "#16a34a", defaultOpen: true,
        rows: [
          { key: "generateMemos", label: "Generate research memos" },
          { key: "updateModels", label: "Update financial models" },
          { key: "monitorPortfolio", label: "Monitor portfolio companies" },
          { key: "sendMarketAlerts", label: "Send market alerts" },
        ],
      },
      {
        key: "clientLp", title: "Client / LP Permissions", accent: "#2563eb",
        rows: [
          { key: "draftUpdates", label: "Draft client updates" },
          { key: "sendQuarterlyLetters", label: "Send quarterly letters" },
          { key: "respondToInquiries", label: "Respond to LP inquiries" },
          { key: "scheduleMeetings", label: "Schedule meetings" },
        ],
        footer: { label: "Max outbound communications per week", field: "maxCommunicationFrequency" },
      },
      {
        key: "trading", title: "Trading Permissions", accent: "#d97706",
        rows: [
          { key: "generateRecommendations", label: "Generate trade recommendations" },
          { key: "setPriceAlerts", label: "Set price alerts" },
          { key: "draftICMemos", label: "Draft investment committee memos" },
        ],
        footer: { label: "Max position size for autonomous recommendations", field: "maxPositionSize", prefix: "$" },
      },
      {
        key: "compliance", title: "Compliance Permissions", accent: "#dc2626",
        rows: [
          { key: "preScreenCommunications", label: "Pre-screen external communications" },
          { key: "flagRegulatoryIssues", label: "Flag regulatory issues" },
          { key: "maintainComplianceLog", label: "Maintain compliance log" },
          { key: "reviewMarketingMaterials", label: "Review marketing materials" },
        ],
      },
      {
        key: "communication", title: "Communication Permissions", accent: "#64748b", type: "communication",
      },
      {
        key: "marketing", title: "Marketing Permissions", accent: "#ec4899",
        rows: [
          { key: "publishThoughtLeadership", label: "Publish thought leadership content" },
          { key: "manageLinkedIn", label: "Manage LinkedIn presence" },
          { key: "createEventMaterials", label: "Create event materials" },
        ],
        footer: { label: "Max campaign budget without approval", field: "maxCampaignBudget", prefix: "$" },
      },
    ],
    playbookCategories: [
      "Investment Thesis Templates", "Due Diligence Checklists", "Client Communication Templates",
      "Research Methodology", "Risk Assessment Framework", "LP Reporting Templates",
      "Compliance Guidelines", "Market Analysis Framework", "Other / General",
    ],
  },
  "real-estate": {
    defaults: {
      globalLevel: 1,
      sales: { respondToLeads: 1, sendRecommendations: 1, scheduleShowings: 1, draftOffers: 1, draftDescriptions: 1, generateCMAs: 1, postClosingFollowup: 1, priceAdjustmentRecs: 1 },
      pm: { respondToTenants: 1, processMaintenanceRequests: 1, maxAutoDispatch: 500, sendRentReminders: 1, serveLateNotices: 1, draftRenewals: 1, maxRentIncrease: 5, marketVacantUnits: 1, screenApplications: 1, ownerCommunication: 1 },
      communication: { sendEmails: true, emailLevel: 1, sendTexts: true, textLevel: 1, makePhoneCalls: false, dailyMessageLimit: 100, disclaimerText: "This message was sent by an AI assistant on behalf of {brokerage name}", quietHoursStart: "21:00", quietHoursEnd: "08:00" },
      marketing: { socialMedia: 1, paidAdvertising: 1, directMail: 1, emailCampaigns: 1, maxCampaignBudget: 500 },
    },
    sections: [
      {
        key: "sales", title: "Sales Permissions", accent: "#16a34a", defaultOpen: true,
        rows: [
          { key: "respondToLeads", label: "Respond to inbound leads (5-min target)" },
          { key: "sendRecommendations", label: "Send property recommendations to buyers" },
          { key: "scheduleShowings", label: "Schedule showings" },
          { key: "draftOffers", label: "Draft purchase offers" },
          { key: "draftDescriptions", label: "Generate listing descriptions" },
          { key: "generateCMAs", label: "Generate comparative market analyses" },
          { key: "postClosingFollowup", label: "Post-closing follow-up" },
          { key: "priceAdjustmentRecs", label: "Recommend price adjustments" },
        ],
      },
      {
        key: "pm", title: "Property Management Permissions", accent: "#2563eb",
        rows: [
          { key: "respondToTenants", label: "Respond to tenant communications" },
          { key: "processMaintenanceRequests", label: "Process maintenance requests", extra: { label: "Max auto-dispatch: $", field: "maxAutoDispatch", type: "number" } },
          { key: "sendRentReminders", label: "Send rent reminders" },
          { key: "serveLateNotices", label: "Serve late payment notices" },
          { key: "draftRenewals", label: "Draft lease renewals", extra: { label: "Max rent increase: %", field: "maxRentIncrease", type: "number" } },
          { key: "marketVacantUnits", label: "Market vacant units" },
          { key: "screenApplications", label: "Screen rental applications" },
          { key: "ownerCommunication", label: "Owner communication and reporting" },
        ],
      },
      {
        key: "communication", title: "Communication Permissions", accent: "#d97706", type: "communication",
      },
      {
        key: "marketing", title: "Marketing Permissions", accent: "#ec4899",
        rows: [
          { key: "socialMedia", label: "Post to social media" },
          { key: "paidAdvertising", label: "Create paid advertising" },
          { key: "directMail", label: "Send direct mail" },
          { key: "emailCampaigns", label: "Run email campaigns" },
        ],
        footer: { label: "Max campaign budget without approval", field: "maxCampaignBudget", prefix: "$" },
      },
    ],
    playbookCategories: [
      "Listing Process", "Buyer Process", "Showing Procedures", "Offer & Negotiation",
      "Transaction Management", "Tenant Screening", "Maintenance Procedures", "Lease Management",
      "Fair Housing Compliance", "Communication Templates", "Marketing Guidelines", "Other / General",
    ],
  },
};

// ── Shared UI Components ──
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

// ── Communication section renderer (shared between verticals) ──
function CommunicationSection({ rules, updateRules, accent }) {
  return (
    <CollapsibleSection title="Communication Permissions" accent={accent}>
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
  );
}

// ── Generic permission section renderer ──
function PermissionSection({ section, rules, updateRules }) {
  if (section.type === "communication") {
    return <CommunicationSection rules={rules} updateRules={updateRules} accent={section.accent} />;
  }

  return (
    <CollapsibleSection title={section.title} accent={section.accent} defaultOpen={section.defaultOpen}>
      {(section.rows || []).map(row => (
        <PermissionRow
          key={row.key}
          label={row.label}
          levelValue={rules[section.key]?.[row.key] || 1}
          onLevelChange={v => updateRules(`${section.key}.${row.key}`, v)}
          extraLabel={row.extra?.label}
          extraValue={row.extra ? rules[section.key]?.[row.extra.field] : undefined}
          onExtraChange={row.extra ? v => updateRules(`${section.key}.${row.extra.field}`, v) : undefined}
          extraType={row.extra?.type}
        />
      ))}
      {section.footer && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
          <div style={{ flex: 1, fontSize: "14px", color: "#334155" }}>{section.footer.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {section.footer.prefix && <span style={{ fontSize: "14px", color: "#64748b" }}>{section.footer.prefix}</span>}
            <input type="number" value={rules[section.key]?.[section.footer.field] || 0} onChange={e => updateRules(`${section.key}.${section.footer.field}`, Number(e.target.value))} style={{ width: "100px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "14px", textAlign: "right" }} />
          </div>
        </div>
      )}
      {(section.postRows || []).map(row => (
        <PermissionRow
          key={row.key}
          label={row.label}
          levelValue={rules[section.key]?.[row.key] || 1}
          onLevelChange={v => updateRules(`${section.key}.${row.key}`, v)}
        />
      ))}
    </CollapsibleSection>
  );
}

export default function Rules() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "FL";
  const config = RULES_CONFIGS[vertical] || RULES_CONFIGS.auto;
  const [rules, setRules] = useState(config.defaults);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Playbooks
  const [playbooks, setPlaybooks] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const playbookInputRef = React.useRef(null);

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

  function handlePlaybookFiles(files) {
    const accepted = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg", "image/webp"];
    const maxSize = 10 * 1024 * 1024;
    for (const file of Array.from(files)) {
      if (!accepted.some(t => file.type.startsWith(t.split("/")[0]) || file.type === t)) continue;
      if (file.size > maxSize) continue;
      setPlaybooks(prev => [...prev, {
        id: `pb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        size: file.size,
        category: "Other / General",
        uploadedAt: new Date().toISOString(),
        file,
      }]);
    }
  }

  function updatePlaybookCategory(id, category) {
    setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, category } : p));
  }

  function removePlaybook(id) {
    setPlaybooks(prev => prev.filter(p => p.id !== id));
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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

      {/* Permission Sections — driven by config */}
      {config.sections.map(section => (
        <PermissionSection key={section.key} section={section} rules={rules} updateRules={updateRules} />
      ))}

      {/* Custom AI Training / Playbooks */}
      <div className="card" style={{ marginTop: "20px", padding: "24px" }}>
        <div style={{ marginBottom: "4px" }}>
          <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>Custom AI Training</div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>Upload your SOPs, scripts, and playbooks. Your AI will follow your processes.</div>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handlePlaybookFiles(e.dataTransfer.files); }}
          onClick={() => playbookInputRef.current?.click()}
          style={{
            margin: "16px 0",
            padding: "32px",
            border: `2px dashed ${dragOver ? "#7c3aed" : "#e2e8f0"}`,
            borderRadius: "12px",
            background: dragOver ? "#faf5ff" : "#f8fafc",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <input
            ref={playbookInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
            style={{ display: "none" }}
            onChange={(e) => { handlePlaybookFiles(e.target.files); e.target.value = ""; }}
          />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Drop files here or click to browse</div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>PDF, DOCX, TXT, or images (OCR). Max 10 MB per file.</div>
        </div>

        {/* Document list */}
        {playbooks.length > 0 && (
          <div className="tableWrap" style={{ marginBottom: "16px" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Uploaded</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {playbooks.map(pb => (
                  <tr key={pb.id}>
                    <td className="tdStrong">{pb.name}</td>
                    <td>
                      <select
                        value={pb.category}
                        onChange={(e) => updatePlaybookCategory(pb.id, e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                      >
                        {config.playbookCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {new Date(pb.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{formatFileSize(pb.size)}</td>
                    <td>
                      <button
                        onClick={() => removePlaybook(pb.id)}
                        className="iconBtn"
                        style={{ padding: "4px 8px", fontSize: "11px", color: "#dc2626", borderColor: "#dc2626" }}
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create from Scratch */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "I don't have a written playbook yet. Can you help me create one?" } }))}
          className="iconBtn"
          style={{ fontSize: "13px", color: "#7c3aed", borderColor: "#7c3aed" }}
        >
          Create from Scratch
        </button>
      </div>

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
          <div style={{ fontWeight: 600, color: "#94a3b8" }}>{playbooks.length > 0 ? `${playbooks.length} playbook${playbooks.length !== 1 ? "s" : ""} uploaded` : "None set"}</div>
        </div>
      </div>
    </div>
  );
}
