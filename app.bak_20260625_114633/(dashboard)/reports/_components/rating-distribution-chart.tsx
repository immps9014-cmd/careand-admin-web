"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface RatingBar {
  rating: string;
  count: number;
}

interface Props {
  data: RatingBar[];
}

const BAR_COLOR = (rating: string) => {
  const r = Number(rating);
  if (r <= 2) return "#EF4444"; // danger
  if (r === 3) return "#F59E0B"; // warn
  return "#10B981"; // brand
};

export function RatingDistributionChart({ data }: Props) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#F1F5F9" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="rating"
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={{ stroke: "#E2E8F0", strokeWidth: 1 }}
            tickFormatter={(r) => `★${r}`}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Plus Jakarta Sans" }}
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "#F1F5F9" }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 4px 12px rgba(16,185,129,0.08)",
            }}
            labelFormatter={(label) => `★${label}`}
            formatter={(value: number) => [`${value}건`, "후기"]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((d) => (
              <Cell key={d.rating} fill={BAR_COLOR(d.rating)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
