import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

const SEVERITY_DOT = {
  info: "ac-feed-dot-info",
  success: "ac-feed-dot-success",
  warning: "ac-feed-dot-warning",
  error: "ac-feed-dot-error",
};

const TYPE_FILTERS = [
  "All",
  "Signups",
  "Workers",
  "Revenue",
  "Errors",
  "Communications",
];

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function matchesFilter(type, filter) {
  if (filter === "All") return true;
  const map = {
    Signups: "signup",
    Workers: "worker",
    Revenue: "revenue",
    Errors: "error",
    Communications: "communication",
  };
  return type === map[filter];
}

export default function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const q = query(
      collection(db, "activityFeed"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(items);
    });

    return () => unsubscribe();
  }, []);

  const filtered = events.filter((e) => matchesFilter(e.type, filter));

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            className={`ac-btn ac-btn-sm ${filter === f ? "ac-btn-primary" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="ac-feed">
        {filtered.length === 0 && (
          <div className="ac-empty">No activity yet.</div>
        )}
        {filtered.map((event) => (
          <div key={event.id} className="ac-feed-item">
            <div
              className={`ac-feed-dot ${
                SEVERITY_DOT[event.severity] || SEVERITY_DOT.info
              }`}
            />
            <div className="ac-feed-msg">{event.message}</div>
            <div className="ac-feed-time">{timeAgo(event.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
