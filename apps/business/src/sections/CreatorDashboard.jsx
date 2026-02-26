import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function CreatorDashboard() {
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth?.currentUser;

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStages, setEditStages] = useState([]);
  const [editKnowledge, setEditKnowledge] = useState([]);
  const [editPricingModel, setEditPricingModel] = useState("subscription");
  const [editPrice, setEditPrice] = useState(0);
  const [editTrialDays, setEditTrialDays] = useState(7);
  const [editCategory, setEditCategory] = useState("consulting");

  useEffect(() => {
    if (currentUser) loadMyWorkers();
  }, [currentUser]);

  async function loadMyWorkers() {
    setLoading(true);
    try {
      const q = query(
        collection(db, "workers"),
        where("creator_id", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const results = [];
      snapshot.forEach((d) => results.push({ id: d.id, ...d.data() }));
      setWorkers(results);
      if (results.length > 0 && !selectedWorker) selectWorker(results[0]);
    } catch (err) {
      console.error("Failed to load workers:", err);
    } finally {
      setLoading(false);
    }
  }

  function selectWorker(w) {
    setSelectedWorker(w);
    setEditName(w.name || "");
    setEditDesc(w.description || "");
    setEditStages(w.raas?.workflow_stages || w.stages || []);
    setEditKnowledge(w.raas?.knowledge_base || []);
    setEditPricingModel(w.pricing?.model || "subscription");
    setEditPrice(w.pricing?.price || 0);
    setEditTrialDays(w.pricing?.trial_days || 7);
    setEditCategory(w.category || "consulting");
  }

  async function saveChanges() {
    if (!selectedWorker) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "workers", selectedWorker.id), {
        name: editName,
        description: editDesc,
        category: editCategory,
        pricing: { model: editPricingModel, price: Number(editPrice), trial_days: editTrialDays },
        "raas.workflow_stages": editStages,
        "raas.knowledge_base": editKnowledge,
      });
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === selectedWorker.id
            ? {
                ...w,
                name: editName,
                description: editDesc,
                category: editCategory,
                pricing: { model: editPricingModel, price: Number(editPrice), trial_days: editTrialDays },
                raas: { ...w.raas, workflow_stages: editStages, knowledge_base: editKnowledge },
              }
            : w
        )
      );
      setSelectedWorker((prev) => ({ ...prev, name: editName, description: editDesc }));
    } catch (err) {
      console.error("Failed to save worker:", err);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!selectedWorker) return;
    const newPublished = !selectedWorker.published;
    setSaving(true);
    try {
      await updateDoc(doc(db, "workers", selectedWorker.id), {
        published: newPublished,
        status: newPublished ? "published" : "draft",
      });
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === selectedWorker.id
            ? { ...w, published: newPublished, status: newPublished ? "published" : "draft" }
            : w
        )
      );
      setSelectedWorker((prev) => ({
        ...prev,
        published: newPublished,
        status: newPublished ? "published" : "draft",
      }));
    } catch (err) {
      console.error("Failed to toggle publish:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="pageHeader">
          <div>
            <h1 className="h1">Creator Dashboard</h1>
            <p className="subtle">Loading your Digital Workers...</p>
          </div>
        </div>
        <div style={{ padding: "60px", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
          <svg width="32" height="32" viewBox="0 0 200 200" fill="none" style={{ animation: "spinKey 1.5s ease-in-out infinite" }}>
            <circle cx="100" cy="100" r="95" fill="#7c3aed"/>
            <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2"/>
            <circle cx="100" cy="80" r="18" fill="white"/>
            <circle cx="100" cy="80" r="8" fill="#7c3aed"/>
            <rect x="94" y="90" width="12" height="35" fill="white"/>
          </svg>
        </div>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div>
        <div className="pageHeader">
          <div>
            <h1 className="h1">Creator Dashboard</h1>
            <p className="subtle">Manage your Digital Workers</p>
          </div>
        </div>
        <div style={{ padding: "60px 24px", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
            No Digital Workers yet
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px", maxWidth: "380px", margin: "0 auto 20px" }}>
            Start a conversation about your expertise on the landing page. The AI will interview you and build a publishable Digital Worker.
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "raas-store" } }))}
            style={{ padding: "10px 24px", fontSize: "14px", fontWeight: 600, borderRadius: "8px", border: "2px solid #7c3aed", background: "transparent", color: "#7c3aed", cursor: "pointer" }}
          >
            Browse the Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Creator Dashboard</h1>
          <p className="subtle">Manage your Digital Workers. Edit content, adjust pricing, and track performance.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", alignItems: "start" }}>
        {/* Worker list */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9", padding: "10px" }}>
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={() => selectWorker(w)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "none",
                background: selectedWorker?.id === w.id ? "#f3e8ff" : "transparent",
                cursor: "pointer",
                marginBottom: "4px",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{w.name || "Untitled"}</div>
              <span style={{
                display: "inline-block",
                marginTop: "4px",
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "10px",
                background: w.published ? "#dcfce7" : "#f1f5f9",
                color: w.published ? "#16a34a" : "#64748b",
              }}>
                {w.published ? "Live" : "Draft"}
              </span>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selectedWorker && (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9", padding: "28px" }}>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "28px" }}>
              <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#1e293b" }}>{selectedWorker.subscriber_count || 0}</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" }}>Subscribers</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#1e293b" }}>
                  ${((selectedWorker.subscriber_count || 0) * (selectedWorker.pricing?.price || 0)).toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" }}>Monthly Revenue</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#1e293b" }}>
                  {selectedWorker.rating != null ? selectedWorker.rating.toFixed(1) : "--"}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" }}>Rating</div>
              </div>
            </div>

            {/* Editable fields */}
            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "20px", marginBottom: "20px" }}>
              <label style={fieldLabelStyle}>Name</label>
              <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />

              <label style={fieldLabelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />

              <label style={fieldLabelStyle}>Category</label>
              <select style={inputStyle} value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                <option value="consulting">Consulting</option>
                <option value="healthcare">Healthcare</option>
                <option value="real_estate">Real Estate</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="legal">Legal</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "20px", marginBottom: "20px" }}>
              <label style={fieldLabelStyle}>Pricing Model</label>
              <select style={inputStyle} value={editPricingModel} onChange={(e) => setEditPricingModel(e.target.value)}>
                <option value="subscription">Monthly Subscription</option>
                <option value="per-project">Per Project</option>
                <option value="free">Free</option>
              </select>
              {editPricingModel !== "free" && (
                <>
                  <label style={fieldLabelStyle}>Price ($)</label>
                  <input style={inputStyle} type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} min="0" />
                  <label style={fieldLabelStyle}>Trial Days</label>
                  <input style={inputStyle} type="number" value={editTrialDays} onChange={(e) => setEditTrialDays(Number(e.target.value))} min="0" />
                </>
              )}
            </div>

            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "20px", marginBottom: "20px" }}>
              <label style={fieldLabelStyle}>Workflow Stages</label>
              {editStages.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={typeof s === "string" ? s : (s.name || "")}
                    onChange={(e) => {
                      const updated = [...editStages];
                      updated[i] = e.target.value;
                      setEditStages(updated);
                    }}
                  />
                  <button
                    onClick={() => setEditStages(editStages.filter((_, j) => j !== i))}
                    style={{ padding: "6px 12px", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditStages([...editStages, ""])}
                style={{ padding: "6px 12px", borderRadius: "8px", background: "#f3e8ff", color: "#7c3aed", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Add Stage
              </button>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={fieldLabelStyle}>Knowledge Base</label>
              {editKnowledge.map((k, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={k}
                    onChange={(e) => {
                      const updated = [...editKnowledge];
                      updated[i] = e.target.value;
                      setEditKnowledge(updated);
                    }}
                  />
                  <button
                    onClick={() => setEditKnowledge(editKnowledge.filter((_, j) => j !== i))}
                    style={{ padding: "6px 12px", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditKnowledge([...editKnowledge, ""])}
                style={{ padding: "6px 12px", borderRadius: "8px", background: "#f3e8ff", color: "#7c3aed", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Add Insight
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={saveChanges}
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#7c3aed",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={togglePublish}
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: selectedWorker.published ? "#dc2626" : "#16a34a",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {selectedWorker.published ? "Unpublish" : "Publish to Store"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldLabelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginTop: "16px",
  marginBottom: "6px",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
  color: "#1e293b",
  background: "#f8fafc",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
