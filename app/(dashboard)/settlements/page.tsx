"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { KpiCard } from "@/components/domain/kpi-card";
import { cn, formatKRW, formatDateTime } from "@/lib/utils";
import {
  Users,
  Coins,
  FileText,
  Wallet,
  FileCheck,
  Info,
  CheckCircle2,
  Clock,
  CircleSlash,
  ChevronRight,
  X,
} from "lucide-react";
import { operationsApi } from "@/lib/api/operations";
import { getApiErrorMessage } from "@/lib/api/client";

const TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "draft", label: "작성중" },
  { key: "confirmed", label: "확정" },
  { key: "paid", label: "지급완료" },
  { key: "failed", label: "실패" },
];

const STATUS_BADGE: Record<
  string,
  { variant: "warn" | "success" | "danger" | "outline" | "info" | "brand"; label: string; dot: string }
> = {
  draft: { variant: "outline", label: "작성중", dot: "bg-warm-400" },
  confirmed: { variant: "info", label: "확정 · 지급대기", dot: "bg-info" },
  paid: { variant: "success", label: "지급완료", dot: "bg-brand-500" },
  failed: { variant: "danger", label: "실패", dot: "bg-danger" },
};

// 정산 사이클 파이프라인 단계 (실데이터에서 집계)
const PIPELINE: {
  key: string;
  label: string;
  dot: string;
  cur?: boolean;
}[] = [
  { key: "draft", label: "작성중", dot: "bg-warm-400" },
  { key: "confirmed", label: "확정 (지급 대기)", dot: "bg-info", cur: true },
  { key: "paid", label: "지급완료", dot: "bg-brand-500" },
  { key: "failed", label: "실패", dot: "bg-danger" },
];

export default function SettlementsPage() {
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "settlements", status],
    queryFn: () => operationsApi.settlements(status ? { status } : undefined),
  });

  const s = query.data?.summary;
  const rows = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;

  // 현재 로드된 정산 건들을 단계별로 집계 (실데이터 기반)
  const byStatus = (key: string) => rows.filter((r) => r.status === key);

  // 일괄 확정: draft 상태인 행만 선택 가능
  const draftRows = rows.filter((r) => r.status === "draft");
  const allDraftSelected =
    draftRows.length > 0 && draftRows.every((r) => selected.has(r.id));

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      // 현재 목록의 draft 행이 모두 선택돼 있으면 해제, 아니면 전체 선택
      const allSelected =
        draftRows.length > 0 && draftRows.every((r) => prev.has(r.id));
      return allSelected ? new Set() : new Set(draftRows.map((r) => r.id));
    });
  };

  const clearSelection = () => setSelected(new Set());

  const bulkConfirm = useMutation({
    mutationFn: (ids: number[]) => operationsApi.bulkConfirmSettlements(ids),
    onSuccess: (res) => {
      const { message, confirmed } = res.data;
      toast.success(message ?? `${confirmed}건 확정했습니다.`);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["admin", "settlements"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">정산</h1>
          <p className="text-sm text-warm-500 mt-1">
            주간 정산 처리 + 홈택스 원천징수(3.3%) 신고
          </p>
        </div>
        {/* 홈택스 신고 API 미연동 — 동작 없는 버튼 노출 금지(INV-8).
            연동(Phase 3.1)까지 비활성 + "준비중" 명시 표기 */}
        <span title="홈택스 신고 API 연동은 준비 중입니다 (Phase 3 예정)">
          <Button variant="primary" size="md" disabled aria-disabled="true">
            <FileCheck className="w-4 h-4" />
            홈택스 일괄 신고
            <span className="ml-1 text-[10px] font-bold">(준비중)</span>
          </Button>
        </span>
      </div>

      {/* 정산 요약 (실데이터) — 총 실지급 강조, 원천징수 차감 강조 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          label="정산 돌봄전문가"
          value={s ? `${s.caregivers}명` : "-"}
          icon={Users}
          subLabel="이번 주 정산 대상"
        />
        <KpiCard
          label="총 세전"
          value={s ? formatKRW(s.gross_amount) : "-"}
          icon={Coins}
          subLabel="지급 전 총 금액"
        />
        <KpiCard
          label="원천징수 (3.3%)"
          value={s ? formatKRW(s.withholding_tax) : "-"}
          icon={FileText}
          iconColor="danger"
          subLabel="홈택스 신고 대상"
        />
        <KpiCard
          variant="brand"
          label="총 실지급"
          value={s ? formatKRW(s.net_amount) : "-"}
          icon={Wallet}
          subLabel="돌봄전문가에게 지급될 순액"
        />
      </div>

      {/* 정산 사이클 파이프라인 (현재 목록 기준) */}
      <Card className="flex items-stretch overflow-hidden mb-5 p-0">
        {PIPELINE.map((step, i) => {
          const list = byStatus(step.key);
          const count = list.length;
          const useNet = step.key === "confirmed" || step.key === "paid";
          const sum = list.reduce(
            (acc, r) => acc + (useNet ? r.net_amount : r.gross_amount),
            0
          );
          const moneyLabel =
            count === 0
              ? step.key === "failed"
                ? "재처리 대상 없음"
                : "대상 없음"
              : `${useNet ? "실지급" : "세전"} ${formatKRW(sum)}`;
          return (
            <div
              key={step.key}
              className={cn(
                "relative flex-1 px-5 py-4 flex flex-col justify-center",
                i !== PIPELINE.length - 1 && "border-r border-warm-100",
                step.cur && "bg-gradient-to-b from-brand-50/60 to-white"
              )}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-warm-600">
                <span className={cn("w-2.5 h-2.5 rounded-full", step.dot)} />
                {step.label}
              </div>
              <div className="mt-2 font-en text-2xl font-extrabold text-warm-800 leading-none tracking-tight">
                {count}
                <small className="text-[13px] font-bold text-warm-500 ml-0.5">건</small>
              </div>
              <div className="mt-1.5 font-en text-[11.5px] text-warm-500">{moneyLabel}</div>
              {step.cur && (
                <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-brand-500" />
              )}
              {i !== PIPELINE.length - 1 && (
                <span className="absolute -right-[9px] top-1/2 -translate-y-1/2 z-10 w-[18px] h-[18px] rounded-full bg-white border border-warm-200 flex items-center justify-center text-warm-500">
                  <ChevronRight className="w-3 h-3" />
                </span>
              )}
            </div>
          );
        })}
      </Card>

      {/* 툴바: 단계 탭 + 원천징수율 안내 */}
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
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-info bg-info-bg px-3 py-1.5 rounded-md">
          <Info className="w-3.5 h-3.5" />
          원천징수율 3.3% 자동 적용
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">정산 목록</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            총 {total}건
          </span>
        </div>

        {/* 일괄 작업 바: 1건 이상 선택 시에만 표시 */}
        {selected.size > 0 && (
          <div className="px-6 py-3 flex items-center gap-3 border-b border-warm-100 bg-brand-50/60">
            <span className="text-sm font-bold text-warm-800">
              {selected.size}건 선택
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              선택 해제
            </Button>
            <Button
              variant="brand"
              size="sm"
              disabled={bulkConfirm.isPending}
              onClick={() => bulkConfirm.mutate(Array.from(selected))}
            >
              <FileCheck className="w-4 h-4" />
              일괄 확정
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="전체선택"
                  title="작성중 정산 전체선택"
                  className="h-4 w-4 align-middle accent-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  checked={allDraftSelected}
                  disabled={draftRows.length === 0}
                  onChange={toggleAll}
                />
              </TableHead>
              <TableHead>돌봄전문가</TableHead>
              <TableHead className="text-right">세전</TableHead>
              <TableHead className="text-right">원천징수 (3.3%)</TableHead>
              <TableHead className="text-right">실지급</TableHead>
              <TableHead>홈택스 신고</TableHead>
              <TableHead className="text-right">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-warm-500 py-10">
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-warm-500 py-10">
                  정산 내역이 없습니다
                </TableCell>
              </TableRow>
            )}
            {rows.map((st) => {
              const badge = STATUS_BADGE[st.status] ?? {
                variant: "outline" as const,
                label: st.status,
                dot: "bg-warm-400",
              };
              const filed = st.hometax_filing_no != null;
              const selectable = st.status === "draft";
              return (
                <TableRow
                  key={st.id}
                  onClick={() => setDetailId(st.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setDetailId(st.id); }}
                  tabIndex={0}
                  className="cursor-pointer hover:bg-warm-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/40"
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={selectable ? "정산 선택" : undefined}
                      className="h-4 w-4 align-middle accent-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                      checked={selectable && selected.has(st.id)}
                      disabled={!selectable}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => selectable && toggleOne(st.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {st.caregiver_name?.[0] ?? "?"}
                      </div>
                      <div>
                        <div className="font-semibold text-warm-800">{st.caregiver_name}</div>
                        <div className="font-en text-[11px] text-warm-500">
                          {st.period_start} ~ {st.period_end}
                          {st.paid_at ? ` · ${st.paid_at} 지급` : ""}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-en text-warm-700">
                    {formatKRW(st.gross_amount)}
                  </TableCell>
                  <TableCell className="text-right font-en font-semibold text-danger">
                    −{formatKRW(st.withholding_tax)}
                  </TableCell>
                  <TableCell className="text-right font-en font-extrabold text-warm-800 bg-warm-50">
                    {formatKRW(st.net_amount)}
                  </TableCell>
                  <TableCell>
                    {filed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        신고완료
                      </span>
                    ) : st.status === "confirmed" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-info">
                        <Clock className="w-3.5 h-3.5" />
                        신고대기
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-500">
                        <CircleSlash className="w-3.5 h-3.5" />
                        미신고
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={badge.variant}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", badge.dot)} />
                      {badge.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {detailId != null && <SettlementDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}


/* ===== 정산 상세 모달 ===== */
function SDRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-warm-100 last:border-0">
      <span className="text-xs font-semibold text-warm-500 flex-none pt-0.5">{label}</span>
      <span className="text-sm text-warm-800 text-right min-w-0 break-all">{children}</span>
    </div>
  );
}

function SettlementDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "settlement-detail", id],
    queryFn: () => operationsApi.settlementDetail(id),
  });
  const stBadge = data ? (STATUS_BADGE[data.status] ?? { variant: "outline" as const, label: data.status, dot: "bg-warm-400" }) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-warm-900/40 backdrop-blur-[1px]" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-xl border border-warm-200 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-warm-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-warm-800">정산 상세 {data && <span className="font-en text-warm-500">#{data.id}</span>}</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-md p-2 text-warm-500 hover:bg-warm-50 hover:text-warm-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {isLoading && <div className="py-10 text-center text-warm-500 text-sm">불러오는 중…</div>}
          {isError && <div className="py-10 text-center text-danger text-sm">상세를 불러오지 못했습니다.</div>}
          {data && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold flex-none">{data.caregiver_name?.[0] ?? "?"}</div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-warm-800 truncate">{data.caregiver_name}</div>
                  <div className="font-en text-xs text-warm-500 mt-0.5">{data.period_start} ~ {data.period_end}</div>
                </div>
                {stBadge && (
                  <Badge variant={stBadge.variant} className="ml-auto">
                    <span className={cn("w-1.5 h-1.5 rounded-full", stBadge.dot)} />{stBadge.label}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg border border-warm-100 bg-warm-50 p-3 text-center">
                  <div className="text-[11px] text-warm-500">세전</div>
                  <div className="font-en font-bold text-warm-800 mt-1">{formatKRW(data.gross_amount)}</div>
                </div>
                <div className="rounded-lg border border-warm-100 bg-warm-50 p-3 text-center">
                  <div className="text-[11px] text-warm-500">원천징수 3.3%</div>
                  <div className="font-en font-bold text-danger mt-1">−{formatKRW(data.withholding_tax)}</div>
                </div>
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-center">
                  <div className="text-[11px] text-brand-700">실지급</div>
                  <div className="font-en font-extrabold text-brand-700 mt-1">{formatKRW(data.net_amount)}</div>
                </div>
              </div>

              <div className="rounded-lg border border-warm-100 px-4 mb-4">
                <SDRow label="홈택스 신고번호">{data.hometax_filing_no || "미신고"}</SDRow>
                <SDRow label="이체 ID">{data.bank_tx_id || "-"}</SDRow>
                <SDRow label="확정일">{data.confirmed_at ? formatDateTime(data.confirmed_at) : "-"}</SDRow>
                <SDRow label="지급일">{data.paid_at ? formatDateTime(data.paid_at) : "-"}</SDRow>
                <SDRow label="생성일">{formatDateTime(data.created_at)}</SDRow>
              </div>

              <div className="text-[11px] font-extrabold text-warm-500 uppercase tracking-wide mb-2">정산 항목 {data.items.length}건</div>
              {data.items.length === 0 ? (
                <div className="text-sm text-warm-500 py-4 text-center bg-warm-50 rounded-lg">세부 항목 내역이 없습니다</div>
              ) : (
                <div className="space-y-1.5">
                  {data.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 border border-warm-100 rounded-lg px-3 py-2 text-sm">
                      <span className="font-en text-warm-600 flex-none">{it.scheduled_start ? formatDateTime(it.scheduled_start) : `세션 #${it.session_id ?? "-"}`}</span>
                      <span className="text-warm-500 text-xs">{it.hours}h × {formatKRW(it.hourly_rate)}</span>
                      <span className="ml-auto font-en font-bold text-warm-800">{formatKRW(it.amount + it.surcharge)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
