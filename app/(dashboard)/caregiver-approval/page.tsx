"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
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
import { formatDate, cn } from "@/lib/utils";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "active", label: "승인됨" },
  { key: "rejected", label: "반려됨" },
];

const STATUS_BADGE: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  pending: { variant: "warn", label: "대기" },
  active: { variant: "success", label: "활성" },
  rejected: { variant: "danger", label: "반려" },
  suspended: { variant: "outline", label: "정지" },
  leave: { variant: "outline", label: "휴직" },
};

const DOMAIN_LABEL: Record<string, string> = {
  senior: "시니어", postpartum: "산후", nursing: "간병", housekeeping: "가사",
};

export default function CaregiverApprovalPage() {
  const [status, setStatus] = useState("pending");
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "caregivers", status],
    queryFn: () => operationsApi.caregivers({ status }),
  });

  const approve = useMutation({
    mutationFn: (id: number) => operationsApi.approveCaregiver(id),
    onSuccess: () => {
      toast.success("인력을 승인했습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "caregivers"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      operationsApi.rejectCaregiver(id, reason),
    onSuccess: () => {
      toast.success("인력을 반려했습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "caregivers"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function handleReject(id: number) {
    const reason = window.prompt("반려 사유를 입력하세요:");
    if (reason && reason.trim()) reject.mutate({ id, reason: reason.trim() });
  }

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          인력 자격 검증
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          신규 인력의 자격증·서류를 검토하고 승인·반려 처리합니다 (1차년도 수동 검증)
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <Button
            key={t.key}
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
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            인력 목록
          </h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            {query.data?.meta?.total ?? 0}명
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>도메인</TableHead>
              <TableHead>특기</TableHead>
              <TableHead>자격증번호</TableHead>
              <TableHead>신청일</TableHead>
              <TableHead>상태</TableHead>
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
                  해당 상태의 인력이 없습니다
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-warm-800">{c.name}</TableCell>
                <TableCell className="text-warm-600 font-en text-xs">{c.phone || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(c.service_domains || "senior").split(",").map((d) => (
                      <Badge key={d} variant="outline">{DOMAIN_LABEL[d] ?? d}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.specialties.length === 0 && <span className="text-warm-400 text-xs">-</span>}
                    {c.specialties.map((s) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-warm-600 font-en text-xs">{c.license_no || "-"}</TableCell>
                <TableCell className="text-warm-500 text-xs">{formatDate(c.created_at)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[c.status]?.variant ?? "outline"}>
                    {STATUS_BADGE[c.status]?.label ?? c.status}
                  </Badge>
                  {c.status === "rejected" && c.rejection_reason && (
                    <div className="text-[11px] text-danger mt-1 max-w-[160px] truncate">
                      {c.rejection_reason}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {c.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(c.id)}
                      >
                        <BadgeCheck className="w-4 h-4" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={reject.isPending}
                        onClick={() => handleReject(c.id)}
                      >
                        반려
                      </Button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-warm-400">
                      <Star className="w-3 h-3" />
                      {c.rating_avg.toFixed(1)} · {c.completed_sessions}회
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
