// PetHealthCanvas — consumer-facing pet health portal (Meadow Creek Veterinary Clinic)
// Slug: pet-health-client — rendered for a signed-in pet owner as a vet client.
// Real Firestore-backed record via /v1/vet:petRecord — this used to be five
// hardcoded constants (PET/VACCINATIONS/VISITS/APPOINTMENTS/MEDS); built that
// way because the product wasn't far enough along yet (Sean, 2026-08-18).
import React, { useState, useEffect } from "react";
import { liveApiFetch } from "./liveData";

const ACCENT = "#7c3aed";
const AMBER = "#d97706";

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
    "active": { bg: "#dcfce7", color: "#15803d", label: "Active" },
    "due-soon": { bg: "#fef3c7", color: "#b45309", label: "Due Soon" },
    "due": { bg: "#fef3c7", color: "#b45309", label: "Due" },
    "overdue": { bg: "#fee2e2", color: "#b91c1c", label: "Overdue" },
    "unverified": { bg: "#f1f5f9", color: "#64748b", label: "Unverified" },
  };
  const s = map[status] || map["unverified"];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
};

const SPECIES_EMOJI = { dog: "🐕", cat: "🐈", rabbit: "🐇", bird: "🐦" };

// eslint-disable-next-line react-refresh/only-export-components
export function isPetHealthWorker(w) {
  return (w?.workerId || w?.slug || "") === "pet-health-client";
}

export default function PetHealthCanvas() {
  const [tab, setTab] = useState("records");
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    liveApiFetch("/v1/vet:petRecord")
      .then(r => { if (!cancelled) setRecord(r?.ok ? r.record : null); })
      .catch(() => { if (!cancelled) setRecord(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading pet record…</div>;
  }

  const pet = record?.pet;
  if (!pet) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
        No pet record on file yet. Ask Alex to add your pet, or contact your clinic to get your record set up.
      </div>
    );
  }

  const visits = record.visits || [];
  const vaccinations = record.vaccinations || [];
  const medications = record.medications || [];
  const appointments = record.appointments || [];
  const nextAppointment = record.nextAppointment;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 4px 32px" }}>

      {/* Pet profile card */}
      <div style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, border: "1px solid #ddd6fe" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
          {SPECIES_EMOJI[(pet.species || "").toLowerCase()] || "🐾"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{pet.name}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
            {[pet.breed, pet.ageYears != null ? `${pet.ageYears} years` : null, pet.weightLbs != null ? `${pet.weightLbs} lbs` : null].filter(Boolean).join(" · ")}
          </div>
          {pet.microchip && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Microchip {pet.microchip}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Primary Vet</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{pet.primaryVetName || "—"}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{pet.clinicName || "—"}</div>
        </div>
      </div>

      {/* Next appointment alert */}
      {nextAppointment && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
              Next appointment in {nextAppointment.daysUntil} {nextAppointment.daysUntil === 1 ? "day" : "days"}
            </div>
            <div style={{ fontSize: 12, color: "#b45309" }}>
              {nextAppointment.type} · {nextAppointment.date} at {nextAppointment.time} · {nextAppointment.vetName}
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
          {visits.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No visits on file yet.</div>}
          {visits.map((v, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{v.type}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{v.date}</div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{v.notes}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>{v.vetName}</div>
            </div>
          ))}
        </div>
      )}

      {/* Vaccinations tab */}
      {tab === "vaccinations" && (
        <div>
          {vaccinations.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No vaccination records on file yet.</div>}
          {vaccinations.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Given {v.givenDate || "—"} · Due {v.dueDate}</div>
              </div>
              {PILL(v.status)}
            </div>
          ))}
          {record.dueSoonVaccinations?.length > 0 && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, fontSize: 12, color: "#64748b" }}>
              <span style={{ color: AMBER, fontWeight: 600 }}>⚠ {record.dueSoonVaccinations.map(v => v.name).join(", ")} due soon</span> — ask Alex to help you book it.
            </div>
          )}
        </div>
      )}

      {/* Medications tab */}
      {tab === "medications" && (
        <div>
          {medications.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No active medications on file.</div>}
          {medications.map((m, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.purpose} · {m.schedule}</div>
                </div>
                {PILL(m.status)}
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                <span>Last: <b style={{ color: "#334155" }}>{m.lastDate || "—"}</b></span>
                <span>Next due: <b style={{ color: "#d97706" }}>{m.nextDueDate || "—"}</b></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointments tab */}
      {tab === "appointments" && (
        <div>
          {appointments.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8" }}>No upcoming appointments on file.</div>}
          {appointments.map((a, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{a.type}</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>{a.date} at {a.time}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{a.vetName} · {pet.clinicName}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>In {a.daysUntil} days</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
