import React, { useState } from "react";
import * as api from "../api/client";

/**
 * PilotRecords - Upload pilot logbooks and generate FAA 8710/ICAO forms
 * Parses Excel files into DTCs and logbook entries
 */
export default function PilotRecords() {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [experienceSummary, setExperienceSummary] = useState(null);

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      // Step 1: Request upload URL
      const signResponse = await api.requestUploadUrl({
        vertical,
        jurisdiction,
        filename: file.name,
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: file.size,
        purpose: "pilot_records",
      });

      if (!signResponse.uploadUrl) {
        throw new Error("No upload URL received");
      }

      // Step 2: Upload file to signed URL
      const uploadResult = await fetch(signResponse.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("Upload failed");
      }

      // Step 3: Finalize upload
      await api.finalizeUpload({
        vertical,
        jurisdiction,
        fileId: signResponse.fileId,
        storagePath: signResponse.storagePath,
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: file.size,
      });

      // Step 4: Parse pilot records
      setParsing(true);
      const parseResponse = await api.parsePilotRecords({
        vertical,
        jurisdiction,
        fileId: signResponse.fileId,
      });

      setParseResult(parseResponse);
      setParsing(false);

      // Auto-load experience summary
      await loadExperienceSummary();
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Upload error:", e);
      setParsing(false);
    } finally {
      setUploading(false);
    }
  }

  async function loadExperienceSummary() {
    setLoading(true);
    setError("");

    try {
      const result = await api.getExperienceSummary({
        vertical,
        jurisdiction,
      });
      setExperienceSummary(result);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load experience summary:", e);
    } finally {
      setLoading(false);
    }
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Pilot Records</h1>
          <p className="subtle">Upload pilot logbooks and generate FAA 8710/ICAO forms</p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "12px",
            color: "#dc2626",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="cardHeader">
          <div className="cardTitle">Upload Pilot Records</div>
        </div>
        <div style={{ padding: "20px" }}>
          <p style={{ marginBottom: "16px", color: "var(--textMuted)" }}>
            Upload an Excel file (.xlsx) containing pilot profile and flight log data. The file should have two sheets:
          </p>
          <ul style={{ marginBottom: "16px", paddingLeft: "20px", color: "var(--textMuted)" }}>
            <li>Pilot Profile - Personal info, certificates, ratings, employment</li>
            <li>Flight Log - Detailed flight entries with dates, aircraft, times, landings, etc.</li>
          </ul>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={uploading || parsing}
            style={{
              padding: "10px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              width: "100%",
            }}
          />

          {uploading && (
            <div style={{ marginTop: "12px", color: "var(--accent)" }}>
              Uploading file...
            </div>
          )}

          {parsing && (
            <div style={{ marginTop: "12px", color: "var(--accent)" }}>
              Parsing pilot records and creating DTCs/logbooks...
            </div>
          )}
        </div>
      </div>

      {/* Parse Results */}
      {parseResult && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="cardHeader">
            <div className="cardTitle">Parse Results</div>
          </div>
          <div style={{ padding: "20px" }}>
            <div className="kpiRow" style={{ marginBottom: "20px" }}>
              <div className="card kpiCard">
                <div className="kpiLabel">Certificates Created</div>
                <div className="kpiValue">{parseResult.certificates?.length || 0}</div>
              </div>
              <div className="card kpiCard">
                <div className="kpiLabel">Logbook Entries</div>
                <div className="kpiValue">{parseResult.logbookEntriesCreated || 0}</div>
              </div>
              <div className="card kpiCard">
                <div className="kpiLabel">Total Flight Time</div>
                <div className="kpiValue">{parseResult.experienceTotals?.totalTime?.toFixed(1) || "0.0"} hrs</div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                Pilot Profile
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "var(--textMuted)", marginBottom: "4px" }}>Name</div>
                  <div style={{ fontWeight: 600 }}>{parseResult.pilotProfile?.["Full Legal Name"] || "-"}</div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "var(--textMuted)", marginBottom: "4px" }}>Certificate Number</div>
                  <div style={{ fontWeight: 600 }}>{parseResult.pilotProfile?.["FAA Certificate Number"] || "-"}</div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "var(--textMuted)", marginBottom: "4px" }}>Certificate Type</div>
                  <div style={{ fontWeight: 600 }}>{parseResult.pilotProfile?.["Certificate Type"] || "-"}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                Certificates Created
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {parseResult.certificates?.map((cert, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px",
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{cert.type}</div>
                      <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>DTC ID: {cert.id}</div>
                    </div>
                    <div style={{ fontSize: "24px" }}>✓</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experience Summary */}
      {experienceSummary && (
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Experience Summary</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="iconBtn"
                onClick={() => downloadJSON(experienceSummary.faa8710, "FAA_8710_Experience.json")}
                style={{
                  background: "var(--accent)",
                  color: "white",
                  borderColor: "var(--accent)",
                }}
              >
                Download FAA 8710
              </button>
              <button
                className="iconBtn"
                onClick={() => downloadJSON(experienceSummary.icao, "ICAO_Experience.json")}
                style={{
                  background: "var(--accent)",
                  color: "white",
                  borderColor: "var(--accent)",
                }}
              >
                Download ICAO
              </button>
            </div>
          </div>
          <div style={{ padding: "20px" }}>
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                FAA Form 8710-1 Experience
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                {Object.entries(experienceSummary.faa8710.experience).map(([key, value]) => (
                  <div key={key} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                      {key}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                ICAO License Application Experience
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                    Total Flight Time
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>
                    {experienceSummary.icao.totalFlightTime.hours}h {experienceSummary.icao.totalFlightTime.minutes}m
                  </div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                    Command Time
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>
                    {experienceSummary.icao.commandTime.hours}h {experienceSummary.icao.commandTime.minutes}m
                  </div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                    Second in Command
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>
                    {experienceSummary.icao.secondInCommandTime.hours}h {experienceSummary.icao.secondInCommandTime.minutes}m
                  </div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                    Cross-Country Time
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>
                    {experienceSummary.icao.crossCountryTime.hours}h {experienceSummary.icao.crossCountryTime.minutes}m
                  </div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                    Night Time
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>
                    {experienceSummary.icao.nightTime.hours}h {experienceSummary.icao.nightTime.minutes}m
                  </div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                    Instrument Time
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>
                    {experienceSummary.icao.instrumentTime.hours}h {experienceSummary.icao.instrumentTime.minutes}m
                  </div>
                </div>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--textMuted)", marginBottom: "4px" }}>
                    Total Landings
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>{experienceSummary.icao.totalLandings}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!parseResult && !experienceSummary && (
        <div className="card" style={{ padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✈️</div>
          <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            No pilot records uploaded yet
          </p>
          <p style={{ color: "var(--textMuted)" }}>
            Upload a pilot logbook Excel file to automatically create DTCs and generate FAA 8710/ICAO experience forms
          </p>
        </div>
      )}
    </div>
  );
}
