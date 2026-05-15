/**
 * ConcernsCard.jsx — Accountability Layer surface for Control Center.
 *
 * Owner raises a concern with title + responsible party + cadence + type.
 * Responsible party submits a response (answers to questions / metric values).
 * System cross-checks claims against ground-truth Firestore data.
 * UI renders verification chips + BS score so the owner can see at a glance
 * whether the responsible party is being straight.
 *
 * v1: manual concern creation, manual response, one verification source per
 * type. Cron-driven email outreach + AI question generation come later.
 */

import React, { useEffect, useState, useCallback } from "react";
import useConcerns from "../hooks/useConcerns";

const STATUS_STYLE = {
  open:               { bg: "#dbeafe", fg: "#1e40af", label: "Open" },
  awaiting_response:  { bg: "#fef3c7", fg: "#92400e", label: "Awaiting response" },
  verified:           { bg: "#dcfce7", fg: "#15803d", label: "Verified" },
  flagged_bs:         { bg: "#fee2e2", fg: "#b91c1c", label: "Contradicted" },
  resolved:           { bg: "#f1f5f9", fg: "#475569", label: "Resolved" },
  deleted:            { bg: "#f1f5f9", fg: "#94a3b8", label: "Deleted" },
};

export default function ConcernsCard() {
  const { list, create, respond, resolve, remove, listTypes, loading } = useConcerns();
  const [concerns, setConcerns] = useState([]);
  const [types, setTypes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);

  const refresh = useCallback(async () => {
    const [a, b] = await Promise.all([list(), listTypes()]);
    setConcerns(Array.isArray(a?.concerns) ? a.concerns : []);
    setTypes(Array.isArray(b?.types) ? b.types : []);
  }, [list, listTypes]);

  useEffect(() => { refresh(); }, [refresh]);

  const live = concerns.filter(c => c.status !== "deleted");

  return (
    <div className="card" style={{ padding: 16, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: 1.5, textTransform: "uppercase" }}>
            Accountability · Open Concerns
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            You raise it. Responsible party answers. System verifies what it can.
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="iconBtn"
          style={{ background: "#7c3aed", color: "white", border: "none" }}
        >
          + Raise a concern
        </button>
      </div>

      {live.length === 0 && !loading && (
        <div style={{ padding: "16px 12px", fontSize: 13, color: "#64748b", textAlign: "center", background: "#f8fafc", borderRadius: 6 }}>
          No open concerns. When you want to hold someone accountable for a specific outcome, raise a concern and the system will ask them to report — and verify what it can.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {live.map(c => (
          <ConcernRow
            key={c.id}
            concern={c}
            onRespond={() => setRespondingTo(c)}
            onResolve={async () => { await resolve(c.id); refresh(); }}
            onDelete={async () => {
              if (!window.confirm(`Delete concern "${c.title}"? This won't notify anyone.`)) return;
              await remove(c.id); refresh();
            }}
          />
        ))}
      </div>

      {showCreate && (
        <CreateConcernModal
          types={types}
          onClose={() => setShowCreate(false)}
          onCreate={async (payload) => {
            const r = await create(payload);
            if (r?.ok) {
              setShowCreate(false);
              refresh();
            }
            return r;
          }}
        />
      )}

      {respondingTo && (
        <RespondModal
          concern={respondingTo}
          onClose={() => setRespondingTo(null)}
          onSubmit={async (answers) => {
            const r = await respond({ concernId: respondingTo.id, answers });
            if (r?.ok) {
              setRespondingTo(null);
              refresh();
            }
            return r;
          }}
        />
      )}
    </div>
  );
}

function ConcernRow({ concern, onRespond, onResolve, onDelete }) {
  const st = STATUS_STYLE[concern.status] || STATUS_STYLE.open;
  const latest = concern.latestResponse;
  const bsScore = latest?.bsScore ?? null;
  const bsColor = bsScore == null ? "#94a3b8"
    : bsScore >= 0.5 ? "#b91c1c"
    : bsScore >= 0.2 ? "#d97706"
    : "#15803d";

  return (
    <div style={{ padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{concern.title}</div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: st.bg, color: st.fg, letterSpacing: 0.4, textTransform: "uppercase",
            }}>{st.label}</span>
            {bsScore != null && (
              <span title="BS score: 0 = trustworthy, 1 = highly suspect" style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: "#f1f5f9", color: bsColor, letterSpacing: 0.4, textTransform: "uppercase",
              }}>BS · {bsScore.toFixed(2)}</span>
            )}
          </div>
          {concern.description && (
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{concern.description}</div>
          )}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            <strong>Responsible:</strong> {concern.responsibleName || concern.responsibleEmail || "(unassigned)"}
            {" · "}
            <strong>Cadence:</strong> {concern.cadence}
            {" · "}
            <strong>Type:</strong> {concern.concernType.replace(/_/g, " ")}
            {concern.responseCount > 0 && <> {" · "} <strong>{concern.responseCount}</strong> response{concern.responseCount === 1 ? "" : "s"}</>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <button onClick={onRespond} className="iconBtn" style={{ fontSize: 12, padding: "6px 10px" }}>Respond</button>
          {concern.status !== "resolved" && (
            <button onClick={onResolve} className="iconBtn" style={{ fontSize: 11, padding: "4px 8px", color: "#475569" }}>Resolve</button>
          )}
          <button onClick={onDelete} className="iconBtn" style={{ fontSize: 11, padding: "4px 8px", color: "#94a3b8" }}>Delete</button>
        </div>
      </div>

      {latest && (
        <VerificationBlock concern={concern} response={latest} />
      )}
    </div>
  );
}

function VerificationBlock({ concern, response }) {
  const verification = response.verification || {};
  const respondedAt = response.respondedAt ? new Date(response.respondedAt).toLocaleString() : "—";
  const by = response.respondedByName || response.respondedBy || "—";

  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>
        Latest response · {respondedAt} · by {by}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {(concern.metrics || []).map(m => {
          const v = verification[m.id];
          const claimed = v?.claimed ?? response.answers?.[m.id];
          const actual = v?.actual;
          const status = v?.status || "no_data";
          const chip = chipFor(status);

          return (
            <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0" }}>
              <span style={{
                flexShrink: 0,
                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                background: chip.bg, color: chip.fg, letterSpacing: 0.3, textTransform: "uppercase",
                marginTop: 1,
              }}>{chip.label}</span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                <div style={{ color: "#0f172a", fontWeight: 600 }}>{m.label}</div>
                <div style={{ color: "#64748b" }}>
                  Claimed: <strong>{claimed != null ? String(claimed) : "—"}</strong>
                  {status === "ok" || status === "contradicted" || status === "exceeded"
                    ? <> · System: <strong>{actual != null ? String(actual) : "—"}</strong></>
                    : null}
                  {status === "contradicted" && v?.delta != null && (
                    <> · <span style={{ color: "#b91c1c" }}>delta {v.delta > 0 ? "+" : ""}{v.delta}</span></>
                  )}
                  {status === "unverifiable" && (
                    <> · <span style={{ color: "#94a3b8" }}>{v?.source || "self-report only"}</span></>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function chipFor(status) {
  if (status === "ok") return { bg: "#dcfce7", fg: "#15803d", label: "Verified" };
  if (status === "contradicted") return { bg: "#fee2e2", fg: "#b91c1c", label: "Contradicted" };
  if (status === "exceeded") return { bg: "#dbeafe", fg: "#1e40af", label: "Exceeded" };
  if (status === "unverifiable") return { bg: "#f1f5f9", fg: "#64748b", label: "Self-report" };
  return { bg: "#f1f5f9", fg: "#94a3b8", label: "No data" };
}

// ─────────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────────

function CreateConcernModal({ types, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [concernType, setConcernType] = useState("investor_outreach");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [cadence, setCadence] = useState("weekly");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const selectedType = types.find(t => t.key === concernType);

  async function handleSubmit() {
    if (!title.trim()) { setErr("Title is required."); return; }
    setSubmitting(true); setErr(null);
    const r = await onCreate({
      title: title.trim(),
      description: description.trim(),
      concernType,
      responsibleEmail: responsibleEmail.trim() || null,
      responsibleName: responsibleName.trim() || null,
      cadence,
    });
    setSubmitting(false);
    if (!r?.ok) setErr(r?.error || "Could not create concern.");
  }

  return (
    <Modal title="Raise a concern" onClose={onClose}>
      <div style={F.row}>
        <label style={F.label}>What's the concern?</label>
        <input
          style={F.input}
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Is Kent actually doing investor outreach?"
        />
      </div>
      <div style={F.row}>
        <label style={F.label}>Context / why this matters (optional)</label>
        <textarea
          style={{ ...F.input, minHeight: 64 }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Anything you want the responsible party to know about why you're asking."
        />
      </div>
      <div style={F.row}>
        <label style={F.label}>Concern type (determines what gets verified)</label>
        <select style={F.input} value={concernType} onChange={e => setConcernType(e.target.value)}>
          {types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        {selectedType && (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
            System will verify: {selectedType.metrics.filter(m => m.verifiable).map(m => m.label).join(", ") || "(none — all self-report)"}.
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={F.row}>
          <label style={F.label}>Responsible party name</label>
          <input style={F.input} value={responsibleName} onChange={e => setResponsibleName(e.target.value)} placeholder="Kent Redwine" />
        </div>
        <div style={F.row}>
          <label style={F.label}>Their email</label>
          <input style={F.input} value={responsibleEmail} onChange={e => setResponsibleEmail(e.target.value)} placeholder="kent@..." />
        </div>
      </div>
      <div style={F.row}>
        <label style={F.label}>Cadence</label>
        <select style={F.input} value={cadence} onChange={e => setCadence(e.target.value)}>
          <option value="once">One-off — just this once</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {err && <div style={F.err}>{err}</div>}

      <div style={F.actions}>
        <button onClick={onClose} className="iconBtn">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="iconBtn"
          style={{ background: "#7c3aed", color: "white", border: "none", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Saving…" : "Raise concern"}
        </button>
      </div>
    </Modal>
  );
}

function RespondModal({ concern, onClose, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit() {
    setSubmitting(true); setErr(null);
    // Cast number-typed inputs.
    const cast = {};
    for (const m of concern.metrics || []) {
      const v = answers[m.id];
      if (v == null || v === "") continue;
      cast[m.id] = m.type === "number" ? Number(v) : String(v);
    }
    const r = await onSubmit(cast);
    setSubmitting(false);
    if (!r?.ok) setErr(r?.error || "Could not save response.");
  }

  return (
    <Modal title={`Respond — ${concern.title}`} onClose={onClose}>
      {concern.description && (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, padding: "8px 10px", background: "#f8fafc", borderRadius: 6 }}>
          {concern.description}
        </div>
      )}
      {(concern.metrics || []).map(m => (
        <div key={m.id} style={F.row}>
          <label style={F.label}>
            {m.label}
            {!m.verifiable && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.4, textTransform: "uppercase" }}>
                · self-report
              </span>
            )}
            {m.verifiable && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: "#7c3aed", letterSpacing: 0.4, textTransform: "uppercase" }}>
                · will be verified
              </span>
            )}
          </label>
          {m.type === "text" ? (
            <textarea
              style={{ ...F.input, minHeight: 56 }}
              value={answers[m.id] || ""}
              onChange={e => setAnswers(a => ({ ...a, [m.id]: e.target.value }))}
            />
          ) : (
            <input
              type="number"
              style={F.input}
              value={answers[m.id] ?? ""}
              onChange={e => setAnswers(a => ({ ...a, [m.id]: e.target.value }))}
            />
          )}
        </div>
      ))}

      {err && <div style={F.err}>{err}</div>}

      <div style={F.actions}>
        <button onClick={onClose} className="iconBtn">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="iconBtn"
          style={{ background: "#7c3aed", color: "white", border: "none", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Submitting…" : "Submit response"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "white", borderRadius: 14, maxWidth: 560, width: "100%",
        padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

const F = {
  row: { marginBottom: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "8px 10px", fontSize: 14,
    border: "1px solid #cbd5e1", borderRadius: 6, outline: "none",
    fontFamily: "inherit",
  },
  err: { fontSize: 12, color: "#b91c1c", padding: "6px 8px", background: "#fef2f2", borderRadius: 4, marginBottom: 8 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 },
};
