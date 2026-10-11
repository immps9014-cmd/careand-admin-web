import { cn } from "@/lib/utils";

/** 바우처 표시(서버 voucher, 2026-10-11) — contract=정부 바우처 계약으로 생긴 방문, eligible=계약 전이지만 보호자가 가입 때 정부 바우처를 고른 가정 */
export type VoucherFlag = "contract" | "eligible" | null | undefined;

/**
 * 테두리 모양(흰 바탕) — 파트너앱 바우처 배지와 같은 모양·색(2026-10-11). 바탕이 채워진 분야·상태 배지와 한눈에 구분된다.
 * 글자 대비 흰 바탕 기준 5:1 이상(계약 #B94C2E 5.1, 대상 #8A5A12 5.9)
 */
const STYLE: Record<"contract" | "eligible", { label: string; color: string; title: string }> = {
  contract: { label: "바우처 계약", color: "#B94C2E", title: "정부 바우처 계약으로 생긴 방문 — 제공기록지·산모 서명 필요" },
  eligible: { label: "바우처 대상", color: "#8A5A12", title: "계약은 아직 없지만 보호자가 가입 때 정부 바우처로 이용한다고 고른 가정" },
};

export function VoucherBadge({ voucher, className }: { voucher: VoucherFlag; className?: string }) {
  if (voucher !== "contract" && voucher !== "eligible") return null;
  const s = STYLE[voucher];
  return (
    <span
      title={s.title}
      className={cn("inline-flex items-center rounded-full border-[1.5px] bg-white px-2 py-px text-xs font-bold whitespace-nowrap", className)}
      style={{ borderColor: s.color, color: s.color }}
    >
      {s.label}
    </span>
  );
}
