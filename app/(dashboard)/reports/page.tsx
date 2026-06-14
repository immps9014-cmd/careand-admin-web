"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, Star, Cpu, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { dashboardApi } from "@/lib/api/dashboard";
import { aiModelsApi } from "@/lib/api/ai-models";
import { csApi } from "@/lib/api/cs";
import { cn, formatKRW } from "@/lib/utils";
import { DomainDistributionChart } from "./_components/domain-distribution-chart";
import { RatingDistributionChart } from "./_components/rating-distribution-chart";

/** 클라이언트 측 CSV 다운로드 (실데이터 기반) */
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "warn" | "crit";
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-warm-100 last:border-0">
      <span className="text-[13px] text-warm-500 whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "text-[13px] font-bold font-en whitespace-nowrap",
          tone === "crit" ? "text-danger" : tone === "warn" ? "text-warn" : "text-warm-800"
        )}
      >
        {value}
      </span>
    </div>
  );
}

const DOMAIN_SLICES = [
  { key: "senior", name: "시니어 돌봄", color: "#7C3AED" },
  { key: "nursing", name: "병원 간병", color: "#3B82F6" },
  { key: "housekeeping", name: "가사", color: "#22C55E" },
  { key: "postpartum", name: "산후", color: "#F59E0B" },
];

function fmtLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}
function accuracyColor(pct: number) {
  if (pct >= 90) return "#22C55E";
  if (pct >= 85) return "#3B82F6";
  return "#F59E0B";
}

export default function ReportsPage() {
  const kpiQuery = useQuery({
    queryKey: ["admin", "dashboard", "kpi"],
    queryFn: dashboardApi.kpi,
  });
  const csQuery = useQuery({
    queryKey: ["admin", "cs", "stats"],
    queryFn: csApi.stats,
  });
  const modelsQuery = useQuery({
    queryKey: ["admin", "ai-models", "list"],
    queryFn: aiModelsApi.list,
  });

  const kpi = kpiQuery.data?.data;
  const cs = csQuery.data;
  const models = modelsQuery.data;

  const generatedAt = kpiQuery.data?.updated_at
    ? new Date(kpiQuery.data.updated_at).toLocaleString("ko-KR")
    : "-";

  // 성능 경고: 1초(1000ms) 초과 지연 모델 수 (실데이터 기반)
  const slowModels = models?.data.filter((m) => m.avg_latency_ms >= 1000).length ?? 0;

  // 도메인별 진행중 매칭 분포 (실데이터: kpi.by_domain)
  const domainData = DOMAIN_SLICES.map((d) => ({
    name: d.name,
    color: d.color,
    value: kpi?.by_domain?.[d.key]?.matches_in_progress ?? 0,
  }));
  const domainTotal = domainData.reduce((sum, d) => sum + d.value, 0);

  // 평점 분포 (실데이터: cs.rating_distribution)
  const ratingData = [1, 2, 3, 4, 5].map((r) => ({
    rating: String(r),
    count: cs?.rating_distribution?.[String(r)] ?? 0,
  }));

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            통계 리포트
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            운영 데이터를 실시간 집계한 통계 리포트 · 기준 {generatedAt}
          </p>
        </div>
        <Button variant="outline" size="md" disabled>
          <Calendar className="w-4 h-4" />
          이번 주
        </Button>
      </div>

      {/* 실시간 통계 3종 */}
      <div className="grid grid-cols-3 gap-4 mb-[18px]">
        {/* 운영 통계 */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-[18px] py-[15px] border-b border-warm-100">
            <span className="w-8 h-8 rounded-[9px] bg-brand-50 text-brand-600 flex items-center justify-center">
              <TrendingUp className="w-[17px] h-[17px]" />
            </span>
            <h3 className="text-sm font-extrabold text-warm-800">운영 통계</h3>
          </div>
          <div className="flex-1 px-[18px] py-1.5">
            <StatRow label="오늘 매칭" value={`${kpi?.matches_today ?? 0}건`} />
            <StatRow label="진행중 매칭" value={`${kpi?.matches_in_progress ?? 0}건`} />
            <StatRow label="주간 매출" value={formatKRW(kpi?.revenue_this_week ?? 0)} />
            <StatRow label="활성 인력" value={`${kpi?.active_caregivers ?? 0}명`} />
            <StatRow
              label="승인 대기 인력"
              value={`${kpi?.pending_caregivers ?? 0}명`}
              tone={kpi && kpi.pending_caregivers > 0 ? "warn" : undefined}
            />
          </div>
          <button
            type="button"
            disabled={!kpi}
            onClick={() =>
              kpi &&
              downloadCsv("careand_운영통계.csv", [
                ["항목", "값"],
                ["오늘 매칭", kpi.matches_today],
                ["진행중 매칭", kpi.matches_in_progress],
                ["오늘 매출", kpi.revenue_today],
                ["주간 매출", kpi.revenue_this_week],
                ["활성 사용자", kpi.active_users],
                ["활성 어르신", kpi.active_seniors],
                ["활성 인력", kpi.active_caregivers],
                ["승인 대기 인력", kpi.pending_caregivers],
                ["미해결 고위험 알림", kpi.high_alerts_unresolved],
              ])
            }
            className="flex items-center justify-center gap-1.5 py-3 border-t border-warm-100 bg-warm-50/60 text-xs font-bold text-warm-600 hover:text-brand-600 disabled:opacity-50 disabled:hover:text-warm-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV 다운로드
          </button>
        </Card>

        {/* 서비스 품질 */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-[18px] py-[15px] border-b border-warm-100">
            <span className="w-8 h-8 rounded-[9px] bg-warn-bg text-warn flex items-center justify-center">
              <Star className="w-[17px] h-[17px]" />
            </span>
            <h3 className="text-sm font-extrabold text-warm-800">서비스 품질</h3>
          </div>
          <div className="flex-1 px-[18px] py-1.5">
            <StatRow label="전체 후기" value={`${cs?.reviews_total ?? 0}건`} />
            <StatRow label="평균 평점" value={cs ? cs.reviews_avg.toFixed(2) : "-"} />
            <StatRow
              label="부정 후기 (★1~2)"
              value={`${cs?.reviews_negative ?? 0}건`}
              tone={cs && cs.reviews_negative > 0 ? "crit" : undefined}
            />
            <StatRow label="CS 상담 전체" value={`${cs?.chatbot_total ?? 0}건`} />
            <StatRow
              label="진행중 CS 상담"
              value={`${cs?.chatbot_open ?? 0}건`}
              tone={cs && cs.chatbot_open > 0 ? "warn" : undefined}
            />
          </div>
          <button
            type="button"
            disabled={!cs}
            onClick={() =>
              cs &&
              downloadCsv("careand_서비스품질.csv", [
                ["평점", "건수"],
                ...[5, 4, 3, 2, 1].map((r) => [
                  `★${r}`,
                  cs.rating_distribution[String(r)] ?? 0,
                ]),
                ["평균 평점", cs.reviews_avg],
                ["부정 후기", cs.reviews_negative],
              ])
            }
            className="flex items-center justify-center gap-1.5 py-3 border-t border-warm-100 bg-warm-50/60 text-xs font-bold text-warm-600 hover:text-brand-600 disabled:opacity-50 disabled:hover:text-warm-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV 다운로드
          </button>
        </Card>

        {/* AI 모델 */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-[18px] py-[15px] border-b border-warm-100">
            <span className="w-8 h-8 rounded-[9px] bg-info-bg text-info flex items-center justify-center">
              <Cpu className="w-[17px] h-[17px]" />
            </span>
            <h3 className="text-sm font-extrabold text-warm-800">AI 모델</h3>
          </div>
          <div className="flex-1 px-[18px] py-1.5">
            <StatRow label="전체 모델" value={`${models?.summary.total ?? 0}개`} />
            <StatRow label="운영중 (active)" value={`${models?.summary.active ?? 0}개`} />
            <StatRow label="섀도우 (shadow)" value={`${models?.summary.shadow ?? 0}개`} />
            <StatRow label="폐기 (deprecated)" value={`${models?.summary.deprecated ?? 0}개`} />
            <StatRow
              label="성능 경고 (지연 ≥1s)"
              value={`${slowModels}건`}
              tone={slowModels > 0 ? "warn" : undefined}
            />
          </div>
          <button
            type="button"
            disabled={!models}
            onClick={() =>
              models &&
              downloadCsv("careand_AI모델성능.csv", [
                ["모델", "버전", "상태", "정확도", "평균지연(ms)"],
                ...models.data.map((m) => [
                  m.model_name,
                  m.version,
                  m.status,
                  m.accuracy,
                  m.avg_latency_ms,
                ]),
              ])
            }
            className="flex items-center justify-center gap-1.5 py-3 border-t border-warm-100 bg-warm-50/60 text-xs font-bold text-warm-600 hover:text-brand-600 disabled:opacity-50 disabled:hover:text-warm-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV 다운로드
          </button>
        </Card>
      </div>

      {/* 시각화: 평점 분포 + 도메인별 매칭 분포 */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-4 mb-[18px]">
        <Card className="p-6">
          <div className="mb-2">
            <h2 className="text-base font-bold text-warm-800">평점 분포</h2>
            <p className="text-[11px] text-warm-500 mt-0.5">
              전체 후기 {cs?.reviews_total ?? 0}건 · 평점별 건수
            </p>
          </div>
          <RatingDistributionChart data={ratingData} />
        </Card>
        <Card className="p-6">
          <div className="mb-3">
            <h2 className="text-base font-bold text-warm-800">도메인별 매칭 분포</h2>
            <p className="text-[11px] text-warm-500 mt-0.5">진행중 {domainTotal}건 기준</p>
          </div>
          <DomainDistributionChart data={domainData} total={domainTotal} />
        </Card>
      </div>

      {/* AI 모델 성능 상세 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-warm-800">AI 모델 성능 상세</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            {models?.summary.total ?? 0}개 모델
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>모델</TableHead>
              <TableHead>버전</TableHead>
              <TableHead>정확도</TableHead>
              <TableHead>평균 지연</TableHead>
              <TableHead className="text-right">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-warm-400 py-10">
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {models?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-warm-400 py-10">
                  등록된 모델이 없습니다
                </TableCell>
              </TableRow>
            )}
            {models?.data.map((m) => {
              const accPct = m.accuracy * 100;
              const isSlow = m.avg_latency_ms >= 1000;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-semibold text-warm-800">
                    {m.model_name}
                  </TableCell>
                  <TableCell>
                    <span className="font-en text-[11px] text-warm-500 bg-warm-100 rounded-md px-2 py-0.5">
                      {m.version}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-block w-[60px] h-[7px] bg-warm-200 rounded-sm overflow-hidden">
                        <span
                          className="block h-full rounded-sm"
                          style={{
                            width: `${Math.min(100, accPct)}%`,
                            background: accuracyColor(accPct),
                          }}
                        />
                      </span>
                      <span
                        className={cn(
                          "font-en text-[12.5px] font-bold w-[44px]",
                          accPct < 85 ? "text-warn" : "text-warm-800"
                        )}
                      >
                        {accPct.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-en text-[12.5px] font-bold",
                        isSlow ? "text-warn" : "text-warm-600"
                      )}
                    >
                      {fmtLatency(m.avg_latency_ms)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        m.status === "active"
                          ? "success"
                          : m.status === "shadow"
                          ? "warn"
                          : "outline"
                      }
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
