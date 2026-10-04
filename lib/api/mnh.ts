import { api } from "./client";

/* ===== 산모신생아 바우처 기간형 계약(CAREN-MNH-01 2단계, 2026-10-05) — 제공기관 = 케어앤 ===== */

export type MnhStatus = "applied" | "confirmed" | "active" | "completed" | "cancelled";
export type MnhDayStatus = "planned" | "scheduled" | "in_progress" | "completed";

export interface MnhLabels {
  fetus_types: Record<string, string>;
  birth_orders: Record<string, string>;
  periods: Record<string, string>;
  payment_methods: Record<string, string>;
  statuses: Record<string, string>;
  min_days: number;
  max_days: number;
}

export interface MnhSupportType {
  id: number;
  year: number;
  fetus_type: string;
  birth_order: string;
  income_tier: string;
  period: string;
  days: number;
  total_price: number;
  gov_support: number;
  self_pay: number;
  note: string | null;
  is_active: boolean;
  contracts: number;
}

export interface MnhContractSummary {
  id: number;
  contract_no: string;
  status: MnhStatus;
  status_label: string;
  postpartum_client_id: number;
  client_name: string | null;
  year: number;
  fetus_type: string | null;
  birth_order: string | null;
  income_tier: string | null;
  period: string | null;
  support_label: string | null;
  days: number;
  total_price: number | null;
  gov_support: number | null;
  self_pay: number | null;
  rates_set: boolean;
  start_date: string;
  end_date: string | null;
  weekdays: number[];
  skip_dates: string[];
  daily_start: string;
  daily_minutes: number;
  payment_method: string;
  payment_method_label: string;
  prepaid: boolean;
  prepaid_amount: number | null;
  prepaid_at: string | null;
  prepaid_receipt_no: string | null;
  caregiver_id: number | null;
  caregiver_name: string | null;
  member_note: string | null;
  cancel_reason: string | null;
  created_at: string;
  completed_days?: number;
}

export interface MnhScheduleDay {
  date: string;
  seq: number;
  status: MnhDayStatus;
  session_id: number | null;
  caregiver_name: string | null;
  actual_start: string | null;
  actual_end: string | null;
  journal: string | null;
}

export interface MnhEvent {
  id: number;
  type: string;
  date: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface MnhContractDetail extends MnhContractSummary {
  schedule: MnhScheduleDay[];
  postponed: string[];
  completed_days: number;
  delivery_date: string | null;
  events: MnhEvent[];
  admin_note: string | null;
  address: string;
  match_request_id: number | null;
  user: { id: number; name: string } | null;
  care_profile_summary: string | null;
  cancelled_sessions: { date: string; reason: string | null; caregiver_name: string | null }[];
}

export interface MnhCalendarRow {
  id: number;
  contract_no: string;
  status: MnhStatus;
  status_label: string;
  client_name: string | null;
  caregiver_name: string | null;
  start_date: string;
  end_date: string | null;
  days: number;
  prepaid: boolean;
  cells: { date: string; seq: number; status: MnhDayStatus; caregiver_name: string | null }[];
  postponed: string[];
  events: MnhEvent[];
}

export interface MnhCaregiverOption {
  id: number;
  name: string;
  postpartum: boolean;
  region: string | null;
  rating: number | null;
  completed_sessions: number;
}

type Ok<T> = { success: boolean; message?: string; data: T };

export const mnhApi = {
  supportTypes: (year: number) =>
    api.get<Ok<{ year: number; years: number[]; rows: MnhSupportType[]; labels: MnhLabels }>>(`/v1/admin/mnh/support-types`, { params: { year } }).then((r) => r.data),
  createSupportType: (body: Partial<MnhSupportType>) => api.post(`/v1/admin/mnh/support-types`, body).then((r) => r.data),
  updateSupportType: (id: number, body: Partial<MnhSupportType>) => api.patch(`/v1/admin/mnh/support-types/${id}`, body).then((r) => r.data),
  deleteSupportType: (id: number) => api.delete<{ message: string }>(`/v1/admin/mnh/support-types/${id}`).then((r) => r.data),
  copySupportTypes: (from: number, to: number) => api.post<{ message: string }>(`/v1/admin/mnh/support-types/copy`, { from, to }).then((r) => r.data),

  contracts: (params: { status?: string; q?: string }) =>
    api.get<Ok<MnhContractSummary[]> & { counts: Record<string, number> }>(`/v1/admin/mnh/contracts`, { params }).then((r) => r.data),
  calendar: (month: string) =>
    api.get<Ok<{ month: string; contracts: MnhCalendarRow[] }>>(`/v1/admin/mnh/calendar`, { params: { month } }).then((r) => r.data),
  caregivers: (all = false) =>
    api.get<Ok<MnhCaregiverOption[]>>(`/v1/admin/mnh/caregivers`, { params: all ? { all: 1 } : {} }).then((r) => r.data),
  contract: (id: number) => api.get<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}`).then((r) => r.data),
  update: (id: number, body: Record<string, unknown>) => api.patch<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}`, body).then((r) => r.data),
  prepaid: (id: number, body: { amount: number; method: string; receipt_no?: string; paid_on?: string }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/prepaid`, body).then((r) => r.data),
  clearPrepaid: (id: number) => api.delete<{ message: string }>(`/v1/admin/mnh/contracts/${id}/prepaid`).then((r) => r.data),
  assign: (id: number, caregiver_id: number, force = false) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/assign`, { caregiver_id, force }).then((r) => r.data),
  swap: (id: number, body: { caregiver_id: number; from_date: string; reason: string; force?: boolean }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/swap`, body).then((r) => r.data),
  postpone: (id: number, body: { date: string; reason: string; force?: boolean }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/postpone`, body).then((r) => r.data),
  restore: (id: number, body: { date: string; force?: boolean }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/restore`, body).then((r) => r.data),
  note: (id: number, body: { date?: string; text: string }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/notes`, body).then((r) => r.data),
  cancel: (id: number, reason: string) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/cancel`, { reason }).then((r) => r.data),
};

/** 409 SCHEDULE_CONFLICT 이면 서버 문구 */
export function conflictMessage(e: unknown): string | null {
  const res = (e as { response?: { status?: number; data?: { error_code?: string; message?: string } } }).response;
  return res?.status === 409 && res.data?.error_code === "SCHEDULE_CONFLICT" ? res.data.message ?? "일정이 겹칩니다." : null;
}

export const MNH_STATUS_STYLE: Record<MnhStatus, string> = {
  applied: "bg-warn-bg text-warn",
  confirmed: "bg-info-bg text-info",
  active: "bg-brand-500 text-white",
  completed: "bg-brand-50 text-brand-700",
  cancelled: "bg-warm-100 text-warm-500",
};

export const MNH_EVENT_LABEL: Record<string, string> = {
  created: "신청",
  support_set: "지원유형·금액",
  prepaid: "본인부담금 선납",
  assigned: "담당 배정",
  swapped: "담당 교체",
  postponed: "연기",
  restored: "연기 되돌림",
  start_changed: "일정 변경",
  note: "특이사항",
  cancelled: "계약 취소",
  completed: "서비스 종료",
};

export const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-10-06" → "10/6(화)" */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}(${DOW_KO[dow]})`;
}

/** 오늘(한국 날짜) "YYYY-MM-DD" */
export function todayKst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}
