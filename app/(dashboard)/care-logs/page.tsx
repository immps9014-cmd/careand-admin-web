"use client";
import { DOMAIN_LABEL } from "@/lib/caregiverType";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Check,
  X,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Sparkles,
  Bell,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/domain/kpi-card";
import { operationsApi } from "@/lib/api/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

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

const DOMAIN_BADGE: Record<string, "brand" | "info" | "success" | "warn" | "outline"> = {
  senior: "brand",
  nursing: "info",
  housekeeping: "success",
  postpartum: "warn",
  companion: "outline",
};

const AVATAR_BG: Record<string, string> = {
  senior: "bg-brand-500",
  nursing: "bg-info",
  housekeeping: "bg-brand-600",
  postpartum: "bg-warn",
  companion: "bg-warm-500",
};

// 케어시간 0분 = 그대로 발송하면 안 되는 품질 이상 일지
function isQualityFlagged(log: { duration_min: number }) {
  return log.duration_min === 0;
}

export default function CareLogsPage() {
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "care-logs", reviewStatus],
    queryFn: () => operationsApi.careLogs({ review_status: reviewStatus }),
  });

  const detail = useQuery({
    queryKey: ["admin", "care-log-detail", selectedId],
    queryFn: () => operationsApi.careLogDetail(selectedId as number),
    enabled: selectedId != null,
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

  const rows = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;
  const flaggedCount = rows.filter(isQualityFlagged).length;

  // 선택된 일지 (없거나 목록에서 사라지면 첫 행으로 폴백)
  useEffect(() => {
    if (rows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (selectedId === null || !rows.some((r) => r.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          AI 일지 검수 · 승인
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          C:Writer가 생성한 케어 일지를 검토하고 보호자 앱 발송을 승인·반려합니다
        </p>
      </div>

      {/* 요약 스트립 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          variant="brand"
          label={`${TABS.find((t) => t.key === reviewStatus)?.label ?? "검수"} 건수`}
          value={total}
          icon={ClipboardCheck}
        />
        <KpiCard
          variant={flaggedCount > 0 ? "alert" : "default"}
          iconColor="danger"
          label="품질 이상 (케어시간 0분)"
          value={flaggedCount}
          icon={AlertTriangle}
          subLabel={flaggedCount > 0 ? "그대로 발송 금지 · 반려 권장" : undefined}
        />
        <KpiCard
          label="현재 목록 표시"
          value={rows.length}
          icon={ShieldCheck}
          iconColor="info"
        />
        <KpiCard
          label="C:Writer 자동 생성"
          value="AI"
          icon={Sparkles}
          iconColor="brand"
        />
      </div>

      {/* 탭 필터 */}
      <div className="flex items-center gap-2 mb-5">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={reviewStatus === t.key ? "primary" : "outline"}
            size="sm"
            onClick={() => setReviewStatus(t.key)}
          >
            {t.label}
            {t.key === reviewStatus && (
              <span className="ml-1.5 font-en text-[11px] bg-white/20 px-1.5 py-px rounded-full">
                {total}
              </span>
            )}
          </Button>
        ))}
        {flaggedCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-danger bg-danger-bg px-2.5 py-1.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5" />
            품질 이상 {flaggedCount}건
          </span>
        )}
      </div>

      {/* 검수 콘솔: 좌측 큐 + 우측 상세 */}
      <div className="grid grid-cols-[340px_1fr] gap-5 items-start">
        {/* 좌측: 검수 큐 */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 flex justify-between items-center border-b border-warm-100">
            <h2 className="text-base font-bold text-warm-800 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-brand-500" />
              검수 큐
            </h2>
            <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
              {total}건
            </span>
          </div>
          <div className="flex flex-col gap-2.5 p-3 max-h-[640px] overflow-y-auto">
            {query.isLoading && (
              <div className="text-center text-warm-400 py-10 text-sm">불러오는 중…</div>
            )}
            {!query.isLoading && rows.length === 0 && (
              <div className="text-center text-warm-400 py-10 text-sm">
                해당 상태의 일지가 없습니다
              </div>
            )}
            {rows.map((log) => {
              const flagged = isQualityFlagged(log);
              const active = log.id === selectedId;
              return (
                <button
                  key={log.id}
                  onClick={() => setSelectedId(log.id)}
                  className={cn(
                    "text-left rounded-xl border bg-white px-3.5 py-3 transition-all hover:shadow-card",
                    "border-l-4",
                    flagged ? "border-l-danger" : "border-l-warm-200",
                    active
                      ? "border-brand-500 ring-2 ring-brand-500/20 shadow-card"
                      : "border-warm-200/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-en text-[11.5px] font-bold text-warm-400">#{log.id}</span>
                    <Badge variant={DOMAIN_BADGE[log.service_domain] ?? "outline"} className="text-[10px] px-2 py-0">
                      {DOMAIN_LABEL[log.service_domain] ?? log.service_domain ?? "-"}
                    </Badge>
                    {flagged && (
                      <span className="ml-auto text-[9.5px] font-extrabold text-white bg-danger rounded px-1.5 py-0.5">
                        시간 0분
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[13.5px] font-bold text-warm-800 truncate">
                    {log.caregiver_name}
                    <span className="text-warm-400 font-normal mx-1.5">→</span>
                    {log.senior_name}{log.guardian_name ? ` (${log.guardian_name})` : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-warm-500 flex items-center gap-1.5">
                    <span className={cn("font-en font-bold", flagged && "text-danger")}>
                      케어 {log.duration_min}분
                    </span>
                    <span>·</span>
                    <span>종료 {log.actual_end ? formatDateTime(log.actual_end) : "—"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 우측: 상세 + 검수 결정 */}
        <Card className="overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center text-center text-warm-400 py-24">
              <ClipboardCheck className="w-10 h-10 mb-3 text-warm-300" />
              <p className="text-sm">
                {query.isLoading ? "불러오는 중…" : "검수할 일지를 선택하세요"}
              </p>
            </div>
          ) : (
            <>
              {/* 상세 헤더 */}
              <div className="px-6 py-5 flex items-center gap-4 border-b border-warm-100">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold flex-none",
                    AVATAR_BG[selected.service_domain] ?? "bg-warm-500"
                  )}
                >
                  {selected.caregiver_name?.[0] ?? "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-warm-800 flex items-center gap-2">
                    {selected.caregiver_name}
                    <span className="text-warm-400 font-normal">→</span>
                    {selected.senior_name}{selected.guardian_name ? ` (${selected.guardian_name})` : ""}
                    {isQualityFlagged(selected) && (
                      <span className="text-[10px] font-extrabold text-white bg-danger rounded px-1.5 py-0.5">
                        시간 0분
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-warm-500 mt-1">
                    세션 #{selected.id} · {DOMAIN_LABEL[selected.service_domain] ?? selected.service_domain} · 케어시간{" "}
                    {selected.duration_min}분 · 종료{" "}
                    {selected.actual_end ? formatDateTime(selected.actual_end) : "—"}
                  </div>
                </div>
                <div className="ml-auto text-right flex-none">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    C:Writer 자동 생성
                  </div>
                  <div className="text-[11px] text-warm-400 mt-1">발송 전 검수 필요</div>
                </div>
              </div>

              <div className="grid grid-cols-[1.4fr_1fr] gap-6 p-6">
                {/* 좌측: 세션 메타 */}
                <div>
                  <div className="text-[11px] font-extrabold text-warm-400 tracking-wide uppercase mb-3">
                    케어 세션 정보
                  </div>
                  <div className="rounded-xl border border-warm-100 overflow-hidden">
                    {[
                      { label: "돌봄전문가", value: selected.caregiver_name },
                      { label: "대상자(보호자)", value: `${selected.senior_name}${selected.guardian_name ? ` (${selected.guardian_name})` : ""}` },
                      {
                        label: "서비스 도메인",
                        value: DOMAIN_LABEL[selected.service_domain] ?? selected.service_domain ?? "-",
                      },
                      { label: "세션 상태", value: selected.session_status || "-" },
                      {
                        label: "케어 시간",
                        value: `${selected.duration_min}분`,
                        flag: isQualityFlagged(selected),
                      },
                      {
                        label: "시작",
                        value: selected.actual_start ? formatDateTime(selected.actual_start) : "—",
                      },
                      {
                        label: "종료",
                        value: selected.actual_end ? formatDateTime(selected.actual_end) : "—",
                      },
                      { label: "매칭 ID", value: `#${selected.match_id}` },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 border-b border-warm-100 last:border-b-0",
                          r.flag ? "bg-danger-bg" : "odd:bg-warm-50/40"
                        )}
                      >
                        <span className="text-[11px] font-bold text-warm-500">{r.label}</span>
                        <span
                          className={cn(
                            "text-[13px] font-semibold text-warm-800",
                            r.flag && "text-danger"
                          )}
                        >
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isQualityFlagged(selected) ? (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-danger bg-danger-bg rounded-lg px-3 py-2.5">
                      <AlertTriangle className="w-4 h-4 flex-none" />
                      케어시간이 0분으로 집계되어 일지 내용을 신뢰할 수 없습니다. 그대로 발송하지
                      말고 반려 후 재작성을 요청하세요.
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-xs text-warm-500 bg-warm-50 rounded-lg px-3 py-2.5">
                      <Clock className="w-4 h-4 flex-none text-warm-400" />
                      케어시간 {selected.duration_min}분 · 자동 품질 점검 통과. 내용을 확인 후 발송을
                      승인하세요.
                    </div>
                  )}

                  {/* AI 일지 본문 (검수 대상) */}
                  <div className="mt-4">
                    <div className="text-[11px] font-extrabold text-warm-400 tracking-wide uppercase mb-2">AI 일지 내용</div>
                    {detail.isLoading ? (
                      <div className="text-xs text-warm-400 py-3">불러오는 중…</div>
                    ) : detail.data && (detail.data.guardian_version || detail.data.transcript) ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                          <div className="text-[11px] font-bold text-brand-700 mb-1">보호자용 요약 (승인 시 발송)</div>
                          <p className="text-[13px] text-warm-800 whitespace-pre-wrap leading-relaxed">{detail.data.guardian_version || "—"}</p>
                        </div>
                        {detail.data.medical_version && (
                          <div className="rounded-xl border border-warm-100 p-3">
                            <div className="text-[11px] font-bold text-warm-500 mb-1">의료·돌봄용 요약</div>
                            <p className="text-[13px] text-warm-700 whitespace-pre-wrap leading-relaxed">{detail.data.medical_version}</p>
                          </div>
                        )}
                        {detail.data.transcript && (
                          <div className="rounded-xl border border-warm-100 p-3">
                            <div className="text-[11px] font-bold text-warm-500 mb-1">
                              음성 전사 원문{detail.data.voice_duration_sec ? ` · ${detail.data.voice_duration_sec}초` : ""}
                            </div>
                            <p className="text-[13px] text-warm-600 whitespace-pre-wrap leading-relaxed">{detail.data.transcript}</p>
                          </div>
                        )}
                        <div className="text-[11px] text-warm-400">
                          AI 신뢰도 {detail.data.confidence != null ? `${Math.round(detail.data.confidence * 100)}%` : "—"}
                          {detail.data.llm_model ? ` · ${detail.data.llm_model}` : ""}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-warm-400 py-3 bg-warm-50 rounded-lg px-3">아직 생성된 AI 일지가 없습니다.</div>
                    )}
                  </div>
                </div>

                {/* 우측: 자동 품질 점검 + 검수 결정 */}
                <div>
                  <div className="text-[11px] font-extrabold text-warm-400 tracking-wide uppercase mb-3">
                    AI 자동 품질 점검
                  </div>
                  <div className="flex flex-col gap-2">
                    <QualityCheck
                      ok={selected.duration_min > 0}
                      label="케어시간"
                      detail={`${selected.duration_min}분 ${selected.duration_min > 0 ? "(정상)" : "(이상)"}`}
                    />
                    <QualityCheck
                      ok={!!selected.actual_end}
                      label="세션 종료 기록"
                      detail={selected.actual_end ? "기록됨" : "미기록"}
                    />
                    <QualityCheck
                      ok={!!selected.senior_name}
                      label="대상자 정보"
                      detail={selected.senior_name || "누락"}
                    />
                    <QualityCheck
                      ok={selected.review_status !== "rejected"}
                      label="검수 상태"
                      detail={REVIEW_BADGE[selected.review_status]?.label ?? selected.review_status}
                    />
                  </div>

                  {selected.review_status === "rejected" && selected.review_note && (
                    <div className="mt-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5">
                      <div className="text-[11px] font-bold text-danger mb-0.5">반려 사유</div>
                      <div className="text-xs text-warm-700">{selected.review_note}</div>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-warm-100 bg-warm-50/40 p-4">
                    <div className="text-[13px] font-bold text-warm-800 mb-2">검수 결정</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-warm-500 mb-3">
                      <Bell className="w-3.5 h-3.5" />
                      승인 시 보호자({selected.guardian_name || `${selected.senior_name} 가족`}) 앱으로 발송됩니다
                    </div>

                    {selected.review_status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          className="flex-1"
                          disabled={reject.isPending}
                          onClick={() => handleReject(selected.id)}
                        >
                          <X className="w-4 h-4" />
                          반려·재작성
                        </Button>
                        <Button
                          variant="brand"
                          className="flex-1"
                          disabled={approve.isPending || isQualityFlagged(selected)}
                          onClick={() => approve.mutate(selected.id)}
                        >
                          <Check className="w-4 h-4" />
                          승인 · 발송
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <Badge variant={REVIEW_BADGE[selected.review_status]?.variant ?? "warn"}>
                          {REVIEW_BADGE[selected.review_status]?.label ?? selected.review_status}
                        </Badge>
                        <span className="text-[11px] text-warm-400">
                          {selected.reviewed_at ? formatDateTime(selected.reviewed_at) : "—"}
                        </span>
                      </div>
                    )}
                    {isQualityFlagged(selected) && selected.review_status === "pending" && (
                      <p className="mt-2 text-[11px] text-danger font-semibold">
                        품질 이상 일지는 승인이 비활성화됩니다. 반려 후 재작성을 요청하세요.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function QualityCheck({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px]",
        ok ? "border-warm-100 bg-warm-50/40" : "border-danger/30 bg-danger-bg"
      )}
    >
      <span
        className={cn(
          "w-[22px] h-[22px] rounded-md flex items-center justify-center flex-none",
          ok ? "bg-brand-50 text-brand-600" : "bg-danger-bg text-danger"
        )}
      >
        {ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      </span>
      <span className="font-semibold text-warm-700">{label}</span>
      <span
        className={cn(
          "ml-auto font-bold text-right",
          ok ? "text-brand-700" : "text-danger"
        )}
      >
        {detail}
      </span>
    </div>
  );
}
