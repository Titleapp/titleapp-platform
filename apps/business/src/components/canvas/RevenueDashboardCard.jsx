/**
 * RevenueDashboardCard.jsx — Revenue dashboard canvas card (44.9)
 * Signal: card:control-center-revenue
 * Data source: firestore subscriber data
 */

import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  kpi: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  kpiCard: {
    background: "#f8fafc", borderRadius: 10, padding: "14px 12px",
    border: "1px solid #f1f5f9",
  },
  kpiLabel: { fontSize: 11, color: "#64748b", marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: 700, color: "#1e293b" },
  kpiDelta: { fontSize: 11, fontWeight: 600, marginTop: 2 },
  up: { color: "#16a34a" },
  down: { color: "#dc2626" },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  row: { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid #f8fafc" },
};

export default function RevenueDashboardCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        if (!uid) { setLoading(false); return; }
        const db = getFirestore();
        const snap = await getDoc(doc(db, "briefings", uid));
        if (!cancelled && snap.exists()) {
          setData(snap.data());
        }
      } catch (err) {
        console.warn("RevenueDashboard load failed:", err.message);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <CanvasCardShell title="Revenue Dashboard" onDismiss={onDismiss} loading={loading}>
      {data && (
        <>
          <div style={S.kpi}>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>MRR</div>
              <div style={S.kpiValue}>${(data.mrr || 0).toLocaleString()}</div>
              {data.mrrDelta != null && <div style={{ ...S.kpiDelta, ...(data.mrrDelta >= 0 ? S.up : S.down) }}>{data.mrrDelta >= 0 ? "+" : ""}{data.mrrDelta}%</div>}
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>Subscribers</div>
              <div style={S.kpiValue}>{(data.subscribers || 0).toLocaleString()}</div>
              {data.subDelta != null && <div style={{ ...S.kpiDelta, ...(data.subDelta >= 0 ? S.up : S.down) }}>{data.subDelta >= 0 ? "+" : ""}{data.subDelta}%</div>}
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>Churn</div>
              <div style={S.kpiValue}>{data.churnRate || 0}%</div>
            </div>
            <div style={S.kpiCard}>
              <div style={S.kpiLabel}>ARPU</div>
              <div style={S.kpiValue}>${(data.arpu || 0).toLocaleString()}</div>
            </div>
          </div>
          {data.topWorkers && data.topWorkers.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Top Workers</div>
              {data.topWorkers.map((w, i) => (
                <div key={i} style={S.row}>
                  <span style={{ color: "#1e293b" }}>{w.name}</span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{w.subscribers} subs</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </CanvasCardShell>
  );
}
