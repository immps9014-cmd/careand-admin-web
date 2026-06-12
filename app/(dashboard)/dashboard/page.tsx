"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/domain/kpi-card";
import { AlertItem } from "@/components/domain/alert-item";
import { dashboardApi } from "@/lib/api/dashboard";
import { cn, formatKRW, ko } from "@/lib/utils";
import { HourlyRequestsChart } from "./_components/hourly-requests-chart";

const DOMAIN_CARDS = [
  { key: "senior", label: "시니어 돌봄" },
  { key: "nursing", label: "병원 간병" },
  { key: "housekeeping", label: "가사" },
  { key: "postpartum", label: "산후" },
];

export default function DashboardPage() {
  const [now, setNow] = useState(new Date());

  // 실시간 시계
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 4가지 데이터 병렬 조회
  const kpiQuery = useQuery({
    queryKey: ["admin", "dashboard", "kpi"],
    queryFn: dashboardApi.kpi,
    refetchInterval: 60_000, // 1분마다 갱신
  });

  const hourlyQuery = useQuery({
    queryKey: ["admin", "dashboard", "hourly", "today"],
    queryFn: () => dashboardApi.hourlyRequests("today"),
  });

  const alertsQuery = useQuery({
    queryKey: ["admin", "dashboard", "alerts"],
    queryFn: dashboardApi.recentAlerts,
    refetchInterval: 30_000, // 30초마다 (긴급 알림이라)
  });

  const regionalQuery = useQuery({
    queryKey: ["admin", "dashboard", "regional"],
    queryFn: dashboardApi.regionalDemand,
  });

  const kpi = kpiQuery.data?.data;

  return (
    <div className="p-8">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            실시간 운영 대시보드
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            전체 매칭, 매출, AI 알림을 한눈에 모니터링
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 rounded-md text-sm text-warm-700 font-en">
          <span className="w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_0_3px_rgba(63,125,82,0.2)]" />
          <span>
            {now.getFullYear()}-
            {String(now.getMonth() + 1).padStart(2, "0")}-
            {String(now.getDate()).padStart(2, "0")}{" "}
            {String(now.getHours()).padStart(2, "0")}:
            {String(now.getMinutes()).padStart(2, "0")}:
            {String(now.getSeconds()).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* KPI 4개 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          variant="brand"
          label="진행중 매칭"
          value={kpi?.matches_in_progress ?? 0}
          icon={ArrowRightLeft}
          trend={{
            pct: 18,
            label: "전주 대비",
          }}
        />
        <KpiCard
          label="이번 주 매출"
          value={kpi ? formatKRW(kpi.revenue_this_week) : "0"}
          icon={DollarSign}
          trend={
            kpi
              ? {
                  pct: kpi.revenue_change_pct,
                  label: "전주 대비",
                }
              : undefined
          }
        />
        <KpiCard
          label="AI 알림 (high+)"
          value={kpi?.high_alerts_unresolved ?? 0}
          icon={AlertTriangle}
          iconColor="danger"
          trend={
            kpi && kpi.high_alerts_unresolved > 0
              ? { pct: -1, label: `미해결 ${kpi.high_alerts_unresolved}건` }
              : undefined
          }
        />
        <KpiCard
          label="검수 대기 인력"
          value={kpi?.pending_caregivers ?? 0}
          icon={Clock}
        />
      </div>

      {/* 도메인별 현황 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-warm-800">도메인별 현황</h2>
            <span className="text-[11px] text-warm-400">진행중 매칭 · 주간 요청 · 주간 매출</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {DOMAIN_CARDS.map((d) => {
              const v = kpi?.by_domain?.[d.key];
              return (
                <div key={d.key} className="rounded-lg border border-warm-100 p-4">
                  <div className="text-xs font-semibold text-warm-500 mb-2">{d.label}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-en text-xl font-bold text-warm-800">
                      {v?.matches_in_progress ?? 0}
                    </span>
                    <span className="text-[11px] text-warm-400">진행중</span>
                  </div>
                  <div className="text-[11px] text-warm-500 mt-1.5">
                    주간 요청 {v?.requests_this_week ?? 0}건 · {formatKRW(v?.revenue_this_week ?? 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 차트 + 알림 (2:1) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="col-span-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base font-bold text-warm-800">
                  시간대별 매칭 요청
                </h2>
                <p className="text-[11px] text-warm-500 mt-0.5">
                  오늘 06시 ~ 22시
                </p>
              </div>
              <div className="inline-flex bg-warm-100 p-1 rounded-md">
                <button className="px-3 py-1.5 text-xs font-semibold text-warm-800 bg-white shadow-sm rounded">
                  오늘
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold text-warm-600">
                  7일
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold text-warm-600">
                  30일
                </button>
              </div>
            </div>

            <HourlyRequestsChart data={hourlyQuery.data?.data || []} />

            <div className="mt-4 pt-4 border-t border-warm-100 flex gap-8">
              <div>
                <div className="text-[11px] text-warm-500">피크</div>
                <div className="font-en text-base font-bold text-warm-800 mt-0.5">
                  {hourlyQuery.data?.peak_hour ?? "-"}시 ·{" "}
                  {hourlyQuery.data?.peak_count ?? 0}건
                </div>
              </div>
              <div>
                <div className="text-[11px] text-warm-500">평균 매칭 소요</div>
                <div className="font-en text-base font-bold text-brand-600 mt-0.5">
                  23분
                </div>
              </div>
              <div>
                <div className="text-[11px] text-warm-500">총 요청</div>
                <div className="font-en text-base font-bold text-warm-800 mt-0.5">
                  {hourlyQuery.data?.total_count ?? 0}건
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 긴급 알림 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-bold text-warm-800 flex items-center gap-2 mb-4">
              긴급 알림
              {(alertsQuery.data?.data.length ?? 0) > 0 && (
                <Badge variant="danger" className="font-en">
                  {alertsQuery.data?.data.length}
                </Badge>
              )}
            </h2>

            {alertsQuery.data?.data.length === 0 ? (
              <p className="text-sm text-warm-500 text-center py-8">
                긴급 알림이 없습니다 ✓
              </p>
            ) : (
              alertsQuery.data?.data.map((alert) => (
                <AlertItem
                  key={alert.id}
                  severity={
                    alert.severity === "critical" || alert.severity === "high"
                      ? "high"
                      : "warn"
                  }
                  title={`${alert.senior_name} 어르신 - ${
                    ko.riskType[alert.risk_type as keyof typeof ko.riskType] ||
                    alert.risk_type
                  } 위험`}
                  meta={`${alert.risk_score}점 · ${alert.detected_ago}`}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 지역별 수요 예측 */}
      <Card>
        <div className="px-6 py-5 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">
            지역별 수요 예측 · 다음 7일
          </h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            AI 모델 v1.3.2
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지역</TableHead>
              <TableHead className="text-right">예측 수요</TableHead>
              <TableHead className="text-right">대기 인력</TableHead>
              <TableHead className="text-right">충족률</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regionalQuery.data?.data.map((row) => (
              <TableRow key={row.region}>
                <TableCell className="font-semibold">{row.region}</TableCell>
                <TableCell className="text-right font-en font-semibold">
                  {row.weekly_requests}건
                </TableCell>
                <TableCell className="text-right font-en font-semibold">
                  {row.caregiver_count}명
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-en font-semibold mr-2">
                    {row.supply_rate_pct}%
                  </span>
                  <span className="inline-block w-15 h-1.5 bg-warm-200 rounded-sm overflow-hidden align-middle">
                    <span
                      className={cn(
                        "block h-full rounded-sm",
                        row.supply_rate_pct >= 80
                          ? "bg-gradient-to-r from-brand-400 to-brand-600"
                          : "bg-gradient-to-r from-warn to-[#A86A0A]"
                      )}
                      style={{ width: `${Math.min(100, row.supply_rate_pct)}%` }}
                    />
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-semibold",
                      row.status === "good" && "text-brand-600",
                      row.status === "warning" && "text-warn",
                      row.status === "critical" && "text-danger"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full bg-current"
                      )}
                    />
                    {row.status === "good"
                      ? "적정"
                      : row.status === "warning"
                      ? "부족 우려"
                      : "심각"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {(!regionalQuery.data || regionalQuery.data.data.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-warm-500 py-8">
                  데이터를 불러오는 중...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
