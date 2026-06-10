"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyRequest } from "@/lib/api/dashboard";

interface Props {
  data: HourlyRequest[];
}

export function HourlyRequestsChart({ data }: Props) {
  // 06시 ~ 22시만 표시
  const filtered = data.filter((d) => d.hour >= 6 && d.hour <= 22);

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filtered}
          margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3F7D52" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#3F7D52" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E8E0D2" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "#6E6757", fontFamily: "Plus Jakarta Sans" }}
            tickLine={false}
            axisLine={{ stroke: "#9A917F", strokeWidth: 1 }}
            tickFormatter={(h) => String(h).padStart(2, "0")}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#9A917F", fontFamily: "Plus Jakarta Sans" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "#F4EFE6" }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E8E0D2",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 4px 12px rgba(58, 53, 43, 0.08)",
            }}
            labelFormatter={(label) => `${String(label).padStart(2, "0")}시`}
            formatter={(value: number) => [`${value}건`, "매칭 요청"]}
          />
          <Bar dataKey="count" fill="url(#bg1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
