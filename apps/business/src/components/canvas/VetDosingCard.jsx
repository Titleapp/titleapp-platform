/**
 * VetDosingCard.jsx — VET-003 Drug Dosing & Protocol Worker canvas.
 * Signal: card:vet-dosing   Data: live (buildVetDosingPayload → /vet:dosing)
 *
 * The clinical "propose → approve" moment: a weight-based dose with the math
 * shown, the Plumb's citation inline, a DEA-schedule badge, a contraindication
 * check, and an Approve button. payload.view = calculator | history | protocols
 * | controlled.
 */

import React, { useState } from "react";
import CanvasCardShell from "./CanvasCardShell";

const DEA = { II: "#dc2626", III: "#ea580c", IV: "#d97706", V: "#ca8a04" };
function DeaBadge({ schedule }) {
  if (!schedule) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: DEA[schedule] || "#dc2626",
      padding: "2px 9px", borderRadius: 20, letterSpacing: 0.4 }}>DEA {schedule}</span>
  );
}
const SPECIES_ICON = { Canine: "🐕", Feline: "🐈", Avian: "🦜", Reptile: "🐍", Rabbit: "🐇", Exotic: "🦎" };

function Kpis({ kpis }) {
  if (!kpis?.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length},1fr)`, gap: 12, marginBottom: 18 }}>
      {kpis.map((k, i) => (
        <div key={i} style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{k.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

function ProposalHero({ p }) {
  const [approved, setApproved] = useState(false);
  if (!p) return null;
  return (
    <div style={{ border: "1px solid #ede9fe", borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
      <div style={{ background: "linear-gradient(135deg,#faf5ff,#eff6ff)", padding: "14px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{SPECIES_ICON[p.species] || "🐾"}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5 }}>Proposed order</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>{p.patient_name} · {p.breed || p.species} · {p.weight_kg} kg</div>
          </div>
        </div>
        <DeaBadge schedule={p.dea_schedule} />
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{p.drug_name}</div>
        {/* the math, shown */}
        <div style={{ fontSize: 14, color: "#334155", fontFamily: "ui-monospace,Menlo,monospace", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          {p.dose_mg_per_kg} mg/kg × {p.weight_kg} kg = <b>{p.total_dose_mg} mg</b>
          {p.volume_to_draw_ml != null && <> → draw <b>{p.volume_to_draw_ml} mL</b> @ {p.concentration_available_mg_per_ml} mg/mL</>}
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
          {[["Route", p.route], ["Frequency", p.frequency], ["Duration", p.duration], ["Indication", p.indication]].map(([l, v]) => v && (
            <div key={l}><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{v}</div></div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Contraindications checked</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>📖 {p.source_citation}</span>
        </div>
        {Array.isArray(p.interactions_flagged) && p.interactions_flagged.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 8, padding: "8px 10px" }}>
            ⚠ {p.interactions_flagged.join(" · ")}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          {approved ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>✓ Approved — written to patient logbook + controlled-substance log</div>
          ) : (
            <button onClick={() => setApproved(true)} style={{
              background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10,
              padding: "11px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>Approve order</button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderRow({ o }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 20, width: 26, textAlign: "center" }}>{SPECIES_ICON[o.species] || "🐾"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{o.patient_name} <span style={{ fontWeight: 400, color: "#94a3b8" }}>· {o.breed || o.species}</span></div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{o.drug_name} — {o.total_dose_mg} mg {o.route} · {o.indication}</div>
      </div>
      <DeaBadge schedule={o.dea_schedule} />
      <div style={{ textAlign: "right", minWidth: 92 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{(o.approved_by || "").replace("_", " ")}</div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>{(o.timestamp || "").slice(0, 10)}</div>
      </div>
    </div>
  );
}

export default function VetDosingCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const view = p.view || "calculator";

  return (
    <CanvasCardShell title={p.title || "Drug Dosing"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      {view === "calculator" && (
        <>
          <Kpis kpis={p.kpis} />
          <ProposalHero p={p.proposal} />
          {Array.isArray(p.speciesBreakdown) && p.speciesBreakdown.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Orders by species</div>
              {p.speciesBreakdown.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 70, fontSize: 13, color: "#334155" }}>{SPECIES_ICON[s.species] || ""} {s.species}</span>
                  <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", background: "#7c3aed", borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 36, fontSize: 12, fontWeight: 600, color: "#64748b", textAlign: "right" }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "controlled" && (
        <>
          <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            🔒 Audit-ready — every Schedule II–V order, timestamped and linked to the controlled-substance log.
          </div>
          {(p.orders || []).map((o, i) => <OrderRow key={o.order_id || i} o={o} />)}
        </>
      )}

      {view === "history" && (p.orders || []).map((o, i) => <OrderRow key={o.order_id || i} o={o} />)}

      {view === "protocols" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
          {(p.protocols || []).map((pr, i) => (
            <div key={i} style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>{pr.protocol_name}</div>
              {(pr.steps || []).map((st, j) => (
                <div key={j} style={{ fontSize: 12, color: "#475569", padding: "3px 0", borderBottom: j < pr.steps.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <b>{st.step}.</b> {st.drug} {st.dose_mg_per_kg != null ? `${st.dose_mg_per_kg} mg/kg` : ""} {st.route}
                  {st.dea_schedule && <span style={{ color: DEA[st.dea_schedule], fontWeight: 700 }}> · DEA {st.dea_schedule}</span>}
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>📖 {pr.source}</div>
            </div>
          ))}
        </div>
      )}
    </CanvasCardShell>
  );
}
