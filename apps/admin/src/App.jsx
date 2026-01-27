import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db, DEMO_TENANT_ID } from "./firebase";
import "./App.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "appointments", label: "Appointments" },
  { key: "customers", label: "Customers" },
  { key: "staff", label: "Staff" },
  { key: "rules", label: "Rules & Resources" },
  { key: "ai", label: "AI, GPTs & Chats" },
  { key: "services", label: "Services & Inventory" },
  { key: "reports", label: "Reports" },
  { key: "data", label: "Data & APIs" },
  { key: "settings", label: "Settings" },
];

function formatCreatedAt(createdAt) {
  try {
    if (!createdAt) return "";
    // Firestore Timestamp
    if (typeof createdAt?.toDate === "function") {
      return createdAt.toDate().toLocaleString();
    }
    // serialized-ish
    if (createdAt?.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleString();
    }
    return String(createdAt);
  } catch {
    return "";
  }
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "created") return "badge badge-created";
  if (s === "processing") return "badge badge-processing";
  if (s === "completed") return "badge badge-completed";
  if (s === "failed") return "badge badge-failed";
  return "badge";
}

function clampText(text, max = 120) {
  const t = String(text || "");
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

export default function App() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "autoJobs"),
      where("tenantId", "==", DEMO_TENANT_ID),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setJobs(rows);
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) || null,
    [jobs, selectedId]
  );

  const kpis = useMemo(() => {
    const total = jobs.length;
    const created = jobs.filter((j) => String(j.status).toLowerCase() === "created").length;
    const processing = jobs.filter((j) => String(j.status).toLowerCase() === "processing").length;
    const completed = jobs.filter((j) => String(j.status).toLowerCase() === "completed").length;
    return { total, created, processing, completed };
  }, [jobs]);

  return (
    <div className="appShell">
      {/* mobile topbar */}
      <div className="topbar">
        <button className="iconBtn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <div className="topbarTitle">Admin Panel</div>
        <span className="pill">Tenant: {DEMO_TENANT_ID}</span>
      </div>

      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebarOpen" : ""}`}>
        <div className="sidebarHeader">
          <div className="brand">
            <div className="brandMark">TA</div>
            <div>
              <div className="brandName">Admin Panel</div>
              <div className="brandSub">Title App Alpha</div>
            </div>
          </div>

          <button className="iconBtn sidebarClose" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        <div className="sidebarSection">
          <div className="sidebarLabel">Navigation</div>
          <nav className="nav">
            {NAV_ITEMS.map((it) => (
              <a
                key={it.key}
                className={`navItem ${activeNav === it.key ? "navItemActive" : ""}`}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNav(it.key);
                  setSidebarOpen(false);
                }}
              >
                {it.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="sidebarFooter">
          <div className="miniStats">
            <div className="miniStat">
              <div className="miniNum">{kpis.total}</div>
              <div className="miniTxt">Total</div>
            </div>
            <div className="miniStat">
              <div className="miniNum">{kpis.created}</div>
              <div className="miniTxt">Created</div>
            </div>
            <div className="miniStat">
              <div className="miniNum">{kpis.completed}</div>
              <div className="miniTxt">Completed</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="pageHeader">
          <div>
            <h1 className="h1">Admin Dashboard</h1>
            <div className="subtle">Tenant: {DEMO_TENANT_ID}</div>
          </div>
          <div className="pill">Live Firestore • autoJobs</div>
        </div>

        <div className="kpiRow">
          <div className="card kpiCard">
            <div className="kpiLabel">Total Jobs</div>
            <div className="kpiValue">{kpis.total}</div>
          </div>
          <div className="card kpiCard">
            <div className="kpiLabel">Created</div>
            <div className="kpiValue">{kpis.created}</div>
          </div>
          <div className="card kpiCard">
            <div className="kpiLabel">Processing</div>
            <div className="kpiValue">{kpis.processing}</div>
          </div>
          <div className="card kpiCard">
            <div className="kpiLabel">Completed</div>
            <div className="kpiValue">{kpis.completed}</div>
          </div>
        </div>

        <div className="contentGrid">
          {/* left: table */}
          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Conversation Inbox</div>
                <div className="cardSub">Click a row to view details.</div>
              </div>
            </div>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Concern</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const inputs = j.inputs || {};
                    return (
                      <tr
                        key={j.id}
                        className={j.id === selectedId ? "rowSelected" : ""}
                        onClick={() => setSelectedId(j.id)}
                      >
                        <td className="tdStrong">{inputs.customer || "-"}</td>
                        <td className="tdMuted">{clampText(inputs.vehicle || "-", 42)}</td>
                        <td className="tdClamp">{clampText(inputs.concern || "-", 95)}</td>
                        <td>
                          <span className={statusBadgeClass(j.status)}>{j.status || "-"}</span>
                        </td>
                        <td className="tdMuted">{formatCreatedAt(j.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {!jobs.length && (
                    <tr>
                      <td colSpan={5} className="empty">
                        No jobs found for tenant "{DEMO_TENANT_ID}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* right: details */}
          <aside className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Job Details</div>
                <div className="cardSub">
                  {selected ? "Selected job + raw payload" : "Select a row to view details."}
                </div>
              </div>
              <button className="iconBtn" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>

            <div className="detail">
              {!selected && <div className="empty">Click a row to view details.</div>}

              {selected && (
                <>
                  <div className="kvRow">
                    <div className="k">Doc ID</div>
                    <div className="v mono">{selected.id}</div>
                  </div>
                  <div className="kvRow">
                    <div className="k">Tenant</div>
                    <div className="v">{selected.tenantId || "-"}</div>
                  </div>
                  <div className="kvRow">
                    <div className="k">Status</div>
                    <div className="v">
                      <span className={statusBadgeClass(selected.status)}>{selected.status}</span>
                    </div>
                  </div>
                  <div className="kvRow">
                    <div className="k">Created</div>
                    <div className="v">{formatCreatedAt(selected.createdAt)}</div>
                  </div>

                  <div className="sectionTitle">Inputs</div>
                  <pre className="code">{JSON.stringify(selected.inputs || {}, null, 2)}</pre>

                  <div className="sectionTitle">Raw</div>
                  <pre className="code">{JSON.stringify(selected, null, 2)}</pre>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
