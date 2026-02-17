import React, { useState } from "react";
import useFileUpload from "../hooks/useFileUpload";

interface RealEstateDataStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface ParsedSheet {
  name: string;
  detectedType: string;
  rowCount: number;
  headers: string[];
  confidence: number;
  sample: any[];
}

interface ParsedFile {
  filename: string;
  sheets: ParsedSheet[];
  detectedProfile: "brokerage" | "property_management" | "str_portfolio" | "mixed";
  platformIntegrations: string[];
}

// Sheet type detection patterns
const SHEET_PATTERNS = {
  buyer_prospects: {
    keywords: ["buyer", "prospect", "lead", "budget", "neighborhood", "must-have"],
    requiredHeaders: ["name", "budget", "status"],
  },
  seller_pipeline: {
    keywords: ["seller", "listing", "property", "zillow", "days on market", "offer"],
    requiredHeaders: ["address", "price", "status"],
  },
  transactions: {
    keywords: ["transaction", "closed", "commission", "escrow", "lender"],
    requiredHeaders: ["date", "amount", "status"],
  },
  agent_roster: {
    keywords: ["agent", "license", "specialization", "volume", "commission"],
    requiredHeaders: ["name", "license"],
  },
  tenant_roster: {
    keywords: ["tenant", "unit", "lease", "rent", "deposit", "move-in"],
    requiredHeaders: ["unit", "tenant", "rent"],
  },
  rent_roll: {
    keywords: ["rent roll", "billing", "payment", "balance", "due"],
    requiredHeaders: ["unit", "amount", "status"],
  },
  maintenance: {
    keywords: ["maintenance", "work order", "repair", "technician", "priority"],
    requiredHeaders: ["date", "description", "status"],
  },
  inspections: {
    keywords: ["inspection", "move-in", "move-out", "condition", "issue"],
    requiredHeaders: ["date", "unit", "type"],
  },
  str_portfolio: {
    keywords: ["airbnb", "vrbo", "booking", "occupancy", "revenue", "property"],
    requiredHeaders: ["property", "revenue"],
  },
  platform_integrations: {
    keywords: ["platform", "integration", "api", "software", "system", "tool"],
    requiredHeaders: ["platform", "name"],
  },
};

export default function RealEstateDataStep({ onComplete, onSkip }: RealEstateDataStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({});
  const fileUpload = useFileUpload({ purpose: "real_estate_data" });

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = Array.from(event.target.files || []);
    setFiles([...files, ...uploadedFiles]);

    for (const file of uploadedFiles) {
      await parseFile(file);
    }
  }

  async function parseFile(file: File) {
    setParsing(true);

    try {
      const parsed: ParsedFile = await simulateFileParsing(file);
      setParsedFiles(prev => [...prev, parsed]);
    } catch (error) {
      console.error("Parse error:", error);
    } finally {
      setParsing(false);
    }
  }

  async function simulateFileParsing(file: File): Promise<ParsedFile> {
    // Simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Detect file type from filename
    const filename = file.name.toLowerCase();
    let detectedProfile: ParsedFile["detectedProfile"] = "brokerage";
    let sheets: ParsedSheet[] = [];
    let platformIntegrations: string[] = [];

    if (filename.includes("summit") || filename.includes("buyers_sellers")) {
      detectedProfile = "brokerage";
      sheets = [
        {
          name: "Buyer Prospects",
          detectedType: "buyer_prospects",
          rowCount: 75,
          headers: ["Name", "Budget Min", "Budget Max", "Neighborhoods", "Must-Haves", "Status"],
          confidence: 0.95,
          sample: [],
        },
        {
          name: "Seller Pipeline",
          detectedType: "seller_pipeline",
          rowCount: 50,
          headers: ["Address", "List Price", "Zillow URL", "Days on Market", "Offers", "Status"],
          confidence: 0.92,
          sample: [],
        },
        {
          name: "Transactions",
          detectedType: "transactions",
          rowCount: 60,
          headers: ["Date", "Address", "Sale Price", "Commission", "Agent", "Status"],
          confidence: 0.98,
          sample: [],
        },
        {
          name: "Agent Roster",
          detectedType: "agent_roster",
          rowCount: 6,
          headers: ["Name", "License #", "Specialization", "YTD Volume", "Commission Split"],
          confidence: 0.99,
          sample: [],
        },
        {
          name: "Platform Integrations",
          detectedType: "platform_integrations",
          rowCount: 14,
          headers: ["Platform", "Type", "Account", "Status", "API Key Needed"],
          confidence: 1.0,
          sample: [],
        },
      ];
      platformIntegrations = [
        "Zillow",
        "Redfin",
        "MLS",
        "DocuSign",
        "CRM",
        "QuickBooks",
        "Matterport",
        "ShowingTime",
      ];
    } else if (filename.includes("pm_operations")) {
      detectedProfile = "property_management";
      sheets = [
        {
          name: "Tenant Roster",
          detectedType: "tenant_roster",
          rowCount: 100,
          headers: ["Unit", "Tenant Name", "Lease Start", "Rent Amount", "Deposit", "Status"],
          confidence: 0.97,
          sample: [],
        },
        {
          name: "Rent Roll",
          detectedType: "rent_roll",
          rowCount: 100,
          headers: ["Unit", "Rent", "Fees", "Total Due", "Paid", "Balance", "Payment Method"],
          confidence: 0.96,
          sample: [],
        },
        {
          name: "Maintenance Orders",
          detectedType: "maintenance",
          rowCount: 120,
          headers: ["Date", "Unit", "Category", "Priority", "Technician", "Cost", "Status"],
          confidence: 0.94,
          sample: [],
        },
        {
          name: "Inspections",
          detectedType: "inspections",
          rowCount: 60,
          headers: ["Date", "Unit", "Type", "Rating", "Issues", "Action Items"],
          confidence: 0.93,
          sample: [],
        },
        {
          name: "Platform Integrations",
          detectedType: "platform_integrations",
          rowCount: 21,
          headers: ["Platform", "Type", "Purpose", "Status", "Credentials Needed"],
          confidence: 1.0,
          sample: [],
        },
      ];
      platformIntegrations = [
        "AppFolio",
        "Guesty",
        "Airbnb",
        "VRBO",
        "Booking.com",
        "PriceLabs",
        "Latchel",
        "Properly",
        "QuickBooks",
        "Xero",
      ];
    } else if (filename.includes("str_portfolio")) {
      detectedProfile = "str_portfolio";
      sheets = [
        {
          name: "Portfolio Summary",
          detectedType: "str_portfolio",
          rowCount: 12,
          headers: ["Property", "Location", "Purchase Price", "Monthly Revenue", "Occupancy", "ROI"],
          confidence: 0.98,
          sample: [],
        },
        ...Array.from({ length: 12 }, (_, i) => ({
          name: `STR-${String(i + 1).padStart(2, "0")}`,
          detectedType: "str_property_detail",
          rowCount: 25,
          headers: ["Date", "Guest", "Nightly Rate", "Nights", "Revenue", "Platform", "Status"],
          confidence: 0.95,
          sample: [],
        })),
      ];
      platformIntegrations = ["Airbnb", "VRBO", "Booking.com", "Guesty", "PriceLabs", "Properly"];
    }

    return {
      filename: file.name,
      sheets,
      detectedProfile,
      platformIntegrations,
    };
  }

  async function handleImport() {
    setUploading(true);
    try {
      for (const file of files) {
        setUploadProgress(prev => ({ ...prev, [file.name]: "uploading" }));
        const result = await fileUpload.uploadFile(file);
        setUploadProgress(prev => ({ ...prev, [file.name]: result ? "done" : "error" }));
      }
      onComplete();
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setUploading(false);
    }
  }

  const totalSheets = parsedFiles.reduce((sum, f) => sum + f.sheets.length, 0);
  const totalRecords = parsedFiles.reduce(
    (sum, f) => sum + f.sheets.reduce((s, sheet) => s + sheet.rowCount, 0),
    0
  );

  return (
    <div style={{ display: "grid", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
          Upload Your Real Estate Data
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
          Upload your Excel files containing client data, listings, tenants, or property portfolios.
          We'll automatically detect the data type and map it to our system.
        </p>
      </div>

      {/* Upload Area */}
      <div
        style={{
          padding: "32px",
          border: "2px dashed #d1d5db",
          borderRadius: "12px",
          textAlign: "center",
          background: "#f9fafb",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: 600, color: "#64748b", marginBottom: "16px" }}>Data Upload</div>
        <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
          Upload Real Estate Data Files
        </p>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
          CRM exports, tenant rosters, transaction history, property portfolios
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          onChange={handleFileUpload}
          style={{ display: "none" }}
          id="re-file-upload"
        />
        <label
          htmlFor="re-file-upload"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "rgb(124, 58, 237)",
            color: "white",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 600,
          }}
        >
          Choose Files
        </label>
      </div>

      {parsing && (
        <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "12px", textAlign: "center" }}>
          Analyzing file structure and detecting data types...
        </div>
      )}

      {/* Parsed Files Summary */}
      {parsedFiles.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 600 }}>
            Detected Data ({totalSheets} sheets, {totalRecords.toLocaleString()} records)
          </div>

          {parsedFiles.map((file, fileIdx) => (
            <div
              key={fileIdx}
              style={{
                padding: "20px",
                background: "white",
                border: "2px solid #e5e7eb",
                borderRadius: "12px",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {file.filename}
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  Profile: {file.detectedProfile.replace(/_/g, " ").toUpperCase()}
                </div>
              </div>

              {/* Sheets */}
              <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
                {file.sheets.map((sheet, sheetIdx) => (
                  <div
                    key={sheetIdx}
                    style={{
                      padding: "12px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{sheet.name}</div>
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>
                        {sheet.detectedType.replace(/_/g, " ")} • {sheet.rowCount} rows • {Math.round(sheet.confidence * 100)}% confidence
                      </div>
                    </div>
                    <div style={{ fontSize: "20px" }}>✓</div>
                  </div>
                ))}
              </div>

              {/* Platform Integrations */}
              {file.platformIntegrations.length > 0 && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#fef3c7",
                    border: "1px solid #fbbf24",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                    Platform Integrations Detected ({file.platformIntegrations.length})
                  </div>
                  <div style={{ fontSize: "13px", color: "#92400e", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {file.platformIntegrations.map((platform, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "4px 8px",
                          background: "white",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: "12px", color: "#92400e", marginTop: "8px" }}>
                    You'll need to provide API keys/credentials for these platforms after onboarding
                  </div>
                </div>
              )}
            </div>
          ))}
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
          onClick={handleImport}
          disabled={parsedFiles.length === 0 || uploading}
          style={{
            padding: "12px 32px",
            fontSize: "15px",
            fontWeight: 600,
            background: parsedFiles.length > 0 && !uploading ? "rgb(124, 58, 237)" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: parsedFiles.length > 0 && !uploading ? "pointer" : "not-allowed",
          }}
        >
          {uploading ? "Importing..." : `Import ${totalRecords.toLocaleString()} Records →`}
        </button>
      </div>
    </div>
  );
}
