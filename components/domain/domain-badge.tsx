import { cn } from "@/lib/utils";
import { DOMAIN_LABEL } from "@/lib/caregiverType";

/**
 * 돌봄 분야 배지(2026-10-11) — 보호자·파트너 앱(lib/core/domain_colors.dart)과 같은 분야 색.
 * 기본=옅은 분야 색 바탕+진한 글자(4.5:1 이상), solid=분야 색으로 채우고 흰 글자(4.8:1 이상, 대표 서비스 등)
 */
export const DOMAIN_COLOR: Record<string, { fill: string; tint: string; ink: string }> = {
  postpartum: { fill: "#C2412D", tint: "#FBE7E3", ink: "#A83524" },
  senior: { fill: "#9A6416", tint: "#FDF3DC", ink: "#9A6416" },
  nursing: { fill: "#2F64B5", tint: "#E8F0FB", ink: "#2F64B5" },
  living_support: { fill: "#2E7D80", tint: "#E3F1F1", ink: "#24686B" },
  housekeeping: { fill: "#2E7D80", tint: "#E3F1F1", ink: "#24686B" },
  childcare: { fill: "#4F7A28", tint: "#EEF5E6", ink: "#4F7A28" },
  mental_care: { fill: "#5B4BC4", tint: "#EAE7FB", ink: "#5B4BC4" },
};
const FALLBACK = { fill: "#6E6757", tint: "#EFEDEA", ink: "#4F4A40" };

/** 분야 채움색(흰 글자 4.8:1 이상) — 이름 아이콘 바탕 등 */
export function domainFill(domain: string | null | undefined): string {
  return (domain && DOMAIN_COLOR[domain]?.fill) || FALLBACK.fill;
}

export function DomainBadge({ domain, label, solid, className, title }: { domain: string | null | undefined; label?: string; solid?: boolean; className?: string; title?: string }) {
  if (!domain) return null;
  const c = DOMAIN_COLOR[domain] ?? FALLBACK;
  return (
    <span
      title={title}
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", className)}
      style={solid ? { background: c.fill, color: "#FFFFFF" } : { background: c.tint, color: c.ink }}
    >
      {label ?? DOMAIN_LABEL[domain] ?? domain}
    </span>
  );
}
