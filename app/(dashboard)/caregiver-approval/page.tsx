"use client";
import { DOMAIN_LABEL } from "@/lib/caregiverType";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  ShieldCheck,
  Star,
  Clock,
  FileWarning,
  CheckCircle2,
  Phone,
  Mail,
  IdCard,
  FileText,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/domain/kpi-card";
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

// 아바타 배경 (도메인 기반, 첫 도메인 사용)
const AVATAR_BG: Record<string, string> = {
  senior: "bg-brand-500", nursing: "bg-info", living_support: "bg-brand-600",
  postpartum: "bg-warn",
  childcare: "bg-info",
};

// 1차년도 수동 검증 — 제출 서류 체크리스트 (정적 안내, 자동 진위검증 미연동)
const DOC_CHECKLIST: { label: string; required: boolean }[] = [
  { label: "신분증", required: true },
  { label: "자격증", required: true },
  { label: "성범죄경력 회신서", required: true },
  { label: "건강진단서", required: true },
  { label: "통장 사본", required: false },
];

export default function CaregiverApprovalPage() {
  const [status, setStatus] = useState("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "caregivers", status],
    queryFn: () => operationsApi.caregivers({ status }),
  });

  const approve = useMutation({
    mutationFn: (id: number) => operationsApi.approveCaregiver(id),
    onSuccess: () => {
      toast.success("돌봄전문가를 승인했습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "caregivers"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      operationsApi.rejectCaregiver(id, reason),
    onSuccess: () => {
      toast.success("돌봄전문가를 반려했습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "caregivers"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function handleReject(id: number) {
    const reason = window.prompt("반려 사유를 입력하세요:");
    if (reason && reason.trim()) reject.mutate({ id, reason: reason.trim() });
  }

  const rows = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? 0;

  // 첫 행 자동 선택 / 목록 변동 시 유효한 선택 유지
  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !rows.some((r) => r.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const firstDomain = (c: typeof rows[number]) => (c.service_domains || "senior").split(",")[0];

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">돌봄전문가 자격 검증</h1>
        <p className="text-sm text-warm-500 mt-1">
          신규 돌봄전문가의 자격증·서류를 검토하고 승인·반려합니다. 시니어 케어는 성범죄경력 회신서 확인이 필수입니다 (1차년도 수동 검증).
        </p>
      </div>

      {/* SLA / 현황 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard variant="brand" label="승인 대기" value={status === "pending" ? total : "—"} icon={Clock} />
        <KpiCard label="검토 대상 (현재 탭)" value={total} icon={ShieldCheck} iconColor="info" />
        <KpiCard label="필수 서류 항목" value={DOC_CHECKLIST.filter((d) => d.required).length} icon={FileWarning} iconColor="warn" subLabel="신분증·자격증·성범죄경력·건강진단서" />
        <KpiCard label="누적 검증 돌봄전문가" value={total} icon={CheckCircle2} iconColor="brand" subLabel="현재 탭 기준" />
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-2 mb-5">
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

      {/* 콘솔: 목록 + 상세 */}
      <div className="grid grid-cols-[340px_1fr] gap-5 items-start">
        {/* 목록 */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1 mb-0.5">
            <h2 className="text-sm font-bold text-warm-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-500" />
              돌봄전문가 목록
            </h2>
            <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">{total}명</span>
          </div>

          {query.isLoading && (
            <Card className="p-6 text-center text-warm-400 text-sm">불러오는 중…</Card>
          )}
          {!query.isLoading && rows.length === 0 && (
            <Card className="p-6 text-center text-warm-400 text-sm">해당 상태의 돌봄전문가가 없습니다</Card>
          )}

          {rows.map((c) => {
            const dom = firstDomain(c);
            const sel = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full text-left rounded-xl border bg-white p-3.5 shadow-card transition-all flex gap-3 items-center hover:-translate-y-px hover:shadow-md",
                  sel ? "border-brand-500 ring-2 ring-brand-500/20" : "border-warm-200/60"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-none", AVATAR_BG[dom] ?? "bg-warm-500")}>
                  {c.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-warm-800 truncate">{c.name}</div>
                  <div className="text-xs text-warm-500 font-semibold mt-0.5 truncate">
                    {DOMAIN_LABEL[dom] ?? dom}
                    {c.career_track ? ` · ${c.career_track}` : ""}
                  </div>
                  <div className="text-[11px] text-warm-400 mt-1 flex items-center gap-1.5">
                    <Badge variant={STATUS_BADGE[c.status]?.variant ?? "outline"}>
                      {STATUS_BADGE[c.status]?.label ?? c.status}
                    </Badge>
                    <span className="font-en">{formatDate(c.created_at)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 상세 패널 */}
        <Card className="overflow-hidden">
          {!selected ? (
            <div className="p-12 text-center text-warm-400 text-sm">
              왼쪽 목록에서 돌봄전문가를 선택하면 검토 상세가 표시됩니다.
            </div>
          ) : (
            <>
              {/* 상세 헤더 */}
              <div className="px-6 py-5 border-b border-warm-100 flex items-start gap-4">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold flex-none", AVATAR_BG[firstDomain(selected)] ?? "bg-warm-500")}>
                  {selected.name?.[0] ?? "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-warm-800 tracking-tight flex items-center gap-2.5">
                    {selected.name}
                    <Badge variant={STATUS_BADGE[selected.status]?.variant ?? "outline"}>
                      {STATUS_BADGE[selected.status]?.label ?? selected.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-warm-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /><span className="font-en">{selected.phone || "-"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /><span className="font-en">{selected.email || "-"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IdCard className="w-3.5 h-3.5" />자격증 <span className="font-en text-warm-700 font-semibold">{selected.license_no || "미제출"}</span>
                    </span>
                    <span>신청일 <span className="font-en">{formatDate(selected.created_at)}</span></span>
                  </div>
                </div>
                {selected.status !== "pending" && (
                  <div className="ml-auto text-right flex-none">
                    <div className="inline-flex items-center gap-1 text-sm font-bold text-warm-700">
                      <Star className="w-4 h-4 text-warn" />{selected.rating_avg.toFixed(1)}
                    </div>
                    <div className="text-[11px] text-warm-400 mt-0.5 font-en">{selected.completed_sessions}회 완료</div>
                  </div>
                )}
              </div>

              {/* 상세 본문 */}
              <div className="p-6 grid grid-cols-[1.35fr_1fr] gap-6">
                {/* 좌: 도메인 / 특기 / 제출 서류 안내 */}
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] font-extrabold text-warm-400 uppercase tracking-wide mb-2.5">서비스 도메인 · 특기</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.service_domains || "senior").split(",").map((d) => (
                        <Badge key={d} variant="brand">{DOMAIN_LABEL[d] ?? d}</Badge>
                      ))}
                      {selected.specialties.length === 0 && (
                        <span className="text-warm-400 text-xs self-center">등록된 특기 없음</span>
                      )}
                      {selected.specialties.map((s) => (
                        <Badge key={s} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-[11px] font-extrabold text-warm-400 uppercase tracking-wide">제출 서류 검토</div>
                      <span className="text-[11px] text-warm-500 bg-warm-100 rounded-full px-2.5 py-0.5">수동 확인</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {DOC_CHECKLIST.map((doc) => (
                        <div key={doc.label} className="flex items-center gap-3 px-3 py-2.5 border border-warm-100 rounded-lg bg-warm-50">
                          <div className="w-9 h-11 rounded-md bg-brand-500/90 text-white flex items-center justify-center flex-none">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold text-warm-800 flex items-center gap-1.5">
                              {doc.label}
                              {doc.required && (
                                <span className="text-[9.5px] font-extrabold text-white bg-danger px-1.5 py-px rounded">필수</span>
                              )}
                            </div>
                            <div className="text-[11px] text-warm-400 mt-0.5">담당자 직접 확인 항목</div>
                          </div>
                          <div className="ml-auto flex items-center gap-2 flex-none">
                            <span className="text-[11.5px] font-bold text-warm-400 inline-flex items-center gap-1">검토 필요</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 우: 검증 안내 + 결정 */}
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] font-extrabold text-warm-400 uppercase tracking-wide mb-2.5">자동 진위 검증</div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-warm-600 bg-info-bg text-info rounded-lg px-3 py-2.5">
                      <AlertTriangle className="w-4 h-4 flex-none" />
                      1차년도는 외부 진위조회 미연동 — 담당자 수동 검증으로 처리합니다.
                    </div>
                  </div>

                  <div className="border border-warm-100 rounded-xl p-4 bg-warm-50">
                    <div className="text-[13px] font-bold text-warm-800 mb-3">검토 결정</div>
                    {selected.status === "rejected" && selected.rejection_reason && (
                      <div className="flex items-start gap-2 text-xs font-semibold text-danger bg-danger-bg rounded-lg px-3 py-2.5 mb-3">
                        <XCircle className="w-4 h-4 flex-none mt-px" />
                        <span>반려 사유: {selected.rejection_reason}</span>
                      </div>
                    )}
                    {selected.status === "pending" ? (
                      <div className="flex gap-2.5">
                        <Button
                          variant="danger"
                          className="flex-1"
                          disabled={reject.isPending}
                          onClick={() => handleReject(selected.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          반려
                        </Button>
                        <Button
                          variant="brand"
                          className="flex-1"
                          disabled={approve.isPending}
                          onClick={() => approve.mutate(selected.id)}
                        >
                          <BadgeCheck className="w-4 h-4" />
                          승인
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-warm-500">
                        <CheckCircle2 className="w-4 h-4 text-brand-500" />
                        이미 검토 완료된 돌봄전문가입니다 ·
                        <span className="inline-flex items-center gap-1 font-semibold text-warm-600">
                          <Star className="w-3 h-3 text-warn" />
                          {selected.rating_avg.toFixed(1)} · {selected.completed_sessions}회
                        </span>
                      </div>
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
