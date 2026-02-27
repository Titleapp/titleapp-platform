import React, { useEffect, useState, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const STATUS_OPTIONS = ["available", "coming-soon", "beta", "draft"];
const STATUS_COLORS = {
  available: "#22c55e",
  "coming-soon": "#f59e0b",
  beta: "#3b82f6",
  draft: "#6b7280",
};

function StatusBadge({ status }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: `${STATUS_COLORS[status] || "#6b7280"}18`,
        color: STATUS_COLORS[status] || "#6b7280",
      }}
    >
      {status}
    </span>
  );
}

function generateWorkerId(name, state) {
  const base = (name || "worker")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (state) return `${base}-${state.toLowerCase()}`;
  return base;
}

export default function Inventory() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSuite, setFilterSuite] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // worker id being edited
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", suite: "", category: "", price: 9, description: "", state: "", status: "coming-soon" });

  // Real-time listener on digitalWorkers collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "digitalWorkers"), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ ...d.data(), _docId: d.id }));
      setWorkers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    return {
      total: workers.length,
      available: workers.filter((w) => w.status === "available").length,
      comingSoon: workers.filter((w) => w.status === "coming-soon").length,
      beta: workers.filter((w) => w.status === "beta").length,
      totalSubscribers: workers.reduce((s, w) => s + (w.subscriberCount || 0), 0),
      totalMRR: workers.reduce((s, w) => s + (w.subscriberCount || 0) * (w.price || 0), 0),
    };
  }, [workers]);

  // Unique suites and states for filter dropdowns
  const suites = useMemo(() => {
    const set = new Set(workers.map((w) => w.suite).filter(Boolean));
    return [...set].sort();
  }, [workers]);

  const states = useMemo(() => {
    const set = new Set(workers.map((w) => w.state).filter(Boolean));
    return [...set].sort();
  }, [workers]);

  // Filtered list
  const filtered = useMemo(() => {
    return workers.filter((w) => {
      if (filterSuite !== "all" && w.suite !== filterSuite) return false;
      if (filterState !== "all" && w.state !== filterState) return false;
      if (filterStatus !== "all" && w.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${w.name} ${w.suite} ${w.category} ${w.id} ${w.state || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [workers, filterSuite, filterState, filterStatus, search]);

  // Edit handlers
  function startEdit(w) {
    setEditing(w._docId);
    setEditForm({
      name: w.name || "",
      description: w.description || "",
      price: w.price || 9,
      status: w.status || "coming-soon",
      featured: w.featured || false,
      suite: w.suite || "",
      category: w.category || "",
      state: w.state || "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    await updateDoc(doc(db, "digitalWorkers", editing), {
      name: editForm.name,
      description: editForm.description,
      price: Number(editForm.price) || 9,
      priceDisplay: `$${Number(editForm.price) || 9}/mo`,
      status: editForm.status,
      featured: editForm.featured,
      suite: editForm.suite,
      category: editForm.category,
      state: editForm.state || null,
      updatedAt: serverTimestamp(),
    });
    setEditing(null);
  }

  async function toggleFeatured(w) {
    await updateDoc(doc(db, "digitalWorkers", w._docId), {
      featured: !w.featured,
      updatedAt: serverTimestamp(),
    });
  }

  async function changeStatus(w, newStatus) {
    const updates = { status: newStatus, updatedAt: serverTimestamp() };
    if (newStatus === "available" && !w.publishedAt) {
      updates.publishedAt = serverTimestamp();
    }
    await updateDoc(doc(db, "digitalWorkers", w._docId), updates);
  }

  // Add worker
  async function handleAdd() {
    const id = generateWorkerId(addForm.name, addForm.state);
    await setDoc(doc(db, "digitalWorkers", id), {
      id,
      name: addForm.name,
      shortName: addForm.name.substring(0, 30),
      suite: addForm.suite,
      industry: (addForm.suite || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      category: addForm.category || addForm.suite,
      state: addForm.state || null,
      tags: [],
      description: addForm.description,
      shortDescription: (addForm.description || "").substring(0, 100),
      price: Number(addForm.price) || 9,
      priceDisplay: `$${Number(addForm.price) || 9}/mo`,
      trialDays: 7,
      status: addForm.status || "coming-soon",
      featured: false,
      published: true,
      subscriberCount: 0,
      totalRevenue: 0,
      rating: null,
      reviewCount: 0,
      creatorId: "titleapp-internal",
      creatorName: "TitleApp",
      cloneOf: null,
      raasConfigId: null,
      marketing: { landingPageCopy: null, linkedInPost: null, tiktokScript: null, googleAdsKeywords: null, emailSequence: null, generatedAt: null },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setShowAdd(false);
    setAddForm({ name: "", suite: "", category: "", price: 9, description: "", state: "", status: "coming-soon" });
  }

  // Export to JSON
  function exportJSON() {
    const data = workers.map(({ _docId, ...w }) => w);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "digitalWorkerCatalog.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div>
        <div className="ac-page-header">
          <h1 className="ac-page-title">Digital Worker Inventory</h1>
        </div>
        <p style={{ color: "#94a3b8", padding: 20 }}>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Digital Worker Inventory</h1>
        <p className="ac-page-subtitle">
          {stats.total} workers &middot; {stats.available} available &middot;{" "}
          {stats.comingSoon} coming soon &middot; {stats.beta} beta
        </p>
      </div>

      {/* Summary cards */}
      <div className="ac-metrics" style={{ marginBottom: 16 }}>
        <div className="ac-card" style={{ padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Workers</div>
        </div>
        <div className="ac-card" style={{ padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{stats.available}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Available</div>
        </div>
        <div className="ac-card" style={{ padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{stats.comingSoon}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Coming Soon</div>
        </div>
        <div className="ac-card" style={{ padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.totalSubscribers}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Subscribers</div>
        </div>
        <div className="ac-card" style={{ padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>
            ${stats.totalMRR.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>MRR</div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <button
          className="ac-btn"
          onClick={() => setShowAdd(true)}
          style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
        >
          Add Worker
        </button>
        <button
          className="ac-btn"
          onClick={exportJSON}
          style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
        >
          Export to JSON
        </button>

        <div style={{ flex: 1 }} />

        <select
          value={filterSuite}
          onChange={(e) => setFilterSuite(e.target.value)}
          style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", padding: "6px 10px", borderRadius: 6, fontSize: 13 }}
        >
          <option value="all">All Suites</option>
          {suites.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", padding: "6px 10px", borderRadius: 6, fontSize: 13 }}
        >
          <option value="all">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", padding: "6px 10px", borderRadius: 6, fontSize: 13 }}
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", padding: "6px 10px", borderRadius: 6, fontSize: 13, width: 180 }}
        />
      </div>

      {/* Add Worker Modal */}
      {showAdd && (
        <div className="ac-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Add Digital Worker</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <input placeholder="Name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} style={inputStyle} />
            <input placeholder="Suite" value={addForm.suite} onChange={(e) => setAddForm({ ...addForm, suite: e.target.value })} style={inputStyle} />
            <input placeholder="Category" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} style={inputStyle} />
            <input placeholder="Price" type="number" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} style={inputStyle} />
            <input placeholder="State (e.g. CA)" value={addForm.state} onChange={(e) => setAddForm({ ...addForm, state: e.target.value })} style={inputStyle} />
            <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })} style={inputStyle}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <textarea placeholder="Description" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} rows={2} style={{ ...inputStyle, width: "100%", marginBottom: 12, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} disabled={!addForm.name} style={{ ...btnStyle, background: "#22c55e", color: "#fff", opacity: addForm.name ? 1 : 0.5 }}>Save</button>
            <button onClick={() => setShowAdd(false)} style={{ ...btnStyle, background: "#334155", color: "#e2e8f0" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="ac-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Edit Worker: {editForm.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
            <input placeholder="Suite" value={editForm.suite} onChange={(e) => setEditForm({ ...editForm, suite: e.target.value })} style={inputStyle} />
            <input placeholder="Category" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} style={inputStyle} />
            <input placeholder="Price" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={inputStyle} />
            <input placeholder="State" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} style={inputStyle} />
            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} style={inputStyle}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <textarea placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} style={{ ...inputStyle, width: "100%", marginBottom: 12, resize: "vertical" }} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#e2e8f0", marginBottom: 12 }}>
            <input type="checkbox" checked={editForm.featured} onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })} />
            Featured
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveEdit} style={{ ...btnStyle, background: "#22c55e", color: "#fff" }}>Save</button>
            <button onClick={() => setEditing(null)} style={{ ...btnStyle, background: "#334155", color: "#e2e8f0" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Workers table */}
      <div className="ac-card">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", textAlign: "left" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Suite</th>
                <th style={thStyle}>State</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Subs</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                    No workers match filters.
                  </td>
                </tr>
              )}
              {filtered.map((w) => (
                <tr key={w._docId} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{w.id}</div>
                  </td>
                  <td style={tdStyle}>{w.suite}</td>
                  <td style={tdStyle}>{w.state || "—"}</td>
                  <td style={tdStyle}>${w.price}/mo</td>
                  <td style={tdStyle}><StatusBadge status={w.status} /></td>
                  <td style={tdStyle}>{w.subscriberCount || 0}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button onClick={() => startEdit(w)} style={actionBtn}>Edit</button>
                      <button
                        onClick={() => toggleFeatured(w)}
                        style={{ ...actionBtn, color: w.featured ? "#f59e0b" : "#64748b" }}
                      >
                        {w.featured ? "Unfeature" : "Feature"}
                      </button>
                      <select
                        value={w.status}
                        onChange={(e) => changeStatus(w, e.target.value)}
                        style={{ ...actionBtn, background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", fontSize: 11, padding: "2px 4px" }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b" }}>
          Showing {filtered.length} of {workers.length} workers
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "#0f172a",
  color: "#e2e8f0",
  border: "1px solid #334155",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 13,
};

const btnStyle = {
  border: "none",
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};

const thStyle = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle = {
  padding: "10px 12px",
  color: "#e2e8f0",
};

const actionBtn = {
  background: "none",
  border: "none",
  color: "#7c3aed",
  fontSize: 12,
  cursor: "pointer",
  padding: "2px 6px",
};
