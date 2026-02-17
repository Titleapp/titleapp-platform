import React, { useState } from "react";

interface PilotOnboardingProps {
  onComplete: (pilotData: any) => void;
  onSkip: () => void;
}

export default function PilotOnboardingStep({ onComplete, onSkip }: PilotOnboardingProps) {
  const [mode, setMode] = useState<"quick" | "full">("quick");

  // Quick mode
  const [pilotName, setPilotName] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");

  // Full mode
  const [certificates, setCertificates] = useState<string[]>(["private"]);
  const [typeRatings, setTypeRatings] = useState("");
  const [medicalClass, setMedicalClass] = useState("third");
  const [medicalExpiration, setMedicalExpiration] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [picHours, setPicHours] = useState("");

  function toggleCertificate(cert: string) {
    if (certificates.includes(cert)) {
      setCertificates(certificates.filter(c => c !== cert));
    } else {
      setCertificates([...certificates, cert]);
    }
  }

  function handleQuickComplete() {
    if (!pilotName.trim() || !certificateNumber.trim()) {
      alert("Please enter your name and certificate number");
      return;
    }

    const pilotData = {
      pilot_name: pilotName,
      certificate_number: certificateNumber,
      certificates_held: ["private"],
      medical_class: "third",
      setup_mode: "quick",
    };

    onComplete(pilotData);
  }

  function handleFullComplete() {
    if (!pilotName.trim() || !certificateNumber.trim()) {
      alert("Please enter your name and certificate number");
      return;
    }

    const pilotData: any = {
      pilot_name: pilotName,
      certificate_number: certificateNumber,
      certificates_held: certificates,
      medical_class: medicalClass,
      setup_mode: "full",
    };

    if (medicalExpiration) pilotData.medical_expiration = medicalExpiration;
    if (totalHours) pilotData.total_hours = parseFloat(totalHours);
    if (picHours) pilotData.pic_hours = parseFloat(picHours);
    if (typeRatings) pilotData.type_ratings = typeRatings.split(',').map(r => r.trim());

    onComplete(pilotData);
  }

  if (mode === "full") {
    return (
      <div style={{ display: "grid", gap: "20px" }}>
        <div>
          <button
            onClick={() => setMode("quick")}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              background: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              marginBottom: "12px",
            }}
          >
            ← Back
          </button>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: 700 }}>
            Complete Pilot Profile
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
            Create comprehensive Pilot DTC with all credentials
          </p>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>Full Name *</div>
            <input
              type="text"
              value={pilotName}
              onChange={(e) => setPilotName(e.target.value)}
              placeholder="John Smith"
              style={{
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>FAA Certificate Number *</div>
            <input
              type="text"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="1234567"
              style={{
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>Certificates & Ratings *</div>
            <div style={{ display: "grid", gap: "6px", gridTemplateColumns: "1fr 1fr" }}>
              {[
                { value: "student", label: "Student" },
                { value: "private", label: "Private" },
                { value: "instrument_airplane", label: "Instrument" },
                { value: "commercial_airplane", label: "Commercial" },
                { value: "atp_airplane", label: "ATP" },
                { value: "cfi", label: "CFI" },
              ].map(cert => (
                <button
                  key={cert.value}
                  onClick={() => toggleCertificate(cert.value)}
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    background: certificates.includes(cert.value) ? "rgba(124,58,237,0.1)" : "white",
                    border: certificates.includes(cert.value) ? "1px solid rgb(124,58,237)" : "1px solid #e5e7eb",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {certificates.includes(cert.value) ? "✓ " : ""}{cert.label}
                </button>
              ))}
            </div>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>Type Ratings (optional)</div>
            <input
              type="text"
              value={typeRatings}
              onChange={(e) => setTypeRatings(e.target.value)}
              placeholder="B-737, CE-525 (comma-separated)"
              style={{
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}
            />
          </label>

          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Medical Class</div>
              <select
                value={medicalClass}
                onChange={(e) => setMedicalClass(e.target.value)}
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: "white",
                }}
              >
                <option value="first">1st Class</option>
                <option value="second">2nd Class</option>
                <option value="third">3rd Class</option>
                <option value="basic_med">BasicMed</option>
                <option value="none">None</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Medical Expires</div>
              <input
                type="date"
                value={medicalExpiration}
                onChange={(e) => setMedicalExpiration(e.target.value)}
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
            </label>
          </div>

          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Total Hours</div>
              <input
                type="number"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                placeholder="250"
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>PIC Hours</div>
              <input
                type="number"
                value={picHours}
                onChange={(e) => setPicHours(e.target.value)}
                placeholder="150"
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
            </label>
          </div>

          <div
            style={{
              padding: "12px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          >
            <strong>✓ Creates:</strong> Pilot DTC + Flight Logbook<br />
            <strong>✓ Verifies:</strong> Against FAA Airmen Registry<br />
            <strong>✓ Syncs:</strong> ForeFlight, Garmin Pilot (optional)
          </div>

          <button
            onClick={handleFullComplete}
            style={{
              padding: "12px",
              fontSize: "14px",
              fontWeight: 600,
              background: "rgb(124,58,237)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Create Pilot DTC →
          </button>
        </div>
      </div>
    );
  }

  // Quick mode
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div>
        <h2 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: 700 }}>
          Add Pilot Credentials
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
          Create your Pilot DTC and digital logbook
        </p>
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <button
          onClick={() => setMode("quick")}
          style={{
            padding: "16px",
            textAlign: "left",
            background: "rgba(124,58,237,0.05)",
            border: "2px solid rgb(124,58,237)",
            borderRadius: "8px",
            cursor: "default",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
            Quick Start (Recommended)
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            Just name + certificate number. Add details later.
          </div>
        </button>

        <button
          onClick={() => setMode("full")}
          style={{
            padding: "16px",
            textAlign: "left",
            background: "white",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
            Complete Setup
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            Add all certificates, ratings, hours, and medical now
          </div>
        </button>
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <label style={{ display: "grid", gap: "6px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>Full Name *</div>
          <input
            type="text"
            value={pilotName}
            onChange={(e) => setPilotName(e.target.value)}
            placeholder="John Smith"
            autoFocus
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>FAA Certificate Number *</div>
          <input
            type="text"
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
            placeholder="1234567"
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Found on your pilot certificate (7-10 digits)
          </div>
        </label>
      </div>

      <div
        style={{
          padding: "12px",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "6px",
          fontSize: "13px",
        }}
      >
        <strong>What you'll get:</strong>
        <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
          <li>Blockchain-verified Pilot DTC</li>
          <li>Digital flight logbook</li>
          <li>Currency tracking (90-day, IFR, BFR)</li>
          <li>ForeFlight/Garmin sync (optional)</li>
        </ul>
      </div>

      <button
        onClick={handleQuickComplete}
        style={{
          padding: "12px",
          fontSize: "14px",
          fontWeight: 600,
          background: "rgb(124,58,237)",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Create My Pilot DTC →
      </button>

      <button
        onClick={onSkip}
        style={{
          padding: "10px",
          fontSize: "13px",
          background: "transparent",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          cursor: "pointer",
          color: "#6b7280",
        }}
      >
        Skip for now
      </button>
    </div>
  );
}
