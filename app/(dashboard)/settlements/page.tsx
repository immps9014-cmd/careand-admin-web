"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKRW } from "@/lib/utils";
import { FileCheck } from "lucide-react";
import { operationsApi } from "@/lib/api/operations";

const TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "draft", label: "작성중" },
  { key: "confirmed", label: "확정" },
  { key: "paid", label: "지급완료" },
  { key: "failed", label: "실패" },
];

const STATUS_BADGE: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  draft: { variant: "outline", label: "작성중" },
  confirmed: { variant: "warn", label: "확정" },
  paid: { variant: "success", label: "지급완료" },
  failed: { variant: "danger", label: "실패" },
};

export default function SettlementsPage() {
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["admin", "settlements", status],
    queryFn: () => operationsApi.settlements(status ? { status } : undefined),
  });

  const s = query.data?.summary;

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">정산</h1>
          <p className="text-sm text-warm-500 mt-1">
            주간 정산 처리 + 홈택스 원천징수(3.3%) 신고
          </p>
        </div>
        <Button variant="outline" size="sm">
          <FileCheck className="w-4 h-4" />
          홈택스 일괄 신고
        </Button>
      </div>

      {/* 정산 요약 (실데이터) */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "정산 인력", value: s ? `${s.caregivers}명` : "-" },
          { label: "총 세전", value: s ? formatKRW(s.gross_amount) : "-" },
          { label: "원천징수 (3.3%)", value: s ? formatKRW(s.withholding_tax) : "-" },
          { label: "총 실지급", value: s ? formatKRW(s.net_amount) : "-" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <div className="text-xs text-warm-500 font-semibold mb-2">{card.label}</div>
            <div className="font-en text-xl font-extrabold text-warm-800 leading-none tracking-tight">
              {card.value}
            </div>
          </Card>
        ))}
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
          <h2 className="text-base font-bold text-warm-800">정산 목록</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            {query.data?.meta?.total ?? 0}건
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>인력</TableHead>
              <TableHead>정산 기간</TableHead>
              <TableHead>세전</TableHead>
              <TableHead>원천징수</TableHead>
              <TableHead>실지급</TableHead>
              <TableHead className="text-right">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-warm-400 py-10">
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-warm-400 py-10">
                  정산 내역이 없습니다
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.map((st) => (
              <TableRow key={st.id}>
                <TableCell className="font-medium text-warm-800">{st.caregiver_name}</TableCell>
                <TableCell className="text-warm-600 text-xs font-en">
                  {st.period_start} ~ {st.period_end}
                </TableCell>
                <TableCell className="font-en text-warm-700">{formatKRW(st.gross_amount)}</TableCell>
                <TableCell className="font-en text-warm-500">
                  -{formatKRW(st.withholding_tax)}
                </TableCell>
                <TableCell className="font-en font-bold text-warm-800">
                  {formatKRW(st.net_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={STATUS_BADGE[st.status]?.variant ?? "outline"}>
                    {STATUS_BADGE[st.status]?.label ?? st.status}
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
