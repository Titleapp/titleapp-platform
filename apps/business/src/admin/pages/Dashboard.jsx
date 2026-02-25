import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  doc,
  onSnapshot,
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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
  if (n == null) return "$0";
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0 });
}

function fmtPct(n) {
  if (n == null) return "--";
  return Number(n).toFixed(1) + "%";
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [accounting, setAccounting] = useState({});
  const [liveCounts, setLiveCounts] = useState({});

  // Listen to analytics doc
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unsub = onSnapshot(doc(db, "analytics", `daily_${today}`), (snap) => {
      if (snap.exists()) setMetrics(snap.data());
    });
    return () => unsub();
  }, []);

  // Listen to accounting summary
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "accounting", "summary"), (snap) => {
      if (snap.exists()) setAccounting(snap.data());
    });
    return () => unsub();
  }, []);

  // Direct collection counts as fallback / live data
  useEffect(() => {
    async function fetchCounts() {
      try {
        const counts = {};

        // Count users
        try {
          const usersSnap = await getCountFromServer(collection(db, "users"));
          counts.users = usersSnap.data().count;
        } catch {
          const usersSnap = await getDocs(collection(db, "users"));
          counts.users = usersSnap.size;
        }

        // Count workspaces
        try {
          const wsSnap = await getCountFromServer(collection(db, "workspaces"));
          counts.workspaces = wsSnap.data().count;
        } catch {
          const wsSnap = await getDocs(collection(db, "workspaces"));
          counts.workspaces = wsSnap.size;
        }

        // Count tenants
        try {
          const tSnap = await getCountFromServer(collection(db, "tenants"));
          counts.tenants = tSnap.data().count;
        } catch {
          try {
            const tSnap = await getDocs(collection(db, "tenants"));
            counts.tenants = tSnap.size;
          } catch { counts.tenants = 0; }
        }

        // Count workers (raasPackages)
        try {
          const wSnap = await getCountFromServer(collection(db, "raasPackages"));
          counts.workers = wSnap.data().count;
        } catch {
          try {
            const wSnap = await getDocs(collection(db, "raasPackages"));
            counts.workers = wSnap.size;
          } catch { counts.workers = 0; }
        }

        // Count activity feed entries
        try {
          const afSnap = await getCountFromServer(collection(db, "activityFeed"));
          counts.activityEvents = afSnap.data().count;
        } catch { counts.activityEvents = 0; }

        setLiveCounts(counts);
      } catch (err) {
        console.warn("[Dashboard] Count fetch error:", err);
      }
    }
    fetchCounts();
  }, []);

  const rev = accounting.revenue || {};

  // Prefer analytics doc values, fall back to live counts
  const activeUsers = metrics.activeUsers ?? liveCounts.users ?? "--";
  const workersCreated = metrics.workersCreated ?? liveCounts.workers ?? "--";
  const workersPublished = metrics.workersPublished ?? "--";
  const apiCalls = metrics.apiCalls24h ?? "--";
  const revMtd = rev.mtd;
  const errorRate = metrics.errorRate;

  const cards = [
    {
      label: "Active Users",
      value: fmt(activeUsers),
      delta: metrics.signupsToday
        ? `+${metrics.signupsToday} today`
        : liveCounts.users
          ? `${liveCounts.users} total`
          : null,
      deltaDir: "up",
    },
    {
      label: "Workers Created",
      value: fmt(workersCreated),
      delta: metrics.workersCreatedToday ? `+${metrics.workersCreatedToday} today` : null,
      deltaDir: "up",
    },
    {
      label: "Workers Published",
      value: fmt(workersPublished),
    },
    {
      label: "API Calls (24h)",
      value: fmt(apiCalls),
    },
    {
      label: "Revenue (MTD)",
      value: fmtDollars(revMtd),
      delta: rev.mtdDelta
        ? `${rev.mtdDelta > 0 ? "+" : ""}${rev.mtdDelta}%`
        : null,
      deltaDir: rev.mtdDelta > 0 ? "up" : rev.mtdDelta < 0 ? "down" : "flat",
    },
    {
      label: "Error Rate",
      value: fmtPct(errorRate),
      deltaDir: (errorRate || 0) > 5 ? "down" : "flat",
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
