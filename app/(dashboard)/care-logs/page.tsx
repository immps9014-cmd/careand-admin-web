"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, Check, X } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "pending", label: "검수 대기" },
  { key: "approved", label: "승인됨" },
  { key: "rejected", label: "반려됨" },
];

const REVIEW_BADGE: Record<string, { variant: "warn" | "success" | "danger"; label: string }> = {
  pending: { variant: "warn", label: "검수 대기" },
  approved: { variant: "success", label: "승인" },
  rejected: { variant: "danger", label: "반려" },
};

const DOMAIN_LABEL: Record<string, string> = {
  senior: "시니어",
  postpartum: "산후",
  care: "간병",
  companion: "동행",
  housekeeping: "가사",
};

export default function CareLogsPage() {
  const [reviewStatus, setReviewStatus] = useState("pending");
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "care-logs", reviewStatus],
    queryFn: () => operationsApi.careLogs({ review_status: reviewStatus }),
  });

  const approve = useMutation({
    mutationFn: (id: number) => operationsApi.approveCareLog(id),
    onSuccess: () => {
      toast.success("일지를 승인했습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "care-logs"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      operationsApi.rejectCareLog(id, reason),
    onSuccess: () => {
      toast.success("일지를 반려했습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "care-logs"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function handleReject(id: number) {
    const reason = window.prompt("반려(재작성 요청) 사유를 입력하세요:");
    if (reason && reason.trim()) reject.mutate({ id, reason: reason.trim() });
  }

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          AI 일지 검수 · 승인
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          C:Writer가 생성한 케어 일지를 검토하고 발송 승인·반려 처리합니다
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={reviewStatus === t.key ? "primary" : "outline"}
            size="sm"
            onClick={() => setReviewStatus(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-brand-500" />
            검수 큐
          </h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            {query.data?.meta?.total ?? 0}건
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>세션 ID</TableHead>
              <TableHead>인력</TableHead>
              <TableHead>대상자</TableHead>
              <TableHead>도메인</TableHead>
              <TableHead>케어시간</TableHead>
              <TableHead>종료</TableHead>
              <TableHead>검수</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-warm-400 py-10">
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-warm-400 py-10">
                  해당 상태의 일지가 없습니다
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-en text-warm-500">#{log.id}</TableCell>
                <TableCell className="font-medium text-warm-800">{log.caregiver_name}</TableCell>
                <TableCell className="text-warm-600">{log.senior_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {DOMAIN_LABEL[log.service_domain] ?? log.service_domain ?? "-"}
                  </Badge>
                </TableCell>
                <TableCell className="font-en text-warm-600">{log.duration_min}분</TableCell>
                <TableCell className="text-warm-500 text-xs">
                  {log.actual_end ? formatDateTime(log.actual_end) : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={REVIEW_BADGE[log.review_status]?.variant ?? "warn"}>
                    {REVIEW_BADGE[log.review_status]?.label ?? log.review_status}
                  </Badge>
                  {log.review_status === "rejected" && log.review_note && (
                    <div className="text-[11px] text-danger mt-1 max-w-[160px] truncate">
                      {log.review_note}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {log.review_status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(log.id)}
                      >
                        <Check className="w-4 h-4" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={reject.isPending}
                        onClick={() => handleReject(log.id)}
                      >
                        <X className="w-4 h-4" />
                        반려
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-warm-400">
                      {log.reviewed_at ? formatDateTime(log.reviewed_at) : "-"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
