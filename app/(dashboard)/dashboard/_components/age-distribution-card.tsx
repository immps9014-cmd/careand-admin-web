"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardApi, type AgeRole } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

const ROLES: { key: AgeRole; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "guardian", label: "보호자" },
  { key: "caregiver", label: "돌봄전문가" },
];

// 한 계열(크기 비교)이라 단색 — 브랜드 500(검증: 명도·채도·배경 대비 통과)
const BAR = "#D5603E";

/** 나이대별 회원 분포(만 나이·오늘 KST) — 구간은 회원 목록 「나이대」 필터와 같다. 생년월일 미입력은 막대 밖 숫자로 */
export function AgeDistributionCard() {
  const [role, setRole] = useState<AgeRole>("all");
  const q = useQuery({ queryKey: ["admin", "dashboard", "age", role], queryFn: () => dashboardApi.ageDistribution(role) });
  const d = q.data;
  const known = d ? d.total - d.unknown : 0;
  const peak = d?.bands.reduce((m, b) => (b.count > m.count ? b : m), d.bands[0]);
  const rows = (d?.bands ?? []).map((b) => ({ ...b, peakLabel: peak && b.key === peak.key && b.count > 0 ? `${b.count}명` : "" }));

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-warm-800">나이대별 회원 분포</h2>
            <p className="text-[11px] text-warm-500 mt-0.5">회원 생년월일 기준 만 나이 · 탈퇴·운영자·기관 제외</p>
          </div>
          <div className="inline-flex bg-warm-100 p-1 rounded-md" role="tablist" aria-label="회원 구분">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={role === r.key}
                onClick={() => setRole(r.key)}
                className={cn("px-3 py-1.5 text-xs font-semibold rounded transition-colors", role === r.key ? "bg-white text-warm-800 shadow-sm" : "text-warm-600 hover:text-warm-800")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {q.isLoading ? (
          <div className="h-56 animate-pulse rounded-lg bg-warm-50" />
        ) : known === 0 ? (
          <p className="h-56 flex items-center justify-center text-sm text-warm-500">생년월일이 입력된 회원이 아직 없어요.</p>
        ) : (
          <div className="h-56" aria-label={`나이대별 회원 수: ${(d?.bands ?? []).map((b) => `${b.label} ${b.count}명`).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 18, right: 8, left: 0, bottom: 4 }} barCategoryGap="28%">
                <CartesianGrid stroke="#EFEDEA" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6E6757" }} tickLine={false} axisLine={{ stroke: "#D9D4CB", strokeWidth: 1 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9A917F" }} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: "#F7F6F4" }}
                  contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E8E0D2", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(58,53,43,0.08)" }}
                  itemStyle={{ color: "#3A352B" }}
                  labelStyle={{ color: "#6E6757", fontWeight: 600 }}
                  formatter={(v: number) => [`${v}명${known ? ` (${Math.round((v / known) * 100)}%)` : ""}`, "회원"]}
                />
                <Bar dataKey="count" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                  {/* 가장 많은 나이대만 숫자(나머지는 마우스를 올리면) */}
                  <LabelList dataKey="peakLabel" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#3A352B" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-warm-100 flex flex-wrap gap-8">
          <div>
            <div className="text-[11px] text-warm-500">생년월일 입력</div>
            <div className="font-en text-base font-bold text-warm-800 mt-0.5">{known}명</div>
          </div>
          <div>
            <div className="text-[11px] text-warm-500">미입력</div>
            <div className="font-en text-base font-bold text-warm-800 mt-0.5">{d?.unknown ?? 0}명</div>
          </div>
          <div>
            <div className="text-[11px] text-warm-500">가장 많은 나이대</div>
            <div className="text-base font-bold text-brand-600 mt-0.5">{peak && peak.count > 0 ? `${peak.label} · ${peak.count}명` : "—"}</div>
          </div>
        </div>

        {/* 표 보기(스크린리더·인쇄용) */}
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-warm-500 hover:text-warm-700">표로 보기</summary>
          <table className="mt-2 w-full max-w-md text-xs">
            <thead><tr className="text-warm-500"><th className="text-left font-semibold py-1">나이대</th><th className="text-right font-semibold py-1">회원</th></tr></thead>
            <tbody>
              {(d?.bands ?? []).map((b) => (
                <tr key={b.key} className="border-t border-warm-100"><td className="py-1 text-warm-700">{b.label}</td><td className="py-1 text-right font-en text-warm-800">{b.count}</td></tr>
              ))}
              <tr className="border-t border-warm-100"><td className="py-1 text-warm-700">미입력</td><td className="py-1 text-right font-en text-warm-800">{d?.unknown ?? 0}</td></tr>
            </tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  );
}
