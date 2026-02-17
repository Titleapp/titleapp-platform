import React, { useState } from "react";
import useFileUpload from "../hooks/useFileUpload";

interface PropertyMgmtStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PROPERTY_TYPES = [
  "Single Family",
  "Multi-Family",
  "Apartment Complex",
  "Condo / Townhome",
  "Commercial",
  "Mixed Use",
];

export default function PropertyMgmtStep({ onComplete, onSkip }: PropertyMgmtStepProps) {
  const [substep, setSubstep] = useState<"portfolio" | "firstProperty" | "docs">("portfolio");
  const [propertyCount, setPropertyCount] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("Multi-Family");
  const [unitCount, setUnitCount] = useState("");
  const [ownershipEntity, setOwnershipEntity] = useState("");

  const deedUpload = useFileUpload({ purpose: "property_deed" });
  const insuranceUpload = useFileUpload({ purpose: "property_insurance" });
  const leaseUpload = useFileUpload({ purpose: "property_leases" });

  function toggleType(type: string) {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  async function handleDocUpload(upload: ReturnType<typeof useFileUpload>, file: File) {
    await upload.uploadFile(file);
  }

  if (substep === "portfolio") {
    return (
      <div style={{ display: "grid", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
            Portfolio Basics
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
            Tell us about your property management portfolio.
          </p>
        </div>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>How many properties do you manage?</div>
          <input
            type="number"
            value={propertyCount}
            onChange={(e) => setPropertyCount(e.target.value)}
            placeholder="e.g. 12"
            style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }}
          />
        </label>

        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Property types (select all that apply)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PROPERTY_TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  borderRadius: "8px",
                  border: selectedTypes.includes(type) ? "2px solid rgb(124,58,237)" : "1px solid #e5e7eb",
                  background: selectedTypes.includes(type) ? "rgba(124,58,237,0.08)" : "white",
                  cursor: "pointer",
                  fontWeight: selectedTypes.includes(type) ? 600 : 400,
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
          <button onClick={onSkip} style={{ padding: "12px 24px", fontSize: "15px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", color: "#6b7280" }}>
            Skip
          </button>
          <button
            onClick={() => setSubstep("firstProperty")}
            disabled={!propertyCount}
            style={{ padding: "12px 32px", fontSize: "15px", fontWeight: 600, background: propertyCount ? "rgb(124,58,237)" : "#9ca3af", color: "white", border: "none", borderRadius: "8px", cursor: propertyCount ? "pointer" : "not-allowed" }}
          >
            Next: First Property
          </button>
        </div>
      </div>
    );
  }

  if (substep === "firstProperty") {
    return (
      <div style={{ display: "grid", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
            First Property
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
            Add one property to get started. You can add more later.
          </p>
        </div>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Property Address</div>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Chicago, IL" style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Property Type</div>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white" }}>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Unit Count</div>
          <input type="number" value={unitCount} onChange={(e) => setUnitCount(e.target.value)} placeholder="e.g. 24" style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Ownership Entity</div>
          <input type="text" value={ownershipEntity} onChange={(e) => setOwnershipEntity(e.target.value)} placeholder="e.g. Acme Properties LLC" style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
        </label>

        <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
          <button onClick={() => setSubstep("portfolio")} style={{ padding: "12px 24px", fontSize: "15px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", color: "#6b7280" }}>
            Back
          </button>
          <button
            onClick={() => setSubstep("docs")}
            disabled={!address}
            style={{ padding: "12px 32px", fontSize: "15px", fontWeight: 600, background: address ? "rgb(124,58,237)" : "#9ca3af", color: "white", border: "none", borderRadius: "8px", cursor: address ? "pointer" : "not-allowed" }}
          >
            Next: Documents
          </button>
        </div>
      </div>
    );
  }

  // docs substep
  const docTypes = [
    { label: "Deed / Title", upload: deedUpload, accept: ".pdf,.jpg,.png" },
    { label: "Insurance Policy", upload: insuranceUpload, accept: ".pdf" },
    { label: "Lease Templates", upload: leaseUpload, accept: ".pdf,.docx" },
  ];

  const anyUploaded = docTypes.some(d => d.upload.uploaded);

  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
          Property Documents
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
          Upload key documents for your first property. You can add more later.
        </p>
      </div>

      {docTypes.map((doc) => (
        <div
          key={doc.label}
          style={{
            padding: "16px",
            background: "white",
            border: doc.upload.uploaded ? "2px solid #10b981" : "1px solid #e5e7eb",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>{doc.label}</div>
            {doc.upload.uploaded && <div style={{ fontSize: "13px", color: "#10b981", marginTop: "4px" }}>Uploaded</div>}
            {doc.upload.error && <div style={{ fontSize: "13px", color: "#dc2626", marginTop: "4px" }}>{doc.upload.error}</div>}
          </div>
          <div>
            <input
              type="file"
              accept={doc.accept}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(doc.upload, f); }}
              style={{ display: "none" }}
              id={`doc-${doc.label}`}
              disabled={doc.upload.uploaded || doc.upload.uploading}
            />
            <label
              htmlFor={`doc-${doc.label}`}
              style={{
                display: "inline-block",
                padding: "8px 16px",
                fontSize: "14px",
                background: doc.upload.uploading ? "#9ca3af" : "white",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: doc.upload.uploaded ? "not-allowed" : "pointer",
                color: doc.upload.uploaded ? "#9ca3af" : "#374151",
              }}
            >
              {doc.upload.uploading ? "Uploading..." : doc.upload.uploaded ? "Done" : "Choose File"}
            </label>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
        <button onClick={() => setSubstep("firstProperty")} style={{ padding: "12px 24px", fontSize: "15px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", color: "#6b7280" }}>
          Back
        </button>
        <button
          onClick={onComplete}
          style={{ padding: "12px 32px", fontSize: "15px", fontWeight: 600, background: "rgb(124,58,237)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          {anyUploaded ? "Complete Setup" : "Skip Documents"}
        </button>
      </div>
    </div>
  );
}
