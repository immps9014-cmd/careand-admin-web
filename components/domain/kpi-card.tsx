import { cn, formatCompact } from "@/lib/utils";
import { ChevronRight, LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "brand" | "default" | "alert";
  trend?: { pct: number; label: string };
  subLabel?: string;
  cta?: string;
  iconColor?: "brand" | "danger" | "warn" | "info";
}

export function KpiCard({ label, value, icon: Icon, variant = "default", trend, subLabel, cta, iconColor = "brand" }: KpiCardProps) {
  const isBrand = variant === "brand";
  const isAlert = variant === "alert";
  const isHighlighted = isBrand || isAlert;
  const formattedValue = typeof value === "number" && value >= 1000 ? formatCompact(value) : value;
  return (
    <div className={cn("relative overflow-hidden rounded-xl p-5 shadow-card border", isBrand && "bg-gradient-to-br from-brand-500 to-brand-700 text-white border-transparent", isAlert && "bg-gradient-to-br from-danger to-[#C2334A] text-white border-transparent", !isHighlighted && "bg-white border-warm-200/60")}>
      {isHighlighted && (<><div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" /><div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" /></>)}
      <div className="flex items-center justify-between mb-3">
        <span className={cn("text-xs font-semibold", isHighlighted ? "text-white/80" : "text-warm-500")}>{label}</span>
        <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", isHighlighted ? "bg-white/15 text-white" : iconColor === "danger" ? "bg-danger-bg text-danger" : iconColor === "warn" ? "bg-warn-bg text-warn" : iconColor === "info" ? "bg-info-bg text-info" : "bg-brand-50 text-brand-600")}><Icon className="w-4 h-4" /></div>
      </div>
      <div className={cn("font-en text-3xl font-extrabold leading-none tracking-tight", isHighlighted ? "text-white" : "text-warm-800")}>{formattedValue}</div>
      {subLabel && <div className={cn("mt-2.5 text-xs font-semibold", isHighlighted ? "text-white/90 bg-white/15 px-2.5 py-1 rounded-full w-fit" : "text-warm-500")}>{subLabel}</div>}
      {!subLabel && trend && (<div className={cn("mt-2 flex items-center gap-1 text-xs font-semibold", isHighlighted ? "text-white/80" : trend.pct >= 0 ? "text-brand-600" : "text-danger")}>{trend.pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}<span>{trend.pct > 0 ? "+" : ""}{trend.pct}% {trend.label}</span></div>)}
      {cta && <div className="absolute bottom-4 right-4 flex items-center gap-0.5 text-[11.5px] font-bold text-white/90">{cta} <ChevronRight className="w-3.5 h-3.5" /></div>}
    </div>
  );
}
