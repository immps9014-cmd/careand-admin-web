"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/lib/api/dashboard";
import { ko, formatTimeAgo, cn } from "@/lib/utils";

const SEVERITIES = [
  { key: "all", label: "전체" },
  { key: "critical", label: "긴급" },
  { key: "high", label: "높음" },
  { key: "mid", label: "중간" },
  { key: "low", label: "낮음" },
] as const;

export default function CareMonitoringPage() {
  const [severity, setSeverity] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "alerts"],
    queryFn: dashboardApi.recentAlerts,
    refetchInterval: 30_000,
  });

  const filtered = data?.data.filter(
    (a) => severity === "all" || a.severity === severity
  );

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          케어 모니터링
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          AI가 감지한 이상징후 알림을 확인하고 처리합니다
        </p>
      </div>

      <div className="inline-flex bg-warm-100 p-1 rounded-md mb-4">
        {SEVERITIES.map((s) => (
          <button
            key={s.key}
            onClick={() => setSeverity(s.key)}
            className={cn(
              "px-4 py-1.5 text-sm font-semibold rounded transition-colors",
              severity === s.key
                ? "bg-white text-warm-800 shadow-sm"
                : "text-warm-600 hover:text-warm-800"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-12 text-center text-warm-500 text-sm">로딩 중...</Card>
        ) : filtered?.length === 0 ? (
          <Card className="p-12 text-center text-warm-500 text-sm">
            조건에 맞는 이상징후가 없습니다 ✓
          </Card>
        ) : (
          filtered?.map((alert) => (
            <Card key={alert.id} className="p-5 flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                  alert.severity === "critical" || alert.severity === "high"
                    ? "bg-danger-bg text-danger"
                    : alert.severity === "mid"
                    ? "bg-warn-bg text-warn"
                    : "bg-info-bg text-info"
                )}
              >
                <span className="font-en text-xl font-bold">
                  {Math.round(alert.risk_score)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-warm-800">
                    {alert.senior_name} 어르신
                  </span>
                  <Badge
                    variant={
                      alert.severity === "critical" || alert.severity === "high"
                        ? "danger"
                        : alert.severity === "mid"
                        ? "warn"
                        : "info"
                    }
                  >
                    {ko.severity[alert.severity]}
                  </Badge>
                  <span className="text-sm text-warm-700">
                    {ko.riskType[alert.risk_type as keyof typeof ko.riskType]} 위험
                  </span>
                </div>
                <div className="text-xs text-warm-500">
                  request #{alert.id} · {alert.detected_ago}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  확인
                </Button>
                <Button variant="brand" size="sm">
                  처리하기
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
