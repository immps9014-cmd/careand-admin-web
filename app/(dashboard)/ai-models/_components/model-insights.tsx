"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { aiModelsApi } from "@/lib/api/ai-models";
import { cn, formatTimeAgo } from "@/lib/utils";

interface Props {
  modelId: number;
}

export function ModelInsights({ modelId }: Props) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "ai-models", modelId, "detail"],
    queryFn: () => aiModelsApi.show(modelId),
  });

  if (isLoading || !detail?.data) return null;

  const { bias_report } = detail.data;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 편향성 감사 */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-sm font-bold text-warm-800">
              매칭 추천 - 편향성 감사 (성별·연령)
            </h3>
            <p className="text-[11px] text-warm-500 mt-0.5">
              정기 감사 · 매주 일요일 자동 실행
            </p>
          </div>
          {bias_report && (
            <span
              className={cn(
                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                bias_report.passed
                  ? "bg-brand-50 text-brand-600"
                  : "bg-warn-bg text-warn"
              )}
            >
              {bias_report.passed ? "✓ 정상" : "⚠ 임계 초과"}
            </span>
          )}
        </div>

        {bias_report ? (
          <>
            <div className="flex gap-6 items-end h-36 px-4 pt-4 bg-warm-50 rounded-md">
              {Object.entries(bias_report.gender_distribution).map(
                ([key, value], idx) => (
                  <BiasBar
                    key={`g-${key}`}
                    label={
                      key === "M" ? "남성 인력" : key === "F" ? "여성 인력" : key
                    }
                    value={value}
                    maxValue={Math.max(...Object.values(bias_report.gender_distribution))}
                    isAlt={idx % 2 === 1}
                  />
                )
              )}
              {Object.entries(bias_report.age_distribution).map(
                ([key, value], idx) => (
                  <BiasBar
                    key={`a-${key}`}
                    label={key}
                    value={value}
                    maxValue={Math.max(...Object.values(bias_report.age_distribution))}
                    isAlt={idx % 2 === 1}
                  />
                )
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-warm-100 text-[11px] text-warm-500">
              최대 차이{" "}
              <strong className={cn(
                "font-bold",
                bias_report.passed ? "text-brand-600" : "text-warn"
              )}>
                {bias_report.max_diff_pct}%p
              </strong>{" "}
              (허용 한도 ±{bias_report.max_diff_threshold_pct}%p) ·{" "}
              {bias_report.audited_at && `최종 감사 ${formatTimeAgo(bias_report.audited_at)}`}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-warm-500 text-sm">
            아직 편향성 감사가 실행되지 않았습니다.
            <br />
            <span className="text-xs">
              위 표에서 ‘감사 실행’을 클릭해주세요.
            </span>
          </div>
        )}
      </Card>

      {/* 최근 추천 결과 검수 (mock) */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-sm font-bold text-warm-800">
              최근 추천 결과 검수
            </h3>
            <p className="text-[11px] text-warm-500 mt-0.5">
              관리자 수동 검토 이력
            </p>
          </div>
          <span className="text-[11px] font-semibold text-brand-600 px-2.5 py-0.5 bg-brand-50 rounded-full">
            실시간
          </span>
        </div>

        <div className="space-y-3">
          {[
            { id: "30142", senior: "홍어머님", count: 5, status: "approved" },
            { id: "30141", senior: "김아버님", count: 3, status: "intervened" },
            { id: "30140", senior: "박할머님", count: 5, status: "approved" },
            { id: "30139", senior: "이아버님", count: 4, status: "approved" },
            { id: "30138", senior: "최할머님", count: 5, status: "approved" },
          ].map((row, idx) => (
            <div
              key={row.id}
              className={cn(
                "flex justify-between items-center py-2 text-sm",
                idx > 0 && "border-t border-warm-100 pt-3"
              )}
            >
              <div>
                <div className="font-en font-semibold text-warm-800">
                  request #{row.id}
                </div>
                <div className="text-[11px] text-warm-500 mt-0.5">
                  {row.senior} · {row.count}명 추천
                </div>
              </div>
              <span
                className={cn(
                  "text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
                  row.status === "approved"
                    ? "bg-brand-50 text-brand-600"
                    : "bg-warn-bg text-warn"
                )}
              >
                {row.status === "approved" ? "승인" : "관리자 개입"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BiasBar({
  label,
  value,
  maxValue,
  isAlt,
}: {
  label: string;
  value: number;
  maxValue: number;
  isAlt: boolean;
}) {
  const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center">
      <div
        className={cn(
          "w-full rounded-t-lg mb-2 relative",
          isAlt
            ? "bg-gradient-to-b from-warm-300 to-warm-500"
            : "bg-gradient-to-b from-brand-300 to-brand-500"
        )}
        style={{ height: `${heightPct}%`, minHeight: 20 }}
      >
        <span className="absolute -top-5 left-0 right-0 text-center font-en text-[11px] font-bold text-warm-700">
          {value}
        </span>
      </div>
      <div className="text-xs text-warm-600 font-medium text-center">
        {label}
      </div>
    </div>
  );
}
