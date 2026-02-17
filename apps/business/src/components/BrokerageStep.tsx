import React, { useState } from "react";
import useFileUpload from "../hooks/useFileUpload";

interface BrokerageStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function BrokerageStep({ onComplete, onSkip }: BrokerageStepProps) {
  const [substep, setSubstep] = useState<"focus" | "firstListing" | "docs">("focus");
  const [focusArea, setFocusArea] = useState("residential");
  const [address, setAddress] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [mlsId, setMlsId] = useState("");

  const listingAgreementUpload = useFileUpload({ purpose: "listing_agreement" });
  const disclosuresUpload = useFileUpload({ purpose: "disclosures" });

  async function handleDocUpload(upload: ReturnType<typeof useFileUpload>, file: File) {
    await upload.uploadFile(file);
  }

  if (substep === "focus") {
    return (
      <div style={{ display: "grid", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
            Brokerage Focus
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
            What type of real estate does your brokerage focus on?
          </p>
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          {[
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" },
            { value: "land", label: "Land / Lots" },
            { value: "mixed", label: "Mixed (All Types)" },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setFocusArea(option.value)}
              style={{
                padding: "16px 20px",
                fontSize: "15px",
                textAlign: "left",
                borderRadius: "12px",
                border: focusArea === option.value ? "2px solid rgb(124,58,237)" : "1px solid #e5e7eb",
                background: focusArea === option.value ? "rgba(124,58,237,0.05)" : "white",
                cursor: "pointer",
                fontWeight: focusArea === option.value ? 600 : 400,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
          <button onClick={onSkip} style={{ padding: "12px 24px", fontSize: "15px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", color: "#6b7280" }}>
            Skip
          </button>
          <button
            onClick={() => setSubstep("firstListing")}
            style={{ padding: "12px 32px", fontSize: "15px", fontWeight: 600, background: "rgb(124,58,237)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >
            Next: First Listing
          </button>
        </div>
      </div>
    );
  }

  if (substep === "firstListing") {
    return (
      <div style={{ display: "grid", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
            First Listing
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
            Add a listing to see the platform in action. You can add more later.
          </p>
        </div>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Property Address</div>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="456 Oak Ave, Los Angeles, CA" style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>List Price</div>
          <input type="text" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="$850,000" style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>MLS ID (optional)</div>
          <input type="text" value={mlsId} onChange={(e) => setMlsId(e.target.value)} placeholder="MLS-12345" style={{ padding: "12px 16px", fontSize: "15px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
        </label>

        <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
          <button onClick={() => setSubstep("focus")} style={{ padding: "12px 24px", fontSize: "15px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", color: "#6b7280" }}>
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
    { label: "Listing Agreement", upload: listingAgreementUpload, accept: ".pdf" },
    { label: "Disclosures", upload: disclosuresUpload, accept: ".pdf" },
  ];

  const anyUploaded = docTypes.some(d => d.upload.uploaded);

  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
          Listing Documents
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
          Upload documents for your first listing.
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
              id={`brokerage-doc-${doc.label}`}
              disabled={doc.upload.uploaded || doc.upload.uploading}
            />
            <label
              htmlFor={`brokerage-doc-${doc.label}`}
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
        <button onClick={() => setSubstep("firstListing")} style={{ padding: "12px 24px", fontSize: "15px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", color: "#6b7280" }}>
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
