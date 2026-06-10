import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, DollarSign, LucideIcon } from "lucide-react";

interface AlertItemProps {
  severity: "high" | "warn" | "info";
  title: string;
  meta: string;
  icon?: LucideIcon;
}

const SEVERITY_STYLE = {
  high: {
    bg: "bg-danger-bg",
    border: "border-danger",
    icon: "text-danger",
  },
  warn: {
    bg: "bg-warn-bg",
    border: "border-warn",
    icon: "text-warn",
  },
  info: {
    bg: "bg-info-bg",
    border: "border-info",
    icon: "text-info",
  },
};

const DEFAULT_ICONS = {
  high: AlertTriangle,
  warn: ArrowRight,
  info: DollarSign,
};

export function AlertItem({ severity, title, meta, icon }: AlertItemProps) {
  const style = SEVERITY_STYLE[severity];
  const Icon = icon || DEFAULT_ICONS[severity];

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-md border-l-[3px] mb-2",
        style.bg,
        style.border
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm",
          style.icon
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-warm-800 leading-tight">
          {title}
        </div>
        <div className="text-[11px] text-warm-500 mt-0.5">{meta}</div>
      </div>
    </div>
  );
}
