"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, List } from "lucide-react";
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
import { operationsApi } from "@/lib/api/operations";
import { cn, formatDateTime, formatKRW } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "confirmed", label: "확정" },
  { key: "in_progress", label: "진행중" },
  { key: "completed", label: "완료" },
  { key: "cancelled", label: "취소" },
];

// 상태 → 표/요약 색 구분 (mockup: 확정=info, 진행중=brand, 완료=success, 취소=회색)
const STATUS_PILL: Record<
  string,
  { cls: string; dot: string; label: string }
> = {
  confirmed: { cls: "bg-info-bg text-info", dot: "bg-info", label: "확정" },
  in_progress: { cls: "bg-brand-50 text-brand-700", dot: "bg-brand-500", label: "진행중" },
  completed: { cls: "bg-brand-50 text-brand-700", dot: "bg-brand-500", label: "완료" },
  cancelled: { cls: "bg-warm-100 text-warm-500", dot: "bg-warm-400", label: "취소" },
  no_show: { cls: "bg-danger-bg text-danger", dot: "bg-danger", label: "노쇼" },
};

// 캘린더 방문 카드 색 구분
const VISIT_STYLE: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  confirmed: { border: "border-l-info", bg: "bg-white", text: "text-info", dot: "bg-info" },
  in_progress: { border: "border-l-brand-500", bg: "bg-brand-50/60", text: "text-brand-700", dot: "bg-brand-500" },
  completed: { border: "border-l-brand-400", bg: "bg-white", text: "text-brand-600", dot: "bg-brand-400" },
  cancelled: { border: "border-l-warm-400", bg: "bg-white", text: "text-warm-500", dot: "bg-warm-400" },
  no_show: { border: "border-l-danger", bg: "bg-white", text: "text-danger", dot: "bg-danger" },
};

const DOMAIN_LABEL: Record<string, string> = {
  senior: "시니어",
  postpartum: "산후",
  nursing: "간병",
  companion: "동행",
  housekeeping: "가사",
};

// 도메인 배지 색 (매칭 페이지와 동일 규칙)
const DOMAIN_BADGE: Record<string, "brand" | "info" | "success" | "warn" | "outline"> = {
  senior: "brand", nursing: "info", housekeeping: "success", postpartum: "warn", companion: "outline",
};

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ContractsPage() {
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"board" | "list">("board");

  const query = useQuery({
    queryKey: ["admin", "contracts", status],
    queryFn: () => operationsApi.contracts(status ? { status } : undefined),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;

  // 요약 카운트 — 백엔드 전체 집계(counts) 기반, 필터와 무관
  const counts = query.data?.counts ?? {};
  const cnt = (s: string) => counts[s] ?? 0;
  const summary = [
    { n: counts.all ?? total, label: "전체 방문", dot: "" },
    { n: cnt("confirmed"), label: "확정 (예정)", dot: "bg-info" },
    { n: cnt("in_progress"), label: "진행중", dot: "bg-brand-500" },
    { n: cnt("completed"), label: "완료", dot: "bg-brand-400" },
    { n: cnt("cancelled"), label: "취소", dot: "bg-warm-400" },
  ];

  // 캘린더: 일정 있는 계약을 요일별로 그룹화 (실데이터)
  const byDow: Record<number, typeof rows> = {};
  for (const c of rows) {
    if (!c.scheduled_start) continue;
    const dow = new Date(c.scheduled_start).getDay();
    (byDow[dow] ??= []).push(c);
  }
  const todayDow = new Date().getDay();

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            계약 · 일정 관리
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            전체 계약(매칭)의 방문 일정을 캘린더로 보고, 상태를 관리합니다
          </p>
        </div>
        <div className="inline-flex bg-white border border-warm-200 p-1 rounded-md">
          <button
            onClick={() => setView("board")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded transition-colors",
              view === "board" ? "bg-brand-500 text-white" : "text-warm-500 hover:text-warm-700"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            주간 일정
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded transition-colors",
              view === "list" ? "bg-brand-500 text-white" : "text-warm-500 hover:text-warm-700"
            )}
          >
            <List className="w-3.5 h-3.5" />
            목록
          </button>
        </div>
      </div>

      {/* 요약 스트립 */}
      <div className="flex gap-3 mb-5">
        {summary.map((s) => (
          <Card key={s.label} className="flex-1 flex items-center gap-3 px-4 py-3.5">
            {s.dot && <span className={cn("w-2.5 h-2.5 rounded-full flex-none", s.dot)} />}
            <div>
              <div className="font-en text-2xl font-extrabold text-warm-800 leading-none">{s.n}</div>
              <div className="text-xs font-semibold text-warm-500 mt-1 whitespace-nowrap">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* 상태 필터 */}
      <div className="flex items-center gap-2 mb-5">
        {TABS.map((t) => (
          <Button
            key={t.key || "all"}
            variant={status === t.key ? "primary" : "outline"}
            size="sm"
            onClick={() => setStatus(t.key)}
          >
            {t.label}
            {counts[t.key || "all"] != null && (
              <span className="ml-1.5 font-en text-[11px] opacity-70">{counts[t.key || "all"]}</span>
            )}
          </Button>
        ))}
      </div>

      {/* 주간 일정 보드 */}
      {view === "board" && (
        <div className="grid grid-cols-7 gap-2.5">
          {DOW.map((label, dow) => {
            const visits = (byDow[dow] ?? []).slice().sort((a, b) =>
              (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? "")
            );
            const isToday = dow === todayDow;
            const isSun = dow === 0;
            return (
              <Card
                key={dow}
                className={cn(
                  "min-h-[340px] flex flex-col overflow-hidden p-0",
                  isToday && "border-brand-500 ring-2 ring-brand-500/15"
                )}
              >
                <div className={cn("px-3 py-2.5 border-b border-warm-100", isToday && "bg-brand-50/40")}>
                  <div className={cn("text-[11px] font-bold", isSun ? "text-danger" : "text-warm-400")}>{label}</div>
                  <div className="text-base font-extrabold text-warm-800 mt-0.5 flex items-center gap-1.5">
                    <span className={cn(isSun && "text-danger")}>{label}요일</span>
                    {isToday && (
                      <span className="text-[9px] font-extrabold text-white bg-brand-500 rounded-full px-1.5 py-px">오늘</span>
                    )}
                  </div>
                </div>
                <div className="p-2 flex flex-col gap-2 flex-1">
                  {query.isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-warm-300">…</div>
                  ) : visits.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-warm-300">일정 없음</div>
                  ) : (
                    visits.map((v) => {
                      const st = VISIT_STYLE[v.status] ?? VISIT_STYLE.confirmed;
                      return (
                        <div
                          key={v.id}
                          className={cn(
                            "rounded-lg border border-warm-100 border-l-[3px] p-2.5 transition-shadow hover:shadow-card",
                            st.border,
                            st.bg,
                            v.status === "cancelled" && "opacity-70"
                          )}
                        >
                          <div className="font-en text-xs font-extrabold text-warm-800">
                            {v.scheduled_start ? timeLabel(v.scheduled_start) : "-"}
                          </div>
                          <div className={cn("text-[11px] font-semibold text-warm-600 mt-1 leading-snug", v.status === "cancelled" && "line-through text-warm-400")}>
                            {v.caregiver_name} → {v.senior_name}
                          </div>
                          <div className={cn("inline-flex items-center gap-1 text-[10px] font-bold mt-1.5", st.text)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                            {STATUS_PILL[v.status]?.label ?? v.status}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 목록 뷰 */}
      {view === "list" && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
            <h2 className="text-base font-bold text-warm-800 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-brand-500" />
              계약 목록
            </h2>
            <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
              총 {total}건
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계약 ID</TableHead>
                <TableHead>인력</TableHead>
                <TableHead>대상자</TableHead>
                <TableHead>도메인</TableHead>
                <TableHead>일정</TableHead>
                <TableHead className="text-right">예상금액</TableHead>
                <TableHead className="text-right">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-warm-400 py-10">
                    불러오는 중…
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-warm-400 py-10">
                    계약이 없습니다
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => {
                const pill = STATUS_PILL[c.status] ?? { cls: "bg-warm-100 text-warm-600", dot: "bg-warm-400", label: c.status };
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-en font-semibold text-warm-500">#{c.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-none">
                          {c.caregiver_name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-warm-800 truncate">{c.caregiver_name}</div>
                          <div className="text-[11px] text-warm-400">담당 케어 인력</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-warm-700">{c.senior_name}</TableCell>
                    <TableCell>
                      <Badge variant={DOMAIN_BADGE[c.service_domain] ?? "outline"}>
                        {DOMAIN_LABEL[c.service_domain] ?? c.service_domain}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-en text-warm-600 text-xs">
                      {c.scheduled_start ? formatDateTime(c.scheduled_start) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.estimated_amount === 0 ? (
                        <span className="inline-block text-[11px] font-bold text-warn bg-warn-bg px-2 py-1 rounded">금액 미설정</span>
                      ) : (
                        <span className="font-en font-semibold text-warm-700">{formatKRW(c.estimated_amount)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full", pill.cls)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", pill.dot)} />
                        {pill.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {rows.length > 0 && (
            <div className="px-6 py-4 border-t border-warm-100 text-xs text-warm-500">
              <span className="font-en font-semibold text-warm-700">{rows.length}</span>건 표시 · 총{" "}
              <span className="font-en font-semibold text-warm-700">{total}</span>건
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
