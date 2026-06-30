"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Activity,
  ShieldCheck,
  PhoneCall,
  UserPlus,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardApi, type RecentAlert } from "@/lib/api/dashboard";
import { getApiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { ko, cn } from "@/lib/utils";

const SEVERITIES = [
  { key: "all", label: "전체" },
  { key: "critical", label: "긴급" },
  { key: "high", label: "높음" },
  { key: "mid", label: "중간" },
  { key: "low", label: "낮음" },
] as const;

const RISK_DESC: Record<string, string> = {
  fall: "활동량 급감 · 낙상 위험 신호 감지",
  delirium: "야간 배회 · 인지 점수 하락 감지",
  depression: "대화 응답 감소 · 식욕 저하 징후",
  nutrition: "연속 결식 · 영양 상태 저하 감지",
};

type Tier = "crit" | "high" | "mid";

function tierOf(severity: RecentAlert["severity"]): Tier {
  if (severity === "critical") return "crit";
  if (severity === "high") return "high";
  return "mid";
}

const TIER_STYLE: Record<
  Tier,
  { score: string; bar: string; tag: string; text: string; chipBg: string; iconBg: string }
> = {
  crit: {
    score: "bg-danger text-white",
    bar: "border-l-danger",
    tag: "bg-danger text-white",
    text: "text-danger",
    chipBg: "bg-danger-bg",
    iconBg: "bg-danger-bg text-danger",
  },
  high: {
    score: "bg-warn text-white",
    bar: "border-l-warn",
    tag: "bg-warn text-white",
    text: "text-warn",
    chipBg: "bg-warn-bg",
    iconBg: "bg-warn-bg text-warn",
  },
  mid: {
    score: "bg-info text-white",
    bar: "border-l-info",
    tag: "bg-info text-white",
    text: "text-info",
    chipBg: "bg-info-bg",
    iconBg: "bg-info-bg text-info",
  },
};

export default function CareMonitoringPage() {
  const [severity, setSeverity] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("unresolved");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setPage(1); }, [severity, statusFilter]);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "monitoring", statusFilter, severity, page],
    queryFn: () =>
      dashboardApi.monitoringAlerts({
        status: statusFilter === "all" ? undefined : statusFilter,
        severity: severity === "all" ? undefined : severity,
        page,
      }),
    refetchInterval: 30_000,
  });
  const ackM = useMutation({
    mutationFn: (v: { id: number; msg: string; note?: string }) => dashboardApi.acknowledgeAlert(v.id, v.note),
    onSuccess: (_d, v) => { toast.success(v.msg); qc.invalidateQueries({ queryKey: ["admin", "monitoring"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const resolveM = useMutation({
    mutationFn: (v: { id: number; note: string }) => dashboardApi.resolveAlert(v.id, v.note),
    onSuccess: () => { toast.success("해결 처리되었습니다."); qc.invalidateQueries({ queryKey: ["admin", "monitoring"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const bySev: Record<string, number> = meta?.by_severity ?? { critical: 0, high: 0, mid: 0, low: 0 };
  const statusTotal = meta?.status_total ?? 0;

  const countBy = (key: string) => (key === "all" ? statusTotal : bySev[key] ?? 0);
  const critCount = bySev.critical ?? 0;
  const highCount = bySev.high ?? 0;
  const midCount = bySev.mid ?? 0;

  const selected =
    rows.find((a) => a.id === selectedId) ?? rows[0] ?? null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            케어 모니터링
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            AI가 감지한 어르신 이상징후를 위험도순으로 분류하고, 바로 대응합니다
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 rounded-md text-sm text-warm-700 font-en">
          <span className="w-2 h-2 bg-danger rounded-full shadow-[0_0_0_3px_rgba(239,68,68,0.2)] animate-pulse" />
          <span>
            실시간 · {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}-
            {String(now.getDate()).padStart(2, "0")}{" "}
            {String(now.getHours()).padStart(2, "0")}:
            {String(now.getMinutes()).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Triage summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="relative overflow-hidden rounded-xl p-4 shadow-card bg-gradient-to-br from-danger to-[#C2334A] text-white flex items-center gap-3">
          <div>
            <div className="font-en text-3xl font-extrabold leading-none">{critCount}</div>
            <div className="text-xs font-semibold text-white/90 mt-1.5">긴급 (80+)</div>
            <div className="text-[11px] text-white/70 mt-0.5">즉시 대응 필요</div>
          </div>
          <AlertTriangle className="w-16 h-16 absolute -right-3 -bottom-3 opacity-15" />
        </div>

        <div className="rounded-xl p-4 shadow-card border border-warm-200/60 bg-white flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-warn flex-none" />
          <div>
            <div className="font-en text-3xl font-extrabold leading-none text-warm-800">{highCount}</div>
            <div className="text-xs font-semibold text-warm-500 mt-1.5">높음 (60–79)</div>
            <div className="text-[11px] text-warm-400 mt-0.5">관찰 강화 필요</div>
          </div>
        </div>

        <div className="rounded-xl p-4 shadow-card border border-warm-200/60 bg-white flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-info flex-none" />
          <div>
            <div className="font-en text-3xl font-extrabold leading-none text-warm-800">{midCount}</div>
            <div className="text-xs font-semibold text-warm-500 mt-1.5">중간 (40–59)</div>
            <div className="text-[11px] text-warm-400 mt-0.5">정상 범위</div>
          </div>
        </div>

        <div className="rounded-xl p-4 shadow-card border border-warm-200/60 bg-white flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-brand-500 flex-none" />
          <div>
            <div className="font-en text-3xl font-extrabold leading-none text-warm-800">{statusTotal}</div>
            <div className="text-xs font-semibold text-warm-500 mt-1.5">전체 활성 알림</div>
            <div className="text-[11px] text-warm-400 mt-0.5">실시간 집계</div>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center mb-5">
        <div className="inline-flex bg-warm-100 p-1 rounded-md">
          {SEVERITIES.map((s) => (
            <button
              key={s.key}
              onClick={() => setSeverity(s.key)}
              className={cn(
                "px-3.5 py-1.5 text-sm font-semibold rounded transition-colors flex items-center gap-1.5",
                severity === s.key
                  ? "bg-white text-warm-800 shadow-sm"
                  : "text-warm-600 hover:text-warm-800"
              )}
            >
              {s.label}
              <span
                className={cn(
                  "font-en text-[11px] font-bold px-1.5 rounded-full",
                  severity === s.key ? "bg-warm-100 text-warm-700" : "bg-white/60 text-warm-500"
                )}
              >
                {countBy(s.key)}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs font-bold text-warm-400 mr-2">상태</span>
        <div className="inline-flex bg-warm-100 p-1 rounded-md">
          {[{ k: "unresolved", l: "미해결" }, { k: "resolved", l: "처리완료" }, { k: "all", l: "전체" }].map((o) => (
            <button key={o.k} onClick={() => setStatusFilter(o.k)}
              className={cn("px-3 py-1.5 text-sm font-semibold rounded transition-colors",
                statusFilter === o.k ? "bg-white text-warm-800 shadow-sm" : "text-warm-600 hover:text-warm-800")}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Console: list + detail */}
      {isLoading ? (
        <Card className="p-12 text-center text-warm-500 text-sm">로딩 중...</Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-warm-500 text-sm">
          조건에 맞는 이상징후가 없습니다 ✓
        </Card>
      ) : (
        <div className="grid grid-cols-[380px_1fr] gap-5 items-start">
          {/* List */}
          <div className="flex flex-col gap-2.5">
            {rows.map((alert) => {
              const tier = tierOf(alert.severity);
              const s = TIER_STYLE[tier];
              const isSel = selected?.id === alert.id;
              const riskName =
                ko.riskType[alert.risk_type as keyof typeof ko.riskType] ?? alert.risk_type;
              return (
                <Card
                  key={alert.id}
                  onClick={() => setSelectedId(alert.id)}
                  className={cn(
                    "p-3.5 flex items-center gap-3 cursor-pointer border-l-4 transition-all hover:-translate-y-px hover:shadow-md",
                    s.bar,
                    isSel && "ring-2 ring-brand-400/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-none leading-none font-extrabold",
                      s.score
                    )}
                  >
                    <span className="font-en text-base">{Math.round(alert.risk_score)}</span>
                    <span className="text-[8.5px] font-bold opacity-85 mt-0.5">위험</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-warm-800 truncate">
                        {alert.senior_name} 어르신
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-extrabold px-1.5 py-px rounded-md flex-none",
                          s.tag
                        )}
                      >
                        {ko.severity[alert.severity]}
                      </span>
                    </div>
                    <div className={cn("text-xs font-bold mt-1", s.text)}>{riskName} 위험</div>
                    <div className="text-[11px] text-warm-500 mt-1.5">
                      <span className={cn("font-semibold", s.text)}>
                        {alert.detected_ago} · 미처리
                      </span>{" "}
                      · request #{alert.id}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Detail */}
          {selected && (
            <Card className="overflow-hidden">
              {(() => {
                const tier = tierOf(selected.severity);
                const s = TIER_STYLE[tier];
                const riskName =
                  ko.riskType[selected.risk_type as keyof typeof ko.riskType] ??
                  selected.risk_type;
                return (
                  <>
                    {/* Detail header */}
                    <div className="px-6 py-5 border-b border-warm-100 flex items-start gap-4">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl flex-none",
                          tier === "crit"
                            ? "bg-gradient-to-br from-danger to-[#C2334A]"
                            : tier === "high"
                            ? "bg-gradient-to-br from-warn to-[#C25608]"
                            : "bg-gradient-to-br from-info to-brand-600"
                        )}
                      >
                        {selected.senior_name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-extrabold text-warm-800">
                            {selected.senior_name} 어르신
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-extrabold px-1.5 py-px rounded-md",
                              s.tag
                            )}
                          >
                            {ko.severity[selected.severity]} · {riskName}
                          </span>
                        </div>
                        <div className="text-xs text-warm-500 mt-1.5">
                          senior #{selected.senior_id} · request #{selected.id} ·{" "}
                          {selected.detected_ago}
                        </div>
                      </div>
                      <div className="ml-auto text-right flex-none">
                        <div className={cn("font-en text-3xl font-extrabold leading-none", s.text)}>
                          {Math.round(selected.risk_score)}
                          <span className="text-sm text-warm-400 font-bold">/100</span>
                        </div>
                        <div className="text-[11px] text-warm-400 mt-1">
                          AI 위험 점수 (높을수록 위험)
                        </div>
                      </div>
                    </div>

                    {/* Detail body */}
                    <div className="grid grid-cols-[1.2fr_1fr] gap-6 p-6">
                      {/* Left: detected signal */}
                      <div>
                        <div className="text-xs font-extrabold text-warm-400 uppercase tracking-wide mb-3">
                          AI 감지 신호
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-warm-50 border border-warm-100">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center flex-none",
                              s.iconBg
                            )}
                          >
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-warm-800">{riskName} 위험 신호</div>
                            <div className="text-[11px] text-warm-500 mt-0.5">
                              {RISK_DESC[selected.risk_type] ?? `${riskName} 이상 패턴 감지`}
                            </div>
                          </div>
                          <div className={cn("ml-auto font-en text-base font-extrabold", s.text)}>
                            {Math.round(selected.risk_score)}
                          </div>
                        </div>
                        <div className="mt-4 text-[11px] text-warm-400">
                          ※ 세부 신호 지표(낙상 횟수·활동량 추이 등)는 추후 연동 예정입니다.
                        </div>
                      </div>

                      {/* Right: recommendation + actions */}
                      <div>
                        <div className="text-xs font-extrabold text-warm-400 uppercase tracking-wide mb-3">
                          권장 조치
                        </div>
                        <div
                          className={cn(
                            "rounded-xl p-4 border",
                            tier === "crit"
                              ? "bg-danger-bg border-danger/20"
                              : tier === "high"
                              ? "bg-warn-bg border-warn/20"
                              : "bg-info-bg border-info/20"
                          )}
                        >
                          <div className={cn("text-xs font-extrabold flex items-center gap-1.5", s.text)}>
                            <AlertTriangle className="w-4 h-4" />
                            AI 권장
                          </div>
                          <div className="text-xs text-warm-600 mt-2 leading-relaxed">
                            {riskName} 위험 신호가 감지되었습니다. 담당 케어 돌봄전문가의 즉시 방문 및
                            보호자 연락을 권장합니다.
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 border border-warm-100 rounded-xl mt-4">
                          <div className="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-sm flex-none">
                            케어
                          </div>
                          <div>
                            <div className="text-sm font-bold text-warm-800">담당 케어 돌봄전문가</div>
                            <div className="text-[11px] text-warm-400 mt-0.5">배정 정보 연동 예정</div>
                          </div>
                          <button className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-warm-200 bg-white text-xs font-bold text-warm-600 hover:border-warm-300">
                            <PhoneCall className="w-3.5 h-3.5" />
                            연락
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Detail actions */}
                    {["resolved", "dismissed"].includes(selected.status) ? (
                      <div className="px-6 py-4 border-t border-warm-100 bg-warm-50/60 text-sm text-warm-500 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-500" /> 처리 완료된 알림입니다.
                      </div>
                    ) : (
                      <div className="flex gap-2.5 px-6 py-4 border-t border-warm-100 bg-warm-50/60">
                        <Button variant="brand" size="sm" disabled={ackM.isPending}
                          onClick={() => ackM.mutate({ id: selected.id, msg: "대응 시작 — 담당 돌봄전문가 긴급 방문 배정으로 기록했습니다.", note: "담당 돌봄전문가 긴급 방문 배정" })}>
                          <UserPlus className="w-4 h-4" />
                          담당 돌봄전문가 긴급 방문 배정
                        </Button>
                        <Button variant="outline" size="sm" disabled={ackM.isPending}
                          onClick={() => ackM.mutate({ id: selected.id, msg: "보호자 알림 대응으로 기록했습니다.", note: "보호자 알림 대응" })}>
                          <Bell className="w-4 h-4" />
                          보호자 알림
                        </Button>
                        {tier === "crit" && (
                          <Button variant="danger" size="sm" disabled={ackM.isPending}
                            onClick={() => ackM.mutate({ id: selected.id, msg: "119·의료 연계 안내를 기록했습니다.", note: "119·의료 연계 안내" })}>
                            <AlertTriangle className="w-4 h-4" />
                            119 / 의료 연계
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="ml-auto" disabled={resolveM.isPending}
                          onClick={() => {
                            const note = window.prompt("처리 내용을 입력하세요:", "현장 확인 후 조치 완료");
                            if (note && note.trim()) resolveM.mutate({ id: selected.id, note: note.trim() });
                          }}>
                          <CheckCircle2 className="w-4 h-4" />
                          처리 완료
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </Card>
          )}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </Button>
          <span className="text-sm font-semibold text-warm-600">
            {meta.current_page} / {meta.last_page} 페이지 · 총 {meta.total}건
          </span>
          <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
