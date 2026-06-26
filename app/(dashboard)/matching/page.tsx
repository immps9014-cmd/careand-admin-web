"use client";
import { DOMAIN_LABEL } from "@/lib/caregiverType";

import { Fragment, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, UserPlus, Search, BadgeCheck, X, Star } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  { key: "senior", label: "요양보호" },
  { key: "nursing", label: "간병" },
  { key: "housekeeping", label: "가사" },
];

export default function MatchingPage() {
  const [status, setStatus] = useState("");
  const [domain, setDomain] = useState("");
  const [assignTo, setAssignTo] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [selectedCg, setSelectedCg] = useState<number | "">("");
  // 수동 배정은 확정 즉시 매칭 계약을 생성하므로 confirm을 거친다(INV-6).
  const [confirmAssign, setConfirmAssign] = useState<{
    requestId: number;
    cgId: number;
    seniorName: string;
    caregiverName: string;
    domain: string;
  } | null>(null);
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
      setConfirmAssign(null);
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
          <span className="w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
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
              접수 상태이며 AI 추천 후보가 없는 요청입니다. 직접 돌봄전문가를 배정해 주세요.
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
        <div className="px-6 py-5 flex justify-between items-center gap-3 border-b border-warm-100">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-warm-800 flex-none">매칭 요청</h2>
            <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 bg-brand-50 border border-brand-100 rounded-full px-2.5 py-1 truncate">
              <BadgeCheck className="w-3.5 h-3.5 flex-none" />
              담당 돌봄전문가 및 일정 변경은 매칭됨 버튼을 클릭하고 매칭변경에서 하실 수 있어요
            </span>
          </div>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full flex-none">
            총 {total}건
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>요청 ID</TableHead>
              <TableHead>대상자(보호자)</TableHead>
              <TableHead>도메인</TableHead>
              <TableHead>일정</TableHead>
              <TableHead>AI 후보 / 담당</TableHead>
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
                  <TableRow onClick={() => setDetailId(row.id)} className={cn("cursor-pointer hover:bg-warm-50", urgent && "bg-warn-bg/40 hover:bg-warn-bg/60")}>
                    <TableCell className="font-en font-semibold text-warm-700">#{row.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-none", AVATAR_BG[row.service_domain] ?? "bg-warm-500")}>
                          {row.senior_name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-warm-800 truncate">{row.senior_name}{row.guardian_name ? ` (${row.guardian_name})` : ""}</div>
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
                      {row.status === "matched" && row.matched_caregiver_name ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-700">
                          <BadgeCheck className="w-4 h-4 text-brand-500" />
                          {row.matched_caregiver_name}
                        </span>
                      ) : noCandidate ? (
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
                          onClick={(e) => {
                            e.stopPropagation();
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
                          <span className="text-sm text-warm-600">배정할 돌봄전문가:</span>
                          <select
                            value={selectedCg}
                            onChange={(e) => setSelectedCg(e.target.value ? Number(e.target.value) : "")}
                            className="h-9 rounded-md border border-warm-200 bg-white px-3 text-sm min-w-[200px]"
                          >
                            <option value="">활성 돌봄전문가 선택</option>
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
                            onClick={() => {
                              if (!selectedCg) return;
                              const cg = caregivers.data?.data.find(
                                (c) => c.id === Number(selectedCg)
                              );
                              setConfirmAssign({
                                requestId: row.id,
                                cgId: Number(selectedCg),
                                seniorName: row.senior_name,
                                caregiverName: cg?.name ?? `돌봄전문가 #${selectedCg}`,
                                domain:
                                  DOMAIN_LABEL[row.service_domain] ??
                                  row.service_domain,
                              });
                            }}
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

      {detailId != null && <MatchingDetailModal id={detailId} onClose={() => setDetailId(null)} />}

      {/* 수동 매칭 배정 확인 (INV-6) — manualAssign은 confirmed 계약을 즉시 생성하고
          admin에 취소 경로가 없으므로 reversible=false로 강조 */}
      <ConfirmDialog
        open={confirmAssign !== null}
        onOpenChange={(o) => {
          if (!o && !assign.isPending) setConfirmAssign(null);
        }}
        loading={assign.isPending}
        tone="brand"
        title="수동 매칭 배정"
        description="이 요청에 선택한 활성 돌봄전문가를 직접 배정합니다."
        target={
          confirmAssign ? (
            <>
              요청 #{confirmAssign.requestId} · {confirmAssign.seniorName} (
              {confirmAssign.domain})
              <span className="mt-0.5 block font-normal text-warm-500">
                배정 돌봄전문가: {confirmAssign.caregiverName}
              </span>
            </>
          ) : null
        }
        impact="확정 즉시 매칭 계약(confirmed)이 생성되고 요청이 '매칭됨' 상태로 전환됩니다."
        reversible={false}
        confirmLabel="배정 확정"
        onConfirm={() => {
          if (confirmAssign)
            assign.mutate({
              requestId: confirmAssign.requestId,
              cgId: confirmAssign.cgId,
            });
        }}
      />
    </div>
  );
}


/* ===== 매칭 요청 상세 모달 ===== */
const RESP_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "대기", cls: "bg-warm-100 text-warm-600" },
  accepted: { label: "수락", cls: "bg-brand-50 text-brand-700" },
  selected: { label: "선정", cls: "bg-brand-50 text-brand-700" },
  rejected: { label: "거절", cls: "bg-danger-bg text-danger" },
  expired: { label: "만료", cls: "bg-warm-100 text-warm-400" },
};

function MDRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-warm-100 last:border-0">
      <span className="text-xs font-semibold text-warm-500 flex-none pt-0.5">{label}</span>
      <span className="text-sm text-warm-800 text-right min-w-0">{children}</span>
    </div>
  );
}

const toLocalDT = (s: string | null | undefined) => (s ? s.slice(0, 16).replace(" ", "T") : "");

function MatchingDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "matching-detail", id],
    queryFn: () => operationsApi.matchingRequestDetail(id),
  });
  const caregivers = useQuery({
    queryKey: ["admin", "caregivers", "active"],
    queryFn: () => operationsApi.caregivers({ status: "active" }),
  });
  const [edit, setEdit] = useState<null | { caregiverId: number; start: string }>(null);
  const save = useMutation({
    mutationFn: (payload: { caregiver_id?: number; scheduled_start?: string }) => operationsApi.updateMatch(id, payload),
    onSuccess: () => {
      toast.success("매칭이 변경되었습니다.");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin", "matching-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin", "matching"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-warm-900/40 backdrop-blur-[1px]" />
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-xl border border-warm-200 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-warm-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-warm-800">매칭 요청 상세 {data && <span className="font-en text-warm-400">#{data.id}</span>}</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-md p-1 text-warm-400 hover:bg-warm-50 hover:text-warm-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {isLoading && <div className="py-10 text-center text-warm-400 text-sm">불러오는 중…</div>}
          {isError && <div className="py-10 text-center text-danger text-sm">상세를 불러오지 못했습니다.</div>}
          {data && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center text-lg font-extrabold flex-none">{data.recipient_name?.[0] ?? "?"}</div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-warm-800 truncate">{data.recipient_name}{data.guardian_name ? ` (${data.guardian_name})` : ""}</div>
                  <div className="text-xs text-warm-500 mt-0.5">
                    {DOMAIN_LABEL[data.service_domain] ?? data.service_domain} · {MODE_LABEL(data.mode)}
                    {data.mode === "emergency" && <span className="ml-1.5 text-[10px] font-extrabold text-warn bg-warn-bg px-1.5 py-px rounded">긴급</span>}
                  </div>
                </div>
                <span className={cn("ml-auto inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-none", STATUS_PILL[data.status]?.cls ?? "bg-warm-100 text-warm-600")}>
                  {STATUS_PILL[data.status]?.label ?? data.status}
                </span>
              </div>

              <div className="rounded-lg border border-warm-100 bg-warm-50/60 px-4 mb-4">
                <MDRow label="일정">{data.scheduled_start ? formatDateTime(data.scheduled_start) : "-"} · {data.duration_min}분</MDRow>
                <MDRow label="대상자 정보">{(data.senior?.gender === "M" ? "남성" : data.senior?.gender === "F" ? "여성" : "-")}{data.senior?.care_grade ? ` · ${data.senior.care_grade}` : ""}</MDRow>
                <MDRow label="주소">{data.address?.address || data.address?.label || "-"}</MDRow>
                {data.address?.entry_note && <MDRow label="출입 안내">{data.address.entry_note}</MDRow>}
                {data.special_request && <MDRow label="요청사항">{data.special_request}</MDRow>}
                {data.senior?.special_notes && <MDRow label="특이사항">{data.senior.special_notes}</MDRow>}
                <MDRow label="신청일"><span className="font-en">{formatDateTime(data.created_at)}</span></MDRow>
              </div>

              {data.matched_caregiver && (
                <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <BadgeCheck className="w-4 h-4 text-brand-500" />
                    <span className="font-bold text-warm-800">담당 돌봄전문가: {data.matched_caregiver.name}</span>
                    {data.matched_caregiver.estimated_amount != null && (
                      <span className="ml-auto font-en text-warm-600 text-xs">예상 {data.matched_caregiver.estimated_amount.toLocaleString()}원</span>
                    )}
                  </div>
                  <div className="text-xs text-warm-500 mt-1">
                    일정: {data.matched_caregiver.scheduled_start ? formatDateTime(data.matched_caregiver.scheduled_start) : (data.scheduled_start ? formatDateTime(data.scheduled_start) : "-")}
                  </div>
                  {edit === null ? (
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={() => setEdit({ caregiverId: data.matched_caregiver!.id, start: toLocalDT(data.matched_caregiver!.scheduled_start ?? data.scheduled_start) })}>
                        매칭 변경 (담당자·일정)
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2.5 border-t border-brand-200 pt-3">
                      <div>
                        <label className="text-[11px] font-bold text-warm-600 block mb-1">담당 돌봄전문가</label>
                        <select
                          value={edit.caregiverId}
                          onChange={(e) => setEdit({ ...edit, caregiverId: Number(e.target.value) })}
                          className="w-full h-9 rounded-md border border-warm-300 bg-white px-2 text-sm text-warm-800 focus:border-brand-500 focus:outline-none"
                        >
                          {(caregivers.data?.data ?? []).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}{c.service_domains ? ` (${(c.service_domains).split(",").map((d) => DOMAIN_LABEL[d] ?? d).join("·")})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-warm-600 block mb-1">일정 시작</label>
                        <input
                          type="datetime-local"
                          value={edit.start}
                          onChange={(e) => setEdit({ ...edit, start: e.target.value })}
                          className="w-full h-9 rounded-md border border-warm-300 bg-white px-2 text-sm text-warm-800 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-0.5">
                        <Button variant="outline" size="sm" onClick={() => setEdit(null)}>취소</Button>
                        <Button variant="brand" size="sm" disabled={save.isPending} onClick={() => {
                          const payload: { caregiver_id?: number; scheduled_start?: string } = {};
                          if (edit.caregiverId && edit.caregiverId !== data.matched_caregiver!.id) payload.caregiver_id = edit.caregiverId;
                          if (edit.start) payload.scheduled_start = edit.start.replace("T", " ") + ":00";
                          if (!payload.caregiver_id && !payload.scheduled_start) return toast.error("변경할 항목이 없습니다.");
                          save.mutate(payload);
                        }}>저장</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] font-extrabold text-warm-400 uppercase tracking-wide mb-2">AI 추천 후보 {data.candidates.length}명</div>
              {data.candidates.length === 0 ? (
                <div className="text-sm text-warm-400 py-4 text-center bg-warm-50 rounded-lg">추천 후보가 없습니다</div>
              ) : (
                <div className="space-y-2">
                  {data.candidates.map((c) => {
                    const rr = RESP_LABEL[c.response] ?? { label: c.response, cls: "bg-warm-100 text-warm-600" };
                    return (
                      <div key={c.id} className="flex items-center gap-3 border border-warm-100 rounded-lg px-3 py-2.5">
                        <span className="w-6 h-6 rounded-full bg-warm-100 text-warm-600 text-[11px] font-extrabold flex items-center justify-center flex-none">{c.rank}</span>
                        <span className="font-semibold text-warm-800 text-sm flex-1 min-w-0 truncate">{c.name ?? "(미상)"}</span>
                        {c.source === "self" && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-none bg-brand-500 text-white">지원함</span>
                        )}
                        {c.source === "self" ? (
                          <span className="text-xs font-bold text-brand-600 flex-none">직접 지원</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-warm-600 flex-none"><Star className="w-3.5 h-3.5 text-warn" />AI {(c.ai_score * 100).toFixed(0)}</span>
                        )}
                        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full flex-none", rr.cls)}>{rr.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
