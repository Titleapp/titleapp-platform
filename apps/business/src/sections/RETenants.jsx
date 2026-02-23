import React, { useState } from "react";

const TENANTS = [
  { id: 1, name: "Maria Santos", unit: "1A", property: "Riverside Apartments", rent: 1200, status: "current", moveIn: "2024-09-01", leaseEnd: "2026-08-31", balance: 0, phone: "(904) 555-0101", email: "msantos@email.com" },
  { id: 2, name: "Jason Park", unit: "1B", property: "Riverside Apartments", rent: 1200, status: "current", moveIn: "2024-07-01", leaseEnd: "2026-06-30", balance: 0, phone: "(904) 555-0102", email: "jpark@email.com" },
  { id: 3, name: "Kevin Williams", unit: "2A", property: "Riverside Apartments", rent: 1300, status: "late", moveIn: "2023-05-01", leaseEnd: "2026-04-30", balance: 1850, phone: "(904) 555-0103", email: "kwilliams@email.com", flag: "30 days late" },
  { id: 4, name: "Ashley Torres", unit: "2B", property: "Riverside Apartments", rent: 1300, status: "current", moveIn: "2024-10-01", leaseEnd: "2026-09-30", balance: 0, phone: "(904) 555-0104", email: "atorres@email.com" },
  { id: 5, name: "Ryan Chen", unit: "3A", property: "Riverside Apartments", rent: 1050, status: "current", moveIn: "2024-08-01", leaseEnd: "2026-07-31", balance: 0, phone: "(904) 555-0105", email: "rchen@email.com" },
  { id: 6, name: "Brittany Moore", unit: "3B", property: "Riverside Apartments", rent: 1050, status: "current", moveIn: "2024-06-01", leaseEnd: "2026-05-31", balance: 0, phone: "(904) 555-0106", email: "bmoore@email.com" },
  { id: 7, name: "David Kim", unit: "4A", property: "Riverside Apartments", rent: 1650, status: "current", moveIn: "2024-12-01", leaseEnd: "2026-11-30", balance: 0, phone: "(904) 555-0107", email: "dkim@email.com" },
  { id: 8, name: "Nicole Johnson", unit: "4B", property: "Riverside Apartments", rent: 1650, status: "current", moveIn: "2024-11-01", leaseEnd: "2026-10-31", balance: 0, phone: "(904) 555-0108", email: "njohnson@email.com" },
  { id: 9, name: "Marcus Thompson", unit: "5A", property: "Riverside Apartments", rent: 1400, status: "current", moveIn: "2025-01-01", leaseEnd: "2026-12-31", balance: 0, phone: "(904) 555-0109", email: "mthompson@email.com" },
  { id: 10, name: "Laura Garcia", unit: "5B", property: "Riverside Apartments", rent: 1400, status: "renewal", moveIn: "2024-04-01", leaseEnd: "2026-03-31", balance: 0, phone: "(904) 555-0110", email: "lgarcia@email.com", flag: "lease expires in 40 days" },
  { id: 11, name: "Tyler Brown", unit: "6B", property: "Riverside Apartments", rent: 1000, status: "current", moveIn: "2024-09-01", leaseEnd: "2026-08-31", balance: 0, phone: "(904) 555-0111", email: "tbrown@email.com" },
  { id: 12, name: "James Lopez", unit: "TH-1", property: "San Marco Townhomes", rent: 1700, status: "renewal", moveIn: "2024-03-15", leaseEnd: "2026-03-15", balance: 0, phone: "(904) 555-0112", email: "jlopez@email.com", flag: "renewal due" },
  { id: 13, name: "Sarah Mitchell", unit: "TH-2", property: "San Marco Townhomes", rent: 1700, status: "current", moveIn: "2024-10-01", leaseEnd: "2026-09-30", balance: 0, phone: "(904) 555-0113", email: "smitchell@email.com" },
  { id: 14, name: "Chris Adams", unit: "TH-3", property: "San Marco Townhomes", rent: 1500, status: "current", moveIn: "2024-08-01", leaseEnd: "2026-07-31", balance: 0, phone: "(904) 555-0114", email: "cadams@email.com" },
  { id: 15, name: "Amanda White", unit: "TH-4", property: "San Marco Townhomes", rent: 1500, status: "current", moveIn: "2024-07-01", leaseEnd: "2026-06-30", balance: 0, phone: "(904) 555-0115", email: "awhite@email.com" },
  { id: 16, name: "Derek Williams", unit: "TH-5", property: "San Marco Townhomes", rent: 1900, status: "current", moveIn: "2025-01-01", leaseEnd: "2026-12-31", balance: 0, phone: "(904) 555-0116", email: "dwilliams@email.com" },
  { id: 17, name: "Patricia Lee", unit: "TH-6", property: "San Marco Townhomes", rent: 1900, status: "current", moveIn: "2024-12-01", leaseEnd: "2026-11-30", balance: 0, phone: "(904) 555-0117", email: "plee@email.com" },
  { id: 18, name: "Mike Reynolds", unit: "A", property: "Beach Cottages", rent: 1600, status: "current", moveIn: "2024-06-01", leaseEnd: "2026-05-31", balance: 0, phone: "(904) 555-0118", email: "mreynolds@email.com" },
  { id: 19, name: "Jessica Wang", unit: "B", property: "Beach Cottages", rent: 1600, status: "current", moveIn: "2024-09-01", leaseEnd: "2026-08-31", balance: 0, phone: "(904) 555-0119", email: "jwang@email.com" },
  { id: 20, name: "Brian Foster", unit: "C", property: "Beach Cottages", rent: 1900, status: "current", moveIn: "2024-11-01", leaseEnd: "2026-10-31", balance: 0, phone: "(904) 555-0120", email: "bfoster@email.com" },
  { id: 21, name: "Robert Chang", unit: "A", property: "Mandarin Duplex", rent: 1800, status: "current", moveIn: "2024-07-01", leaseEnd: "2026-06-30", balance: 0, phone: "(904) 555-0121", email: "rchang@email.com" },
  { id: 22, name: "Elena Vasquez", unit: "B", property: "Mandarin Duplex", rent: 1700, status: "current", moveIn: "2024-10-01", leaseEnd: "2026-09-30", balance: 0, phone: "(904) 555-0122", email: "evasquez@email.com" },
  { id: 23, name: "Angela Davis", unit: "1", property: "Southside Flats", rent: 1200, status: "current", moveIn: "2024-05-01", leaseEnd: "2026-04-30", balance: 0, phone: "(904) 555-0123", email: "adavis@email.com" },
  { id: 24, name: "Steven Clark", unit: "2", property: "Southside Flats", rent: 1200, status: "current", moveIn: "2024-08-01", leaseEnd: "2026-07-31", balance: 0, phone: "(904) 555-0124", email: "sclark@email.com" },
];

const STATUS_BADGES = {
  current: { background: "#dcfce7", color: "#16a34a" },
  late: { background: "#fee2e2", color: "#dc2626" },
  renewal: { background: "#fef3c7", color: "#d97706" },
};

export default function RETenants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt },
    }));
  }

  // Compute KPIs
  const totalTenants = TENANTS.length;
  const currentCount = TENANTS.filter((t) => t.status === "current").length;
  const lateCount = TENANTS.filter((t) => t.status === "late").length;

  // Renewal due: status === "renewal" OR lease ending within 60 days
  const now = new Date("2026-02-19");
  const sixtyDaysOut = new Date(now);
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);

  const renewalTenants = TENANTS.filter((t) => {
    if (t.status === "renewal") return true;
    const end = new Date(t.leaseEnd);
    return end <= sixtyDaysOut && end >= now && t.status !== "late";
  });
  const renewalCount = renewalTenants.length;

  // Filter tenants
  const filtered = TENANTS.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !t.name.toLowerCase().includes(q) &&
        !t.property.toLowerCase().includes(q) &&
        !t.unit.toLowerCase().includes(q)
      ) return false;
    }
    if (statusFilter === "current" && t.status !== "current") return false;
    if (statusFilter === "late" && t.status !== "late") return false;
    if (statusFilter === "renewal") {
      const isRenewal = t.status === "renewal";
      const end = new Date(t.leaseEnd);
      const endingSoon = end <= sixtyDaysOut && end >= now && t.status !== "late";
      if (!isRenewal && !endingSoon) return false;
    }
    return true;
  });

  const filterBtnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "9999px",
    border: active ? "none" : "1px solid var(--line)",
    background: active ? "#7c3aed" : "transparent",
    color: active ? "#fff" : "inherit",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Tenants</h1>
          <p className="subtle">{totalTenants} tenants across 5 properties</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("Give me a tenant management summary. Who needs attention, any upcoming renewals, and any outstanding balances?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          AI Tenant Summary
        </button>
      </div>

      {/* KPI Row */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Tenants</div>
          <div className="kpiValue" style={{ color: "#2563eb" }}>{totalTenants}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Current</div>
          <div className="kpiValue" style={{ color: "#16a34a" }}>{currentCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Late</div>
          <div className="kpiValue" style={{ color: "#dc2626" }}>{lateCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Renewal Due</div>
          <div className="kpiValue" style={{ color: "#d97706" }}>{renewalCount}</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by name, property, or unit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: "220px",
            maxWidth: "400px",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            fontSize: "14px",
          }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={filterBtnStyle(statusFilter === "all")} onClick={() => setStatusFilter("all")}>All</button>
          <button style={filterBtnStyle(statusFilter === "current")} onClick={() => setStatusFilter("current")}>Current</button>
          <button style={filterBtnStyle(statusFilter === "late")} onClick={() => setStatusFilter("late")}>Late</button>
          <button style={filterBtnStyle(statusFilter === "renewal")} onClick={() => setStatusFilter("renewal")}>Renewal Due</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="tableWrap">
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Property</th>
                <th>Rent</th>
                <th>Status</th>
                <th>Lease End</th>
                <th>Balance</th>
                <th>Flag</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const badge = STATUS_BADGES[t.status] || STATUS_BADGES.current;
                const isExpanded = expandedId === t.id;
                return (
                  <React.Fragment key={t.id}>
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <td className="tdStrong">{t.name}</td>
                      <td>{t.unit}</td>
                      <td>{t.property}</td>
                      <td>${t.rent.toLocaleString()}</td>
                      <td>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "9999px",
                          background: badge.background,
                          color: badge.color,
                          textTransform: "capitalize",
                        }}>
                          {t.status}
                        </span>
                      </td>
                      <td>{new Date(t.leaseEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td style={{ color: t.balance > 0 ? "#dc2626" : "inherit", fontWeight: t.balance > 0 ? 700 : 400 }}>
                        {t.balance > 0 ? `$${t.balance.toLocaleString()}` : "$0"}
                      </td>
                      <td>
                        {t.flag ? (
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#d97706" }}>
                            {t.flag}
                          </span>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>--</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="iconBtn"
                            style={{ padding: "5px 10px", fontSize: "12px" }}
                            onClick={() => openChat(`Draft a message to ${t.name} at unit ${t.unit}, ${t.property}. Rent: $${t.rent}/mo. Status: ${t.status}.${t.balance > 0 ? " Outstanding balance: $" + t.balance + "." : ""}${t.flag ? " Note: " + t.flag + "." : ""}`)}
                          >
                            Contact
                          </button>
                          <button
                            className="iconBtn"
                            style={{ padding: "5px 10px", fontSize: "12px" }}
                            onClick={() => alert(`Lease details for ${t.name}\nUnit: ${t.unit}, ${t.property}\nLease: ${t.moveIn} to ${t.leaseEnd}\nRent: $${t.rent}/mo`)}
                          >
                            View Lease
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div style={{
                            background: "#f8fafc",
                            padding: "16px 24px",
                            borderTop: "1px solid var(--line)",
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr",
                            gap: "16px",
                            fontSize: "13px",
                          }}>
                            <div>
                              <div style={{ color: "#64748b", marginBottom: "4px" }}>Email</div>
                              <div style={{ fontWeight: 600 }}>{t.email}</div>
                            </div>
                            <div>
                              <div style={{ color: "#64748b", marginBottom: "4px" }}>Phone</div>
                              <div style={{ fontWeight: 600 }}>{t.phone}</div>
                            </div>
                            <div>
                              <div style={{ color: "#64748b", marginBottom: "4px" }}>Move-in Date</div>
                              <div style={{ fontWeight: 600 }}>{new Date(t.moveIn).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                            </div>
                            <div>
                              <div style={{ color: "#64748b", marginBottom: "4px" }}>Lease End</div>
                              <div style={{ fontWeight: 600 }}>{new Date(t.leaseEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
