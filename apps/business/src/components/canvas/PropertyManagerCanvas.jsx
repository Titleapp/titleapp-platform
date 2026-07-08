import { useState } from "react";

const DEMO_PROPERTIES = [
  {
    id: "prop-1",
    address: "1 Main St",
    city: "Las Vegas, NV",
    units: [
      {
        id: "u-1a",
        unit: "Unit A",
        status: "occupied",
        tenant: "Marcus Reyes",
        rent: 2400,
        due: 1,
        paidThrough: "Jul 2026",
        leaseEnd: "Nov 30, 2026",
        daysPastDue: 0,
        mxOpen: 0,
      },
      {
        id: "u-1b",
        unit: "Unit B",
        status: "occupied",
        tenant: "Priya Nair",
        rent: 2600,
        due: 1,
        paidThrough: "Jun 2026",
        leaseEnd: "Sep 15, 2026",
        daysPastDue: 7,
        mxOpen: 1,
      },
      {
        id: "u-1c",
        unit: "Unit C",
        status: "vacant",
        tenant: null,
        rent: 2500,
        due: null,
        paidThrough: null,
        leaseEnd: null,
        daysPastDue: 0,
        mxOpen: 0,
      },
    ],
  },
  {
    id: "prop-2",
    address: "2 Oak Ave",
    city: "Las Vegas, NV",
    units: [
      {
        id: "u-2-1",
        unit: "Unit 1",
        status: "eviction",
        tenant: "Derek Hollis",
        rent: 3100,
        due: 1,
        paidThrough: "May 2026",
        leaseEnd: "Dec 31, 2026",
        daysPastDue: 37,
        mxOpen: 0,
      },
    ],
  },
];

const DEMO_MAINTENANCE = [
  { id: "mx-001", unit: "1 Main St, Unit B", type: "emergency", issue: "No hot water — water heater fault", opened: "Jul 6, 2026", vendor: "Desert Plumbing Co.", status: "in_progress", estCost: 450 },
  { id: "mx-002", unit: "1 Main St, Unit A", type: "routine", issue: "Bathroom exhaust fan not working", opened: "Jul 2, 2026", vendor: "HandyPro", status: "scheduled", estCost: 120 },
  { id: "mx-003", unit: "2 Oak Ave, Unit 1", type: "routine", issue: "Front door deadbolt sticking", opened: "Jun 15, 2026", vendor: "Lockmaster NV", status: "closed", estCost: 85 },
];

const DEMO_APPLICANTS = [
  { id: "ap-001", unit: "1 Main St, Unit C", name: "Jordan Vance", income: 7800, creditTier: "Good (680–719)", priorEviction: false, priorBalance: false, fhFlag: null, decision: "approve" },
  { id: "ap-002", unit: "1 Main St, Unit C", name: "Anita Reeves", income: 6200, creditTier: "Fair (620–679)", priorEviction: false, priorBalance: true, fhFlag: "YELLOW", fhNote: "Prior balance-due creates disparate-impact risk — document rationale carefully.", decision: "conditional" },
];

const DEMO_EVICTIONS = [
  { id: "ev-001", unit: "2 Oak Ave, Unit 1", tenant: "Derek Hollis", type: "pay_or_quit", servedDate: "Jul 1, 2026", cureDays: 5, cureDeadline: "Jul 6, 2026", status: "cure_expired", nextStep: "File unlawful detainer — Clark County District Court. Gather: notice + proof of service + rent ledger." },
];

const DEMO_COMPLIANCE = [
  { id: "c-001", category: "lease_expiry", unit: "1 Main St, Unit B", tenant: "Priya Nair", deadline: "Sep 15, 2026", daysOut: 69, severity: "yellow", action: "Send renewal offer by Aug 1 (45 days advance)" },
  { id: "c-002", category: "rent_past_due", unit: "1 Main St, Unit B", tenant: "Priya Nair", deadline: "Pay or Quit — serve by Jul 15", daysOut: 7, severity: "red", action: "Serve 5-day Pay or Quit notice (NV NRS 40.253)" },
  { id: "c-003", category: "mx_emergency", unit: "1 Main St, Unit B", tenant: "Priya Nair", deadline: "Jul 7, 2026 — 24hr dispatch deadline", daysOut: 0, severity: "red", action: "Water heater dispatch in progress — verify closed today" },
  { id: "c-004", category: "lease_expiry", unit: "1 Main St, Unit A", tenant: "Marcus Reyes", deadline: "Nov 30, 2026", daysOut: 145, severity: "green", action: "Renewal outreach due Oct 1" },
];

const TABS = ["Properties", "Lease-Up", "Screening", "Maintenance", "Evictions", "Compliance"];

const SEV_COLOR = { red: "#ef4444", yellow: "#eab308", green: "#22c55e" };
const SEV_BG = { red: "#fef2f2", yellow: "#fefce8", green: "#f0fdf4" };
const STATUS_BADGE = {
  occupied: { label: "Occupied", bg: "#dcfce7", color: "#166534" },
  vacant: { label: "Vacant", bg: "#fef9c3", color: "#854d0e" },
  eviction: { label: "Eviction", bg: "#fee2e2", color: "#991b1b" },
};
const MX_TYPE_COLOR = { emergency: "#ef4444", routine: "#3b82f6", cosmetic: "#a3a3a3" };
const MX_STATUS_LABEL = { in_progress: "In Progress", scheduled: "Scheduled", closed: "Closed", open: "Open" };
const DECISION_STYLE = {
  approve: { label: "Approve", bg: "#dcfce7", color: "#166534" },
  conditional: { label: "Conditional", bg: "#fef9c3", color: "#854d0e" },
  deny: { label: "Deny", bg: "#fee2e2", color: "#991b1b" },
};
const FH_STYLE = {
  GREEN: { label: "FH: Clean", bg: "#dcfce7", color: "#166534" },
  YELLOW: { label: "FH: Flag", bg: "#fef9c3", color: "#854d0e" },
  RED: { label: "FH: Block", bg: "#fee2e2", color: "#991b1b" },
};

function stat(label, value, sub, color) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", minWidth: 90 }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

function PropertiesTab() {
  const allUnits = DEMO_PROPERTIES.flatMap((p) => p.units.map((u) => ({ ...u, property: p.address, city: p.city })));
  const occupied = allUnits.filter((u) => u.status === "occupied" || u.status === "eviction").length;
  const grossRent = allUnits.filter((u) => u.status === "occupied" || u.status === "eviction").reduce((s, u) => s + u.rent, 0);
  const pastDue = allUnits.filter((u) => u.daysPastDue > 0).length;
  const openMx = DEMO_MAINTENANCE.filter((m) => m.status !== "closed").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {stat("Units", `${occupied}/${allUnits.length}`, "occupied")}
        {stat("Monthly Gross", `$${grossRent.toLocaleString()}`, "contracted rent")}
        {stat("Past Due", pastDue, "tenants", pastDue > 0 ? "#ef4444" : "#22c55e")}
        {stat("Open MX", openMx, "work orders", openMx > 0 ? "#eab308" : "#22c55e")}
      </div>
      {DEMO_PROPERTIES.map((p) => (
        <div key={p.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#374151" }}>
            {p.address} · {p.city} · {p.units.length} unit{p.units.length !== 1 ? "s" : ""}
          </div>
          {p.units.map((u) => {
            const badge = STATUS_BADGE[u.status] || STATUS_BADGE.occupied;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{u.unit}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, borderRadius: 4, padding: "1px 6px" }}>{badge.label}</span>
                    {u.daysPastDue > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "1px 6px" }}>{u.daysPastDue}d past due</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {u.tenant ? `${u.tenant} · $${u.rent.toLocaleString()}/mo · Lease ends ${u.leaseEnd}` : `$${u.rent.toLocaleString()}/mo market · Available now`}
                  </div>
                </div>
                {u.mxOpen > 0 && <span style={{ fontSize: 10, background: "#fef9c3", color: "#854d0e", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>{u.mxOpen} MX open</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function LeaseUpTab() {
  const vacantUnits = DEMO_PROPERTIES.flatMap((p) => p.units.filter((u) => u.status === "vacant").map((u) => ({ ...u, property: p.address })));
  const stages = ["Inquired", "Toured", "Applied", "Screened", "Approved", "Signed"];
  const pipeline = [
    { stage: "Applied", count: 2 },
    { stage: "Screened", count: 1 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {vacantUnits.map((u) => (
        <div key={u.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#fef9c3", borderBottom: "1px solid #fde68a", padding: "8px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{u.property} · {u.unit} — Vacant · ${u.rent.toLocaleString()}/mo market</div>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>APPLICANT PIPELINE</div>
            <div style={{ display: "flex", gap: 6 }}>
              {stages.map((s) => {
                const p = pipeline.find((x) => x.stage === s);
                return (
                  <div key={s} style={{ flex: 1, textAlign: "center", background: p ? "#dbeafe" : "#f9fafb", border: `1px solid ${p ? "#93c5fd" : "#e5e7eb"}`, borderRadius: 6, padding: "6px 4px" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: p ? "#1d4ed8" : "#9ca3af" }}>{p ? p.count : "—"}</div>
                    <div style={{ fontSize: 9, color: p ? "#1d4ed8" : "#9ca3af", fontWeight: 600 }}>{s.toUpperCase()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#374151" }}>
              <strong>Next action:</strong> Jordan Vance — approved, pending lease signature. Send lease package by Jul 10.
            </div>
          </div>
        </div>
      ))}
      {vacantUnits.length === 0 && <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: 24 }}>No vacant units — all units occupied.</div>}
    </div>
  );
}

function ScreeningTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534" }}>
        <strong>Fair Housing enforcement active.</strong> All screening decisions apply only income ratio, credit tier, rental history, and prior balance/eviction flags per your written policy. Protected-class criteria are blocked.
      </div>
      {DEMO_APPLICANTS.map((a) => {
        const ds = DECISION_STYLE[a.decision];
        const fh = a.fhFlag ? FH_STYLE[a.fhFlag] : FH_STYLE.GREEN;
        return (
          <div key={a.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{a.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: ds.bg, color: ds.color, borderRadius: 4, padding: "1px 7px" }}>{ds.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: fh.bg, color: fh.color, borderRadius: 4, padding: "1px 7px" }}>{fh.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: a.fhNote ? 6 : 0 }}>
              Unit: {a.unit} · Income: ${a.income.toLocaleString()}/mo · Credit: {a.creditTier} · Prior eviction: {a.priorEviction ? "Yes" : "No"} · Prior balance-due: {a.priorBalance ? "Yes" : "No"}
            </div>
            {a.fhNote && (
              <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#92400e" }}>
                FH flag: {a.fhNote}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MaintenanceTab() {
  const open = DEMO_MAINTENANCE.filter((m) => m.status !== "closed");
  const closed = DEMO_MAINTENANCE.filter((m) => m.status === "closed");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {open.map((m) => (
        <div key={m.id} style={{ background: "#fff", border: `1px solid ${m.type === "emergency" ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: MX_TYPE_COLOR[m.type], borderRadius: 4, padding: "1px 7px", textTransform: "uppercase" }}>{m.type}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#374151", background: "#f3f4f6", borderRadius: 4, padding: "1px 7px" }}>{MX_STATUS_LABEL[m.status]}</span>
            <span style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>Est. ${m.estCost}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{m.issue}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{m.unit} · Opened {m.opened} · Vendor: {m.vendor}</div>
        </div>
      ))}
      {closed.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginTop: 6 }}>CLOSED</div>
          {closed.map((m) => (
            <div key={m.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", opacity: 0.7 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{m.issue}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.unit} · Closed · ${m.estCost}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function EvictionsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#991b1b" }}>
        <strong>Self-help eviction is illegal.</strong> Do not change locks, shut off utilities, or remove belongings. Proceed only via court process.
      </div>
      {DEMO_EVICTIONS.map((e) => (
        <div key={e.id} style={{ background: "#fff", border: "1px solid #fca5a5", borderRadius: 10, padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{e.unit}</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "1px 7px" }}>Cure Expired</span>
          </div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
            Tenant: {e.tenant} · {e.type === "pay_or_quit" ? "Pay or Quit" : e.type} · Served: {e.servedDate} · {e.cureDays}-day cure · Deadline: {e.cureDeadline}
          </div>
          <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#92400e" }}>
            <strong>Next step:</strong> {e.nextStep}
          </div>
        </div>
      ))}
      {DEMO_EVICTIONS.length === 0 && <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: 24 }}>No active eviction proceedings.</div>}
    </div>
  );
}

function ComplianceTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 2 }}>UPCOMING DEADLINES — sorted by urgency</div>
      {DEMO_COMPLIANCE.sort((a, b) => a.daysOut - b.daysOut).map((c) => (
        <div key={c.id} style={{ background: SEV_BG[c.severity], border: `1px solid ${SEV_COLOR[c.severity]}40`, borderRadius: 10, padding: "11px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_COLOR[c.severity], marginTop: 4, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{c.unit}{c.tenant ? ` · ${c.tenant}` : ""}</div>
            <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>{c.deadline}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{c.action}</div>
          </div>
          {c.daysOut <= 7 && (
            <span style={{ fontSize: 10, fontWeight: 700, background: SEV_COLOR[c.severity], color: "#fff", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
              {c.daysOut === 0 ? "Today" : `${c.daysOut}d`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PropertyManagerCanvas({ payload: directPayload, onBack, resolved: _resolved = {}, context: _context = {}, onDismiss }) {
  const _payload = directPayload || _context?.payload || _resolved?.payload || {}; void _payload;
  const handleBack = onBack || onDismiss || null;
  const [tab, setTab] = useState("Properties");

  const allUnits = DEMO_PROPERTIES.flatMap((p) => p.units);
  const occupied = allUnits.filter((u) => u.status === "occupied" || u.status === "eviction").length;

  const tabContent = {
    Properties: <PropertiesTab />,
    "Lease-Up": <LeaseUpTab />,
    Screening: <ScreeningTab />,
    Maintenance: <MaintenanceTab />,
    Evictions: <EvictionsTab />,
    Compliance: <ComplianceTab />,
  };

  const alerts = DEMO_COMPLIANCE.filter((c) => c.severity === "red").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          {handleBack && (
            <button onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 18, padding: 0, lineHeight: 1 }}>
              ←
            </button>
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Property Manager</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              {DEMO_PROPERTIES.length} properties · {occupied}/{allUnits.length} units occupied
              {alerts > 0 && <span style={{ marginLeft: 8, color: "#ef4444", fontWeight: 700 }}>· {alerts} urgent</span>}
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginTop: 10, overflowX: "auto" }}>
          {TABS.map((t) => {
            const hasBadge = (t === "Evictions" && DEMO_EVICTIONS.length > 0) || (t === "Compliance" && alerts > 0);
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "5px 11px",
                  fontSize: 12,
                  fontWeight: tab === t ? 700 : 500,
                  color: tab === t ? "#7c3aed" : "#6b7280",
                  background: tab === t ? "#f5f3ff" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  position: "relative",
                }}
              >
                {t}
                {hasBadge && <span style={{ position: "absolute", top: 2, right: 4, width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {tabContent[tab]}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", padding: "8px 16px", background: "#fff", fontSize: 10, color: "#9ca3af" }}>
        Fair Housing rules enforced · NV statutes applied · RAAS property_manager_v1
      </div>
    </div>
  );
}
