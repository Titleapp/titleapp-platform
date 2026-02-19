import React, { useState } from "react";

const SERVICE_SCHEDULE = {
  Monday: [
    { time: "7:00 AM", customer: "Lawrence Foster", vehicle: "2024 Camry SE", vin: "...N25012", service: "30K Maintenance", advisor: "Mike Torres", bay: 3, cost: 389, status: "confirmed", upsell: null, salesOpp: { strength: "possible", note: "2024 Camry, 30K mi -- nurture" } },
    { time: "7:30 AM", customer: "Patricia Adams", vehicle: "2023 RAV4 XLE", vin: "...R23045", service: "Oil Change + Tire Rotation", advisor: "Mike Torres", bay: 5, cost: 129, status: "confirmed", upsell: "Cabin air filter ($45)", salesOpp: null },
    { time: "8:00 AM", customer: "Charles Cox", vehicle: "2023 Tacoma TRD Sport", vin: "...T23088", service: "60K Major Service", advisor: "Sarah Kim", bay: 1, cost: 449, status: "confirmed", upsell: "Factory warranty expiring -- pitch Extra Care Gold ($2,995)", salesOpp: { strength: "strong", note: "High mileage, 2025 Tacoma available, $42,300" } },
    { time: "9:00 AM", customer: "James Mitchell", vehicle: "2022 Highlander Limited", vin: "...H22033", service: "Brake Inspection + Pads", advisor: "Sarah Kim", bay: 7, cost: 285, status: "confirmed", upsell: null, salesOpp: { strength: "possible", note: "2022 Highlander, explore trade-up" } },
    { time: "10:00 AM", customer: "Robert Chen", vehicle: "2025 Corolla Cross LE", vin: "...C25001", service: "First Oil Change (complimentary)", advisor: "Mike Torres", bay: 4, cost: 0, status: "confirmed", upsell: "ToyoGuard Platinum presentation ($995)", salesOpp: null },
    { time: "11:00 AM", customer: "Angela Williams", vehicle: "2021 Prius Prime", vin: "...P21019", service: "Hybrid Battery Check + Multi-Point", advisor: "David Park", bay: 2, cost: 95, status: "pending", upsell: "Vehicle 4+ years old -- trade-up candidate", salesOpp: { strength: "strong", note: "2021 Prius aging, 2025 Prius Prime available, $34,800" } },
    { time: "1:00 PM", customer: "Thomas Garcia", vehicle: "2024 Tundra SR5", vin: "...U24007", service: "Recall Campaign -- Seat Belt Retractor", advisor: "David Park", bay: 8, cost: 0, status: "confirmed", upsell: null, salesOpp: { strength: "possible", note: "2024 Tundra, discuss accessories/protection" } },
    { time: "2:30 PM", customer: "Diana Brooks", vehicle: "2022 Venza Limited", vin: "...V22015", service: "Transmission Flush + Coolant", advisor: "Sarah Kim", bay: 6, cost: 329, status: "pending", upsell: "Approaching 50K -- present extended warranty options", salesOpp: { strength: "strong", note: "Crown comparable -- $2K equity advantage" } },
  ],
  Tuesday: [
    { time: "7:00 AM", customer: "Kevin O'Brien", vehicle: "2024 4Runner TRD Off-Road", vin: "...4R24003", service: "Suspension Check + Alignment", advisor: "Mike Torres", bay: 1, cost: 189, status: "confirmed", upsell: null, salesOpp: null },
    { time: "8:00 AM", customer: "Sandra Lee", vehicle: "2023 Camry XSE", vin: "...N23044", service: "Oil Change + Multi-Point", advisor: "Sarah Kim", bay: 3, cost: 89, status: "confirmed", upsell: "Wiper blades ($35)", salesOpp: null },
    { time: "9:30 AM", customer: "Michael Wong", vehicle: "2025 RAV4 Hybrid XLE", vin: "...R25011", service: "5K First Service", advisor: "David Park", bay: 5, cost: 0, status: "confirmed", upsell: "Paint protection film ($495)", salesOpp: null },
    { time: "10:00 AM", customer: "Lisa Johnson", vehicle: "2022 Corolla LE", vin: "...C22089", service: "AC Compressor Diagnosis", advisor: "Mike Torres", bay: 9, cost: 149, status: "pending", upsell: null, salesOpp: { strength: "strong", note: "Repair cost high -- present Corolla Cross upgrade" } },
    { time: "11:30 AM", customer: "Fleet - Demo Motors", vehicle: "2024 Camry LE (Loaner)", vin: "...N24L01", service: "Loaner Return Inspection", advisor: "David Park", bay: 2, cost: 0, status: "confirmed", upsell: null, salesOpp: null },
  ],
  Wednesday: [
    { time: "7:00 AM", customer: "Richard Brown", vehicle: "2023 Tundra Limited", vin: "...U23015", service: "45K Service", advisor: "Sarah Kim", bay: 1, cost: 359, status: "confirmed", upsell: "Bed liner application ($595)", salesOpp: { strength: "possible", note: "Approaching high mileage, 2025 Tundra available" } },
    { time: "8:00 AM", customer: "Jennifer Patel", vehicle: "2024 Crown Platinum", vin: "...CR24002", service: "Oil Change", advisor: "Mike Torres", bay: 4, cost: 89, status: "confirmed", upsell: null, salesOpp: null },
    { time: "9:00 AM", customer: "William Davis", vehicle: "2025 GR86 Premium", vin: "...G25001", service: "Performance Alignment", advisor: "David Park", bay: 7, cost: 179, status: "confirmed", upsell: null, salesOpp: null },
    { time: "10:30 AM", customer: "Carol Thompson", vehicle: "2022 Highlander XLE", vin: "...H22078", service: "Brake Pads + Rotors", advisor: "Sarah Kim", bay: 3, cost: 445, status: "pending", upsell: "Approaching 60K -- warranty pitch", salesOpp: { strength: "strong", note: "Grand Highlander -- $4K positive equity" } },
    { time: "1:00 PM", customer: "George Martinez", vehicle: "2021 Tacoma SR", vin: "...T21055", service: "Recall -- Leaf Spring", advisor: "Mike Torres", bay: 10, cost: 0, status: "confirmed", upsell: "Vehicle 5 years old -- trade-up opportunity", salesOpp: { strength: "strong", note: "5 yrs old, strong residual -- 2025 Tacoma SR5" } },
  ],
  Thursday: [
    { time: "7:00 AM", customer: "Nancy Wilson", vehicle: "2024 Venza XLE", vin: "...V24008", service: "15K Service", advisor: "David Park", bay: 2, cost: 219, status: "confirmed", upsell: null, salesOpp: null },
    { time: "8:30 AM", customer: "Paul Rodriguez", vehicle: "2023 RAV4 TRD Off-Road", vin: "...R23077", service: "4WD System Check", advisor: "Sarah Kim", bay: 6, cost: 129, status: "confirmed", upsell: null, salesOpp: null },
    { time: "9:00 AM", customer: "Maria Gonzalez", vehicle: "2024 Corolla LE", vin: "...C24033", service: "Tire Rotation + Inspection", advisor: "Mike Torres", bay: 3, cost: 49, status: "pending", upsell: "Lease expiring in 60 days -- upgrade discussion", salesOpp: { strength: "strong", note: "Lease ends Apr 2026 -- present Corolla Hybrid" } },
    { time: "11:00 AM", customer: "Steven Park", vehicle: "2025 Sequoia Capstone", vin: "...S25001", service: "First Oil Change", advisor: "David Park", bay: 1, cost: 0, status: "confirmed", upsell: "ToyoGuard + Tire & Wheel bundle ($1,295)", salesOpp: null },
    { time: "1:30 PM", customer: "Barbara Kim", vehicle: "2022 Prius LE", vin: "...P22041", service: "Hybrid System Diagnostic", advisor: "Sarah Kim", bay: 8, cost: 149, status: "confirmed", upsell: null, salesOpp: { strength: "possible", note: "3+ yrs, monitor for trade-up" } },
    { time: "3:00 PM", customer: "Fleet - Houston Metro", vehicle: "2024 Camry LE (x3)", vin: "...fleet", service: "Fleet 10K Service (3 vehicles)", advisor: "Mike Torres", bay: "4,5,6", cost: 267, status: "confirmed", upsell: null, salesOpp: null },
  ],
  Friday: [
    { time: "7:00 AM", customer: "Daniel Green", vehicle: "2023 Camry TRD", vin: "...N23TRD", service: "Performance Brake Service", advisor: "David Park", bay: 1, cost: 389, status: "confirmed", upsell: null, salesOpp: null },
    { time: "8:00 AM", customer: "Susan White", vehicle: "2024 Grand Highlander Platinum", vin: "...GH24005", service: "Oil Change + Multi-Point", advisor: "Sarah Kim", bay: 3, cost: 99, status: "confirmed", upsell: null, salesOpp: null },
    { time: "9:30 AM", customer: "Mark Brown", vehicle: "2025 Corolla Cross LE", vin: "...CC25009", service: "5K First Service", advisor: "Mike Torres", bay: 5, cost: 0, status: "confirmed", upsell: "Cross-sell RAV4 upgrade opportunity", salesOpp: { strength: "possible", note: "RAV4 Hybrid -- natural upgrade path" } },
    { time: "11:00 AM", customer: "Recon - Used", vehicle: "2021 BMW X3 xDrive30i", vin: "...U30000", service: "Pre-Sale Reconditioning", advisor: "Mike Torres", bay: 11, cost: 850, status: "in-progress", upsell: null, salesOpp: null },
    { time: "1:00 PM", customer: "Karen Taylor", vehicle: "2022 4Runner SR5", vin: "...4R22019", service: "75K Major Service", advisor: "David Park", bay: 2, cost: 549, status: "pending", upsell: "Extended warranty -- factory coverage ending", salesOpp: { strength: "strong", note: "High mileage -- 2025 4Runner or Grand Highlander" } },
  ],
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function AutoService() {
  const [activeDay, setActiveDay] = useState("Monday");

  const appointments = SERVICE_SCHEDULE[activeDay] || [];
  const dayRevenue = appointments.reduce((sum, a) => sum + a.cost, 0);
  const upsellCount = appointments.filter((a) => a.upsell).length;
  const salesOppCount = appointments.filter((a) => a.salesOpp).length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Service Schedule</h1>
          <p className="subtle">Weekly service appointments, upsell opportunities, and bay assignments</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("Show me the service upsell opportunities for this week")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          AI Upsell Report
        </button>
      </div>

      {/* Service KPIs */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Appointments Today</div>
          <div className="kpiValue">{appointments.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Service Revenue</div>
          <div className="kpiValue">${dayRevenue.toLocaleString()}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Upsell Opportunities</div>
          <div className="kpiValue" style={{ color: upsellCount > 0 ? "#d97706" : undefined }}>{upsellCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Sales Opportunities</div>
          <div className="kpiValue" style={{ color: salesOppCount > 0 ? "#7c3aed" : undefined }}>{salesOppCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Confirmed</div>
          <div className="kpiValue">{confirmedCount} / {appointments.length}</div>
        </div>
      </div>

      {/* Day tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" }}>
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeDay === day ? "2px solid #7c3aed" : "2px solid transparent",
              background: "transparent",
              color: activeDay === day ? "#7c3aed" : "#64748b",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule table */}
      <div className="card">
        <div className="tableWrap">
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Service</th>
                <th>Advisor</th>
                <th>Bay</th>
                <th>Est. Cost</th>
                <th>Sales Opp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, idx) => (
                <tr
                  key={idx}
                  style={{ cursor: "pointer" }}
                  onClick={() => openChat(`Tell me about ${appt.customer}'s ${appt.service} appointment for their ${appt.vehicle}`)}
                >
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{appt.time}</td>
                  <td className="tdStrong">{appt.customer}</td>
                  <td>
                    <div>{appt.vehicle}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{appt.vin}</div>
                  </td>
                  <td>{appt.service}</td>
                  <td className="tdMuted">{appt.advisor}</td>
                  <td style={{ textAlign: "center" }}>{appt.bay}</td>
                  <td style={{ fontWeight: 600 }}>{appt.cost > 0 ? `$${appt.cost}` : "Comp"}</td>
                  <td>
                    {appt.salesOpp ? (
                      <div
                        style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openChat(`${appt.customer} is in for ${appt.service} on their ${appt.vehicle}. Sales opportunity: ${appt.salesOpp.note}. What's the best approach?`);
                        }}
                      >
                        <div style={{
                          width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, marginTop: "3px",
                          background: appt.salesOpp.strength === "strong" ? "#16a34a" : "#d97706",
                        }} />
                        <div style={{ fontSize: "12px", color: "#334155", maxWidth: "180px", lineHeight: 1.4 }}>{appt.salesOpp.note}</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e2e8f0", flexShrink: 0 }} />
                        <span style={{ color: "#cbd5e1", fontSize: "12px" }}>No match</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      background: appt.status === "confirmed" ? "#dcfce7" : appt.status === "in-progress" ? "#dbeafe" : "#fef3c7",
                      color: appt.status === "confirmed" ? "#16a34a" : appt.status === "in-progress" ? "#2563eb" : "#d97706",
                    }}>
                      {appt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upsell Opportunities */}
      {appointments.filter((a) => a.upsell).length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>Upsell Opportunities -- {activeDay}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {appointments.filter((a) => a.upsell).map((appt, idx) => (
              <div key={idx} className="card" style={{ padding: "16px", borderLeft: "4px solid #d97706" }}>
                <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>{appt.customer}</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>{appt.vehicle} -- {appt.service}</div>
                <div style={{ fontSize: "14px", color: "#d97706", fontWeight: 600, marginBottom: "10px" }}>{appt.upsell}</div>
                <button
                  onClick={() => openChat(`${appt.customer} is coming in for ${appt.service} on their ${appt.vehicle}. The upsell opportunity is: ${appt.upsell}. Draft a pitch I can use when they arrive.`)}
                  style={{
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    color: "#fff",
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  }}
                >
                  Draft Pitch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
