/**
 * StaffRosterCard.jsx — SPINE-4 Staff Credential & Training Worker canvas.
 * Signal: card:staff-roster   Data: live (buildStaffCredentialPayload → /staff-credentials:list)
 *
 * Sean's redesign (2026-06-26): the first page must show the PEOPLE — an avatar
 * per staff member with a Green / Yellow / Red status, derived from their worst
 * credential. Status: red = something overdue, yellow = expiring ≤30d,
 * green = all current. payload.view = roster | credentials | training |
 * reminders | calendar.
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const STATUS = {
  red:    { dot: "#dc2626", soft: "#fef2f2", label: "Action needed" },
  yellow: { dot: "#d97706", soft: "#fffbeb", label: "Renewal due" },
  green:  { dot: "#16a34a", soft: "#f0fdf4", label: "All current" },
};
const ACRONYMS = new Set(["DVM", "CVT", "DEA", "OSHA", "HR", "RVT", "VA", "CE"]);

function initials(fullName = "") {
  const base = String(fullName).split(",")[0].trim(); // drop ", DVM" suffix
  const parts = base.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
function prettyRole(role = "") {
  return String(role).split(/[_\s]+/).filter(Boolean)
    .map(w => ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
function daysBadge(d) {
  if (typeof d !== "number") return null;
  if (d < 0) return { text: `${Math.abs(d)}d overdue`, color: "#dc2626" };
  if (d <= 30) return { text: `${d}d left`, color: "#d97706" };
  return { text: `${d}d left`, color: "#64748b" };
}

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

function StatusDot({ status }) {
  const s = STATUS[status] || STATUS.green;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
      color: s.dot, background: s.soft, border: `1px solid ${s.dot}22`, padding: "3px 10px", borderRadius: 20 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

function StaffRow({ person }) {
  const s = STATUS[person.status] || STATUS.green;
  const badge = person.top ? daysBadge(person.top.days_remaining) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
        background: s.soft, border: `2px solid ${s.dot}`, color: s.dot,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>
        {initials(person.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{person.name}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {prettyRole(person.role)} · {person.credentialCount} credential{person.credentialCount === 1 ? "" : "s"}
          {person.top && <> · {person.top.credential_name}</>}
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        <StatusDot status={person.status} />
        {badge && <span style={{ fontSize: 11, fontWeight: 600, color: badge.color }}>{badge.text}</span>}
      </div>
    </div>
  );
}

function CredStatusPill({ status, days }) {
  const map = { overdue: "#dc2626", expiring_soon: "#d97706", current: "#16a34a", in_progress: "#7c3aed" };
  const txt = { overdue: "Overdue", expiring_soon: "Expiring", current: "Current", in_progress: "In progress" };
  const c = map[status] || "#64748b";
  return <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{txt[status] || status}{typeof days === "number" && status !== "in_progress" ? ` · ${days}d` : ""}</span>;
}

export default function StaffRosterCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const view = p.view || "roster";

  return (
    <CanvasCardShell title={p.title || "Staff Credentials"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      {p.subtitle && view === "roster" && (
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{p.subtitle}</div>
      )}

      {view === "roster" && (
        <>
          <Kpis kpis={p.kpis} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Team</div>
          {(p.roster || []).map((person, i) => <StaffRow key={person.staff_id || i} person={person} />)}
          {!(p.roster || []).length && <div style={{ fontSize: 13, color: "#94a3b8", padding: "12px 0" }}>No staff on file yet.</div>}
        </>
      )}

      {view === "credentials" && (p.staff || []).map((s, i) => (
        <div key={s.staff_id || i} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{s.full_name}</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{prettyRole(s.role)}</span>
          </div>
          {(s.credentials || []).map((c, j) => (
            <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{c.credential_name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.issuing_body}{c.expiry_date ? ` · exp ${c.expiry_date}` : ""}</div>
              </div>
              <CredStatusPill status={c.status} days={c.days_remaining} />
            </div>
          ))}
        </div>
      ))}

      {view === "training" && (
        <>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{(p.training || []).length} completions</div>
          {(p.training || []).slice(0, 20).map((t, i) => (
            <div key={t.id || i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{t.training_name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.staff_id}{t.ce_hours ? ` · ${t.ce_hours} CE hours` : ""}</div>
              </div>
              <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{t.completion_date}</span>
            </div>
          ))}
        </>
      )}

      {view === "reminders" && (
        <>
          {p.subtitle && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{p.subtitle}</div>}
          {(p.reminders || []).slice(0, 20).map((r, i) => (
            <div key={r.id || i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{r.credential_type}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.staff_id} · {r.channel}</div>
              </div>
              <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{r.sent_at}</span>
            </div>
          ))}
        </>
      )}

      {view === "calendar" && (
        <>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Next 90 days</div>
          {(p.upcoming || []).map((u, i) => {
            const badge = daysBadge(u.days_remaining);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{u.name} — {u.credential_name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>exp {u.expiry_date}</div>
                </div>
                {badge && <span style={{ fontSize: 12, fontWeight: 600, color: badge.color, whiteSpace: "nowrap" }}>{badge.text}</span>}
              </div>
            );
          })}
          {!(p.upcoming || []).length && <div style={{ fontSize: 13, color: "#94a3b8" }}>Nothing due in the next 90 days.</div>}
        </>
      )}
    </CanvasCardShell>
  );
}
