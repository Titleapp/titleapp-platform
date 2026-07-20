// TenantPortalCanvas — consumer-facing tenant portal (Merritt Capital Group)
// Slug: tenant-portal-001 — rendered for Sara Kahele as a renter.
import React, { useState } from "react";

const ACCENT = "#0ea5e9";
const GREEN = "#16a34a";
const AMBER = "#d97706";

const UNIT = {
  address: "Kona Gardens Apt 204",
  city: "Kailua-Kona, HI 96740",
  bedrooms: "2 BR / 1 BA",
  sqft: "872 sq ft",
  monthlyRent: 1850,
  leaseStart: "Aug 1, 2025",
  leaseEnd: "Jul 31, 2026",
  daysUntilExpiry: 12,
  propertyManager: "Merritt Capital Group",
  contact: "Lisa Torres, Property Manager",
  phone: "(808) 555-0192",
};

const PAYMENTS = [
  { month: "July 2026", amount: 1850, date: "Jul 1, 2026", status: "paid", method: "ACH" },
  { month: "June 2026", amount: 1850, date: "Jun 1, 2026", status: "paid", method: "ACH" },
  { month: "May 2026", amount: 1850, date: "May 1, 2026", status: "paid", method: "ACH" },
  { month: "April 2026", amount: 1850, date: "Apr 1, 2026", status: "paid", method: "ACH" },
  { month: "March 2026", amount: 1850, date: "Mar 1, 2026", status: "paid", method: "ACH" },
];

const MAINTENANCE = [
  { id: "MR-2026-041", title: "Bathroom faucet dripping", category: "Plumbing", submitted: "Jul 8, 2026", status: "scheduled", scheduled: "Jul 22, 2026", priority: "normal" },
  { id: "MR-2026-018", title: "AC filter replacement", category: "HVAC", submitted: "Mar 15, 2026", status: "completed", completed: "Mar 18, 2026", priority: "normal" },
  { id: "MR-2026-003", title: "Kitchen light fixture flickering", category: "Electrical", submitted: "Jan 20, 2026", status: "completed", completed: "Jan 23, 2026", priority: "normal" },
];

const STATUS_PILL = (status) => {
  const map = {
    "paid": { bg: "#dcfce7", color: "#15803d", label: "Paid" },
    "scheduled": { bg: "#dbeafe", color: "#1d4ed8", label: "Scheduled" },
    "completed": { bg: "#f1f5f9", color: "#475569", label: "Completed" },
    "open": { bg: "#fef3c7", color: "#b45309", label: "Open" },
    "overdue": { bg: "#fee2e2", color: "#b91c1c", label: "Overdue" },
  };
  const s = map[status] || map["open"];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
};

const TAB_STYLE = (active) => ({
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  color: active ? ACCENT : "#64748b",
  background: "none",
  border: "none",
  borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
  cursor: "pointer",
  letterSpacing: 0.1,
});

// eslint-disable-next-line react-refresh/only-export-components
export function isTenantPortalWorker(w) {
  return (w?.workerId || w?.slug || "") === "tenant-portal-001";
}

export default function TenantPortalCanvas() {
  const [tab, setTab] = useState("rent");
  const [mxOpen, setMxOpen] = useState(false);
  const [mxForm, setMxForm] = useState({ title: "", category: "Plumbing", description: "" });

  const nextDue = new Date();
  nextDue.setDate(1);
  nextDue.setMonth(nextDue.getMonth() + 1);
  const nextDueStr = nextDue.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 4px 32px" }}>

      {/* Unit card */}
      <div style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", gap: 20, border: "1px solid #bae6fd" }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
          🏠
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>{UNIT.address}</div>
          <div style={{ fontSize: 13, color: "#0369a1", marginTop: 2 }}>{UNIT.city} · {UNIT.bedrooms} · {UNIT.sqft}</div>
          <div style={{ fontSize: 12, color: "#0284c7", marginTop: 4 }}>
            Lease: {UNIT.leaseStart} → {UNIT.leaseEnd}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0c4a6e" }}>${UNIT.monthlyRent.toLocaleString()}<span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>/mo</span></div>
          {UNIT.daysUntilExpiry <= 30 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: "#b45309", background: "#fef3c7", borderRadius: 999, padding: "2px 8px", marginTop: 4 }}>
              Lease expires in {UNIT.daysUntilExpiry} days
            </div>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => { setTab("maintenance"); setMxOpen(true); }}
          style={{ flex: 1, padding: "11px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 0.2 }}
        >
          Emergency Maintenance
        </button>
        <button
          onClick={() => setTab("lease")}
          style={{ flex: 1, padding: "11px 16px", background: "#fff", color: "#0369a1", border: "1.5px solid #bae6fd", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
        {[["rent", "Rent & Payments"], ["maintenance", "Maintenance"], ["lease", "Lease & Contact"]].map(([key, label]) => (
          <button key={key} style={TAB_STYLE(tab === key)} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Rent tab */}
      {tab === "rent" && (
        <div>
          {/* Next payment */}
          <div style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Next Payment Due</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0c4a6e", marginTop: 4 }}>${UNIT.monthlyRent.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>Due {nextDueStr}</div>
            </div>
            <button style={{ padding: "10px 22px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Pay Now
            </button>
          </div>

          {/* Payment history */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10 }}>Payment History</div>
          {PAYMENTS.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: i % 2 === 0 ? "#fff" : "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{p.month}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.date} · {p.method}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>${p.amount.toLocaleString()}</span>
                {STATUS_PILL(p.status)}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
            5 payments on time · 0 late payments · Perfect record
          </div>
        </div>
      )}

      {/* Maintenance tab */}
      {tab === "maintenance" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Maintenance Requests</div>
            <button
              onClick={() => setMxOpen(!mxOpen)}
              style={{ padding: "8px 16px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              + New Request
            </button>
          </div>

          {/* Emergency contact strip */}
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>Emergency Maintenance</div>
              <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>Lisa Torres · (808) 555-0192</div>
            </div>
            <a href="tel:+18085550192" style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Call Now</a>
          </div>

          {mxOpen && (
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0c4a6e", marginBottom: 12 }}>Submit Maintenance Request</div>
              <input
                placeholder="Issue title (e.g. Leaking pipe under sink)"
                value={mxForm.title}
                onChange={e => setMxForm(f => ({ ...f, title: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #bae6fd", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
              />
              <select
                value={mxForm.category}
                onChange={e => setMxForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #bae6fd", fontSize: 13, marginBottom: 8 }}
              >
                {["Plumbing", "Electrical", "HVAC", "Appliance", "Structural", "Other"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <textarea
                placeholder="Describe the issue..."
                value={mxForm.description}
                onChange={e => setMxForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #bae6fd", fontSize: 13, resize: "vertical", boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ padding: "8px 16px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Submit
                </button>
                <button onClick={() => setMxOpen(false)} style={{ padding: "8px 16px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {MAINTENANCE.map((m, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.category} · Submitted {m.submitted}</div>
                  {m.scheduled && <div style={{ fontSize: 12, color: "#0369a1", marginTop: 4 }}>Scheduled {m.scheduled}</div>}
                  {m.completed && <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>Completed {m.completed}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  {STATUS_PILL(m.status)}
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{m.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lease tab */}
      {tab === "lease" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 14 }}>Lease Details</div>
            {[
              ["Unit", `${UNIT.address}, ${UNIT.city}`],
              ["Term", `${UNIT.leaseStart} – ${UNIT.leaseEnd}`],
              ["Monthly Rent", `$${UNIT.monthlyRent.toLocaleString()}`],
              ["Unit Size", `${UNIT.bedrooms} · ${UNIT.sqft}`],
              ["Security Deposit", "$1,850 (held)"],
              ["Late Fee", "$75 after the 5th of the month"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{value}</span>
              </div>
            ))}
          </div>

          {UNIT.daysUntilExpiry <= 30 && (
            <div style={{ background: "#fef3c7", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>⚠ Lease expires in {UNIT.daysUntilExpiry} days</div>
              <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>Contact your property manager to renew or discuss your options.</div>
            </div>
          )}

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Property Manager Contact</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>{UNIT.contact}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{UNIT.propertyManager}</div>
            <div style={{ fontSize: 13, color: "#0ea5e9", marginTop: 4 }}>{UNIT.phone}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button style={{ padding: "10px 20px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Send Message
              </button>
              <a href="tel:+18085550192" style={{ padding: "10px 20px", background: "#fff", color: ACCENT, border: `1.5px solid ${ACCENT}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
