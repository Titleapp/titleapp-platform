import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAuth } from "firebase/auth";
import FormModal from "../components/FormModal";
import { useCalendarStatus, connectCalendar, disconnectCalendar } from "../hooks/useCalendar";
import { useGmailStatus, connectGmail, disconnectGmail, syncGmailContacts } from "../hooks/useGmail";
import { useDriveStatus, connectDrive, disconnectDrive } from "../hooks/useDrive";
import { useShopifyStatus, connectShopify, disconnectShopify } from "../hooks/useShopify";

const _API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
async function _socialFetch(path, method = "GET", body = null) {
  const token = localStorage.getItem("ID_TOKEN");
  const tenantId = localStorage.getItem("TENANT_ID") || "sociii-inc";
  const res = await fetch(`${_API_BASE}/api?path=${encodeURIComponent(path)}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function YouTubeRow() {
  const [status, setStatus] = useState({ loading: true, connected: false, channelTitle: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const refresh = useCallback(async () => {
    try { const r = await _socialFetch("/v1/youtube:status"); setStatus({ loading: false, connected: !!r.connected, channelTitle: r.channelTitle || null }); }
    catch { setStatus({ loading: false, connected: false, channelTitle: null }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function handleConnect() {
    setBusy(true); setErr(null);
    try {
      const r = await _socialFetch("/v1/youtube:authUrl");
      if (!r.authUrl) throw new Error("Could not start YouTube connection");
      const popup = window.open(r.authUrl, "google-youtube-auth", "width=600,height=700");
      if (!popup) throw new Error("Popup blocked — allow popups for this site.");
      const code = await new Promise((resolve, reject) => {
        let done = false;
        const h = (e) => { if (!e.data || e.data.type !== "google-youtube-auth-code" || !e.data.code) return; window.removeEventListener("message", h); done = true; resolve(e.data.code); };
        window.addEventListener("message", h);
        const t = setInterval(() => { try { if (popup.closed) { clearInterval(t); if (!done) { window.removeEventListener("message", h); reject(new Error("Cancelled.")); } } } catch { /* ignore closed-window race */ } }, 500);
      });
      await _socialFetch("/v1/youtube:exchangeCode", "POST", { code });
      await refresh();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function handleDisconnect() {
    if (!window.confirm("Disconnect YouTube?")) return;
    setBusy(true);
    try { await _socialFetch("/v1/youtube:disconnect", "POST"); await refresh(); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>YouTube</div>
        <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
          {status.loading ? "Checking…" : status.connected ? `Connected: ${status.channelTitle || "YouTube channel"}. Workers can publish video content.` : "Connect your YouTube channel so Alex can publish content on your behalf."}
        </div>
        {err && <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>{err}</div>}
      </div>
      {status.connected ? (
        <button className="iconBtn" disabled={busy} onClick={handleDisconnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{busy ? "…" : "Disconnect"}</button>
      ) : (
        <button className="iconBtn" disabled={busy || status.loading} onClick={handleConnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{busy ? "Connecting…" : "Connect"}</button>
      )}
    </div>
  );
}

function TikTokRow() {
  const [status, setStatus] = useState({ loading: true, connected: false, displayName: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const refresh = useCallback(async () => {
    try { const r = await _socialFetch("/v1/tiktok:status"); setStatus({ loading: false, connected: !!r.connected, displayName: r.displayName || null }); }
    catch { setStatus({ loading: false, connected: false, displayName: null }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function handleConnect() {
    setBusy(true); setErr(null);
    try {
      const r = await _socialFetch("/v1/tiktok:authUrl");
      if (!r.authUrl) throw new Error("Could not start TikTok connection");
      const popup = window.open(r.authUrl, "tiktok-auth", "width=600,height=700");
      if (!popup) throw new Error("Popup blocked — allow popups for this site.");
      const code = await new Promise((resolve, reject) => {
        let done = false;
        const h = (e) => { if (!e.data || e.data.type !== "tiktok-auth-code" || !e.data.code) return; window.removeEventListener("message", h); done = true; resolve(e.data.code); };
        window.addEventListener("message", h);
        const t = setInterval(() => { try { if (popup.closed) { clearInterval(t); if (!done) { window.removeEventListener("message", h); reject(new Error("Cancelled.")); } } } catch { /* ignore closed-window race */ } }, 500);
      });
      await _socialFetch("/v1/tiktok:exchangeCode", "POST", { code });
      await refresh();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function handleDisconnect() {
    if (!window.confirm("Disconnect TikTok?")) return;
    setBusy(true);
    try { await _socialFetch("/v1/tiktok:disconnect", "POST"); await refresh(); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>TikTok</div>
        <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
          {status.loading ? "Checking…" : status.connected ? `Connected: @${status.displayName || "TikTok account"}. Workers can upload and publish videos.` : "Connect your TikTok account so Alex can publish short-form content."}
        </div>
        {err && <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>{err}</div>}
      </div>
      {status.connected ? (
        <button className="iconBtn" disabled={busy} onClick={handleDisconnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{busy ? "…" : "Disconnect"}</button>
      ) : (
        <button className="iconBtn" disabled={busy || status.loading} onClick={handleConnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{busy ? "Connecting…" : "Connect"}</button>
      )}
    </div>
  );
}

// Google Calendar connector status + connect/disconnect button.
// Renders a single row inside the Integrations card.
function GoogleCalendarRow() {
  const { status, refresh } = useCalendarStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function handleConnect() {
    setBusy(true); setErr(null);
    try {
      await connectCalendar();
      await refresh();
    } catch (e) {
      setErr(e?.message || "Connection failed");
    }
    setBusy(false);
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Google Calendar? Workers won't be able to read or create events until you reconnect.")) return;
    setBusy(true); setErr(null);
    try {
      await disconnectCalendar();
      await refresh();
    } catch (e) {
      setErr(e?.message || "Disconnect failed");
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>Google Calendar</div>
        <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
          {status.loading
            ? "Checking…"
            : status.connected
              ? `Connected as ${status.email || "Google account"}. Workers can read your schedule and propose events.`
              : "Connect so Alex and every worker can read your schedule and coordinate meetings, webinars, and deadlines."}
        </div>
        {err && <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>{err}</div>}
      </div>
      {status.connected ? (
        <button className="iconBtn" disabled={busy} onClick={handleDisconnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          {busy ? "…" : "Disconnect"}
        </button>
      ) : (
        <button className="iconBtn" disabled={busy || status.loading} onClick={handleConnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          {busy ? "Connecting…" : "Connect"}
        </button>
      )}
    </div>
  );
}

// Gmail connector status + connect/disconnect + sync contacts button.
function GmailRow() {
  const { status, refresh } = useGmailStatus();
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [err, setErr] = useState(null);

  async function handleConnect() {
    setBusy(true); setErr(null);
    try {
      await connectGmail();
      await refresh();
    } catch (e) {
      setErr(e?.message || "Connection failed");
    }
    setBusy(false);
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Gmail? Workers won't be able to read email or sync contacts until you reconnect.")) return;
    setBusy(true); setErr(null);
    try {
      await disconnectGmail();
      await refresh();
      setSyncResult(null);
    } catch (e) {
      setErr(e?.message || "Disconnect failed");
    }
    setBusy(false);
  }

  async function handleSync() {
    setSyncing(true); setErr(null); setSyncResult(null);
    try {
      const r = await syncGmailContacts();
      setSyncResult(r);
    } catch (e) {
      setErr(e?.message || "Sync failed");
    }
    setSyncing(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Gmail</div>
          <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
            {status.loading
              ? "Checking…"
              : status.connected
                ? `Connected as ${status.email || "Google account"}. Workers can read email context and send on your behalf.`
                : "Connect so workers can sync your contacts, search email context, and send outbound from your address."}
          </div>
          {err && <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>{err}</div>}
          {syncResult && (
            <div style={{ fontSize: "12px", color: "#166534", marginTop: 4 }}>
              Sync complete — {syncResult.added} added, {syncResult.updated} updated ({syncResult.total} contacts found)
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {status.connected && (
            <button className="iconBtn" disabled={syncing} onClick={handleSync} style={{ whiteSpace: "nowrap" }}>
              {syncing ? "Syncing…" : "Sync contacts"}
            </button>
          )}
          {status.connected ? (
            <button className="iconBtn" disabled={busy} onClick={handleDisconnect} style={{ whiteSpace: "nowrap" }}>
              {busy ? "…" : "Disconnect"}
            </button>
          ) : (
            <button className="iconBtn" disabled={busy || status.loading} onClick={handleConnect} style={{ whiteSpace: "nowrap" }}>
              {busy ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Shopify connector — connect ecommerce store so workers can read orders, customers, revenue.
function ShopifyRow() {
  const { status, refresh } = useShopifyStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [shopInput, setShopInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  async function handleConnect() {
    const shop = shopInput.trim().replace(/https?:\/\//, "").replace(/\/$/, "");
    if (!shop) { setErr("Enter your store domain (e.g. mystore.myshopify.com)"); return; }
    setBusy(true); setErr(null);
    try {
      await connectShopify(shop);
      await refresh();
      setShowInput(false);
      setShopInput("");
    } catch (e) {
      setErr(e?.message || "Connection failed");
    }
    setBusy(false);
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Shopify? Workers won't be able to read orders or customers until you reconnect.")) return;
    setBusy(true); setErr(null);
    try {
      await disconnectShopify();
      await refresh();
    } catch (e) {
      setErr(e?.message || "Disconnect failed");
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Shopify</div>
          <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
            {status.loading
              ? "Checking…"
              : status.connected
                ? `Connected to ${status.shop}. Workers can read orders, revenue, and customers.`
                : "Connect your Shopify store so workers can surface sales data in Accounting and contacts in CRM."}
          </div>
          {err && <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>{err}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {status.connected ? (
            <button className="iconBtn" disabled={busy} onClick={handleDisconnect} style={{ whiteSpace: "nowrap" }}>
              {busy ? "…" : "Disconnect"}
            </button>
          ) : (
            <button className="iconBtn" disabled={busy || status.loading} onClick={() => setShowInput(s => !s)} style={{ whiteSpace: "nowrap" }}>
              Connect
            </button>
          )}
        </div>
      </div>
      {showInput && !status.connected && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={shopInput}
            onChange={e => setShopInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConnect()}
            placeholder="mystore.myshopify.com"
            style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none" }}
          />
          <button className="iconBtn" disabled={busy} onClick={handleConnect} style={{ whiteSpace: "nowrap" }}>
            {busy ? "Connecting…" : "Connect store"}
          </button>
        </div>
      )}
    </div>
  );
}

// Google Drive connector — connect personal Drive so workers can read/import files.
function DriveRow() {
  const { status, refresh } = useDriveStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function handleConnect() {
    setBusy(true); setErr(null);
    try {
      await connectDrive();
      await refresh();
    } catch (e) {
      setErr(e?.message || "Connection failed");
    }
    setBusy(false);
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Google Drive? Workers won't be able to read your files until you reconnect.")) return;
    setBusy(true); setErr(null);
    try {
      await disconnectDrive();
      await refresh();
    } catch (e) {
      setErr(e?.message || "Disconnect failed");
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>Google Drive</div>
        <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
          {status.loading
            ? "Checking…"
            : status.connected
              ? `Connected as ${status.email || "Google account"}. Workers can browse and import your Drive files.`
              : "Connect so workers can read documents, contracts, and files from your Drive."}
        </div>
        {err && <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>{err}</div>}
      </div>
      {status.connected ? (
        <button className="iconBtn" disabled={busy} onClick={handleDisconnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          {busy ? "…" : "Disconnect"}
        </button>
      ) : (
        <button className="iconBtn" disabled={busy || status.loading} onClick={handleConnect} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          {busy ? "Connecting…" : "Connect"}
        </button>
      )}
    </div>
  );
}

// ── Personal Vault Settings ──────────────────────────────────────
function PersonalSettings() {
  const auth = getAuth();
  const user = auth.currentUser;
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    name: user?.displayName || localStorage.getItem("DISPLAY_NAME") || localStorage.getItem("USER_NAME") || "",
    email: user?.email || "",
    phone: "",
  });

  const [avatarPreview, setAvatarPreview] = useState(() => localStorage.getItem("VAULT_AVATAR") || null);

  const [chiefOfStaff, setChiefOfStaff] = useState(() => {
    const saved = localStorage.getItem("COS_CONFIG");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      name: "Alex",
      channel: "email",
      autonomy: "remind",
    };
  });

  const [toast, setToast] = useState(null);
  const [blockchainEnabled, setBlockchainEnabled] = useState(() => localStorage.getItem("VAULT_BLOCKCHAIN_ENABLED") === "true");

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    renewalReminders: true,
    expirationAlerts: true,
    weeklyDigest: true,
    workerUpdates: true,
    frequency: "realtime",
  });

  function saveCOS(updated) {
    setChiefOfStaff(updated);
    localStorage.setItem("COS_CONFIG", JSON.stringify(updated));
  }

  function saveNotificationPrefs(prefs) {
    localStorage.setItem("NOTIFICATION_PREFS", JSON.stringify(prefs));
    // Persist to Firestore via API if available
    const token = localStorage.getItem("ID_TOKEN");
    if (token) {
      const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      fetch(`${API_BASE}/api?path=/v1/me:notificationPreferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      }).catch(() => {});
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    console.log("[Avatar] File selected:", file?.name, file?.type, file?.size);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      console.log("[Avatar] FileReader loaded, data length:", ev.target.result?.length);
      const img = new Image();
      img.onload = () => {
        console.log("[Avatar] Image loaded:", img.width, "x", img.height);
        try {
          const canvas = document.createElement("canvas");
          const maxSize = 200;
          let w = img.width;
          let h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          console.log("[Avatar] Compressed length:", compressed.length);
          setAvatarPreview(compressed);
          localStorage.setItem("VAULT_AVATAR", compressed);
          setToast("Photo updated");
          setTimeout(() => setToast(null), 3000);
        } catch (canvasErr) {
          console.error("[Avatar] Canvas error:", canvasErr);
          // Fallback: use the raw data URL without compression
          const raw = ev.target.result;
          setAvatarPreview(raw);
          try { localStorage.setItem("VAULT_AVATAR", raw); } catch (lsErr) {
            console.error("[Avatar] localStorage full, using in-memory only:", lsErr);
          }
          setToast("Photo updated");
          setTimeout(() => setToast(null), 3000);
        }
      };
      img.onerror = (imgErr) => {
        console.error("[Avatar] Image load error:", imgErr);
        setToast("Could not load image. Try a different file.");
        setTimeout(() => setToast(null), 4000);
      };
      img.src = ev.target.result;
    };
    reader.onerror = (readErr) => {
      console.error("[Avatar] FileReader error:", readErr);
      setToast("Could not read file. Try again.");
      setTimeout(() => setToast(null), 4000);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleBlockchainToggle(checked) {
    setBlockchainEnabled(checked);
    localStorage.setItem("VAULT_BLOCKCHAIN_ENABLED", String(checked));
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="subtle">Your personal Vault preferences</p>
        </div>
      </div>

      {toast && (
        <div style={{ padding: "10px 16px", marginBottom: "12px", borderRadius: "10px", background: "#f0fdf4", color: "#16a34a", fontSize: "14px", fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {/* Profile */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Profile</div>
            <div className="cardSub">Your personal information</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "24px",
                flexShrink: 0,
              }}>
                {profile.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "16px", color: "#1e293b" }}>{profile.name || "Your Name"}</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>{profile.email}</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
              <button
                className="iconBtn"
                style={{ marginTop: "8px", fontSize: "12px" }}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Photo
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", background: "#f8fafc", color: "#94a3b8" }}
              />
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Email is managed through your login credentials</div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Optional -- used for text notifications"
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alex — Chief of Staff */}
      <div className="card" style={{ marginBottom: "16px", border: "1px solid #e9d5ff" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Your Chief of Staff</div>
            <div className="cardSub">Rename, change voice, or set language preferences</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{
            padding: "14px 16px",
            background: "#faf5ff",
            borderRadius: "10px",
            fontSize: "14px",
            color: "#64748b",
            lineHeight: "1.6",
            marginBottom: "20px",
          }}>
            Alex manages follow-ups, tracks deadlines, and communicates on your behalf within the boundaries you set. Choose how Alex reaches you and decide how much autonomy to grant.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* AI Name */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>AI Name</label>
              <input
                type="text"
                value={chiefOfStaff.name}
                onChange={(e) => saveCOS({ ...chiefOfStaff, name: e.target.value })}
                placeholder="Give your AI a name"
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              />
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>This is how your AI will introduce itself</div>
            </div>

            {/* AI Title */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Title</label>
              <input
                type="text"
                value="Chief of Staff"
                disabled
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", background: "#f8fafc", color: "#94a3b8" }}
              />
            </div>

            {/* Voice / Accent */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Voice / Accent</label>
              <select
                value={chiefOfStaff.voice || "american"}
                onChange={(e) => saveCOS({ ...chiefOfStaff, voice: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              >
                <option value="american">American</option>
                <option value="british">British</option>
                <option value="australian">Australian</option>
                <option value="indian">Indian</option>
                <option value="irish">Irish</option>
                <option value="scottish">Scottish</option>
                <option value="southern">Southern (US)</option>
                <option value="new_york">New York</option>
              </select>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Affects tone and phrasing. Guests always see the default Alex.</div>
            </div>

            {/* Language */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Language</label>
              <select
                value={chiefOfStaff.language || "en"}
                onChange={(e) => saveCOS({ ...chiefOfStaff, language: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              >
                <option value="en">English</option>
                <option value="es">Espanol</option>
                <option value="pt">Portugues</option>
                <option value="fr">Francais</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="hi">हिन्दी</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Communication Channel */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "13px" }}>Communication Channel</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "email", label: "Email" },
                  { value: "text", label: "Text" },
                  { value: "both", label: "Both" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => saveCOS({ ...chiefOfStaff, channel: opt.value })}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "10px",
                      border: chiefOfStaff.channel === opt.value ? "2px solid #7c3aed" : "1px solid var(--line)",
                      background: chiefOfStaff.channel === opt.value ? "rgba(124,58,237,0.08)" : "white",
                      color: chiefOfStaff.channel === opt.value ? "#7c3aed" : "#64748b",
                      fontWeight: chiefOfStaff.channel === opt.value ? 600 : 400,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Autonomy Level */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "13px" }}>Autonomy Level</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { value: "remind", label: "Just remind me", desc: "Send me reminders about deadlines and tasks. I'll handle everything myself." },
                  { value: "schedule", label: "Schedule and remind me", desc: "Book appointments, set reminders, and organize my calendar. I approve before anything goes out." },
                  { value: "handle", label: "Handle it for me", desc: "Take action on routine items automatically. I'll review a summary after the fact." },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => saveCOS({ ...chiefOfStaff, autonomy: opt.value })}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: chiefOfStaff.autonomy === opt.value ? "2px solid #7c3aed" : "1px solid var(--line)",
                      background: chiefOfStaff.autonomy === opt.value ? "rgba(124,58,237,0.08)" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: chiefOfStaff.autonomy === opt.value ? "#7c3aed" : "#1e293b",
                      marginBottom: "2px",
                    }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing & Subscription */}
      <div style={{ marginTop: '32px', padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>Billing & Subscription</h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Manage your plan and premium services</p>

        {/* Current Plan */}
        <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>Personal Vault — Free</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Your personal Vault is free forever. No credit card required.</div>
          </div>
          <span style={{ padding: '4px 12px', background: '#dcfce7', color: '#16a34a', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>Active</span>
        </div>

        {/* Premium Services */}
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Optional Premium Services</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Identity Verification</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>$2.99</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Per verification. Government ID + biometric check for high-value DTCs.</div>
          </div>

          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Blockchain Recording</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>$0.99</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Per DTC. Permanent record on the Base blockchain via Venly (Polygon available). Tamper-proof.</div>
          </div>

          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>E-Signature Requests</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>$1.99</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Per request. DocuSign-powered third-party attestation on logbook entries.</div>
          </div>

          <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Priority Support</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed' }}>$4.99<span style={{ fontSize: '14px', fontWeight: '400' }}>/mo</span></div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Dedicated support channel. Response within 1 hour.</div>
          </div>
        </div>

        {/* Usage Summary */}
        <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Usage This Month</div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
            <div><span style={{ fontWeight: '600' }}>0</span> ID verifications</div>
            <div><span style={{ fontWeight: '600' }}>0</span> blockchain recordings</div>
            <div><span style={{ fontWeight: '600' }}>0</span> e-signature requests</div>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Total charges this month: $0.00</div>
        </div>
      </div>

      {/* Blockchain Verification */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Blockchain Verification</div>
            <div className="cardSub">Permanent, tamper-proof records</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.7", marginBottom: "20px" }}>
            Save your most important records on the blockchain so they can never be lost, altered, or forged. Each verified item gets a permanent digital certificate that exists independently of any company or service.
          </div>
          <div style={{
            padding: "14px 16px",
            background: blockchainEnabled ? "#f0fdf4" : "#f8fafc",
            border: blockchainEnabled ? "1px solid #86efac" : "1px solid #e5e7eb",
            borderRadius: "10px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={blockchainEnabled}
                onChange={(e) => handleBlockchainToggle(e.target.checked)}
                style={{ width: "20px", height: "20px" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: "2px" }}>Enable Blockchain Record Keeping</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>Additional fee applies. Records are minted to the Base blockchain by default via VENLY (Polygon available).</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Notifications</div>
            <div className="cardSub">How you receive alerts and reminders</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { key: "email", label: "Email Notifications", desc: "Receive updates and reminders via email" },
            { key: "sms", label: "Text Notifications", desc: "Receive updates via text message" },
            { key: "weeklyDigest", label: "Weekly Digest", desc: "Receive a weekly summary of your worker activity and insights" },
            { key: "workerUpdates", label: "Worker Update Alerts", desc: "Get notified when workers you subscribe to publish updates" },
            { key: "renewalReminders", label: "Renewal Reminders", desc: "Get reminded when certifications or licenses are due for renewal" },
            { key: "expirationAlerts", label: "Expiration Alerts", desc: "Get alerted when documents or IDs are about to expire" },
          ].map((item) => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={(e) => {
                  const updated = { ...notifications, [item.key]: e.target.checked };
                  setNotifications(updated);
                  saveNotificationPrefs(updated);
                }}
                style={{ width: "18px", height: "18px" }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>{item.desc}</div>
              </div>
            </div>
          ))}

          {/* Frequency selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Notification Frequency</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>How often you receive grouped notifications</div>
            </div>
            <select
              value={notifications.frequency}
              onChange={(e) => {
                const updated = { ...notifications, frequency: e.target.value };
                setNotifications(updated);
                saveNotificationPrefs(updated);
              }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px", background: "white", cursor: "pointer" }}
            >
              <option value="realtime">Real-time</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>

          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", lineHeight: 1.5 }}>
            Every email includes an unsubscribe link at the bottom. Manage your preferences at any time.
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Connected Accounts</div>
            <div className="cardSub">Link external accounts for faster verification</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Google</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sign in and import contacts</div>
            </div>
            <button className="iconBtn">Connect</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Apple</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sign in with Apple ID</div>
            </div>
            <button className="iconBtn">Connect</button>
          </div>
        </div>
      </div>

      {/* Developer Tools */}
      <div className="card" style={{ marginBottom: "16px", borderColor: "#e9d5ff" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Developer Tools</div>
            <div className="cardSub">Testing and debugging utilities</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Reset Onboarding</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Clear onboarding state and restart the setup flow. Your data is preserved.
              </div>
            </div>
            <button
              className="iconBtn"
              style={{ color: "#f59e0b", borderColor: "#fcd34d" }}
              onClick={() => {
                if (window.confirm("This will reset your onboarding flow. Your existing data will be preserved. Continue?")) {
                  localStorage.removeItem("ONBOARDING_STATE");
                  localStorage.removeItem("ONBOARDING_COMPLETE");
                  localStorage.removeItem("TENANT_ID");
                  localStorage.removeItem("VERTICAL");
                  localStorage.removeItem("JURISDICTION");
                  window.location.href = "/";
                }
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Current Config</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Vertical: {localStorage.getItem("VERTICAL") || "auto"} | Jurisdiction: {localStorage.getItem("JURISDICTION") || "IL"} | Tenant: {localStorage.getItem("TENANT_ID") || "none"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle" style={{ color: "var(--danger)" }}>Danger Zone</div>
            <div className="cardSub">Irreversible actions</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>
            Export All Data
          </button>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Business Settings ────────────────────────────────────────────
function BusinessSettings() {
  const [myCompanies, setMyCompanies] = useState([]);
  const [currentTenantId, setCurrentTenantId] = useState(
    localStorage.getItem("CURRENT_TENANT_ID") || null
  );
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [viewerRole, setViewerRole] = useState(null);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    type: "org",
    vertical: "consumer",
    jurisdiction: "",
  });
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [newCompanyError, setNewCompanyError] = useState("");

  const vertical = localStorage.getItem("VERTICAL") || "consumer";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "";

  // 49.32 — expanded so every launch vertical has a label.
  const VERTICAL_LABELS = {
    consumer: "Personal Vault",
    platform: "Business in a Box",
    auto: "Auto Dealer",
    analyst: "Investment Analyst",
    "real-estate": "Real Estate Brokerage",
    "property-mgmt": "Property Management",
    aviation: "Aviation",
    "title-escrow": "Title & Escrow",
    construction: "Construction",
    government: "Government",
    healthcare: "Healthcare",
    legal: "Legal",
    solar: "Solar Energy",
    web3: "Web3",
    marine: "Marine",
  };

  // Resolve a human-readable workspace name, rejecting raw IDs like ws_1771474949129_ryx41z
  function resolveWorkspaceName() {
    const candidates = [
      localStorage.getItem("WORKSPACE_NAME"),
      localStorage.getItem("COMPANY_NAME"),
      localStorage.getItem("TENANT_NAME"),
    ];
    for (const c of candidates) {
      if (c && !/^ws_\d+_[a-z0-9]+$/i.test(c)) return c;
    }
    return "";
  }

  const workspaceName = resolveWorkspaceName();

  const [business, setBusiness] = useState({
    name: workspaceName,
    type: VERTICAL_LABELS[vertical] || vertical,
    vertical,
    jurisdiction,
    address: "",
    phone: "",
    email: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
    notifications: {
      email: true,
      sms: false,
      lowInventoryAlert: true,
      appointmentReminders: true,
    },
    blockchain: {
      enabled: false,
      provider: "venly",
      inventoryOnChain: 0,
      dealsOnChain: 0,
    },
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [formData, setFormData] = useState({});

  // ── Audit Trail (workspace-level, Firestore-backed) — S52.23 ────
  const [auditTrail, setAuditTrail] = useState({
    enabled: false,
    mode: "full",
    coinbaseWalletAddress: "",
    optInAt: null,
    lastAnchorAt: null,
    loading: true,
  });
  const [auditTrailSaving, setAuditTrailSaving] = useState(false);
  const [auditTrailError, setAuditTrailError] = useState(null);
  const [auditTrailWalletInput, setAuditTrailWalletInput] = useState("");

  async function loadAuditTrail() {
    const wsId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
    if (!wsId || wsId === "vault" || wsId === "personal") {
      setAuditTrail((p) => ({ ...p, loading: false }));
      return;
    }
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const res = await fetch(`${apiBase}/api?path=/v1/tenant:auditTrail:get&tenantId=${encodeURIComponent(wsId)}`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": wsId },
      });
      const data = await res.json();
      if (data && data.ok && data.auditTrail) {
        const at = data.auditTrail;
        setAuditTrail({
          enabled: !!at.enabled,
          mode: at.mode || "full",
          coinbaseWalletAddress: at.coinbaseWalletAddress || "",
          optInAt: at.optInAt || null,
          lastAnchorAt: at.lastAnchorAt || null,
          loading: false,
        });
        setAuditTrailWalletInput(at.coinbaseWalletAddress || "");
      } else {
        setAuditTrail((p) => ({ ...p, loading: false }));
      }
    } catch (e) {
      console.warn("[auditTrail] load failed:", e.message);
      setAuditTrail((p) => ({ ...p, loading: false }));
    }
  }

  const [auditTrailTesting, setAuditTrailTesting] = useState(false);
  const [auditTrailTestResult, setAuditTrailTestResult] = useState(null);

  async function fireTestAnchor() {
    setAuditTrailTesting(true);
    setAuditTrailTestResult(null);
    try {
      const wsId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const res = await fetch(`${apiBase}/api?path=/v1/tenant:auditTrail:testMint`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-tenant-id": wsId },
        body: JSON.stringify({ tenantId: wsId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setAuditTrailTestResult({ ok: false, message: data.error || data.message || `HTTP ${res.status}` });
      } else {
        setAuditTrailTestResult({
          ok: true,
          actionId: data.actionId,
          mintOk: data.mint?.ok === true,
          mintAttempted: data.mint?.attempted === true,
          message: data.message || "Test anchor created.",
          jobId: data.mint?.jobId || null,
        });
        loadAuditTrail();
      }
    } catch (e) {
      setAuditTrailTestResult({ ok: false, message: e?.message || "Network error" });
    }
    setAuditTrailTesting(false);
  }

  async function saveAuditTrail({ enabled, mode, coinbaseWalletAddress }) {
    setAuditTrailSaving(true);
    setAuditTrailError(null);
    try {
      const wsId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
      if (!wsId || wsId === "vault" || wsId === "personal") {
        setAuditTrailError("Audit Trail requires a business workspace.");
        setAuditTrailSaving(false);
        return;
      }
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const payload = { tenantId: wsId, enabled, mode };
      if (coinbaseWalletAddress != null) payload.coinbaseWalletAddress = coinbaseWalletAddress || null;
      const res = await fetch(`${apiBase}/api?path=/v1/tenant:auditTrail:update`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-tenant-id": wsId },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.error || data.message || `HTTP ${res.status}`;
        setAuditTrailError(msg);
        if (res.status === 412) {
          setAuditTrailError("Identity verification required. Complete identity verification in Settings → Identity before enabling.");
        }
      } else {
        setAuditTrail((p) => ({
          ...p,
          enabled: !!data.auditTrail.enabled,
          mode: data.auditTrail.mode || "full",
          coinbaseWalletAddress: data.auditTrail.coinbaseWalletAddress || "",
        }));
      }
    } catch (e) {
      setAuditTrailError(e?.message || "Save failed.");
    }
    setAuditTrailSaving(false);
  }

  function handleEditClick(section) {
    setEditSection(section);
    if (section === "business") {
      setFormData({
        name: business.name,
        type: business.type,
        address: business.address,
        phone: business.phone,
        email: business.email,
      });
    } else if (section === "notifications") {
      setFormData({ ...business.notifications });
    }
    setShowEditModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editSection === "business") {
      setBusiness({ ...business, ...formData });
    } else if (editSection === "notifications") {
      setBusiness({ ...business, notifications: formData });
    }
    setShowEditModal(false);
  }

  function getNotificationItems() {
    if (vertical === "real-estate") {
      return [
        { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
        { key: "sms", label: "SMS Notifications", desc: "Receive updates via text message" },
        { key: "vacancyAlerts", label: "Vacancy Alerts", desc: "Get notified when units become vacant" },
        { key: "lateRentAlerts", label: "Late Rent Alerts", desc: "Get alerted when tenants are past due" },
        { key: "leaseExpiration", label: "Lease Expiration Alerts", desc: "Get reminded when leases are expiring soon" },
        { key: "maintenanceOverdue", label: "Maintenance Overdue Alerts", desc: "Get notified when maintenance requests exceed SLA" },
      ];
    }
    if (vertical === "analyst") {
      return [
        { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
        { key: "sms", label: "SMS Notifications", desc: "Receive updates via text message" },
        { key: "priceAlerts", label: "Price Target Alerts", desc: "Get alerted when positions hit price targets" },
        { key: "riskAlerts", label: "Risk Alerts", desc: "Get notified of portfolio risk threshold breaches" },
      ];
    }
    // auto / default
    return [
      { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
      { key: "sms", label: "SMS Notifications", desc: "Receive updates via text message" },
      { key: "lowInventoryAlert", label: "Low Inventory Alerts", desc: "Get notified when inventory is running low" },
      { key: "appointmentReminders", label: "Appointment Reminders", desc: "Remind staff about upcoming appointments" },
    ];
  }

  useEffect(() => {
    loadMyCompanies();
    loadWorkspaceMembers();
    loadAuditTrail();
  }, []);

  async function loadWorkspaceMembers() {
    const wsId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
    if (!wsId || wsId === "vault" || wsId === "personal") {
      setWorkspaceMembers([]);
      return;
    }
    setMembersLoading(true);
    setMembersError(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const res = await fetch(`${apiBase}/api?path=/v1/workspace:members&tenantId=${encodeURIComponent(wsId)}`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": wsId },
      });
      const data = await res.json();
      if (data && data.ok) {
        setWorkspaceMembers(Array.isArray(data.members) ? data.members : []);
        setViewerRole(data.viewerRole || null);
      } else {
        setMembersError(data?.message || data?.error || "Failed to load members.");
      }
    } catch (e) {
      setMembersError(e?.message || "Failed to load members.");
    }
    setMembersLoading(false);
  }

  async function loadMyCompanies() {
    const companies = [];

    // Current workspace
    const wsId = localStorage.getItem("WORKSPACE_ID") || localStorage.getItem("TENANT_ID") || "";
    const wsName = resolveWorkspaceName();
    companies.push({
      id: wsId,
      name: wsName || "Current Workspace",
      type: VERTICAL_LABELS[vertical] || vertical,
      vertical: vertical,
      role: "admin",
      current: true,
    });

    // Try to fetch all memberships from API
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const response = await fetch(`${apiBase}/api?path=/v1/me:memberships`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.ok && data.memberships) {
        data.memberships.forEach((m) => {
          if (m.tenantId !== wsId) {
            const tenant = data.tenants?.[m.tenantId] || {};
            const v = (tenant.vertical || "auto").toLowerCase();
            // Resolve a human-readable name, skipping raw IDs
            const rawName = tenant.companyName || tenant.name || m.tenantId || "";
            const isRawId = /^(ws_\d+_[a-z0-9]+|[a-z0-9_-]{20,})$/i.test(rawName);
            const displayName = isRawId
              ? (VERTICAL_LABELS[v] || "Business") + " Workspace"
              : rawName;
            companies.push({
              id: m.tenantId,
              name: displayName,
              type: VERTICAL_LABELS[v] || v,
              vertical: v,
              role: m.role || "member",
              current: false,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Could not load all memberships:", err.message);
    }

    setMyCompanies(companies);
    if (!currentTenantId) setCurrentTenantId(wsId);
  }

  function switchTenant(company) {
    localStorage.setItem("CURRENT_TENANT_ID", company.id);
    localStorage.setItem("TENANT_ID", company.id);
    localStorage.setItem("WORKSPACE_ID", company.id);
    if (company.vertical) localStorage.setItem("VERTICAL", company.vertical);
    if (company.name) {
      localStorage.setItem("WORKSPACE_NAME", company.name);
      localStorage.setItem("COMPANY_NAME", company.name);
    }
    setCurrentTenantId(company.id);
    window.location.reload();
  }

  async function handleCreateCompany(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (newCompanyData.name || "").trim();
    if (!name) {
      setNewCompanyError("Company name is required.");
      return;
    }
    setCreatingCompany(true);
    setNewCompanyError("");
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const resp = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          vertical: newCompanyData.vertical || "consumer",
          type: newCompanyData.type === "personal" ? "personal" : "org",
          jurisdiction: (newCompanyData.jurisdiction || "").trim() || undefined,
          onboardingComplete: true,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || data.message || `HTTP ${resp.status}`);
      }
      const ws = data.workspace || {};
      const wsId = ws.id || ws.tenantId;
      if (!wsId) throw new Error("Workspace created but no id returned");
      setShowNewCompanyModal(false);
      setNewCompanyData({ name: "", type: "org", vertical: "consumer", jurisdiction: "" });
      switchTenant({ id: wsId, name, vertical: ws.vertical || newCompanyData.vertical });
    } catch (err) {
      console.error("Failed to create company:", err);
      setNewCompanyError(err.message || "Failed to create company.");
    } finally {
      setCreatingCompany(false);
    }
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="subtle">Business configuration and preferences</p>
        </div>
      </div>

      {/* My Companies */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">My Companies</div>
            <div className="cardSub">Manage multiple businesses with one account</div>
          </div>
          <button
            className="iconBtn"
            onClick={() => setShowNewCompanyModal(true)}
            style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
          >
            + New Company
          </button>
        </div>
        <div style={{ padding: "16px" }}>
          {myCompanies.map((company) => (
            <div
              key={company.id}
              style={{
                padding: "12px",
                marginBottom: "8px",
                border: `2px solid ${currentTenantId === company.id ? "var(--accent)" : "var(--line)"}`,
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: currentTenantId === company.id ? "rgba(124,58,237,0.05)" : "transparent",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{company.name}</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  {company.type} {company.role ? `\u00B7 ${company.role}` : ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: {
                      auto: "#fef3c7",
                      analyst: "#dbeafe",
                      "real-estate": "#dcfce7",
                      consumer: "#f3e8ff",
                    }[company.vertical] || "#f1f5f9",
                    color: {
                      auto: "#d97706",
                      analyst: "#2563eb",
                      "real-estate": "#16a34a",
                      consumer: "#7c3aed",
                    }[company.vertical] || "#475569",
                  }}>
                    {company.type}
                  </span>
                  {company.current && (
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#7c3aed" }}>Active</span>
                  )}
                </div>
              </div>
              {currentTenantId !== company.id && (
                <button className="iconBtn" onClick={() => switchTenant(company)}>Switch</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Workspace Members (50.27) */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Workspace Members</div>
            <div className="cardSub">
              {viewerRole === "admin"
                ? "Everyone with access to this workspace. Use this to debug invited-member access issues."
                : "Everyone with access to this workspace."}
            </div>
          </div>
          <button className="iconBtn" onClick={loadWorkspaceMembers} disabled={membersLoading}>
            {membersLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
        <div style={{ padding: "16px" }}>
          {membersError && (
            <div style={{ fontSize: "13px", color: "#b91c1c", marginBottom: "8px" }}>{membersError}</div>
          )}
          {!membersError && workspaceMembers.length === 0 && !membersLoading && (
            <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>No members loaded yet.</div>
          )}
          {workspaceMembers.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "10px 12px",
                marginBottom: "6px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.email || m.displayName || m.userId}</div>
                <div style={{ fontSize: "12px", color: "var(--textMuted)" }}>
                  {m.displayName && m.email ? `${m.displayName} · ` : ""}
                  <code style={{ fontSize: "11px" }}>{m.userId}</code>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  textTransform: "uppercase",
                  background: m.role === "admin" ? "#ede9fe" : m.role === "viewer" ? "#fef3c7" : "#dcfce7",
                  color: m.role === "admin" ? "#6d28d9" : m.role === "viewer" ? "#b45309" : "#15803d",
                }}>{m.role}</span>
                <span style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: m.status === "active" ? "#dcfce7" : "#fef2f2",
                  color: m.status === "active" ? "#15803d" : "#b91c1c",
                }}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Information */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Business Information</div>
            <div className="cardSub">Your business details</div>
          </div>
          <button className="iconBtn" onClick={() => handleEditClick("business")}>Edit</button>
        </div>
        <div className="detail">
          <div className="kvRow"><div className="k">Business Name</div><div className="v">{business.name}</div></div>
          <div className="kvRow"><div className="k">Type</div><div className="v">{business.type}</div></div>
          <div className="kvRow"><div className="k">Vertical</div><div className="v">{business.vertical.toUpperCase()} ({business.jurisdiction.toUpperCase()})</div></div>
          <div className="kvRow"><div className="k">Address</div><div className="v">{business.address}</div></div>
          <div className="kvRow"><div className="k">Phone</div><div className="v">{business.phone}</div></div>
          <div className="kvRow"><div className="k">Email</div><div className="v">{business.email}</div></div>
          <div className="kvRow"><div className="k">Timezone</div><div className="v">{business.timezone}</div></div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Notification Preferences</div>
            <div className="cardSub">How your business receives alerts</div>
          </div>
          <button className="iconBtn" onClick={() => handleEditClick("notifications")}>Edit</button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {getNotificationItems().map((item) => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="checkbox" checked={business.notifications[item.key] || false} readOnly />
              <div><div style={{ fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>{item.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Integrations</div>
            <div className="cardSub">Connected third-party services</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <GoogleCalendarRow />
          <GmailRow />
          <DriveRow />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>Salesforce CRM</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sync customer data with Salesforce</div></div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>Coming Soon</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>QuickBooks</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sync financial data and invoices</div></div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>Coming Soon</span>
          </div>
          <ShopifyRow />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>Microsoft OneDrive</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sync files and documents from OneDrive</div></div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>Coming Soon</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>Microsoft Outlook</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sync email and calendar from Outlook</div></div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>Coming Soon</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>Stripe Payments</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Accept online payments</div></div>
            <span className="badge badge-completed">Connected</span>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Social Media</div>
            <div className="cardSub">Connect accounts so Alex can publish content on your behalf</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <YouTubeRow />
          <TikTokRow />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>X (Twitter)</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Posts from the @SOCIIIai managed account — Alex queues posts for your approval.</div>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#eff6ff", color: "#2563eb", whiteSpace: "nowrap" }}>Platform account</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>LinkedIn</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Publish posts and articles to your company page</div></div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>Coming Soon</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>Instagram</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Publish photos and reels to your Instagram account</div></div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#f1f5f9", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>Coming Soon</span>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">API Access</div>
            <div className="cardSub">API keys for programmatic access</div>
          </div>
          <button className="iconBtn">Generate New Key</button>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "13px", color: "var(--textMuted)", marginBottom: "8px" }}>Production API Key</div>
          <div style={{ fontFamily: "monospace", padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
            ta_prod_••••••••••••••••••••••••
          </div>
        </div>
      </div>

      {/* Audit Trail — S52.23 foundational architecture */}
      <div className="card" style={{ marginBottom: "16px", border: "1px solid #c4b5fd", background: auditTrail.enabled ? "linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)" : "white" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Audit Trail
              {auditTrail.enabled && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
                  background: "#ede9fe", color: "#6d28d9", textTransform: "uppercase", letterSpacing: 0.5,
                }}>Enabled</span>
              )}
            </div>
            <div className="cardSub">Cryptographically anchored record of every meaningful platform action. Required for regulated work.</div>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 48, height: 26, flexShrink: 0, opacity: auditTrailSaving ? 0.5 : 1 }}>
            <input
              type="checkbox"
              disabled={auditTrailSaving || auditTrail.loading}
              checked={auditTrail.enabled}
              onChange={(e) => {
                const next = e.target.checked;
                if (next) {
                  saveAuditTrail({ enabled: true, coinbaseWalletAddress: auditTrailWalletInput || null });
                } else {
                  if (!window.confirm("Disable Audit Trail? New actions will no longer be anchored. Existing receipts remain in your records.")) return;
                  saveAuditTrail({ enabled: false });
                }
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: auditTrail.enabled ? "#7c3aed" : "#cbd5e1",
              borderRadius: 26, transition: "0.3s",
            }}>
              <span style={{
                position: "absolute", height: 20, width: 20, left: auditTrail.enabled ? 24 : 4, bottom: 3,
                backgroundColor: "white", borderRadius: "50%", transition: "0.3s",
              }} />
            </span>
          </label>
        </div>
        <div style={{ padding: "16px" }}>
          {auditTrail.loading ? (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>
                When enabled, every meaningful action your workers take is sealed into a tamper-evident receipt and anchored to an independent public registry. You hold the receipts; SOCIII keeps a backup copy for recovery. Records survive even catastrophic infrastructure loss.
              </div>

              {/* Coinbase Wallet — optional. If set, receipts ship to wallet + SOCIII backup. If empty, SOCIII keeps the only copy. */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Coinbase Wallet Address <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                <input
                  type="text"
                  placeholder="0x… (leave empty for SOCIII-only custody)"
                  value={auditTrailWalletInput}
                  onChange={(e) => setAuditTrailWalletInput(e.target.value.trim())}
                  onBlur={() => {
                    if (auditTrail.enabled && auditTrailWalletInput !== auditTrail.coinbaseWalletAddress) {
                      saveAuditTrail({ enabled: true, coinbaseWalletAddress: auditTrailWalletInput || null });
                    }
                  }}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 13,
                  }}
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  EVM-compatible address on Base. When set, receipts ship to your wallet automatically; SOCIII keeps a backup copy for recovery. Leave empty to have SOCIII hold the only copy.
                </div>
              </div>

              {/* Status summary */}
              {auditTrail.enabled && (
                <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#475569" }}>
                  {auditTrail.optInAt && (
                    <div>Opted in: {new Date(typeof auditTrail.optInAt === "object" && auditTrail.optInAt._seconds ? auditTrail.optInAt._seconds * 1000 : auditTrail.optInAt).toLocaleString()}</div>
                  )}
                  {auditTrail.lastAnchorAt ? (
                    <div>Last anchor: {new Date(typeof auditTrail.lastAnchorAt === "object" && auditTrail.lastAnchorAt._seconds ? auditTrail.lastAnchorAt._seconds * 1000 : auditTrail.lastAnchorAt).toLocaleString()}</div>
                  ) : (
                    <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Anchoring service activates after Sean's review of the gating spec (S52.23). Toggle is live; receipts will start once the service layer is wired.</div>
                  )}
                </div>
              )}

              {/* Error surface */}
              {auditTrailError && (
                <div style={{
                  marginTop: 12, padding: "10px 12px", borderRadius: 8,
                  background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 12,
                }}>
                  {auditTrailError}
                </div>
              )}

              {/* Test Anchor — admin-only, for verifying end-to-end wiring */}
              {auditTrail.enabled && (
                <div style={{ marginTop: 14, padding: "12px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#92400e" }}>Send Test Anchor</div>
                      <div style={{ fontSize: 11, color: "#78350f", marginTop: 2 }}>
                        Fire one manual anchor to verify end-to-end wiring. Production gating service goes live after spec review.
                      </div>
                    </div>
                    <button
                      className="iconBtn"
                      disabled={auditTrailTesting}
                      onClick={fireTestAnchor}
                      style={{ whiteSpace: "nowrap", background: "#f59e0b", color: "white", borderColor: "#f59e0b" }}
                    >
                      {auditTrailTesting ? "Anchoring…" : "Send Test Anchor"}
                    </button>
                  </div>
                  {auditTrailTestResult && (
                    <div style={{
                      marginTop: 10, padding: "8px 10px", borderRadius: 6, fontSize: 12,
                      background: auditTrailTestResult.ok ? "#dcfce7" : "#fee2e2",
                      color: auditTrailTestResult.ok ? "#166534" : "#991b1b",
                      lineHeight: 1.5,
                    }}>
                      {auditTrailTestResult.ok ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{auditTrailTestResult.mintOk ? "Anchor sealed to the public registry." : "Anchor recorded in ledger (sealing step skipped)."}</div>
                          <div style={{ fontSize: 11, marginTop: 2 }}>actionId: <code>{auditTrailTestResult.actionId}</code></div>
                          {auditTrailTestResult.jobId && <div style={{ fontSize: 11 }}>job ID: <code>{auditTrailTestResult.jobId}</code></div>}
                          <div style={{ fontSize: 11, marginTop: 4 }}>{auditTrailTestResult.message}</div>
                        </>
                      ) : (
                        <div>{auditTrailTestResult.message}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                Patent-pending architecture (USPTO 64/073,693 + Filing C). See the <a href="/workers/audit-trail" style={{ color: "#7c3aed" }}>Audit Trail worker</a> to view your ledger, download receipts, and configure recovery options.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Alex Rules */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Alex Rules</div>
            <div className="cardSub">Custom rules and compliance settings for Alex</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "14px", color: "var(--textMuted)", marginBottom: "8px" }}>
            These rules were set during onboarding. You can update them anytime.
          </div>
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px", lineHeight: 1.6, minHeight: "60px", color: "#374151" }}>
            {localStorage.getItem("RAAS_RULES") || "Standard rules (no custom rules set)"}
          </div>
        </div>
      </div>

      {/* Billing & Subscription -- Analyst */}
      {vertical === 'analyst' && (
        <div style={{ marginBottom: '16px', padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>Billing & Subscription</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Manage your plan, seats, and billing</p>

          {/* Current Plan */}
          <div style={{ padding: '16px', background: '#f5f3ff', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>SOCIII Pro</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>$9/user/month · Billed monthly</div>
            </div>
            <span style={{ padding: '4px 12px', background: '#ede9fe', color: '#7c3aed', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>Active</span>
          </div>

          {/* Billing Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>NEXT PAYMENT</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Mar 18, 2026</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>$9.00</div>
            </div>

            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>TEAM SEATS</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>1 of 1</div>
              <div style={{ fontSize: '13px', color: '#7c3aed', cursor: 'pointer' }}>+ Add seat</div>
            </div>

            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>PLAN STARTED</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Feb 18, 2026</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Monthly billing</div>
            </div>
          </div>

          {/* Usage This Month */}
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Usage This Month</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>5</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Deals Analyzed</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>4</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Opportunities Found</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>3</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Reports Generated</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>12</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>AI Conversations</div>
            </div>
          </div>

          {/* What's Included */}
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>What's Included</h3>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
              <div>&#10003; Unlimited deal analysis</div>
              <div>&#10003; Alex, Chief of Staff</div>
              <div>&#10003; AI deal sourcing (overnight scans)</div>
              <div>&#10003; Risk scoring & validation</div>
              <div>&#10003; IC-ready report generation</div>
              <div>&#10003; Email/text outreach from AI</div>
              <div>&#10003; Team collaboration (per seat)</div>
              <div>&#10003; Services & fee tracking</div>
            </div>
          </div>

          {/* Manage */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button style={{ padding: '10px 20px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              Manage Plan
            </button>
            <button style={{ padding: '10px 20px', backgroundColor: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
              Billing History
            </button>
          </div>
        </div>
      )}

      {/* Developer Tools */}
      <div className="card" style={{ marginBottom: "16px", borderColor: "#e9d5ff" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Developer Tools</div>
            <div className="cardSub">Testing and debugging utilities</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Reset Onboarding</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Clear onboarding state and restart the setup flow for this workspace.</div>
            </div>
            <button
              className="iconBtn"
              style={{ color: "#f59e0b", borderColor: "#fcd34d" }}
              onClick={() => {
                if (window.confirm("This will reset your onboarding flow and re-run the setup wizard. Your existing data will be preserved. Continue?")) {
                  const currentVertical = localStorage.getItem("VERTICAL") || "auto";
                  localStorage.removeItem("ONBOARDING_STATE");
                  localStorage.removeItem("ONBOARDING_COMPLETE");
                  localStorage.setItem("PENDING_ONBOARDING", currentVertical);
                  window.location.href = "/";
                }
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Clear Sample Data</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Remove sample data and show empty-state dashboard.</div>
            </div>
            <button
              className="iconBtn"
              style={{ color: "#d97706", borderColor: "#fcd34d" }}
              onClick={() => {
                if (window.confirm("This will clear sample data from your workspace. Continue?")) {
                  try {
                    const state = JSON.parse(localStorage.getItem("ONBOARDING_STATE") || "{}");
                    state.dataSource = "none";
                    localStorage.setItem("ONBOARDING_STATE", JSON.stringify(state));
                  } catch {
                    localStorage.setItem("ONBOARDING_STATE", JSON.stringify({ dataSource: "none" }));
                  }
                  window.location.reload();
                }
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Current Config</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Vertical: {localStorage.getItem("VERTICAL") || "auto"} | Jurisdiction: {localStorage.getItem("JURISDICTION") || "IL"} | Tenant: {localStorage.getItem("TENANT_ID") || "none"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Integrations */}
      {(() => {
        try {
          const state = JSON.parse(localStorage.getItem("ONBOARDING_STATE") || "{}");
          const integrations = state?.integrations;
          if (integrations && Array.isArray(integrations) && integrations.length > 0) {
            return (
              <div className="card" style={{ marginTop: "16px", marginBottom: "16px" }}>
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">Selected Integrations</div>
                    <div className="cardSub">Tools selected during onboarding</div>
                  </div>
                </div>
                <div style={{ padding: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {integrations.map((id) => (
                    <span key={id} style={{
                      fontSize: "13px", fontWeight: 600, padding: "4px 12px", borderRadius: "20px",
                      background: "#f3e8ff", color: "#7c3aed",
                    }}>{id}</span>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        } catch { return null; }
      })()}

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle" style={{ color: "var(--danger)" }}>Danger Zone</div>
            <div className="cardSub">Irreversible actions</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>Export All Data</button>
          <button
            className="iconBtn"
            style={{ width: "fit-content", color: "var(--danger)" }}
            onClick={async () => {
              const wsId = localStorage.getItem("WORKSPACE_ID") || localStorage.getItem("TENANT_ID");
              const wsName = resolveWorkspaceName() || "this workspace";
              if (!wsId || wsId === "vault") {
                alert("Cannot delete the Personal Vault.");
                return;
              }
              if (!window.confirm(`Permanently delete "${wsName}"? This cannot be undone. All data in this workspace will be lost.`)) return;
              // Double-confirm
              const typed = window.prompt(`Type "${wsName}" to confirm deletion:`);
              if (typed !== wsName) {
                alert("Deletion canceled. The name did not match.");
                return;
              }
              try {
                const token = localStorage.getItem("ID_TOKEN");
                const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
                const resp = await fetch(`${apiBase}/api?path=/v1/workspaces/${wsId}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await resp.json();
                if (data.ok) {
                  localStorage.removeItem("WORKSPACE_ID");
                  localStorage.removeItem("WORKSPACE_NAME");
                  localStorage.removeItem("TENANT_ID");
                  localStorage.removeItem("TENANT_NAME");
                  localStorage.removeItem("COMPANY_NAME");
                  localStorage.removeItem("VERTICAL");
                  localStorage.removeItem("JURISDICTION");
                  localStorage.removeItem("ONBOARDING_STATE");
                  localStorage.removeItem("ONBOARDING_COMPLETE");
                  localStorage.removeItem("COS_CONFIG");
                  window.location.href = "/";
                } else {
                  alert(data.error || "Failed to delete workspace.");
                }
              } catch (err) {
                console.error("Delete workspace failed:", err);
                alert("Failed to delete workspace. Please try again.");
              }
            }}
          >
            Delete Business Account
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editSection === "business" ? "Edit Business Information" : "Edit Notifications"}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      >
        {editSection === "business" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Business Name</label>
              <input type="text" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Type</label>
              <input type="text" value={formData.type || ""} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Address</label>
              <input type="text" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Phone</label>
              <input type="tel" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Email</label>
              <input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
          </div>
        )}
        {editSection === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {getNotificationItems().map((item) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input type="checkbox" checked={formData[item.key] || false} onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })} />
                <div><div style={{ fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>{item.desc}</div></div>
              </div>
            ))}
          </div>
        )}
      </FormModal>

      {/* New Company Modal */}
      <FormModal
        isOpen={showNewCompanyModal}
        onClose={() => {
          if (creatingCompany) return;
          setShowNewCompanyModal(false);
          setNewCompanyError("");
        }}
        title="New Company"
        onSubmit={handleCreateCompany}
        submitLabel={creatingCompany ? "Creating…" : "Create Company"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Company Name</label>
            <input
              type="text"
              autoFocus
              value={newCompanyData.name}
              onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
              placeholder="e.g. SOCIII AI"
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Industry</label>
            <select
              value={newCompanyData.vertical}
              onChange={(e) => setNewCompanyData({ ...newCompanyData, vertical: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", background: "white" }}
            >
              {Object.entries(VERTICAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Workspace Type</label>
            <select
              value={newCompanyData.type}
              onChange={(e) => setNewCompanyData({ ...newCompanyData, type: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", background: "white" }}
            >
              <option value="org">Organization (invite teammates)</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Jurisdiction (optional)</label>
            <input
              type="text"
              value={newCompanyData.jurisdiction}
              onChange={(e) => setNewCompanyData({ ...newCompanyData, jurisdiction: e.target.value.toUpperCase().slice(0, 10) })}
              placeholder="e.g. CA, IL, US"
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
            />
          </div>
          {newCompanyError && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 12px", borderRadius: "10px", fontSize: "13px" }}>
              {newCompanyError}
            </div>
          )}
          <div style={{ fontSize: "12px", color: "var(--textMuted)" }}>
            Switching workspaces will reload the app. Your current workspace stays intact.
          </div>
        </div>
      </FormModal>
    </div>
  );
}

// ── Settings Router ──────────────────────────────────────────────
export default function Settings() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isPersonal = vertical === "consumer";

  return isPersonal ? <PersonalSettings /> : <BusinessSettings />;
}
