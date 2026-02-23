import React, { useState } from "react";

const TODAY = new Date("2026-02-19");

const PROPERTIES = [
  {
    id: 1,
    name: "Riverside Apartments",
    address: "450 Riverside Ave",
    city: "Jacksonville",
    zip: "32204",
    type: "Apartment",
    totalUnits: 12,
    occupiedUnits: 11,
    monthlyRent: 16200,
    avgRent: 1350,
    units: [
      { unit: "1A", beds: 2, bath: 1, sqft: 850, rent: 1200, status: "occupied", tenant: "Maria Santos", leaseEnd: "2026-08-31" },
      { unit: "1B", beds: 2, bath: 1, sqft: 850, rent: 1200, status: "occupied", tenant: "Jason Park", leaseEnd: "2026-06-30" },
      { unit: "2A", beds: 2, bath: 1, sqft: 900, rent: 1300, status: "occupied", tenant: "Kevin Williams", leaseEnd: "2026-04-30", flag: "30 days late" },
      { unit: "2B", beds: 2, bath: 1, sqft: 900, rent: 1300, status: "occupied", tenant: "Ashley Torres", leaseEnd: "2026-09-30" },
      { unit: "3A", beds: 1, bath: 1, sqft: 650, rent: 1050, status: "occupied", tenant: "Ryan Chen", leaseEnd: "2026-07-31" },
      { unit: "3B", beds: 1, bath: 1, sqft: 650, rent: 1050, status: "occupied", tenant: "Brittany Moore", leaseEnd: "2026-05-31" },
      { unit: "4A", beds: 3, bath: 2, sqft: 1200, rent: 1650, status: "occupied", tenant: "David Kim", leaseEnd: "2026-11-30" },
      { unit: "4B", beds: 3, bath: 2, sqft: 1200, rent: 1650, status: "occupied", tenant: "Nicole Johnson", leaseEnd: "2026-10-31" },
      { unit: "5A", beds: 2, bath: 2, sqft: 950, rent: 1400, status: "occupied", tenant: "Marcus Thompson", leaseEnd: "2026-12-31" },
      { unit: "5B", beds: 2, bath: 2, sqft: 950, rent: 1400, status: "occupied", tenant: "Laura Garcia", leaseEnd: "2026-03-31" },
      { unit: "6A", beds: 1, bath: 1, sqft: 600, rent: 950, status: "vacant", tenant: null, leaseEnd: null, vacantDays: 12 },
      { unit: "6B", beds: 1, bath: 1, sqft: 600, rent: 1000, status: "occupied", tenant: "Tyler Brown", leaseEnd: "2026-08-31" },
    ],
  },
  {
    id: 2,
    name: "San Marco Townhomes",
    address: "221 San Marco Blvd",
    city: "Jacksonville",
    zip: "32207",
    type: "Townhome",
    totalUnits: 6,
    occupiedUnits: 6,
    monthlyRent: 10200,
    avgRent: 1700,
    units: [
      { unit: "TH-1", beds: 3, bath: 2.5, sqft: 1400, rent: 1700, status: "occupied", tenant: "James Lopez", leaseEnd: "2026-03-15", flag: "renewal due" },
      { unit: "TH-2", beds: 3, bath: 2.5, sqft: 1400, rent: 1700, status: "occupied", tenant: "Sarah Mitchell", leaseEnd: "2026-09-30" },
      { unit: "TH-3", beds: 2, bath: 2, sqft: 1100, rent: 1500, status: "occupied", tenant: "Chris Adams", leaseEnd: "2026-07-31" },
      { unit: "TH-4", beds: 2, bath: 2, sqft: 1100, rent: 1500, status: "occupied", tenant: "Amanda White", leaseEnd: "2026-06-30" },
      { unit: "TH-5", beds: 3, bath: 2.5, sqft: 1400, rent: 1900, status: "occupied", tenant: "Derek Williams", leaseEnd: "2026-12-31" },
      { unit: "TH-6", beds: 3, bath: 2.5, sqft: 1400, rent: 1900, status: "occupied", tenant: "Patricia Lee", leaseEnd: "2026-11-30" },
    ],
  },
  {
    id: 3,
    name: "Beach Cottages",
    address: "812 1st St S",
    city: "Jacksonville Beach",
    zip: "32250",
    type: "Cottage",
    totalUnits: 4,
    occupiedUnits: 3,
    monthlyRent: 5100,
    avgRent: 1700,
    units: [
      { unit: "A", beds: 2, bath: 1, sqft: 800, rent: 1600, status: "occupied", tenant: "Mike Reynolds", leaseEnd: "2026-05-31" },
      { unit: "B", beds: 2, bath: 1, sqft: 800, rent: 1600, status: "occupied", tenant: "Jessica Wang", leaseEnd: "2026-08-31" },
      { unit: "C", beds: 3, bath: 2, sqft: 1100, rent: 1900, status: "occupied", tenant: "Brian Foster", leaseEnd: "2026-10-31" },
      { unit: "D", beds: 2, bath: 1, sqft: 800, rent: 1500, status: "vacant", tenant: null, leaseEnd: null, vacantDays: 8 },
    ],
  },
  {
    id: 4,
    name: "Mandarin Duplex",
    address: "1234 Mandarin Rd",
    city: "Jacksonville",
    zip: "32258",
    type: "Duplex",
    totalUnits: 2,
    occupiedUnits: 2,
    monthlyRent: 3500,
    avgRent: 1750,
    units: [
      { unit: "A", beds: 3, bath: 2, sqft: 1300, rent: 1800, status: "occupied", tenant: "Robert Chang", leaseEnd: "2026-06-30" },
      { unit: "B", beds: 3, bath: 2, sqft: 1300, rent: 1700, status: "occupied", tenant: "Elena Vasquez", leaseEnd: "2026-09-30" },
    ],
  },
  {
    id: 5,
    name: "Southside Flats",
    address: "567 Philips Hwy",
    city: "Jacksonville",
    zip: "32205",
    type: "Apartment",
    totalUnits: 4,
    occupiedUnits: 2,
    monthlyRent: 2400,
    avgRent: 1200,
    units: [
      { unit: "1", beds: 2, bath: 1, sqft: 750, rent: 1200, status: "occupied", tenant: "Angela Davis", leaseEnd: "2026-04-30" },
      { unit: "2", beds: 2, bath: 1, sqft: 750, rent: 1200, status: "occupied", tenant: "Steven Clark", leaseEnd: "2026-07-31" },
      { unit: "3", beds: 2, bath: 1, sqft: 750, rent: 1150, status: "vacant", tenant: null, leaseEnd: null, vacantDays: 45, flag: "45 days vacant" },
      { unit: "4", beds: 2, bath: 1, sqft: 750, rent: 1150, status: "vacant", tenant: null, leaseEnd: null, vacantDays: 5 },
    ],
  },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  return Math.ceil((target - TODAY) / (1000 * 60 * 60 * 24));
}

export default function REProperties() {
  const [expandedId, setExpandedId] = useState(null);

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt },
    }));
  }

  const totalUnits = PROPERTIES.reduce((s, p) => s + p.totalUnits, 0);
  const totalOccupied = PROPERTIES.reduce((s, p) => s + p.occupiedUnits, 0);
  const totalVacant = totalUnits - totalOccupied;
  const occupancyRate = ((totalOccupied / totalUnits) * 100).toFixed(1);
  const totalRevenue = PROPERTIES.reduce((s, p) => s + p.monthlyRent, 0);

  function occColor(occ) {
    if (occ > 90) return "#16a34a";
    if (occ >= 80) return "#d97706";
    return "#dc2626";
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Properties</h1>
          <p className="subtle">Portfolio overview and unit management</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("Give me a portfolio overview. Which properties need attention — vacancies, late rent, upcoming renewals?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          AI Portfolio Brief
        </button>
      </div>

      {/* KPI row */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Properties</div>
          <div className="kpiValue">{PROPERTIES.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Units</div>
          <div className="kpiValue">{totalUnits}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Occupancy Rate</div>
          <div className="kpiValue" style={{ color: occColor(parseFloat(occupancyRate)) }}>{occupancyRate}%</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Monthly Revenue</div>
          <div className="kpiValue" style={{ color: "#16a34a" }}>${totalRevenue.toLocaleString()}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Vacant Units</div>
          <div className="kpiValue" style={{ color: "#dc2626" }}>{totalVacant}</div>
        </div>
      </div>

      {/* Property grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {PROPERTIES.map((prop) => {
          const occ = (prop.occupiedUnits / prop.totalUnits) * 100;
          const isExpanded = expandedId === prop.id;
          const vacantUnits = prop.units.filter((u) => u.status === "vacant");
          const renewalUnits = prop.units.filter((u) => {
            if (!u.leaseEnd) return false;
            const d = daysUntil(u.leaseEnd);
            return d !== null && d <= 60 && d >= 0;
          });

          return (
            <div
              key={prop.id}
              className="card"
              style={{
                padding: "0",
                cursor: "pointer",
                overflow: "hidden",
                gridColumn: isExpanded ? "1 / -1" : undefined,
              }}
              onClick={() => setExpandedId(isExpanded ? null : prop.id)}
            >
              {/* Card top */}
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>{prop.name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{prop.address}, {prop.city} {prop.zip}</div>
                  </div>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: "#f1f5f9",
                    color: "#475569",
                  }}>
                    {prop.type}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
                  <span><strong style={{ color: "#475569" }}>Units:</strong> {prop.occupiedUnits}/{prop.totalUnits}</span>
                  <span><strong style={{ color: "#475569" }}>Rent:</strong> ${prop.monthlyRent.toLocaleString()}/mo</span>
                  <span><strong style={{ color: "#475569" }}>Avg:</strong> ${prop.avgRent.toLocaleString()}</span>
                </div>

                {/* Occupancy bar */}
                <div style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Occupancy</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: occColor(occ) }}>{occ.toFixed(0)}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    width: `${occ}%`,
                    height: "100%",
                    background: occColor(occ),
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                  }} />
                </div>

                {/* Flags summary */}
                {(vacantUnits.length > 0 || prop.units.some((u) => u.flag)) && (
                  <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {vacantUnits.length > 0 && (
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: "#fee2e2", color: "#dc2626" }}>
                        {vacantUnits.length} vacant
                      </span>
                    )}
                    {prop.units.filter((u) => u.flag).map((u, i) => (
                      <span key={i} style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: "#fef3c7", color: "#d97706" }}>
                        {u.unit}: {u.flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded unit table */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #e2e8f0", padding: "16px 20px", background: "#f8fafc" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "12px" }}>Unit Details</div>
                  <div className="tableWrap">
                    <table className="table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Unit</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Beds/Bath</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>SqFt</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Rent</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Status</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Tenant</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Lease End</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Flags</th>
                          <th style={{ textAlign: "left", fontSize: "11px", color: "#64748b", padding: "6px 8px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prop.units.map((u, i) => {
                          const leaseD = daysUntil(u.leaseEnd);
                          const renewalSoon = leaseD !== null && leaseD <= 60 && leaseD >= 0;
                          const isVacant = u.status === "vacant";
                          return (
                            <tr key={i} style={{ background: isVacant ? "#fef2f2" : u.flag ? "#fffbeb" : "transparent" }}>
                              <td className="tdStrong" style={{ padding: "6px 8px", fontSize: "12px" }}>{u.unit}</td>
                              <td style={{ padding: "6px 8px", fontSize: "12px", color: "#64748b" }}>{u.beds}/{u.bath}</td>
                              <td style={{ padding: "6px 8px", fontSize: "12px", color: "#64748b" }}>{u.sqft.toLocaleString()}</td>
                              <td style={{ padding: "6px 8px", fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>${u.rent.toLocaleString()}</td>
                              <td style={{ padding: "6px 8px" }}>
                                {isVacant ? (
                                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#fee2e2", color: "#dc2626" }}>
                                    Vacant{u.vacantDays ? ` (${u.vacantDays}d)` : ""}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#dcfce7", color: "#16a34a" }}>
                                    Occupied
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "6px 8px", fontSize: "12px", color: "#475569" }}>{u.tenant || "—"}</td>
                              <td style={{ padding: "6px 8px", fontSize: "12px", color: renewalSoon ? "#d97706" : "#64748b", fontWeight: renewalSoon ? 700 : 400 }}>
                                {u.leaseEnd || "—"}
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                {u.flag && (
                                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: "#fef3c7", color: "#d97706" }}>
                                    {u.flag}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "6px 8px" }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "flex", gap: "4px" }}>
                                  {isVacant && (
                                    <button
                                      className="iconBtn"
                                      onClick={() => openChat(`Draft a marketing listing for the vacant unit ${u.unit} at ${prop.name}, ${prop.address}. ${u.beds} bed / ${u.bath} bath, ${u.sqft} sqft, asking $${u.rent}/mo. It has been vacant for ${u.vacantDays || "unknown"} days.`)}
                                      style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", fontSize: "10px", padding: "3px 8px", whiteSpace: "nowrap" }}
                                    >
                                      AI: Market unit
                                    </button>
                                  )}
                                  {renewalSoon && !isVacant && (
                                    <button
                                      className="iconBtn"
                                      onClick={() => openChat(`Draft a lease renewal letter for ${u.tenant} in unit ${u.unit} at ${prop.name}. Current rent: $${u.rent}/mo. Lease ends ${u.leaseEnd}. That is ${leaseD} days away.`)}
                                      style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontSize: "10px", padding: "3px 8px", whiteSpace: "nowrap" }}
                                    >
                                      AI: Draft renewal
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
