"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRightLeft, Clock, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/domain/kpi-card";
import { AlertItem } from "@/components/domain/alert-item";
import { dashboardApi } from "@/lib/api/dashboard";
import { cn, formatKRW, ko } from "@/lib/utils";
import { HourlyRequestsChart } from "./_components/hourly-requests-chart";

const DOMAIN_CARDS = [
  { key: "senior", label: "요양보호" },
  { key: "nursing", label: "간병" },
  { key: "living_support", label: "생활지원" },
  { key: "postpartum", label: "산후" },
  { key: "childcare", label: "아이돌봄" },
  { key: "mental_care", label: "마음돌봄" },
];

const RISK_DESC: Record<string, string> = {
  fall: "활동량 급감 · 낙상 위험 신호 감지",
  dementia: "인지 점수 하락 · 배회 패턴 감지",
  depression: "대화 응답 감소 · 식욕 저하 징후",
};

function getSeverityTier(s: string): "crit" | "warn" | "watch" {
  if (s === "critical") return "crit";
  if (s === "high") return "warn";
  return "watch";
}
function getSeverityLevel(s: string) {
  if (s === "critical") return "위급";
  if (s === "high") return "주의";
  return "관찰";
}
function getRegionStatus(row: { status: string; supply_rate_pct: number }) {
  if (row.supply_rate_pct > 150) return { label: "돌봄전문가 여유", cls: "text-info" };
  if (row.status === "good") return { label: "적정", cls: "text-brand-600" };
  if (row.status === "warning") return { label: "돌봄전문가 부족", cls: "text-warn" };
  return { label: "심각 부족", cls: "text-danger" };
}
function getRegionBarColor(row: { status: string; supply_rate_pct: number }) {
  if (row.supply_rate_pct > 150) return "bg-info";
  if (row.status === "good") return "bg-gradient-to-r from-brand-400 to-brand-600";
  return "bg-gradient-to-r from-warn to-[#A86A0A]";
}

export default function DashboardPage() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const kpiQuery = useQuery({ queryKey: ["admin", "dashboard", "kpi"], queryFn: dashboardApi.kpi, refetchInterval: 60_000 });
  const hourlyQuery = useQuery({ queryKey: ["admin", "dashboard", "hourly", "today"], queryFn: () => dashboardApi.hourlyRequests("today") });
  const alertsQuery = useQuery({ queryKey: ["admin", "dashboard", "alerts"], queryFn: dashboardApi.recentAlerts, refetchInterval: 30_000 });
  const regionalQuery = useQuery({ queryKey: ["admin", "dashboard", "regional"], queryFn: dashboardApi.regionalDemand });

  const kpi = kpiQuery.data?.data;
  const alertData = alertsQuery.data?.data ?? [];
  const critCount = alertData.filter(a => a.severity === "critical").length;
  const warnCount = alertData.filter(a => a.severity === "high").length;
  const watchCount = alertData.length - critCount - warnCount;
  const alertSubLabel = alertData.length > 0 ? `위급 ${critCount} · 주의 ${warnCount} · 관찰 ${watchCount}` : undefined;

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">실시간 운영 대시보드</h1>
          <p className="text-sm text-warm-500 mt-1">전체 매칭, 매출, AI 알림을 한눈에 모니터링</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 rounded-md text-sm text-warm-700 font-en">
          <span className="w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_0_3px_rgba(63,125,82,0.2)]" />
          <span>{now.getFullYear()}-{String(now.getMonth()+1).padStart(2,"0")}-{String(now.getDate()).padStart(2,"0")}{" "}{String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}:{String(now.getSeconds()).padStart(2,"0")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard variant="alert" label="미해결 위험 알림" value={kpi?.high_alerts_unresolved ?? 0} icon={AlertTriangle} subLabel={alertSubLabel} cta="즉시 확인" />
        <KpiCard label="검수 대기 돌봄전문가" value={kpi?.pending_caregivers ?? 0} icon={Clock} />
        <KpiCard label="진행중 매칭" value={kpi?.matches_in_progress ?? 0} icon={ArrowRightLeft} />
        <KpiCard label="이번 주 매출" value={kpi ? formatKRW(kpi.revenue_this_week) : "0"} icon={DollarSign} trend={kpi && kpi.revenue_change_pct != null ? { pct: kpi.revenue_change_pct, label: "전주 대비" } : undefined} />
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-warm-800">도메인별 현황</h2>
            <span className="text-[11px] text-warm-400">진행중 매칭 · 주간 요청 · 주간 매출</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {DOMAIN_CARDS.map((d) => {
              const v = kpi?.by_domain?.[d.key];
              return (
                <div key={d.key} className="rounded-lg border border-warm-100 p-4">
                  <div className="text-xs font-semibold text-warm-500 mb-2">{d.label}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-en text-xl font-bold text-warm-800">{v?.matches_in_progress ?? 0}</span>
                    <span className="text-[11px] text-warm-400">진행중</span>
                  </div>
                  <div className="text-[11px] text-warm-500 mt-1.5">주간 요청 {v?.requests_this_week ?? 0}건 · {formatKRW(v?.revenue_this_week ?? 0)}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="col-span-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base font-bold text-warm-800">시간대별 매칭 요청</h2>
                <p className="text-[11px] text-warm-500 mt-0.5">오늘 06시 ~ 22시</p>
              </div>
              <div className="inline-flex bg-warm-100 p-1 rounded-md">
                <button className="px-3 py-1.5 text-xs font-semibold text-warm-800 bg-white shadow-sm rounded">오늘</button>
                <button className="px-3 py-1.5 text-xs font-semibold text-warm-600">7일</button>
                <button className="px-3 py-1.5 text-xs font-semibold text-warm-600">30일</button>
              </div>
            </div>
            <HourlyRequestsChart data={hourlyQuery.data?.data || []} />
            <div className="mt-4 pt-4 border-t border-warm-100 flex gap-8">
              <div>
                <div className="text-[11px] text-warm-500">피크</div>
                <div className="font-en text-base font-bold text-warm-800 mt-0.5">{hourlyQuery.data?.peak_hour ?? "-"}시 · {hourlyQuery.data?.peak_count ?? 0}건</div>
              </div>
              <div>
                <div className="text-[11px] text-warm-500">평균 매칭 소요</div>
                <div className="font-en text-base font-bold text-brand-600 mt-0.5">{hourlyQuery.data?.avg_match_minutes != null ? `${hourlyQuery.data.avg_match_minutes}분` : "—"}</div>
              </div>
              <div>
                <div className="text-[11px] text-warm-500">총 요청</div>
                <div className="font-en text-base font-bold text-warm-800 mt-0.5">{hourlyQuery.data?.total_count ?? 0}건</div>
              </div>
              <div>
                <div className="text-[11px] text-warm-500">매칭 성공률</div>
                <div className="font-en text-base font-bold text-warm-800 mt-0.5">{hourlyQuery.data?.match_success_rate != null ? `${hourlyQuery.data.match_success_rate}%` : "—"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-warm-800 flex items-center gap-2">
                긴급 위험 알림
                {alertData.length > 0 && <Badge variant="danger" className="font-en">{alertData.length}</Badge>}
              </h2>
              <span className="text-[11px] text-warm-400">위험도순</span>
            </div>
            {alertData.length === 0 ? (
              <p className="text-sm text-warm-500 text-center py-8">긴급 알림이 없습니다 ✓</p>
            ) : (
              alertData.map((alert) => {
                const tier = getSeverityTier(alert.severity);
                const level = getSeverityLevel(alert.severity);
                const riskName = ko.riskType[alert.risk_type as keyof typeof ko.riskType] || alert.risk_type;
                return (
                  <AlertItem
                    key={alert.id}
                    severity={tier}
                    name={`${alert.senior_name} 어르신`}
                    chipLabel={`${riskName} ${level}`}
                    desc={RISK_DESC[alert.risk_type] ?? `${riskName} 이상 감지`}
                    score={alert.risk_score}
                    elapsed={tier !== "watch" ? `${alert.detected_ago} · 미처리` : alert.detected_ago}
                    action={tier === "crit" ? "배정" : "확인"}
                  />
                );
              })
            )}
            {alertData.length > 0 && (
              <div className="text-center pt-3">
                <button className="text-xs font-bold text-brand-600 hover:underline">전체 알림 {alertData.length}건 보기 →</button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="px-6 py-5 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">지역별 수요 예측 · 다음 7일</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">AI 모델 v1.3.2</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지역</TableHead>
              <TableHead className="text-right">예측 수요</TableHead>
              <TableHead className="text-right">대기 돌봄전문가</TableHead>
              <TableHead className="text-right">충족률</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regionalQuery.data?.data.map((row) => {
              const rs = getRegionStatus(row);
              return (
                <TableRow key={row.region}>
                  <TableCell className="font-semibold">{row.region}</TableCell>
                  <TableCell className="text-right font-en font-semibold">{row.weekly_requests}건</TableCell>
                  <TableCell className="text-right font-en font-semibold">{row.caregiver_count}명</TableCell>
                  <TableCell className="text-right">
                    <span className="font-en font-semibold mr-2">{row.supply_rate_pct}%</span>
                    <span className="inline-block w-15 h-1.5 bg-warm-200 rounded-sm overflow-hidden align-middle">
                      <span className={cn("block h-full rounded-sm", getRegionBarColor(row))} style={{ width: `${Math.min(100, row.supply_rate_pct)}%` }} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", rs.cls)}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{rs.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!regionalQuery.data || regionalQuery.data.data.length === 0) && (
              <TableRow><TableCell colSpan={5} className="text-center text-warm-500 py-8">데이터를 불러오는 중...</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
