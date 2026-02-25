import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FunnelChart({ data, dataKey, nameKey, color }) {
  if (!data || data.length === 0) {
    return <div className="ac-empty">No data to display.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis
          dataKey={nameKey || "name"}
          type="category"
          tick={{ fontSize: 11, fill: "#64748b" }}
          width={80}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e8ebf3",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar
          dataKey={dataKey || "value"}
          fill={color || "#7c3aed"}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
