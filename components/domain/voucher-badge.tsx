import { Badge } from "@/components/ui/badge";

/** 바우처 표시(서버 voucher, 2026-10-11) — contract=정부 바우처 계약으로 생긴 방문, eligible=계약 전이지만 보호자가 가입 때 정부 바우처를 고른 가정 */
export type VoucherFlag = "contract" | "eligible" | null | undefined;

export function VoucherBadge({ voucher, className }: { voucher: VoucherFlag; className?: string }) {
  if (voucher === "contract")
    return (
      <Badge variant="info" className={className} title="정부 바우처 계약으로 생긴 방문 — 제공기록지·산모 서명 필요">
        바우처 계약
      </Badge>
    );
  if (voucher === "eligible")
    return (
      <Badge variant="warn" className={className} title="계약은 아직 없지만 보호자가 가입 때 정부 바우처로 이용한다고 고른 가정">
        바우처 대상
      </Badge>
    );
  return null;
}
