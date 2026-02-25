import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export default function RevenueChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function load() {
      const q = query(
        collection(db, "analytics"),
        orderBy("date", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      const items = snap.docs
        .map((d) => d.data())
        .filter((d) => d.date)
        .reverse()
        .map((d) => ({
          date: d.date?.slice(5) || "",
          revenue: d.revenue || 0,
          expenses: d.expenses || 0,
        }));
      setData(items);
    }
    load();
  }, []);

  if (data.length === 0) {
    return <div className="ac-empty">Revenue chart will populate with data.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e8ebf3",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#7c3aed"
          fill="rgba(124,58,237,0.1)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#ef4444"
          fill="rgba(239,68,68,0.05)"
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
