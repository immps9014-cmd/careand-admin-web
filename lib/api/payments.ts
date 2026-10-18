import { api } from "./client";

/** 관리자 결제 내역(2026-10-11) — GET /v1/admin/payments. 매출 = 카드 결제 완료 + 바우처 선납 − 환불(대시보드 「이번 주 매출」과 같은 식) */
export type PaymentPeriod = "today" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";
export type PaymentKind = "card" | "voucher_prepaid" | "voucher_refund" | "voucher_penalty";

export interface PaymentRow {
  key: string;
  kind: PaymentKind;
  id: number;
  at: string | null;
  amount: number; // 환불은 음수
  status: string; // paid|pending|failed|cancelled|refunded
  method: string | null;
  ref: string | null; // 주문번호 또는 바우처 계약번호
  payer_name: string | null;
  recipient_name: string | null;
  caregiver_name: string | null;
  service_domain: string | null;
  request_id: number | null;
  contract_id: number | null;
}

export interface PaymentSummary {
  from: string;
  to: string;
  revenue: number;
  card_paid: { count: number; amount: number };
  voucher: { net: number; prepaid_count: number; refund_count: number; penalty_count?: number };
  by_status: Record<string, number>;
}

export interface PaymentListParams {
  period?: PaymentPeriod;
  from?: string;
  to?: string;
  kind?: "card" | "voucher";
  status?: "all";
  q?: string;
  page?: number;
}

export const paymentsApi = {
  async list(params: PaymentListParams) {
    const { data } = await api.get<{
      success: boolean;
      data: PaymentRow[];
      summary: PaymentSummary;
      meta: { total: number; per_page: number; current_page: number; last_page: number };
    }>("/v1/admin/payments", { params });
    return data;
  },
};
