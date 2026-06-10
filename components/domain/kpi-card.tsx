import { cn, formatCompact } from "@/lib/utils";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "brand" | "default";
  trend?: {
    pct: number;
    label: string;
  };
  /** 아이콘 색상 (기본 brand) */
  iconColor?: "brand" | "danger" | "warn" | "info";
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  trend,
  iconColor = "brand",
}: KpiCardProps) {
  const isBrand = variant === "brand";
  const formattedValue =
    typeof value === "number" && value >= 1000 ? formatCompact(value) : value;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg p-5 shadow-card border",
        isBrand
          ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white border-transparent"
          : "bg-white border-warm-100"
      )}
    >
      {isBrand && (
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/8 pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-xs font-semibold",
            isBrand ? "text-white/80" : "text-warm-500"
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center",
            isBrand
              ? "bg-white/15 text-white"
              : iconColor === "danger"
              ? "bg-danger-bg text-danger"
              : iconColor === "warn"
              ? "bg-warn-bg text-warn"
              : iconColor === "info"
              ? "bg-info-bg text-info"
              : "bg-brand-50 text-brand-600"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div
        className={cn(
          "font-en text-3xl font-extrabold leading-none tracking-tight",
          isBrand ? "text-white" : "text-warm-800"
        )}
      >
        {formattedValue}
      </div>

      {trend && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-semibold",
            trend.pct >= 0
              ? isBrand ? "text-brand-200" : "text-brand-600"
              : "text-danger"
          )}
        >
          {trend.pct >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>
            {trend.pct >= 0 ? "+" : ""}
            {trend.pct}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
