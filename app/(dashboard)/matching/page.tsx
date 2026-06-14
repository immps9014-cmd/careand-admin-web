"use client";

import { Fragment, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, UserPlus, Search } from "lucide-react";
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
import { cn, formatDateTime } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "open", label: "접수" },
  { key: "matched", label: "매칭됨" },
  { key: "cancelled", label: "취소" },
];

const STATUS_PILL: Record<string, { cls: string; dot: string; label: string }> = {
  open: { cls: "bg-info-bg text-info", dot: "bg-info", label: "접수·대기" },
  matching: { cls: "bg-info-bg text-info", dot: "bg-info", label: "매칭중" },
  matched: { cls: "bg-brand-50 text-brand-700", dot: "bg-brand-500", label: "매칭됨" },
  expired: { cls: "bg-danger-bg text-danger", dot: "bg-danger", label: "만료" },
  cancelled: { cls: "bg-warm-100 text-warm-500", dot: "bg-warm-400", label: "취소" },
};

const DOMAIN_LABEL: Record<string, string> = {
  senior: "시니어", postpartum: "산후", nursing: "간병", companion: "동행", housekeeping: "가사",
};

// 도메인 배지 색상 (mockup: dom-senior=purple, dom-nursing=info, dom-house=ok)
const DOMAIN_BADGE: Record<string, "brand" | "info" | "success" | "warn" | "outline"> = {
  senior: "brand", nursing: "info", housekeeping: "success", postpartum: "warn", companion: "outline",
};

// 아바타 배경 (도메인 기반)
const AVATAR_BG: Record<string, string> = {
  senior: "bg-brand-500", nursing: "bg-info", housekeeping: "bg-brand-600",
  postpartum: "bg-warn", companion: "bg-warm-500",
};

const MODE_LABEL = (mode: string) =>
  mode === "emergency" ? "긴급" : mode === "recurring" ? "정기" : "일반";

const DOMAIN_TABS = [
  { key: "", label: "전체 도메인" },
  { key: "senior", label: "시니어" },
  { key: "nursing", label: "간병" },
  { key: "housekeeping", label: "가사" },
  { key: "postpartum", label: "산후" },
];

export default function MatchingPage() {
  const [status, setStatus] = useState("");
  const [domain, setDomain] = useState("");
  const [assignTo, setAssignTo] = useState<number | null>(null);
  const [selectedCg, setSelectedCg] = useState<number | "">("");
  const [now, setNow] = useState(new Date());
  const qc = useQueryClient();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const query = useQuery({
    queryKey: ["admin", "matching", status, domain],
    queryFn: () =>
      operationsApi.matchingRequests({
        ...(status ? { status } : {}),
        ...(domain ? { domain } : {}),
      }),
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

  const rows = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;
  const counts = query.data?.counts ?? {};
  // 수동 개입 필요: 접수/매칭중/만료 상태이며 AI 후보가 없는 요청
  const needsAction = rows.filter(
    (r) => ["open", "matching", "expired"].includes(r.status) && r.candidate_count === 0
  ).length;

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">매칭 관리</h1>
          <p className="text-sm text-warm-500 mt-1">
            AI 매칭 추천 결과를 검토하고, 미해결 매칭에 수동 개입합니다
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 rounded-md text-sm text-warm-700 font-en">
          <span className="w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_0_3px_rgba(124,58,237,0.2)]" />
          <span>
            실시간 · {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}-
            {String(now.getDate()).padStart(2, "0")}{" "}
            {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* 수동 개입 필요 스트립 */}
      {needsAction > 0 && (
        <div className="flex items-center gap-4 mb-5 rounded-xl border border-warn/30 bg-warn-bg px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-warn text-white flex items-center justify-center flex-none">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-warn">수동 개입 필요 — AI가 후보를 찾지 못한 매칭</div>
            <div className="text-xs text-warm-600 mt-0.5">
              접수 상태이며 AI 추천 후보가 없는 요청입니다. 직접 인력을 배정해 주세요.
            </div>
          </div>
          <div className="font-en text-2xl font-extrabold text-warn">
            {needsAction}
            <span className="text-sm font-bold ml-0.5">건</span>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-2">
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

      <div className="flex items-center gap-2 mb-5">
        {DOMAIN_TABS.map((d) => (
          <Button
            key={d.key || "all"}
            variant={domain === d.key ? "primary" : "outline"}
            size="sm"
            onClick={() => setDomain(d.key)}
          >
            {d.label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2 h-8 px-3 rounded-md border border-warm-200 bg-white text-xs text-warm-400 select-none">
          <Search className="w-3.5 h-3.5" />
          요청 ID·대상자 검색
        </div>
      </div>

      {/* 테이블 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-5 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">매칭 요청</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            총 {total}건
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>요청 ID</TableHead>
              <TableHead>대상자</TableHead>
              <TableHead>도메인</TableHead>
              <TableHead>일정</TableHead>
              <TableHead>AI 후보</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-warm-400 py-10">불러오는 중…</TableCell>
              </TableRow>
            )}
            {!query.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-warm-400 py-10">매칭 요청이 없습니다</TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const unmatched = ["open", "matching", "expired"].includes(row.status);
              const noCandidate = row.candidate_count === 0;
              const urgent = unmatched && noCandidate;
              const pill = STATUS_PILL[row.status] ?? { cls: "bg-warm-100 text-warm-600", dot: "bg-warm-400", label: row.status };
              return (
                <Fragment key={row.id}>
                  <TableRow className={cn(urgent && "bg-warn-bg/40 hover:bg-warn-bg/60")}>
                    <TableCell className="font-en font-semibold text-warm-700">#{row.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-none", AVATAR_BG[row.service_domain] ?? "bg-warm-500")}>
                          {row.senior_name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-warm-800 truncate">{row.senior_name}</div>
                          <div className="text-[11px] text-warm-400">
                            {DOMAIN_LABEL[row.service_domain] ?? row.service_domain} · {MODE_LABEL(row.mode)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={DOMAIN_BADGE[row.service_domain] ?? "outline"}>
                        {DOMAIN_LABEL[row.service_domain] ?? row.service_domain}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-en text-warm-600 text-xs">
                      {row.scheduled_start ? formatDateTime(row.scheduled_start) : "-"}
                      {row.mode === "emergency" && (
                        <span className="ml-2 inline-flex items-center text-[10px] font-extrabold text-warn bg-warn-bg px-1.5 py-px rounded">긴급</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {noCandidate ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-danger bg-danger-bg px-2.5 py-1 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          후보 없음
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-warm-700">
                          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-extrabold flex items-center justify-center">
                            {row.candidate_count}
                          </span>
                          후보 {row.candidate_count}명
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full", pill.cls)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", pill.dot)} />
                        {pill.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {unmatched && (
                        <Button
                          size="sm"
                          variant={assignTo === row.id ? "primary" : urgent ? "brand" : "outline"}
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
                      <TableCell colSpan={7} className="bg-warm-50">
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

        {/* 푸터 */}
        {rows.length > 0 && (
          <div className="px-6 py-4 border-t border-warm-100 text-xs text-warm-500 flex items-center justify-between">
            <div>
              <span className="font-en font-semibold text-warm-700">{rows.length}</span>건 표시 · 총{" "}
              <span className="font-en font-semibold text-warm-700">{total}</span>건
              {needsAction > 0 && (
                <span className="ml-2 text-warn font-bold">· 수동 개입 {needsAction}건</span>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
