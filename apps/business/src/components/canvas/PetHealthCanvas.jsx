// PetHealthCanvas — consumer-facing pet health portal (Meadow Creek Veterinary Clinic)
// Slug: pet-health-client — rendered for Sara Kahele as a vet client.
import React, { useState } from "react";

const ACCENT = "#7c3aed";
const GREEN = "#16a34a";
const AMBER = "#d97706";
const RED = "#dc2626";

const PET = {
  name: "Koa",
  species: "Dog",
  breed: "Golden Retriever Mix",
  age: "4 years",
  weight: "62 lbs",
  microchip: "985141004123456",
  vet: "Dr. Maya Chen, DVM",
  clinic: "Meadow Creek Veterinary Clinic",
};

const VACCINATIONS = [
  { name: "Rabies", date: "Mar 15, 2026", due: "Mar 15, 2027", status: "current" },
  { name: "DHPP (Distemper / Parvo)", date: "Mar 15, 2026", due: "Mar 15, 2027", status: "current" },
  { name: "Leptospirosis", date: "Mar 15, 2026", due: "Mar 15, 2027", status: "current" },
  { name: "Bordetella", date: "Sep 10, 2025", due: "Sep 10, 2026", status: "due-soon" },
  { name: "Canine Influenza", date: "Mar 15, 2026", due: "Mar 15, 2027", status: "current" },
];

const VISITS = [
  { date: "Mar 15, 2026", type: "Annual Wellness Exam", notes: "Healthy weight. All vaccinations updated. Dental cleaning recommended within 6 months. Heartworm negative.", vet: "Dr. Maya Chen, DVM" },
  { date: "Nov 2, 2025", type: "Sick Visit", notes: "Mild GI upset — prescribed bland diet for 3 days. Resolved completely.", vet: "Dr. Maya Chen, DVM" },
  { date: "Mar 20, 2025", type: "Annual Wellness Exam", notes: "Healthy overall. Minor tartar buildup noted. Heartworm negative.", vet: "Dr. Maya Chen, DVM" },
];

const APPOINTMENTS = [
  { date: "Aug 12, 2026", time: "10:30 AM", type: "Annual Wellness Exam", vet: "Dr. Maya Chen, DVM", daysUntil: 24 },
  { date: "Sep 10, 2026", time: "2:00 PM", type: "Bordetella Booster", vet: "Dr. Maya Chen, DVM", daysUntil: 53 },
];

const MEDS = [
  { name: "Heartgard Plus", type: "Heartworm prevention", schedule: "Monthly", last: "Jul 1, 2026", next: "Aug 1, 2026" },
  { name: "NexGard", type: "Flea & tick prevention", schedule: "Monthly", last: "Jul 1, 2026", next: "Aug 1, 2026" },
];

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

const PILL = (status) => {
  const map = {
    "current": { bg: "#dcfce7", color: "#15803d", label: "Current" },
    "due-soon": { bg: "#fef3c7", color: "#b45309", label: "Due Soon" },
    "overdue": { bg: "#fee2e2", color: "#b91c1c", label: "Overdue" },
  };
  const s = map[status] || map["current"];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function isPetHealthWorker(w) {
  return (w?.workerId || w?.slug || "") === "pet-health-client";
}

export default function PetHealthCanvas() {
  const [tab, setTab] = useState("records");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 4px 32px" }}>

      {/* Pet profile card */}
      <div style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, border: "1px solid #ddd6fe" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
          🐕
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{PET.name}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{PET.breed} · {PET.age} · {PET.weight}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Microchip {PET.microchip}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Primary Vet</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{PET.vet}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{PET.clinic}</div>
        </div>
      </div>

      {/* Next appointment alert */}
      {APPOINTMENTS.length > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
              Next appointment in {APPOINTMENTS[0].daysUntil} days
            </div>
            <div style={{ fontSize: 12, color: "#b45309" }}>
              {APPOINTMENTS[0].type} · {APPOINTMENTS[0].date} at {APPOINTMENTS[0].time} · {APPOINTMENTS[0].vet}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
        {[["records", "Health Records"], ["vaccinations", "Vaccinations"], ["medications", "Medications"], ["appointments", "Appointments"]].map(([key, label]) => (
          <button key={key} style={TAB_STYLE(tab === key)} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Health Records tab */}
      {tab === "records" && (
        <div>
          {VISITS.map((v, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{v.type}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{v.date}</div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{v.notes}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>{v.vet}</div>
            </div>
          ))}
        </div>
      )}

      {/* Vaccinations tab */}
      {tab === "vaccinations" && (
        <div>
          {VACCINATIONS.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Given {v.date} · Due {v.due}</div>
              </div>
              {PILL(v.status)}
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, fontSize: 12, color: "#64748b" }}>
            <span style={{ color: AMBER, fontWeight: 600 }}>⚠ Bordetella due Sep 10</span> — already scheduled. No action needed.
          </div>
        </div>
      )}

      {/* Medications tab */}
      {tab === "medications" && (
        <div>
          {MEDS.map((m, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.type} · {m.schedule}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#15803d", letterSpacing: 0.3 }}>Active</span>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                <span>Last: <b style={{ color: "#334155" }}>{m.last}</b></span>
                <span>Next due: <b style={{ color: "#d97706" }}>{m.next}</b></span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: 12, color: "#166534" }}>
            Both preventatives are current. Ask Alex to set a monthly reminder.
          </div>
        </div>
      )}

      {/* Appointments tab */}
      {tab === "appointments" && (
        <div>
          {APPOINTMENTS.map((a, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{a.type}</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>{a.date} at {a.time}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{a.vet} · Meadow Creek Veterinary Clinic</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>In {a.daysUntil} days</div>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, fontSize: 12, color: "#5b21b6" }}>
            Ask Alex to add these to your calendar or send you a reminder the day before.
          </div>
        </div>
      )}
    </div>
  );
}
