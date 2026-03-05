import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

function fmtDate(ts) {
  if (!ts) return "--";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(str, max) {
  if (!str) return "--";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

const PRIORITY_COLORS = {
  low: { color: "#64748b", bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.3)" },
  medium: { color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.3)" },
  high: { color: "#d97706", bg: "rgba(217,119,6,0.06)", border: "rgba(217,119,6,0.3)" },
  critical: { color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.3)" },
};

const STATUS_COLORS = {
  new: "",
  investigating: "ac-badge-warning",
  resolved: "ac-badge-success",
  pending: "ac-badge-warning",
  converted: "ac-badge-success",
};

export default function GrowthTab() {
  const [referrals, setReferrals] = useState([]);
  const [promoLeads, setPromoLeads] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refEmail, setRefEmail] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch referrals
        try {
          const refQ = query(
            collection(db, "referrals"),
            orderBy("createdAt", "desc")
          );
          const refSnap = await getDocs(refQ);
          setReferrals(
            refSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        } catch (err) {
          console.warn("[GrowthTab] referrals fetch error:", err);
        }

        // Fetch leads with promo codes
        try {
          const promoQ = query(
            collection(db, "leads"),
            orderBy("createdAt", "desc"),
            limit(30)
          );
          const promoSnap = await getDocs(promoQ);
          const withPromo = promoSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((l) => l.promo_code);
          setPromoLeads(withPromo);
        } catch (err) {
          console.warn("[GrowthTab] promo leads fetch error:", err);
        }

        // Fetch bug reports
        try {
          const bugQ = query(
            collection(db, "bugReports"),
            orderBy("createdAt", "desc")
          );
          const bugSnap = await getDocs(bugQ);
          setBugReports(
            bugSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        } catch (err) {
          console.warn("[GrowthTab] bugReports fetch error:", err);
        }
      } catch (err) {
        console.warn("[GrowthTab] fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Referral metrics
  const totalReferrals = referrals.length;
  const convertedReferrals = referrals.filter(
    (r) => r.status === "converted"
  ).length;
  const conversionRate =
    totalReferrals > 0
      ? Math.round((convertedReferrals / totalReferrals) * 100)
      : 0;

  // Promo code aggregation
  const promoCodeCounts = {};
  promoLeads.forEach((l) => {
    if (l.promo_code) {
      promoCodeCounts[l.promo_code] =
        (promoCodeCounts[l.promo_code] || 0) + 1;
    }
  });

  function generateRefLink() {
    if (!refEmail) return "";
    return `https://titleapp.ai?ref=${encodeURIComponent(refEmail)}`;
  }

  async function copyRefLink() {
    const link = generateRefLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn("[GrowthTab] clipboard error:", err);
    }
  }

  async function updateBugStatus(bugId, newStatus) {
    try {
      await updateDoc(doc(db, "bugReports", bugId), { status: newStatus });
      setBugReports((prev) =>
        prev.map((b) => (b.id === bugId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      console.warn("[GrowthTab] bug status update error:", err);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="ac-page-header">
          <h1 className="ac-page-title">Growth</h1>
          <p className="ac-page-subtitle">
            Referrals, promotions, and bug tracking
          </p>
        </div>
        <div className="ac-card">
          <div className="ac-card-body">
            <div className="ac-empty">Loading growth data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Growth</h1>
        <p className="ac-page-subtitle">
          Referrals, promotions, and bug tracking
        </p>
      </div>

      {/* Panel 1: Referral Program */}
      <div className="ac-card" style={{ marginBottom: 20 }}>
        <div className="ac-card-header">
          <span className="ac-card-title">Referral Program</span>
        </div>
        <div className="ac-card-body">
          <div
            className="ac-metrics"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}
          >
            <div className="ac-metric-card">
              <div className="ac-metric-label">Total Referrals</div>
              <div className="ac-metric-value">{totalReferrals}</div>
            </div>
            <div className="ac-metric-card">
              <div className="ac-metric-label">Converted</div>
              <div className="ac-metric-value" style={{ color: "#059669" }}>
                {convertedReferrals}
              </div>
            </div>
            <div className="ac-metric-card">
              <div className="ac-metric-label">Conversion Rate</div>
              <div className="ac-metric-value">{conversionRate}%</div>
            </div>
          </div>

          {/* Generate referral link */}
          <div
            style={{
              padding: 16,
              background: "#fbfcff",
              borderRadius: 10,
              border: "1px solid #e8ebf3",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              Generate Referral Link
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="ac-input"
                type="email"
                placeholder="Enter referrer email"
                value={refEmail}
                onChange={(e) => setRefEmail(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="ac-btn ac-btn-primary"
                onClick={copyRefLink}
                disabled={!refEmail}
              >
                {copiedLink ? "Copied" : "Copy Link"}
              </button>
            </div>
            {refEmail && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#64748b",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {generateRefLink()}
              </div>
            )}
          </div>

          {/* Referrals table */}
          {referrals.length === 0 ? (
            <div className="ac-empty">
              No referrals yet. Generate referral links above to start tracking.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Referrer Email</th>
                    <th>Referred Email</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => (
                    <tr key={ref.id}>
                      <td>{ref.referrerEmail || "--"}</td>
                      <td>{ref.referredEmail || "--"}</td>
                      <td>
                        <span
                          className={`ac-badge ${
                            STATUS_COLORS[ref.status] || ""
                          }`}
                        >
                          {ref.status || "pending"}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(ref.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel 2: Promo Redemptions */}
      <div className="ac-card" style={{ marginBottom: 20 }}>
        <div className="ac-card-header">
          <span className="ac-card-title">Promo Redemptions</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {promoLeads.length} total
          </span>
        </div>
        <div className="ac-card-body">
          {promoLeads.length === 0 ? (
            <div className="ac-empty">
              No promo code redemptions yet. Leads that use a promo code will
              appear here.
            </div>
          ) : (
            <>
              {/* Code summary */}
              {Object.keys(promoCodeCounts).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {Object.entries(promoCodeCounts).map(([code, count]) => (
                    <span
                      key={code}
                      className="ac-badge"
                      style={{
                        borderColor: "rgba(124,58,237,0.3)",
                        color: "#7c3aed",
                        background: "rgba(124,58,237,0.06)",
                      }}
                    >
                      {code}: {count}
                    </span>
                  ))}
                </div>
              )}

              {/* Timeline */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {promoLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid #f0f2f8",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#7c3aed",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>
                        {lead.email || "Unknown"}
                      </span>
                      {" used "}
                      <span
                        className="ac-badge"
                        style={{
                          borderColor: "rgba(124,58,237,0.3)",
                          color: "#7c3aed",
                          background: "rgba(124,58,237,0.06)",
                        }}
                      >
                        {lead.promo_code}
                      </span>
                      {lead.vertical && (
                        <span style={{ color: "#64748b", marginLeft: 8 }}>
                          on {lead.vertical}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDate(lead.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Panel 3: Bug Reports */}
      <div className="ac-card">
        <div className="ac-card-header">
          <span className="ac-card-title">Bug Reports</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {bugReports.length} total
          </span>
        </div>
        <div className="ac-card-body" style={{ padding: 0 }}>
          {bugReports.length === 0 ? (
            <div className="ac-empty">
              No bug reports filed. Reports submitted by users will appear here.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Reporter</th>
                    <th>Status</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {bugReports.map((bug) => {
                    const pc = PRIORITY_COLORS[bug.priority] || PRIORITY_COLORS.low;
                    return (
                      <tr key={bug.id}>
                        <td
                          style={{ maxWidth: 300 }}
                          title={bug.description}
                        >
                          {truncate(bug.description, 80)}
                        </td>
                        <td>{bug.reporter || bug.reporterEmail || "--"}</td>
                        <td>
                          <select
                            className="ac-select"
                            value={bug.status || "new"}
                            onChange={(e) =>
                              updateBugStatus(bug.id, e.target.value)
                            }
                            style={{ minWidth: 120 }}
                          >
                            <option value="new">New</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </td>
                        <td>
                          <span
                            className="ac-badge"
                            style={{
                              color: pc.color,
                              background: pc.bg,
                              borderColor: pc.border,
                            }}
                          >
                            {bug.priority || "low"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
