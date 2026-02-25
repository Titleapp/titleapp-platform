import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import EscalationLog from "../components/EscalationLog";

const DEFAULT_CONFIG = {
  mode: "autonomous",
  sales: {
    autoRespond: true,
    autoFollowUp: true,
    followUpCadence: "day1, day3, day7, day14, day30",
    maxFollowUps: 5,
    autoScheduleDemo: true,
    escalateOn: ["angry_customer", "legal_question", "refund_request_over_100"],
  },
  service: {
    autoResolve: true,
    autoEscalate: true,
    escalateAfterAttempts: 3,
    escalateOn: ["bug_report", "data_loss", "security_concern", "billing_dispute"],
  },
  customerCare: {
    autoOnboard: true,
    autoCheckIn: true,
    checkInCadence: "day7, day30, day60",
    autoChurnIntervention: true,
    churnSignals: ["no_login_14d", "worker_deleted", "subscription_downgrade"],
  },
  investorOutreach: {
    autoFollowUp: true,
    autoSendDeck: true,
    autoScheduleCall: false,
    escalateOn: ["ready_to_commit", "due_diligence_request", "legal_question"],
  },
  campaigns: {
    autoOptimize: false,
    autoPause: true,
    pauseOn: ["cpc_over_15", "ctr_under_0.5", "budget_exceeded"],
    autoScale: false,
  },
  accounting: {
    autoReconcile: true,
    autoCategorizeTxns: true,
    escalateOn: ["unknown_charge", "amount_over_1000", "failed_payment"],
  },
  globalEscalation: {
    method: "sms",
    phone: "+14152360013",
    email: "seanlcombs@gmail.com",
    alsoNotify: ["sean@titleapp.ai", "kent@titleapp.ai"],
    urgentSMS: true,
    quietHours: { start: "22:00", end: "07:00", timezone: "America/Los_Angeles" },
    quietHoursOverrideFor: ["security_concern", "data_loss", "payment_failure_over_500"],
  },
};

const MODE_OPTIONS = [
  { value: "autonomous", label: "Autonomous", desc: "Full go. Do and report back only if issue." },
  { value: "supervised", label: "Supervised", desc: "Alex drafts, Sean approves before send." },
  { value: "manual", label: "Manual", desc: "Alex only takes action when instructed." },
];

function Toggle({ value, onChange }) {
  return (
    <button
      className={`ac-toggle ${value ? "ac-toggle-on" : ""}`}
      onClick={() => onChange(!value)}
      type="button"
    />
  );
}

function SettingRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f2f8" }}>
      <span style={{ fontSize: "13px", color: "#0f172a" }}>{label}</span>
      {children}
    </div>
  );
}

function TagInput({ value, onChange }) {
  const tags = Array.isArray(value) ? value : [];
  const [input, setInput] = useState("");

  function add() {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  }

  function remove(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
        {tags.map((t) => (
          <span key={t} className="ac-badge" style={{ cursor: "pointer" }} onClick={() => remove(t)}>
            {t} x
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <input
          className="ac-input"
          style={{ width: "180px", fontSize: "12px" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add trigger..."
        />
        <button className="ac-btn ac-btn-sm" onClick={add} type="button">Add</button>
      </div>
    </div>
  );
}

function generatePreview(config) {
  const parts = [];
  if (config.mode === "autonomous") parts.push("Alex operates fully autonomously.");
  else if (config.mode === "supervised") parts.push("Alex drafts all communications for Sean's approval.");
  else parts.push("Alex only acts when instructed.");

  if (config.sales?.autoRespond) parts.push("Auto-responds to inbound leads.");
  if (config.sales?.autoFollowUp) parts.push(`Follows up at ${config.sales.followUpCadence}.`);
  if (config.sales?.autoScheduleDemo) parts.push("Schedules demos automatically.");
  if (config.service?.autoResolve) parts.push("Resolves support tickets autonomously.");
  if (config.customerCare?.autoChurnIntervention) parts.push("Intervenes on churn signals.");
  if (config.campaigns?.autoPause) parts.push("Auto-pauses underperforming campaigns.");
  if (config.accounting?.autoCategorizeTxns) parts.push("Auto-categorizes transactions.");

  const escalations = [
    ...(config.sales?.escalateOn || []),
    ...(config.service?.escalateOn || []),
  ];
  if (escalations.length > 0) {
    parts.push(`Escalates to Sean on: ${escalations.slice(0, 4).join(", ")}${escalations.length > 4 ? "..." : ""}.`);
  }

  return parts.join(" ");
}

export default function AIControls() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("controls");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "aiAuthorization"), (snap) => {
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() });
      }
    });
    return () => unsub();
  }, []);

  function update(path, value) {
    const parts = path.split(".");
    setConfig((prev) => {
      const next = { ...prev };
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    await setDoc(doc(db, "config", "aiAuthorization"), config);
    setSaving(false);
  }

  return (
    <div>
      <div className="ac-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="ac-page-title">AI Controls</h1>
          <p className="ac-page-subtitle">Alex autonomy settings and escalation management</p>
        </div>
        <button className="ac-btn ac-btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="ac-tabs">
        <button className={`ac-tab ${tab === "controls" ? "ac-tab-active" : ""}`} onClick={() => setTab("controls")}>
          Controls
        </button>
        <button className={`ac-tab ${tab === "escalations" ? "ac-tab-active" : ""}`} onClick={() => setTab("escalations")}>
          Escalation Log
        </button>
      </div>

      {tab === "controls" && (
        <>
          {/* Mode selector */}
          <div className="ac-card" style={{ marginBottom: "16px" }}>
            <div className="ac-card-header">
              <span className="ac-card-title">Operating Mode</span>
            </div>
            <div className="ac-card-body">
              <div style={{ display: "flex", gap: "12px" }}>
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    className={`ac-btn ${config.mode === m.value ? "ac-btn-primary" : ""}`}
                    onClick={() => update("mode", m.value)}
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    <div style={{ fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.8 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="ac-card" style={{ marginBottom: "16px", background: "rgba(124,58,237,0.03)" }}>
            <div className="ac-card-body">
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Alex will:
              </div>
              <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.6" }}>
                {generatePreview(config)}
              </div>
            </div>
          </div>

          {/* Domain sections */}
          <div className="ac-grid-2">
            {/* Sales */}
            <div className="ac-card">
              <div className="ac-card-header"><span className="ac-card-title">Sales</span></div>
              <div className="ac-card-body">
                <SettingRow label="Auto-respond to leads"><Toggle value={config.sales.autoRespond} onChange={(v) => update("sales.autoRespond", v)} /></SettingRow>
                <SettingRow label="Auto follow-up"><Toggle value={config.sales.autoFollowUp} onChange={(v) => update("sales.autoFollowUp", v)} /></SettingRow>
                <SettingRow label="Auto schedule demos"><Toggle value={config.sales.autoScheduleDemo} onChange={(v) => update("sales.autoScheduleDemo", v)} /></SettingRow>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Follow-up cadence</div>
                  <input className="ac-input" value={config.sales.followUpCadence} onChange={(e) => update("sales.followUpCadence", e.target.value)} />
                </div>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Max follow-ups</div>
                  <input className="ac-input" type="number" value={config.sales.maxFollowUps} onChange={(e) => update("sales.maxFollowUps", parseInt(e.target.value) || 0)} style={{ width: "80px" }} />
                </div>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Escalate on</div>
                  <TagInput value={config.sales.escalateOn} onChange={(v) => update("sales.escalateOn", v)} />
                </div>
              </div>
            </div>

            {/* Service */}
            <div className="ac-card">
              <div className="ac-card-header"><span className="ac-card-title">Service</span></div>
              <div className="ac-card-body">
                <SettingRow label="Auto-resolve tickets"><Toggle value={config.service.autoResolve} onChange={(v) => update("service.autoResolve", v)} /></SettingRow>
                <SettingRow label="Auto-escalate"><Toggle value={config.service.autoEscalate} onChange={(v) => update("service.autoEscalate", v)} /></SettingRow>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Escalate after attempts</div>
                  <input className="ac-input" type="number" value={config.service.escalateAfterAttempts} onChange={(e) => update("service.escalateAfterAttempts", parseInt(e.target.value) || 0)} style={{ width: "80px" }} />
                </div>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Escalate on</div>
                  <TagInput value={config.service.escalateOn} onChange={(v) => update("service.escalateOn", v)} />
                </div>
              </div>
            </div>

            {/* Customer Care */}
            <div className="ac-card">
              <div className="ac-card-header"><span className="ac-card-title">Customer Care</span></div>
              <div className="ac-card-body">
                <SettingRow label="Auto-onboard"><Toggle value={config.customerCare.autoOnboard} onChange={(v) => update("customerCare.autoOnboard", v)} /></SettingRow>
                <SettingRow label="Auto check-in"><Toggle value={config.customerCare.autoCheckIn} onChange={(v) => update("customerCare.autoCheckIn", v)} /></SettingRow>
                <SettingRow label="Auto churn intervention"><Toggle value={config.customerCare.autoChurnIntervention} onChange={(v) => update("customerCare.autoChurnIntervention", v)} /></SettingRow>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Churn signals</div>
                  <TagInput value={config.customerCare.churnSignals} onChange={(v) => update("customerCare.churnSignals", v)} />
                </div>
              </div>
            </div>

            {/* Investor Outreach */}
            <div className="ac-card">
              <div className="ac-card-header"><span className="ac-card-title">Investor Outreach</span></div>
              <div className="ac-card-body">
                <SettingRow label="Auto follow-up"><Toggle value={config.investorOutreach.autoFollowUp} onChange={(v) => update("investorOutreach.autoFollowUp", v)} /></SettingRow>
                <SettingRow label="Auto send deck"><Toggle value={config.investorOutreach.autoSendDeck} onChange={(v) => update("investorOutreach.autoSendDeck", v)} /></SettingRow>
                <SettingRow label="Auto schedule calls"><Toggle value={config.investorOutreach.autoScheduleCall} onChange={(v) => update("investorOutreach.autoScheduleCall", v)} /></SettingRow>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Escalate on</div>
                  <TagInput value={config.investorOutreach.escalateOn} onChange={(v) => update("investorOutreach.escalateOn", v)} />
                </div>
              </div>
            </div>

            {/* Campaigns */}
            <div className="ac-card">
              <div className="ac-card-header"><span className="ac-card-title">Campaigns</span></div>
              <div className="ac-card-body">
                <SettingRow label="Auto-optimize"><Toggle value={config.campaigns.autoOptimize} onChange={(v) => update("campaigns.autoOptimize", v)} /></SettingRow>
                <SettingRow label="Auto-pause"><Toggle value={config.campaigns.autoPause} onChange={(v) => update("campaigns.autoPause", v)} /></SettingRow>
                <SettingRow label="Auto-scale"><Toggle value={config.campaigns.autoScale} onChange={(v) => update("campaigns.autoScale", v)} /></SettingRow>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Pause on</div>
                  <TagInput value={config.campaigns.pauseOn} onChange={(v) => update("campaigns.pauseOn", v)} />
                </div>
              </div>
            </div>

            {/* Accounting */}
            <div className="ac-card">
              <div className="ac-card-header"><span className="ac-card-title">Accounting</span></div>
              <div className="ac-card-body">
                <SettingRow label="Auto-reconcile"><Toggle value={config.accounting.autoReconcile} onChange={(v) => update("accounting.autoReconcile", v)} /></SettingRow>
                <SettingRow label="Auto-categorize transactions"><Toggle value={config.accounting.autoCategorizeTxns} onChange={(v) => update("accounting.autoCategorizeTxns", v)} /></SettingRow>
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Escalate on</div>
                  <TagInput value={config.accounting.escalateOn} onChange={(v) => update("accounting.escalateOn", v)} />
                </div>
              </div>
            </div>
          </div>

          {/* Global Escalation */}
          <div className="ac-card" style={{ marginTop: "16px" }}>
            <div className="ac-card-header"><span className="ac-card-title">Global Escalation</span></div>
            <div className="ac-card-body">
              <div className="ac-grid-2" style={{ marginBottom: 0 }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Phone (SMS)</div>
                  <input className="ac-input" value={config.globalEscalation.phone} onChange={(e) => update("globalEscalation.phone", e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Email</div>
                  <input className="ac-input" value={config.globalEscalation.email} onChange={(e) => update("globalEscalation.email", e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: "12px" }}>
                <SettingRow label="Urgent SMS notifications"><Toggle value={config.globalEscalation.urgentSMS} onChange={(v) => update("globalEscalation.urgentSMS", v)} /></SettingRow>
              </div>
              <div className="ac-grid-2" style={{ marginTop: "12px", marginBottom: 0 }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Quiet hours start</div>
                  <input className="ac-input" type="time" value={config.globalEscalation.quietHours?.start || "22:00"} onChange={(e) => update("globalEscalation.quietHours", { ...config.globalEscalation.quietHours, start: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Quiet hours end</div>
                  <input className="ac-input" type="time" value={config.globalEscalation.quietHours?.end || "07:00"} onChange={(e) => update("globalEscalation.quietHours", { ...config.globalEscalation.quietHours, end: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "escalations" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Escalation Log</span>
          </div>
          <div className="ac-card-body" style={{ padding: 0 }}>
            <EscalationLog />
          </div>
        </div>
      )}
    </div>
  );
}
