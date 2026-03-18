import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

const CAMPAIGN_SLUGS = ["auto-dealer", "aviation", "real-estate-developer", "real-estate-operations", "creators"];

export default function ABTests() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const rows = [];
      for (const slug of CAMPAIGN_SLUGS) {
        try {
          const snap = await getDocs(collection(db, "abTests", slug, "sessions"));
          const sessions = snap.docs.map((d) => d.data());
          const variantA = sessions.filter((s) => s.variant === "A");
          const variantB = sessions.filter((s) => s.variant === "B");
          const convA = variantA.filter((s) => s.converted).length;
          const convB = variantB.filter((s) => s.converted).length;
          rows.push({ slug, variant: "A", sessions: variantA.length, conversions: convA, rate: variantA.length ? ((convA / variantA.length) * 100).toFixed(1) + "%" : "—" });
          rows.push({ slug, variant: "B", sessions: variantB.length, conversions: convB, rate: variantB.length ? ((convB / variantB.length) * 100).toFixed(1) + "%" : "—" });
        } catch {
          rows.push({ slug, variant: "A", sessions: 0, conversions: 0, rate: "—" });
          rows.push({ slug, variant: "B", sessions: 0, conversions: 0, rate: "—" });
        }
      }
      setResults(rows);
      setLoading(false);
    }
    loadData();
  }, []);

  const S = {
    container: { padding: 32, maxWidth: 900 },
    h1: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 },
    subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
    th: { textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" },
    td: { padding: "10px 14px", borderBottom: "1px solid #f3f4f6", color: "#111827" },
    slugCell: { fontWeight: 600, color: "#7c3aed" },
    variantBadge: (v) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: v === "A" ? "#f0fdf4" : "#fef3c7", color: v === "A" ? "#16a34a" : "#d97706" }),
    loading: { padding: 40, textAlign: "center", color: "#6b7280" },
  };

  return (
    <div style={S.container}>
      <h1 style={S.h1}>A/B Test Results</h1>
      <div style={S.subtitle}>Campaign variant performance — sessions and conversions by variant.</div>
      {loading ? (
        <div style={S.loading}>Loading test data...</div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Campaign</th>
              <th style={S.th}>Variant</th>
              <th style={S.th}>Sessions</th>
              <th style={S.th}>Conversions</th>
              <th style={S.th}>Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td style={{ ...S.td, ...S.slugCell }}>{r.variant === "A" ? r.slug : ""}</td>
                <td style={S.td}><span style={S.variantBadge(r.variant)}>{r.variant}</span></td>
                <td style={S.td}>{r.sessions}</td>
                <td style={S.td}>{r.conversions}</td>
                <td style={S.td}>{r.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
