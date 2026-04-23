/**
 * ContactImport.jsx — CSV contact import with drag-and-drop (49.4)
 * Auto-maps common fields (name, email, phone, company).
 * Preview before importing. Saves to Spine contacts collection.
 */

import React, { useState, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  container: { padding: "28px 32px", maxWidth: 700 },
  title: { fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#64748b", marginBottom: 24 },
  dropzone: {
    padding: 48, textAlign: "center", background: "#f8fafc", borderRadius: 12,
    border: "2px dashed #e2e8f0", cursor: "pointer", transition: "border-color 0.2s",
  },
  dropzoneActive: {
    padding: 48, textAlign: "center", background: "#faf5ff", borderRadius: 12,
    border: "2px dashed #6B46C1", cursor: "pointer",
  },
  dropText: { fontSize: 14, color: "#64748b", marginTop: 8 },
  dropHint: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  preview: { marginTop: 24 },
  previewTitle: { fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 600 },
  td: { padding: "6px 10px", borderBottom: "1px solid #f1f5f9", color: "#374151" },
  actions: { display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" },
  importBtn: {
    padding: "10px 24px", fontSize: 13, fontWeight: 600, borderRadius: 8,
    border: "none", background: "#6B46C1", color: "#fff", cursor: "pointer",
  },
  clearBtn: {
    padding: "10px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8,
    border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
  },
  success: { padding: 16, background: "#f0fdf4", borderRadius: 8, color: "#16a34a", fontSize: 13, marginTop: 16, textAlign: "center" },
  error: { padding: 16, background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13, marginTop: 16 },
  stats: { fontSize: 12, color: "#94a3b8", marginTop: 8 },
};

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, j) => { row[h] = values[j]; });
      rows.push(row);
    }
  }

  return { headers, rows };
}

function autoMapFields(headers) {
  const map = {};
  const patterns = {
    email: /^(email|e-?mail|email.?address)$/i,
    firstName: /^(first.?name|fname|given.?name)$/i,
    lastName: /^(last.?name|lname|surname|family.?name)$/i,
    name: /^(name|full.?name|contact.?name)$/i,
    phone: /^(phone|tel|telephone|mobile|cell)$/i,
    company: /^(company|organization|org|business|employer)$/i,
  };

  headers.forEach(h => {
    for (const [field, re] of Object.entries(patterns)) {
      if (re.test(h) && !map[field]) {
        map[field] = h;
      }
    }
  });

  return map;
}

export default function ContactImport() {
  const [parsed, setParsed] = useState(null);
  const [fieldMap, setFieldMap] = useState({});
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      if (rows.length === 0) {
        setError("No data rows found in CSV");
        return;
      }
      setParsed({ headers, rows });
      setFieldMap(autoMapFields(headers));
      setError(null);
      setResult(null);
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    setError(null);

    const contacts = parsed.rows.map(row => {
      const c = {};
      if (fieldMap.email) c.email = row[fieldMap.email] || "";
      if (fieldMap.firstName) c.firstName = row[fieldMap.firstName] || "";
      if (fieldMap.lastName) c.lastName = row[fieldMap.lastName] || "";
      if (fieldMap.name && !fieldMap.firstName) {
        const parts = (row[fieldMap.name] || "").split(" ");
        c.firstName = parts[0] || "";
        c.lastName = parts.slice(1).join(" ") || "";
      }
      if (fieldMap.phone) c.phone = row[fieldMap.phone] || "";
      if (fieldMap.company) c.company = row[fieldMap.company] || "";
      return c;
    }).filter(c => c.email);

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/onboarding:importContacts")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contacts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({ imported: data.importedCount || contacts.length });
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={S.container}>
      <div style={S.title}>Import Contacts</div>
      <div style={S.subtitle}>Upload a CSV file with your contacts. We'll auto-map the columns.</div>

      {!parsed && (
        <div
          style={dragging ? S.dropzoneActive : S.dropzone}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
          <div style={S.dropText}>Drop your CSV here or click to browse</div>
          <div style={S.dropHint}>Supports: .csv files with headers</div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {parsed && (
        <div style={S.preview}>
          <div style={S.previewTitle}>
            Preview ({parsed.rows.length} contacts)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {parsed.headers.slice(0, 5).map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {parsed.headers.slice(0, 5).map(h => (
                      <td key={h} style={S.td}>{row[h] || ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 5 && (
            <div style={S.stats}>...and {parsed.rows.length - 5} more rows</div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
            Auto-mapped: {Object.entries(fieldMap).map(([k, v]) => `${k} -> "${v}"`).join(", ") || "none detected"}
          </div>

          <div style={S.actions}>
            <button style={S.clearBtn} onClick={() => { setParsed(null); setResult(null); setError(null); }}>
              Clear
            </button>
            <button
              style={S.importBtn}
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? "Importing..." : `Import ${parsed.rows.length} Contacts`}
            </button>
          </div>
        </div>
      )}

      {result && <div style={S.success}>{result.imported} contacts imported successfully</div>}
      {error && <div style={S.error}>{error}</div>}
    </div>
  );
}
