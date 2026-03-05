import React, { useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiCall(endpoint, body) {
  const token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

const ENROLLMENT_TYPES = [
  { value: "university_aviation", label: "University Aviation Program" },
  { value: "propilot_program", label: "Professional Pilot Program" },
  { value: "gi_bill", label: "GI Bill Flight Training" },
];

export default function StudentVerificationForm({ onComplete, onCancel }) {
  const [schoolName, setSchoolName] = useState("");
  const [enrollmentType, setEnrollmentType] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const canSubmit = schoolName.trim() && enrollmentType && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      let photo = null;
      if (photoFile) {
        photo = await readFileAsDataUrl(photoFile);
      }

      const result = await apiCall("verify:student", {
        school_name: schoolName.trim(),
        enrollment_type: enrollmentType,
        student_id_photo: photo,
      });

      if (!result.ok) {
        setError(result.error || "Verification failed");
        setSubmitting(false);
        return;
      }

      onComplete?.(result);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="cardHeader">
        <div className="cardTitle">Student Pilot Verification</div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 16 }}>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>
          Verify your enrollment to get Pilot Pro free while you're a student.
          We'll ask you to re-verify once a year.
        </p>

        {/* School Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--fg)" }}>
            School Name
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Embry-Riddle Aeronautical University"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--line)", background: "var(--bg)",
              color: "var(--fg)", fontSize: 14, boxSizing: "border-box",
            }}
          />
        </div>

        {/* Enrollment Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--fg)" }}>
            Program Type
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ENROLLMENT_TYPES.map((t) => (
              <label
                key={t.value}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, border: `1px solid ${enrollmentType === t.value ? "var(--accent)" : "var(--line)"}`,
                  background: enrollmentType === t.value ? "rgba(124, 58, 237, 0.06)" : "var(--bg)",
                  cursor: "pointer", fontSize: 14,
                }}
              >
                <input
                  type="radio"
                  name="enrollmentType"
                  value={t.value}
                  checked={enrollmentType === t.value}
                  onChange={() => setEnrollmentType(t.value)}
                  style={{ accentColor: "var(--accent)" }}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        {/* Student ID Photo */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--fg)" }}>
            Student ID Photo
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              padding: "10px 16px", borderRadius: 8, border: "1px dashed var(--line)",
              background: "var(--bg)", color: "var(--muted)", cursor: "pointer",
              width: "100%", fontSize: 14, textAlign: "center",
            }}
          >
            {photoFile ? photoFile.name : "Upload student ID photo"}
          </button>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            Optional but speeds up verification. JPG, PNG, or PDF.
          </p>
        </div>

        {error && (
          <div style={{
            padding: "10px 12px", borderRadius: 8, marginBottom: 16,
            background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {onCancel && (
            <button type="button" className="iconBtn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="iconBtn"
            disabled={!canSubmit}
            style={{
              background: canSubmit ? "var(--accent)" : "var(--line)",
              color: "white", borderColor: canSubmit ? "var(--accent)" : "var(--line)",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Verifying..." : "Verify Enrollment"}
          </button>
        </div>
      </form>
    </div>
  );
}
