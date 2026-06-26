"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Gauge,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/domain/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { aiModelsApi, type AiModel } from "@/lib/api/ai-models";
import { cn, formatTimeAgo } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/client";
import { ModelInsights } from "./_components/model-insights";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// DB의 실제 model_name 값 기준(예: 'matching-recommender'). [[careand-aimodel-name-mismatch]]
const MODEL_NAME_KO: Record<string, string> = {
  "matching-recommender": "매칭 추천",
  "anomaly-detector": "이상징후 탐지",
  "demand-forecast": "수요 예측",
  "rag-chatbot": "RAG 챗봇",
  "voice-summary-llm": "음성 요약 LLM",
};

const SLOW_LATENCY_MS = 1000;
const LOW_ACCURACY = 0.85;
// 마지막 감사가 14일 이상 지난 active 모델은 감사 지연으로 본다
const STALE_AUDIT_MS = 14 * 24 * 60 * 60 * 1000;

function isAuditStale(model: AiModel) {
  if (model.status !== "active") return false;
  if (!model.audited_at) return true;
  return Date.now() - new Date(model.audited_at).getTime() > STALE_AUDIT_MS;
}

function accuracyColor(accuracy: number) {
  if (accuracy >= 0.9) return "bg-brand-500";
  if (accuracy >= LOW_ACCURACY) return "bg-info";
  return "bg-warn";
}

export default function AiModelsPage() {
  const queryClient = useQueryClient();

  // 파괴적 액션은 confirm 다이얼로그를 거친다(INV-6). 대상 모델을 보관.
  const [promoteTarget, setPromoteTarget] = useState<AiModel | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<AiModel | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ai-models"],
    queryFn: aiModelsApi.list,
  });

  const promoteMutation = useMutation({
    mutationFn: aiModelsApi.promote,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-models"] });
      setPromoteTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rollbackMutation = useMutation({
    mutationFn: aiModelsApi.rollback,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-models"] });
      setRollbackTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const auditMutation = useMutation({
    mutationFn: aiModelsApi.audit,
    onSuccess: (data) => {
      if (data.data?.passed) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-models"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const models = data?.data ?? [];
  const summary = data?.summary;
  // 매칭 모델 판별은 실제 model_name('matching-recommender') 기준으로 includes 매칭.
  const matchingModel = models.find(
    (m) => m.model_name.includes("matching") && m.status === "active"
  );

  // 헬스 요약 (실데이터 기반 계산)
  const avgAccuracy =
    models.length > 0
      ? models.reduce((sum, m) => sum + m.accuracy, 0) / models.length
      : 0;
  const perfWarnings = models.filter(
    (m) =>
      m.accuracy < LOW_ACCURACY ||
      m.avg_latency_ms >= SLOW_LATENCY_MS ||
      isAuditStale(m)
  ).length;

  return (
    <div className="p-8">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            AI 모델 운영
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            AI 모델의 버전·성능·편향성을 통합 관리합니다. 임계치 미달 모델은 자동
            플래그됩니다.
          </p>
        </div>
        <Button variant="brand">
          <Plus className="w-4 h-4" />
          새 모델 배포
        </Button>
      </div>

      {/* 모델 헬스 요약 KPI */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="운영중 (active)"
          value={summary?.active ?? 0}
          icon={CheckCircle2}
          iconColor="brand"
        />
        <KpiCard
          label="섀도우 (shadow)"
          value={summary?.shadow ?? 0}
          icon={Circle}
          iconColor="info"
        />
        <KpiCard
          label="폐기 (deprecated)"
          value={summary?.deprecated ?? 0}
          icon={Trash2}
          iconColor="warn"
        />
        <KpiCard
          label="평균 정확도"
          value={models.length > 0 ? `${(avgAccuracy * 100).toFixed(1)}%` : "—"}
          icon={Gauge}
          iconColor="brand"
        />
        <KpiCard
          variant={perfWarnings > 0 ? "alert" : "default"}
          label="성능 경고"
          value={perfWarnings}
          icon={AlertTriangle}
          iconColor="warn"
          subLabel={
            perfWarnings > 0 ? "정확도·지연·감사 지연 합산" : undefined
          }
        />
      </div>

      {/* 모델 일람 표 */}
      <Card className="mb-6 overflow-hidden">
        <div className="px-6 py-5 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">배포 모델 일람</h2>
          {summary && (
            <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
              총 {summary.total}개 모델 · {summary.active} ACTIVE /{" "}
              {summary.shadow} SHADOW
            </span>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>모델 종류</TableHead>
              <TableHead>버전</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">정확도</TableHead>
              <TableHead className="text-right">평균 지연</TableHead>
              <TableHead>마지막 감사</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-warm-500">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-warm-500">
                  배포된 모델이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              models.map((model) => {
                const slow = model.avg_latency_ms >= SLOW_LATENCY_MS;
                const lowAcc = model.accuracy < LOW_ACCURACY;
                const stale = isAuditStale(model);
                return (
                  <TableRow
                    key={model.id}
                    className={
                      model.status === "shadow" ? "bg-info-bg/40" : undefined
                    }
                  >
                    <TableCell>
                      <strong className="text-warm-800">
                        {MODEL_NAME_KO[model.model_name] || model.model_name}
                      </strong>
                    </TableCell>
                    <TableCell>
                      <span className="font-en text-[11px] text-warm-600 px-1.5 py-0.5 bg-warm-100 rounded-md">
                        {model.model_name}-{model.version}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          model.status === "active"
                            ? "success"
                            : model.status === "shadow"
                            ? "info"
                            : "outline"
                        }
                        className={cn(
                          "uppercase text-[10px]",
                          model.status === "deprecated" &&
                            "bg-warm-100 text-warm-500"
                        )}
                      >
                        {model.status === "active"
                          ? "● ACTIVE"
                          : model.status === "shadow"
                          ? "○ SHADOW"
                          : "DEPRECATED"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="w-16 h-1.5 bg-warm-200 rounded-sm overflow-hidden">
                          <span
                            className={cn(
                              "block h-full rounded-sm",
                              accuracyColor(model.accuracy)
                            )}
                            style={{
                              width: `${Math.min(
                                100,
                                model.accuracy * 100
                              )}%`,
                            }}
                          />
                        </span>
                        <span
                          className={cn(
                            "font-en font-bold w-12 text-right",
                            lowAcc ? "text-warn" : "text-warm-800"
                          )}
                        >
                          {(model.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      {lowAcc && (
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-bold text-warn">
                          <AlertTriangle className="w-3 h-3" />
                          임계치 미달
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-en font-semibold",
                          slow && "text-warn"
                        )}
                      >
                        {model.avg_latency_ms < 1000
                          ? `${Math.round(model.avg_latency_ms)}ms`
                          : `${(model.avg_latency_ms / 1000).toFixed(1)}s`}
                      </span>
                      {slow && (
                        <span className="ml-1.5 inline-flex items-center text-[9.5px] font-extrabold text-white bg-warn px-1.5 py-px rounded">
                          지연
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={cn(
                          stale ? "text-warn font-bold" : "text-warm-500"
                        )}
                      >
                        {model.audited_at
                          ? formatTimeAgo(model.audited_at)
                          : "-"}
                        {stale && " · 감사 필요"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {model.status === "shadow" && (
                          <Button
                            size="sm"
                            variant="brand"
                            onClick={() => setPromoteTarget(model)}
                            disabled={promoteMutation.isPending}
                          >
                            승격 ↑
                          </Button>
                        )}
                        {model.status === "active" && (
                          <>
                            {model.model_name.includes("matching") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => auditMutation.mutate(model.id)}
                                disabled={auditMutation.isPending}
                              >
                                감사 실행
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRollbackTarget(model)}
                              disabled={rollbackMutation.isPending}
                            >
                              롤백 ↓
                            </Button>
                          </>
                        )}
                        {model.status === "deprecated" && (
                          <Button size="sm" variant="outline">
                            상세 →
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 편향성 감사 + 검수 (매칭 모델 자세히) */}
      {matchingModel && <ModelInsights modelId={matchingModel.id} />}

      {/* 승격 확인 (INV-6) — shadow → active, 기존 active는 deprecated */}
      <ConfirmDialog
        open={promoteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setPromoteTarget(null);
        }}
        loading={promoteMutation.isPending}
        tone="brand"
        title="모델 승격"
        description="섀도우 모델을 운영(active)에 투입합니다."
        target={
          promoteTarget
            ? `${MODEL_NAME_KO[promoteTarget.model_name] ?? promoteTarget.model_name} · ${promoteTarget.model_name}-${promoteTarget.version}`
            : null
        }
        impact="현재 운영 중인 같은 종류의 모델은 자동으로 폐기(deprecated)되고, 이 모델이 실제 추천·처리에 사용됩니다."
        reversible
        reverseHint="승격 후 '롤백'으로 이전 버전을 되돌릴 수 있습니다."
        confirmLabel="승격"
        onConfirm={() => {
          if (promoteTarget) promoteMutation.mutate(promoteTarget.id);
        }}
      />

      {/* 롤백 확인 (INV-6) — active → deprecated, 직전 버전을 active */}
      <ConfirmDialog
        open={rollbackTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRollbackTarget(null);
        }}
        loading={rollbackMutation.isPending}
        tone="danger"
        title="모델 롤백"
        description="운영 중인 모델을 직전 버전으로 되돌립니다."
        target={
          rollbackTarget
            ? `${MODEL_NAME_KO[rollbackTarget.model_name] ?? rollbackTarget.model_name} · ${rollbackTarget.model_name}-${rollbackTarget.version}`
            : null
        }
        impact="이 모델은 폐기(deprecated)되고 직전 버전이 운영(active)으로 전환됩니다. 되돌릴 직전 버전이 없으면 실패합니다."
        reversible={false}
        confirmLabel="롤백"
        onConfirm={() => {
          if (rollbackTarget) rollbackMutation.mutate(rollbackTarget.id);
        }}
      />
    </div>
  );
}
