"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, Star, Cpu } from "lucide-react";
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
import { formatKRW } from "@/lib/utils";

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

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-warm-50 last:border-0">
      <span className="text-sm text-warm-500">{label}</span>
      <span className="text-sm font-bold text-warm-800 font-en">{value}</span>
    </div>
  );
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

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          통계 리포트
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          운영 데이터를 실시간 집계한 통계 리포트 (기준: {generatedAt})
        </p>
      </div>

      {/* 실시간 통계 3종 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* 운영 리포트 */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-warm-800">운영 통계</h3>
          </div>
          <div className="flex-1">
            <StatRow label="오늘 매칭" value={`${kpi?.matches_today ?? 0}건`} />
            <StatRow label="진행중 매칭" value={`${kpi?.matches_in_progress ?? 0}건`} />
            <StatRow label="주간 매출" value={formatKRW(kpi?.revenue_this_week ?? 0)} />
            <StatRow label="활성 인력" value={`${kpi?.active_caregivers ?? 0}명`} />
            <StatRow label="승인 대기 인력" value={`${kpi?.pending_caregivers ?? 0}명`} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
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
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </Button>
        </Card>

        {/* 서비스 품질 리포트 */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-warm-800">서비스 품질</h3>
          </div>
          <div className="flex-1">
            <StatRow label="전체 후기" value={`${cs?.reviews_total ?? 0}건`} />
            <StatRow label="평균 평점" value={cs ? cs.reviews_avg.toFixed(2) : "-"} />
            <StatRow label="부정 후기 (★1~2)" value={`${cs?.reviews_negative ?? 0}건`} />
            <StatRow label="CS 상담 전체" value={`${cs?.chatbot_total ?? 0}건`} />
            <StatRow label="진행중 CS 상담" value={`${cs?.chatbot_open ?? 0}건`} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
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
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </Button>
        </Card>

        {/* AI 모델 성능 */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-warm-800">AI 모델</h3>
          </div>
          <div className="flex-1">
            <StatRow label="전체 모델" value={`${models?.summary.total ?? 0}개`} />
            <StatRow label="운영중(active)" value={`${models?.summary.active ?? 0}개`} />
            <StatRow label="섀도우(shadow)" value={`${models?.summary.shadow ?? 0}개`} />
            <StatRow label="폐기(deprecated)" value={`${models?.summary.deprecated ?? 0}개`} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
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
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </Button>
        </Card>
      </div>

      {/* AI 모델 성능 상세 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">AI 모델 성능 상세</h2>
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
            {models?.data.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-warm-800">
                  {m.model_name}
                </TableCell>
                <TableCell className="font-en text-warm-600">{m.version}</TableCell>
                <TableCell className="font-en text-warm-600">
                  {(m.accuracy * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="font-en text-warm-600">
                  {m.avg_latency_ms}ms
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
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
