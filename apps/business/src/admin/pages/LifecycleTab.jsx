import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

function daysSince(ts) {
  if (!ts) return null;
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(ts) {
  if (!ts) return "--";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LifecycleTab() {
  const [customers, setCustomers] = useState([]);
  const [stalledUsers, setStalledUsers] = useState([]);
  const [pastDueUsers, setPastDueUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nudgeSent, setNudgeSent] = useState({});

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch pro/enterprise customers
        const customerResults = [];
        for (const tier of ["pro", "enterprise"]) {
          try {
            const q = query(
              collection(db, "users"),
              where("tier", "==", tier)
            );
            const snap = await getDocs(q);
            snap.docs.forEach((d) =>
              customerResults.push({ id: d.id, ...d.data() })
            );
          } catch (err) {
            console.warn(`[LifecycleTab] Error fetching ${tier} users:`, err);
          }
        }
        setCustomers(customerResults);

        // Fetch stalled onboarding users
        try {
          const stalledQ = query(
            collection(db, "users"),
            where("onboardingComplete", "==", false),
            orderBy("createdAt", "asc")
          );
          const stalledSnap = await getDocs(stalledQ);
          setStalledUsers(
            stalledSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        } catch (err) {
          console.warn("[LifecycleTab] stalled onboarding fetch error:", err);
        }

        // Fetch past_due users
        try {
          const pastDueQ = query(
            collection(db, "users"),
            where("stripeSubscriptionStatus", "==", "past_due")
          );
          const pastDueSnap = await getDocs(pastDueQ);
          setPastDueUsers(
            pastDueSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        } catch (err) {
          console.warn("[LifecycleTab] past_due fetch error:", err);
        }
      } catch (err) {
        console.warn("[LifecycleTab] fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Bucket customers by health
  const healthy = [];
  const atRisk = [];
  const churnRisk = [];

  customers.forEach((c) => {
    const lastActive = c.lastActiveAt || c.updatedAt;
    const days = daysSince(lastActive);
    if (days == null || days < 7) {
      healthy.push(c);
    } else if (days < 30) {
      atRisk.push(c);
    } else {
      churnRisk.push(c);
    }
  });

  const totalCustomers = healthy.length + atRisk.length + churnRisk.length;

  async function sendNudge(user) {
    try {
      await fetch("https://sendemail-feyfibglbq-uc.a.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          subject: "Need help getting started?",
          body: `Hi ${user.displayName || "there"}, I noticed you signed up but haven't finished setting up. Can I help? -- Alex`,
          purpose: "onboarding_nudge",
        }),
      });
      setNudgeSent((prev) => ({ ...prev, [user.id]: true }));
    } catch (err) {
      console.warn("[LifecycleTab] nudge send error:", err);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="ac-page-header">
          <h1 className="ac-page-title">Lifecycle</h1>
          <p className="ac-page-subtitle">Customer health and retention</p>
        </div>
        <div className="ac-card">
          <div className="ac-card-body">
            <div className="ac-empty">Loading lifecycle data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Lifecycle</h1>
        <p className="ac-page-subtitle">Customer health and retention</p>
      </div>

      {/* Panel 1: Customer Health Distribution */}
      <div className="ac-card" style={{ marginBottom: 20 }}>
        <div className="ac-card-header">
          <span className="ac-card-title">Customer Health Distribution</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {totalCustomers} total customers
          </span>
        </div>
        <div className="ac-card-body">
          {totalCustomers === 0 ? (
            <div className="ac-empty">
              No pro or enterprise customers found. Customers will appear here
              once users upgrade their tier.
            </div>
          ) : (
            <>
              <div
                className="ac-metrics"
                style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}
              >
                <div className="ac-metric-card">
                  <div className="ac-metric-label">Healthy</div>
                  <div
                    className="ac-metric-value"
                    style={{ color: "#059669" }}
                  >
                    {healthy.length}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                  >
                    Active within 7 days
                  </div>
                </div>
                <div className="ac-metric-card">
                  <div className="ac-metric-label">At Risk</div>
                  <div
                    className="ac-metric-value"
                    style={{ color: "#d97706" }}
                  >
                    {atRisk.length}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                  >
                    Inactive 7-30 days
                  </div>
                </div>
                <div className="ac-metric-card">
                  <div className="ac-metric-label">Churn Risk</div>
                  <div
                    className="ac-metric-value"
                    style={{ color: "#dc2626" }}
                  >
                    {churnRisk.length}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                  >
                    Inactive 30+ days
                  </div>
                </div>
              </div>

              {/* Stacked bar */}
              <div
                style={{
                  display: "flex",
                  height: 28,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#f1f5f9",
                }}
              >
                {healthy.length > 0 && (
                  <div
                    style={{
                      width: `${(healthy.length / totalCustomers) * 100}%`,
                      background: "#059669",
                      transition: "width 0.3s ease",
                    }}
                    title={`Healthy: ${healthy.length}`}
                  />
                )}
                {atRisk.length > 0 && (
                  <div
                    style={{
                      width: `${(atRisk.length / totalCustomers) * 100}%`,
                      background: "#d97706",
                      transition: "width 0.3s ease",
                    }}
                    title={`At Risk: ${atRisk.length}`}
                  />
                )}
                {churnRisk.length > 0 && (
                  <div
                    style={{
                      width: `${(churnRisk.length / totalCustomers) * 100}%`,
                      background: "#dc2626",
                      transition: "width 0.3s ease",
                    }}
                    title={`Churn Risk: ${churnRisk.length}`}
                  />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                <span>
                  Healthy{" "}
                  {totalCustomers > 0
                    ? Math.round((healthy.length / totalCustomers) * 100)
                    : 0}
                  %
                </span>
                <span>
                  At Risk{" "}
                  {totalCustomers > 0
                    ? Math.round((atRisk.length / totalCustomers) * 100)
                    : 0}
                  %
                </span>
                <span>
                  Churn{" "}
                  {totalCustomers > 0
                    ? Math.round((churnRisk.length / totalCustomers) * 100)
                    : 0}
                  %
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Panel 2: Stalled Onboarding */}
      <div className="ac-card" style={{ marginBottom: 20 }}>
        <div className="ac-card-header">
          <span className="ac-card-title">Stalled Onboarding</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {stalledUsers.length} users
          </span>
        </div>
        <div className="ac-card-body" style={{ padding: 0 }}>
          {stalledUsers.length === 0 ? (
            <div className="ac-empty">
              No stalled onboarding users. Everyone who signed up has completed
              setup.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Signup Date</th>
                    <th>Days Since Signup</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stalledUsers.map((user) => {
                    const days = daysSince(user.createdAt);
                    return (
                      <tr key={user.id}>
                        <td>{user.email || "--"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {fmtDate(user.createdAt)}
                        </td>
                        <td>
                          <span
                            className={`ac-badge ${
                              days > 7
                                ? "ac-badge-error"
                                : days > 3
                                ? "ac-badge-warning"
                                : ""
                            }`}
                          >
                            {days != null ? `${days} days` : "--"}
                          </span>
                        </td>
                        <td>
                          {nudgeSent[user.id] ? (
                            <span
                              className="ac-badge ac-badge-success"
                              style={{ fontSize: 11 }}
                            >
                              Sent
                            </span>
                          ) : (
                            <button
                              className="ac-btn ac-btn-sm ac-btn-primary"
                              onClick={() => sendNudge(user)}
                              disabled={!user.email}
                            >
                              Send Nudge
                            </button>
                          )}
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

      {/* Panel 3: Failed Payments */}
      <div className="ac-card">
        <div className="ac-card-header">
          <span className="ac-card-title">Failed Payments</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {pastDueUsers.length} users
          </span>
        </div>
        <div className="ac-card-body" style={{ padding: 0 }}>
          {pastDueUsers.length === 0 ? (
            <div className="ac-empty">
              No failed payments. All subscriptions are current.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastDueUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email || "--"}</td>
                      <td>
                        <span className="ac-badge">
                          {user.tier || "unknown"}
                        </span>
                      </td>
                      <td>
                        <span className="ac-badge ac-badge-error">
                          past_due
                        </span>
                      </td>
                      <td>
                        <a
                          href={`mailto:${user.email}?subject=Payment%20Issue%20-%20TitleApp&body=Hi%20${encodeURIComponent(user.displayName || "there")},%0A%0AWe%20noticed%20a%20payment%20issue%20on%20your%20account.%20Can%20we%20help%20resolve%20this?%0A%0A--%20TitleApp%20Team`}
                          className="ac-btn ac-btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          Contact
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
