"use client";
import { DOMAIN_LABEL } from "@/lib/caregiverType";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, PlayCircle, ClipboardCheck, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/domain/kpi-card";
import { operationsApi } from "@/lib/api/operations";
import { cn, formatDateTime } from "@/lib/utils";

const TABS = [
  { key: "", label: "진행 전체" },
  { key: "in_progress", label: "진행중" },
  { key: "scheduled", label: "예정" },
  { key: "completed", label: "완료·검수대기" },
];

const STATUS: Record<
  string,
  { variant: "brand" | "info" | "success" | "warn" | "outline"; label: string }
> = {
  in_progress: { variant: "success", label: "진행중" },
  scheduled: { variant: "info", label: "예정" },
  completed: { variant: "warn", label: "완료·검수대기" },
  cancelled: { variant: "outline", label: "취소" },
};

function withGuardian(name: string, guardian: string | null) {
  return guardian ? `${name} (${guardian})` : name;
}

export default function CareSessionsPage() {
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["admin", "care-sessions", status],
    queryFn: () => operationsApi.careSessions({ status: status || undefined }),
    refetchInterval: 30_000,
  });

  const rows = query.data?.data ?? [];
  const sm = query.data?.summary;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-brand-500" /> 케어 진행 현황
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          매칭 완료 후 출근·진행·퇴근까지, AI 일지 검수 전 단계의 케어를 실시간 관리합니다.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard variant="brand" label="진행중" value={sm?.in_progress ?? 0} icon={PlayCircle} />
        <KpiCard label="예정" value={sm?.scheduled ?? 0} icon={Clock} iconColor="info" />
        <KpiCard label="완료·검수대기" value={sm?.completed_pending ?? 0} icon={ClipboardCheck} iconColor="warn" subLabel="AI 일지 검수 필요" />
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-2 mb-5">
        {TABS.map((t) => (
          <Button key={t.key} variant={status === t.key ? "primary" : "outline"} size="sm" onClick={() => setStatus(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>대상자(보호자)</TableHead>
              <TableHead>돌봄전문가</TableHead>
              <TableHead>직군</TableHead>
              <TableHead>예정 일정</TableHead>
              <TableHead>출근/퇴근</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">검수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-warm-400 py-10">불러오는 중…</TableCell></TableRow>
            )}
            {!query.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-warm-400 py-10">진행 중인 케어가 없습니다</TableCell></TableRow>
            )}
            {rows.map((s) => {
              const st = STATUS[s.status] ?? STATUS.scheduled;
              const reviewable = s.status === "completed" && s.review_status === "pending";
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-warm-800">
                    {withGuardian(s.recipient_name, s.guardian_name)}
                    {s.is_manual && <span className="ml-1.5 text-[10px] font-bold text-brand-600 bg-brand-50 rounded px-1.5 py-0.5">수동</span>}
                  </TableCell>
                  <TableCell className="text-warm-700">{s.caregiver_name}</TableCell>
                  <TableCell>
                    <Badge variant="brand">{DOMAIN_LABEL[s.service_domain] ?? s.service_domain}</Badge>
                  </TableCell>
                  <TableCell className="text-warm-600 font-en text-xs">
                    {s.scheduled_start ? formatDateTime(s.scheduled_start) : "-"}
                    {s.duration_min != null ? ` · ${s.duration_min}분` : ""}
                  </TableCell>
                  <TableCell className="text-warm-500 font-en text-xs">
                    <div>출근 {s.actual_start ? formatDateTime(s.actual_start) : "—"}</div>
                    <div>퇴근 {s.actual_end ? formatDateTime(s.actual_end) : "—"}</div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold")}>
                      {s.status === "in_progress" && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {reviewable ? (
                      <Link href="/care-logs">
                        <Button variant="outline" size="sm">
                          <ClipboardCheck className="w-4 h-4" /> 검수
                        </Button>
                      </Link>
                    ) : s.status === "in_progress" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-warm-400"><MapPin className="w-3.5 h-3.5" />케어 중</span>
                    ) : (
                      <span className="text-warm-300 text-xs">—</span>
                    )}
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
