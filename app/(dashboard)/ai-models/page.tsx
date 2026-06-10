"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { aiModelsApi } from "@/lib/api/ai-models";
import { cn, formatTimeAgo } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/client";
import { ModelInsights } from "./_components/model-insights";

const MODEL_NAME_KO: Record<string, string> = {
  matching: "매칭 추천",
  stt: "음성 STT",
  llm: "일지 LLM",
  anomaly: "이상징후 탐지",
  forecast: "수요 예측",
};

export default function AiModelsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ai-models"],
    queryFn: aiModelsApi.list,
  });

  const promoteMutation = useMutation({
    mutationFn: aiModelsApi.promote,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-models"] });
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

  return (
    <div className="p-8">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            AI 모델 운영
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            5개 AI 모델의 버전·성능·편향성을 통합 관리
          </p>
        </div>
        <Button variant="brand">
          <Plus className="w-4 h-4" />
          새 모델 배포
        </Button>
      </div>

      {/* 모델 일람 표 */}
      <Card className="mb-6 overflow-hidden">
        <div className="px-6 py-5 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">배포 모델 일람</h2>
          {data?.summary && (
            <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
              총 {data.summary.total}개 모델 · {data.summary.active} ACTIVE /{" "}
              {data.summary.shadow} SHADOW
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
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-warm-500">
                  배포된 모델이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((model) => (
                <TableRow
                  key={model.id}
                  className={model.status === "shadow" ? "bg-warn-bg/40" : undefined}
                >
                  <TableCell>
                    <strong className="text-warm-800">
                      {MODEL_NAME_KO[model.model_name] || model.model_name}
                    </strong>
                  </TableCell>
                  <TableCell className="font-en text-warm-600">
                    {model.model_name}-{model.version}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        model.status === "active"
                          ? "success"
                          : model.status === "shadow"
                          ? "outline"
                          : "outline"
                      }
                      className={cn(
                        "uppercase text-[10px]",
                        model.status === "shadow" && "bg-warm-100 text-warm-700"
                      )}
                    >
                      {model.status === "active"
                        ? "● ACTIVE"
                        : model.status === "shadow"
                        ? "○ SHADOW"
                        : "DEPRECATED"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-en font-semibold",
                      model.accuracy >= 0.9
                        ? "text-brand-600"
                        : model.accuracy >= 0.8
                        ? "text-warm-800"
                        : "text-warn"
                    )}
                  >
                    {(model.accuracy * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-en font-semibold">
                    {model.avg_latency_ms < 1000
                      ? `${Math.round(model.avg_latency_ms)}ms`
                      : `${(model.avg_latency_ms / 1000).toFixed(1)}s`}
                  </TableCell>
                  <TableCell className="text-warm-500 text-xs">
                    {model.audited_at ? formatTimeAgo(model.audited_at) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {model.status === "shadow" ? (
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => promoteMutation.mutate(model.id)}
                        disabled={promoteMutation.isPending}
                      >
                        승격 ↑
                      </Button>
                    ) : model.model_name === "matching" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => auditMutation.mutate(model.id)}
                        disabled={auditMutation.isPending}
                      >
                        감사 실행
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline">
                        상세 →
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 편향성 감사 + 검수 (매칭 모델 자세히) */}
      {data?.data.find((m) => m.model_name === "matching" && m.status === "active") && (
        <ModelInsights
          modelId={
            data.data.find((m) => m.model_name === "matching" && m.status === "active")!.id
          }
        />
      )}
    </div>
  );
}
