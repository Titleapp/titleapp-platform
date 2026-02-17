import React, { useState } from "react";

interface DealershipDataStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface UploadedFile {
  type: string;
  file: File | null;
  uploaded: boolean;
  uploading: boolean;
  error: string | null;
}

const REQUIRED_FILES = [
  {
    type: "customer_list",
    label: "Customer Database",
    description: "Customer contact info, purchase history, preferences",
    icon: "",
    required: true,
  },
  {
    type: "dealer_inventory",
    label: "Current Inventory",
    description: "VINs, models, prices, stock numbers",
    icon: "",
    required: true,
  },
  {
    type: "service_schedule",
    label: "Service Appointments",
    description: "Scheduled services, maintenance history",
    icon: "",
    required: false,
  },
  {
    type: "financial_products",
    label: "Financing Options",
    description: "Available loan products, rates, terms",
    icon: "",
    required: false,
  },
  {
    type: "warranty_products",
    label: "Warranty Products",
    description: "Extended warranties, service contracts",
    icon: "",
    required: false,
  },
];

export default function DealershipDataStep({ onComplete, onSkip }: DealershipDataStepProps) {
  const [files, setFiles] = useState<UploadedFile[]>(
    REQUIRED_FILES.map(f => ({
      type: f.type,
      file: null,
      uploaded: false,
      uploading: false,
      error: null,
    }))
  );

  function handleFileSelect(type: string, file: File) {
    setFiles(prev =>
      prev.map(f =>
        f.type === type
          ? { ...f, file, uploaded: false, error: null }
          : f
      )
    );
  }

  async function handleUpload(type: string) {
    const fileEntry = files.find(f => f.type === type);
    if (!fileEntry?.file) return;

    setFiles(prev =>
      prev.map(f =>
        f.type === type
          ? { ...f, uploading: true, error: null }
          : f
      )
    );

    try {
      // Step 1: Request upload URL
      const token = localStorage.getItem("ID_TOKEN");
      const vertical = "auto";
      const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      const signResponse = await fetch(`${apiBase}/api?path=/v1/files:sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Vertical": vertical,
          "X-Jurisdiction": jurisdiction,
        },
        body: JSON.stringify({
          filename: fileEntry.file.name,
          contentType: fileEntry.file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          sizeBytes: fileEntry.file.size,
          purpose: type,
        }),
      });

      const signData = await signResponse.json();

      if (!signResponse.ok || !signData.ok) {
        throw new Error(signData.error || "Failed to get upload URL");
      }

      // Step 2: Upload to Cloud Storage
      const uploadResult = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileEntry.file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: fileEntry.file,
      });

      if (!uploadResult.ok) {
        throw new Error("Upload failed");
      }

      // Step 3: Finalize upload
      await fetch(`${apiBase}/api?path=/v1/files:finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Vertical": vertical,
          "X-Jurisdiction": jurisdiction,
        },
        body: JSON.stringify({
          fileId: signData.fileId,
          storagePath: signData.storagePath,
          contentType: fileEntry.file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          sizeBytes: fileEntry.file.size,
        }),
      });

      setFiles(prev =>
        prev.map(f =>
          f.type === type
            ? { ...f, uploading: false, uploaded: true }
            : f
        )
      );
    } catch (error: any) {
      setFiles(prev =>
        prev.map(f =>
          f.type === type
            ? { ...f, uploading: false, error: error.message || "Upload failed" }
            : f
        )
      );
    }
  }

  const requiredFiles = REQUIRED_FILES.filter(f => f.required);
  const requiredUploaded = requiredFiles.every(rf =>
    files.find(f => f.type === rf.type)?.uploaded
  );
  const anyUploaded = files.some(f => f.uploaded);

  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
          Upload Your Dealership Data
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
          To help you sell more effectively, we need some basic data about your business.
          Upload Excel files (.xlsx) for each category below.
        </p>
      </div>

      <div
        style={{
          padding: "16px 20px",
          background: "#fef3c7",
          border: "1px solid #fbbf24",
          borderRadius: "12px",
          fontSize: "14px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Minimum Viable Data</div>
        <div style={{ color: "#92400e" }}>
          Customer database and inventory are required. The more data you provide, the more AI can help you sell.
        </div>
      </div>

      {/* File Upload Cards */}
      <div style={{ display: "grid", gap: "16px" }}>
        {REQUIRED_FILES.map((fileType) => {
          const fileEntry = files.find(f => f.type === fileType.type);
          const hasFile = fileEntry?.file !== null;

          return (
            <div
              key={fileType.type}
              style={{
                padding: "20px",
                background: "white",
                border: fileEntry?.uploaded
                  ? "2px solid #10b981"
                  : fileType.required
                  ? "2px solid #e5e7eb"
                  : "1px solid #e5e7eb",
                borderRadius: "12px",
                position: "relative",
              }}
            >
              {fileType.required && !fileEntry?.uploaded && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    padding: "4px 8px",
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#dc2626",
                  }}
                >
                  REQUIRED
                </div>
              )}

              {fileEntry?.uploaded && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    padding: "4px 8px",
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#10b981",
                  }}
                >
                  ✓ UPLOADED
                </div>
              )}

              <div style={{ display: "flex", gap: "16px", alignItems: "start" }}>
                <div style={{ fontSize: "32px" }}>{fileType.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                    {fileType.label}
                  </div>
                  <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "12px" }}>
                    {fileType.description}
                  </div>

                  {hasFile && (
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "13px", color: "#374151", marginBottom: "4px" }}>
                        {fileEntry.file?.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {fileEntry.file ? (fileEntry.file.size / 1024).toFixed(1) : 0} KB
                      </div>
                    </div>
                  )}

                  {fileEntry?.error && (
                    <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", fontSize: "13px", color: "#dc2626", marginBottom: "12px" }}>
                      {fileEntry.error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(fileType.type, file);
                      }}
                      style={{ display: "none" }}
                      id={`file-${fileType.type}`}
                      disabled={fileEntry?.uploaded}
                    />
                    <label
                      htmlFor={`file-${fileType.type}`}
                      style={{
                        display: "inline-block",
                        padding: "8px 16px",
                        fontSize: "14px",
                        fontWeight: 500,
                        background: fileEntry?.uploaded ? "#f3f4f6" : "white",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        cursor: fileEntry?.uploaded ? "not-allowed" : "pointer",
                        color: fileEntry?.uploaded ? "#9ca3af" : "#374151",
                      }}
                    >
                      Choose File
                    </label>

                    {hasFile && !fileEntry?.uploaded && (
                      <button
                        onClick={() => handleUpload(fileType.type)}
                        disabled={fileEntry?.uploading}
                        style={{
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: 500,
                          background: fileEntry?.uploading ? "#9ca3af" : "rgb(124, 58, 237)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: fileEntry?.uploading ? "not-allowed" : "pointer",
                        }}
                      >
                        {fileEntry?.uploading ? "Uploading..." : "Upload"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {anyUploaded && (
        <div
          style={{
            padding: "16px 20px",
            background: "#f0fdf4",
            border: "2px solid #86efac",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>
            Your data is being processed
          </div>
          <p style={{ fontSize: "14px", color: "#374151", margin: 0 }}>
            TitleApp AI will analyze your data and start helping you match customers to vehicles,
            suggest optimal pricing, and identify sales opportunities.
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
        <button
          onClick={onSkip}
          style={{
            padding: "12px 24px",
            fontSize: "15px",
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          Skip for Now
        </button>
        <button
          onClick={onComplete}
          disabled={!requiredUploaded && !anyUploaded}
          style={{
            padding: "12px 32px",
            fontSize: "15px",
            fontWeight: 600,
            background: requiredUploaded || anyUploaded ? "rgb(124, 58, 237)" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: requiredUploaded || anyUploaded ? "pointer" : "not-allowed",
          }}
        >
          Complete Setup →
        </button>
      </div>
    </div>
  );
}
