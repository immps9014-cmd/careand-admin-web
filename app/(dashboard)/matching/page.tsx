"use client";

import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { operationsApi } from "@/lib/api/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "open", label: "접수" },
  { key: "matched", label: "매칭됨" },
  { key: "cancelled", label: "취소" },
];

const STATUS_BADGE: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  open: { variant: "warn", label: "접수" },
  matching: { variant: "warn", label: "매칭중" },
  matched: { variant: "success", label: "매칭됨" },
  expired: { variant: "danger", label: "만료" },
  cancelled: { variant: "danger", label: "취소" },
};

const DOMAIN_LABEL: Record<string, string> = {
  senior: "시니어", postpartum: "산후", care: "간병", companion: "동행", housekeeping: "가사",
};

export default function MatchingPage() {
  const [status, setStatus] = useState("");
  const [assignTo, setAssignTo] = useState<number | null>(null);
  const [selectedCg, setSelectedCg] = useState<number | "">("");
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "matching", status],
    queryFn: () => operationsApi.matchingRequests(status ? { status } : undefined),
    refetchInterval: 30_000,
  });

  const caregivers = useQuery({
    queryKey: ["admin", "caregivers", "active"],
    queryFn: () => operationsApi.caregivers({ status: "active" }),
  });

  const assign = useMutation({
    mutationFn: ({ requestId, cgId }: { requestId: number; cgId: number }) =>
      operationsApi.manualAssign(requestId, cgId),
    onSuccess: () => {
      toast.success("수동 매칭이 완료되었습니다.");
      setAssignTo(null);
      setSelectedCg("");
      qc.invalidateQueries({ queryKey: ["admin", "matching"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">매칭 관리</h1>
        <p className="text-sm text-warm-500 mt-1">
          AI 매칭 추천 결과를 검토하고, 미해결 매칭에 수동 개입합니다
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
        <div className="px-6 py-5 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">매칭 요청</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            {query.data?.meta?.total ?? 0}건
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>요청 ID</TableHead>
              <TableHead>대상자</TableHead>
              <TableHead>도메인</TableHead>
              <TableHead>모드</TableHead>
              <TableHead>일정</TableHead>
              <TableHead>AI 후보</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-warm-400 py-10">불러오는 중…</TableCell>
              </TableRow>
            )}
            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-warm-400 py-10">매칭 요청이 없습니다</TableCell>
              </TableRow>
            )}
            {query.data?.data.map((row) => {
              const unmatched = ["open", "matching", "expired"].includes(row.status);
              return (
                <Fragment key={row.id}>
                  <TableRow>
                    <TableCell className="font-en font-semibold">#{row.id}</TableCell>
                    <TableCell className="font-semibold text-warm-800">{row.senior_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{DOMAIN_LABEL[row.service_domain] ?? row.service_domain}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.mode === "emergency" ? "danger" : "outline"}>
                        {row.mode === "emergency" ? "긴급" : row.mode === "recurring" ? "정기" : "일반"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-en text-warm-600 text-xs">
                      {row.scheduled_start ? formatDateTime(row.scheduled_start) : "-"}
                    </TableCell>
                    <TableCell>
                      {row.candidate_count > 0
                        ? <span className="text-warm-700">{row.candidate_count}명</span>
                        : <span className="text-warm-400">후보 없음</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[row.status]?.variant ?? "outline"}>
                        {STATUS_BADGE[row.status]?.label ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {unmatched && (
                        <Button
                          size="sm"
                          variant={assignTo === row.id ? "primary" : "outline"}
                          onClick={() => {
                            setAssignTo(assignTo === row.id ? null : row.id);
                            setSelectedCg("");
                          }}
                        >
                          <UserPlus className="w-4 h-4" />
                          수동 매칭
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {assignTo === row.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-warm-50">
                        <div className="flex items-center gap-3 py-1">
                          <span className="text-sm text-warm-600">배정할 인력:</span>
                          <select
                            value={selectedCg}
                            onChange={(e) => setSelectedCg(e.target.value ? Number(e.target.value) : "")}
                            className="h-9 rounded-md border border-warm-200 bg-white px-3 text-sm min-w-[200px]"
                          >
                            <option value="">활성 인력 선택</option>
                            {caregivers.data?.data.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} (평점 {c.rating_avg.toFixed(1)}, {c.completed_sessions}회)
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!selectedCg || assign.isPending}
                            onClick={() => selectedCg && assign.mutate({ requestId: row.id, cgId: Number(selectedCg) })}
                          >
                            배정 확정
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAssignTo(null)}>
                            취소
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
