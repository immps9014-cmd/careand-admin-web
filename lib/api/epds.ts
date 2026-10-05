import { api } from "./client";

/* ===== 산후우울(에딘버러) 검사 결과 — 관리자(2026-10-05). 문항별 응답은 열람 사유가 있어야 받는다 ===== */

export type EpdsRisk = "low" | "medium" | "high" | "critical";

export interface EpdsSubscale { key: string; label: string; score: number; max: number; flag?: boolean }

export interface EpdsRow {
  id: number;
  client_id: number;
  date: string;
  total: number;
  risk_level: EpdsRisk;
  risk_label: string;
  self_harm: boolean;
  subscales: EpdsSubscale[];
  recommend_mental_care: boolean;
  needs_action: boolean;
  followup_status: string | null;
  followup_label: string | null;
  followup_note: string | null;
  followed_up_at: string | null;
  submitted_at: string | null;
  client_name?: string;
  prev_total?: number | null;
  tests?: number;
}

export interface EpdsList {
  days: number;
  summary: { open: number; open_self_harm: number; tests: number; clients: number; by_risk: Partial<Record<EpdsRisk, number>> };
  rows: EpdsRow[];
  followups: Record<string, string>;
}

export interface EpdsHistoryRow extends EpdsRow {
  answers: { no: number; text: string; score: number; answer: string | null }[];
  followed_up_by_name: string | null;
}

export interface EpdsClientDetail {
  client: { id: number; name: string; birth_date: string | null; delivery_date: string | null; delivery_type: string | null; guardian: { id: number; name: string; phone: string | null } | null };
  contract: { id: number; contract_no: string; status: string; caregiver_name: string | null } | null;
  history: EpdsHistoryRow[];
  period: string;
  crisis_contacts: { label: string; number: string }[];
  followups: Record<string, string>;
}

type Ok<T> = { success: boolean; message?: string; data: T };

export const epdsApi = {
  list: (params: { status?: string; risk?: string; days?: number; q?: string }) =>
    api.get<Ok<EpdsList>>(`/v1/admin/epds`, { params }).then((r) => r.data),
  client: (clientId: number, reason: string) =>
    api.get<Ok<EpdsClientDetail>>(`/v1/admin/epds/clients/${clientId}`, { headers: { "X-Access-Reason": encodeURIComponent(reason) } }).then((r) => r.data),
  followup: (id: number, body: { status: string; note?: string }) =>
    api.post<Ok<EpdsRow>>(`/v1/admin/epds/${id}/followup`, body).then((r) => r.data),
};

export const EPDS_RISK_STYLE: Record<EpdsRisk, string> = {
  low: "bg-brand-50 text-brand-700",
  medium: "bg-warn-bg text-warn",
  high: "bg-danger-bg text-danger",
  critical: "bg-danger text-white",
};
