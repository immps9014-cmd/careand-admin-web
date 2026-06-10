"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
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
import { formatDateTime, formatKRW } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "confirmed", label: "확정" },
  { key: "in_progress", label: "진행중" },
  { key: "completed", label: "완료" },
  { key: "cancelled", label: "취소" },
];

const STATUS_BADGE: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  confirmed: { variant: "warn", label: "확정" },
  in_progress: { variant: "success", label: "진행중" },
  completed: { variant: "outline", label: "완료" },
  cancelled: { variant: "danger", label: "취소" },
  no_show: { variant: "danger", label: "노쇼" },
};

const DOMAIN_LABEL: Record<string, string> = {
  senior: "시니어",
  postpartum: "산후",
  care: "간병",
  companion: "동행",
  housekeeping: "가사",
};

export default function ContractsPage() {
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["admin", "contracts", status],
    queryFn: () => operationsApi.contracts(status ? { status } : undefined),
  });

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          계약 · 일정 관리
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          전체 계약(매칭)을 조회하고 일정·상태를 관리합니다
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {TABS.map((t) => (
          <Button
            key={t.key || "all"}
            variant={status === t.key ? "primary" : "outline"}
            size="sm"
            onClick={() => setStatus(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-brand-500" />
            계약 목록
          </h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            {query.data?.meta?.total ?? 0}건
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
              <TableHead>예상금액</TableHead>
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
            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-warm-400 py-10">
                  계약이 없습니다
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-en text-warm-500">#{c.id}</TableCell>
                <TableCell className="font-medium text-warm-800">{c.caregiver_name}</TableCell>
                <TableCell className="text-warm-600">{c.senior_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {DOMAIN_LABEL[c.service_domain] ?? c.service_domain}
                  </Badge>
                </TableCell>
                <TableCell className="text-warm-600 text-xs">
                  {c.scheduled_start ? formatDateTime(c.scheduled_start) : "-"}
                </TableCell>
                <TableCell className="font-en text-warm-700">
                  {formatKRW(c.estimated_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={STATUS_BADGE[c.status]?.variant ?? "outline"}>
                    {STATUS_BADGE[c.status]?.label ?? c.status}
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
