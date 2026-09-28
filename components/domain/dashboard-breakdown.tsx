"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchBreakdown } from "@/lib/api/dashboard";
import { formatKRW } from "@/lib/utils";

/**
 * 지점·도메인·기간 필터 현황 (기능 17, 2026-09-28 S5)
 * 지점 = 배정된 돌봄전문가의 소속 지점. 지점 미지정 인력이 많으면 지점별 수치가 비어 보인다(안내 문구로 표시).
 */
const DOMAINS: [string, string][] = [
  ["senior", "시니어 돌봄"], ["nursing", "간병"], ["housekeeping", "가사"], ["living_support", "생활지원"],
  ["postpartum", "산후"], ["childcare", "아이돌봄"], ["mental_care", "마음돌봄"],
];
const PERIODS: [string, string][] = [["today", "오늘"], ["week", "이번 주"], ["month", "이번 달"]];

export function DashboardBreakdown() {
  const [period, setPeriod] = useState("week");
  const [branch, setBranch] = useState("");
  const [domain, setDomain] = useState("");
  const q = useQuery({
    queryKey: ["admin", "dashboard", "breakdown", period, branch, domain],
    queryFn: () => fetchBreakdown({ period, branch_id: branch, domain }),
  });
  const d = q.data;
  const sel = "h-9 rounded-md border border-warm-200 bg-white px-2.5 text-sm text-warm-700";
  const stat = (label: string, value: string, sub?: string) => (
    <div className="rounded-lg bg-warm-50 px-3 py-2.5">
      <div className="text-[11px] font-semibold text-warm-500">{label}</div>
      <div className="font-en text-lg font-extrabold text-warm-800">{value}</div>
      {sub && <div className="text-[10.5px] text-warm-500">{sub}</div>}
    </div>
  );

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-brand-600" />
        <h2 className="font-bold text-warm-800">지점·도메인 현황</h2>
        <div className="ml-auto flex flex-wrap gap-2">
          <select aria-label="기간" className={sel} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select aria-label="지점" className={sel} value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">전체 지점</option>
            {(d?.by_branch ?? []).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
          </select>
          <select aria-label="도메인" className={sel} value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">전체 도메인</option>
            {DOMAINS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {q.isError && <div className="text-xs text-danger">현황을 불러오지 못했습니다.</div>}
      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {stat("매칭 요청", `${d.requests}건`, d.match_rate != null ? `성사 ${d.matched}건 · ${d.match_rate}%` : undefined)}
            {stat("매출", formatKRW(d.revenue))}
            {stat("완료 돌봄", `${d.sessions_completed}회`)}
            {stat("활성 인력", `${d.active_caregivers}명`)}
            {stat("인력 가동률", d.utilization != null ? `${d.utilization}%` : "-", "기간 중 1회 이상 돌봄")}
            {stat("평균 평점", d.rating_avg != null ? d.rating_avg.toFixed(2) : "-")}
          </div>
          {d.unassigned_caregivers > 0 && (
            <p className="mt-3 text-[11.5px] text-warn">
              활성 인력 중 {d.unassigned_caregivers}명이 지점 미지정이라 지점별 수치에서 빠집니다 — 돌봄전문가 관리에서 지점을 지정해 주세요.
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            <table className="w-full">
              <thead><tr className="text-left text-[11px] text-warm-500 border-b border-warm-100"><th className="py-1.5">지점</th><th className="py-1.5 text-right">매출</th><th className="py-1.5 text-right">활성 인력</th></tr></thead>
              <tbody>
                {d.by_branch.map((b) => (
                  <tr key={b.branch_id} className="border-b border-warm-50"><td className="py-1.5">{b.name}</td><td className="py-1.5 text-right font-en">{formatKRW(b.revenue)}</td><td className="py-1.5 text-right font-en">{b.active_caregivers}</td></tr>
                ))}
              </tbody>
            </table>
            <table className="w-full">
              <thead><tr className="text-left text-[11px] text-warm-500 border-b border-warm-100"><th className="py-1.5">도메인</th><th className="py-1.5 text-right">요청</th><th className="py-1.5 text-right">성사</th></tr></thead>
              <tbody>
                {d.by_domain.map((x) => (
                  <tr key={x.domain} className="border-b border-warm-50"><td className="py-1.5">{x.label}</td><td className="py-1.5 text-right font-en">{x.requests}</td><td className="py-1.5 text-right font-en">{x.matched}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
