"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export interface DomainSlice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: DomainSlice[];
  total: number;
}

export function DomainDistributionChart({ data, total }: Props) {
  const slices = data.filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[130px] h-[130px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices.length > 0 ? slices : [{ name: "없음", value: 1, color: "#EEF0F3" }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              paddingAngle={slices.length > 1 ? 2 : 0}
            >
              {(slices.length > 0 ? slices : [{ color: "#EEF0F3" }]).map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-en text-2xl font-extrabold text-warm-800 leading-none">
            {total}
          </span>
          <span className="text-[10px] text-warm-400 mt-0.5">진행중</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2.5 text-[12.5px]">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: d.color }}
            />
            <span className="font-medium text-warm-600 whitespace-nowrap">{d.name}</span>
            <span className="ml-auto font-bold text-warm-800 font-en whitespace-nowrap">
              {d.value}건 · {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
