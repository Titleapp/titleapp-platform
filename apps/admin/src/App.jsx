import React, { useEffect, useMemo, useState } from "react";
import Login from "./auth/login";

// NOTE:
// This is a minimal auth gate to unblock MVP wiring.
// If ID_TOKEN is missing, we render the Login screen.
// Once present, we render the existing Admin UI shell.
//
// If you already have an Admin UI component you want to render,
// replace <AdminShell /> with your existing component in Step 3.

function AdminShell() {
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>Title App Admin</h2>
      <p>
        ✅ Logged in (ID_TOKEN present). Next step will wire API client + /workflows
        call.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
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
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ID_TOKEN") : null
  );

  // Keep state in sync if token is set by login without a full reload
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
