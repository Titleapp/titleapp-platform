import React, { useEffect, useState } from "react";
import Login from "./auth/login";
import { getWorkflows } from "./api/client";

function AdminShell() {
  const [vertical, setVertical] = useState("auto");
  const [jurisdiction, setJurisdiction] = useState("il");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function loadWorkflows() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await getWorkflows({ vertical, jurisdiction });
      setResult(data);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900 }}>
      <h2>Title App Admin</h2>
      <p>✅ Logged in (ID_TOKEN present).</p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            localStorage.removeItem("ID_TOKEN");
            window.location.reload();
          }}
        >
          Sign out (clear token)
        </button>

        <button
          onClick={() => {
            const token = localStorage.getItem("ID_TOKEN");
            alert(token ? token.slice(0, 60) + "..." : "No token found");
          }}
        >
          Show token prefix
        </button>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <h3>Workflows</h3>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Vertical:&nbsp;
          <select value={vertical} onChange={(e) => setVertical(e.target.value)}>
            <option value="auto">auto (David)</option>
            <option value="real_estate">real_estate (Christina)</option>
          </select>
        </label>

        <label>
          Jurisdiction:&nbsp;
          <input
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="e.g. il"
            style={{ width: 100 }}
          />
        </label>

        <button onClick={loadWorkflows} disabled={loading}>
          {loading ? "Loading..." : "Load workflows"}
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: 12, color: "crimson" }}>❌ {error}</div>
      ) : null}

      {result ? (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f6f8fa",
            borderRadius: 8,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ID_TOKEN") : null
  );

  useEffect(() => {
    const t = localStorage.getItem("ID_TOKEN");
    setToken(t);

    const onStorage = (e) => {
      if (e.key === "ID_TOKEN") setToken(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!token) return <Login />;
  return <AdminShell />;
}
