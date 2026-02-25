import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import ActivityFeed from "../components/ActivityFeed";
import MetricCard from "../components/MetricCard";
import RevenueChart from "../components/RevenueChart";
import DigestView from "../components/DigestView";

function fmt(n) {
  if (n == null || n === "--") return "--";
  if (typeof n === "number") return n.toLocaleString();
  return String(n);
}

function fmtDollars(n) {
  if (n == null) return "--";
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0 });
}

function fmtPct(n) {
  if (n == null) return "--";
  return Number(n).toFixed(1) + "%";
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [accounting, setAccounting] = useState({});

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unsub = onSnapshot(doc(db, "analytics", `daily_${today}`), (snap) => {
      if (snap.exists()) setMetrics(snap.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "accounting", "summary"), (snap) => {
      if (snap.exists()) setAccounting(snap.data());
    });
    return () => unsub();
  }, []);

  const rev = accounting.revenue || {};

  const cards = [
    {
      label: "Active Users",
      value: fmt(metrics.activeUsers),
      delta: metrics.signupsToday ? `+${metrics.signupsToday} today` : null,
      deltaDir: "up",
    },
    {
      label: "Workers Created",
      value: fmt(metrics.workersCreated),
      delta: metrics.workersCreatedToday ? `+${metrics.workersCreatedToday} today` : null,
      deltaDir: "up",
    },
    {
      label: "Workers Published",
      value: fmt(metrics.workersPublished),
    },
    {
      label: "API Calls (24h)",
      value: fmt(metrics.apiCalls24h),
    },
    {
      label: "Revenue (MTD)",
      value: fmtDollars(rev.mtd),
      delta: rev.mtdDelta
        ? `${rev.mtdDelta > 0 ? "+" : ""}${rev.mtdDelta}%`
        : null,
      deltaDir: rev.mtdDelta > 0 ? "up" : rev.mtdDelta < 0 ? "down" : "flat",
    },
    {
      label: "Error Rate",
      value: fmtPct(metrics.errorRate),
      deltaDir: (metrics.errorRate || 0) > 5 ? "down" : "flat",
    },
  ];

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Dashboard</h1>
        <p className="ac-page-subtitle">Platform overview — real-time</p>
      </div>

      <div className="ac-metrics">
        {cards.map((c, i) => (
          <MetricCard key={i} {...c} />
        ))}
      </div>

      {/* Today's Digest */}
      <div className="ac-card" style={{ marginBottom: "20px" }}>
        <div className="ac-card-header">
          <span className="ac-card-title">Today's Digest</span>
        </div>
        <div className="ac-card-body">
          <DigestView />
        </div>
      </div>

      {/* Charts row */}
      <div className="ac-grid-2">
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Revenue Over Time</span>
          </div>
          <div className="ac-card-body">
            <RevenueChart />
          </div>
        </div>
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Activity Feed</span>
          </div>
          <div className="ac-card-body">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
