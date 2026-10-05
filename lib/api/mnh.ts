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
  /** 공휴일 근무로 지정한 날이면 공휴일 이름 */
  holiday: string | null;
}

export interface MnhHoliday {
  id?: number;
  date: string;
  name: string;
  source?: "seed" | "admin";
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
  /** 제공 요일인데 공휴일이라 빠진 날 */
  holidays: MnhHoliday[];
  holiday_work_dates: string[];
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
    api.get<Ok<{ month: string; holidays: MnhHoliday[]; contracts: MnhCalendarRow[] }>>(`/v1/admin/mnh/calendar`, { params: { month } }).then((r) => r.data),
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
  holidayWork: (id: number, body: { date: string; work: boolean; force?: boolean }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/holiday-work`, body).then((r) => r.data),
  holidays: (year: number) =>
    api.get<Ok<{ year: number; years: number[]; today: string; rows: MnhHoliday[] }>>(`/v1/admin/mnh/holidays`, { params: { year } }).then((r) => r.data),
  createHoliday: (body: { date: string; name: string }) =>
    api.post<{ message: string; result: HolidayResync }>(`/v1/admin/mnh/holidays`, body).then((r) => r.data),
  deleteHoliday: (id: number) =>
    api.delete<{ message: string; result: HolidayResync }>(`/v1/admin/mnh/holidays/${id}`).then((r) => r.data),
  note: (id: number, body: { date?: string; text: string }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/notes`, body).then((r) => r.data),
  cancel: (id: number, reason: string) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/cancel`, { reason }).then((r) => r.data),
};

/** 공휴일 표 변경 뒤 다시 맞춘 계약 / 담당 일정이 겹쳐 그대로 둔 계약 */
export interface HolidayResync {
  synced: { id: number; contract_no: string; end_date: string }[];
  conflicts: { id: number; contract_no: string; message: string }[];
}

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
  holiday_work: "공휴일 근무",
  holiday_off: "공휴일 휴무",
  holiday_changed: "공휴일 변경",
  start_changed: "일정 변경",
  note: "특이사항",
  cancelled: "계약 취소",
  completed: "서비스 종료",
  doc_issued: "서류 발행",
  doc_signed: "서류 서명",
  evaluated: "평가",
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

/* ───── 전자서명 서류(3단계) ───── */

export interface MnhDocFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "checks" | "select";
  filled_by: "client" | "caregiver" | "admin";
  options?: string[] | Record<string, string> | null;
}

export interface MnhDocBrief {
  id: number;
  doc_type: string;
  label: string;
  title: string;
  status: "issued" | "signed" | "void";
  signer_role: "client" | "caregiver";
  signer_name: string | null;
  before_start: boolean;
  contract_id: number | null;
  care_session_id: number | null;
  caregiver_id: number | null;
  template_version: number | null;
  form_data: Record<string, unknown>;
  signed_at: string | null;
  pdf_ready: boolean;
  issued_at: string;
  session_date?: string | null;
  void_reason: string | null;
  signed_ip?: string | null;
  content_hash?: string | null;
}

export interface MnhDocDetail extends MnhDocBrief {
  content_html: string;
  fields_html: string;
  integrity: boolean | null;
}

export interface MnhTemplate {
  doc_type: string;
  label: string;
  signer: "client" | "caregiver";
  before_start: boolean;
  auto: string | null;
  fields: MnhDocFieldDef[];
  version: number;
  title: string;
  body: string;
  note: string | null;
  updated_at: string;
  versions: { version: number; note: string | null; created_at: string }[];
}

export const mnhDocAdminApi = {
  forContract: (id: number) =>
    api.get<Ok<{ documents: MnhDocBrief[]; missing_before_start: string[]; enforce: boolean; issuable: { type: string; label: string; admin_fields: MnhDocFieldDef[] }[] }>>(`/v1/admin/mnh/contracts/${id}/documents`).then((r) => r.data),
  issue: (id: number, doc_type: string, form_data?: Record<string, unknown>) =>
    api.post<Ok<MnhDocBrief>>(`/v1/admin/mnh/contracts/${id}/documents`, { doc_type, form_data }).then((r) => r.data),
  get: (id: number) => api.get<Ok<MnhDocDetail>>(`/v1/admin/mnh/documents/${id}`).then((r) => r.data),
  reissue: (id: number, reason: string) => api.post<Ok<MnhDocBrief>>(`/v1/admin/mnh/documents/${id}/reissue`, { reason }).then((r) => r.data),
  void: (id: number, reason: string) => api.post<{ message: string }>(`/v1/admin/mnh/documents/${id}/void`, { reason }).then((r) => r.data),
  templates: () => api.get<Ok<{ templates: MnhTemplate[]; variables: string[]; provider: Record<string, string> }>>(`/v1/admin/mnh/templates`).then((r) => r.data),
  saveTemplate: (type: string, body: { title: string; body: string; note?: string }) =>
    api.put<{ message: string }>(`/v1/admin/mnh/templates/${type}`, body).then((r) => r.data),
  preview: (type: string, body: string) => api.post<Ok<{ html: string }>>(`/v1/admin/mnh/templates/${type}/preview`, { body }).then((r) => r.data),
  employment: () =>
    api.get<Ok<{ caregiver_id: number; name: string; status: string; documents: MnhDocBrief[] }[]>>(`/v1/admin/mnh/employment`).then((r) => r.data),
  issueEmployment: (caregiver_id: number, form_data: Record<string, unknown>) =>
    api.post<Ok<MnhDocBrief>>(`/v1/admin/mnh/employment`, { caregiver_id, form_data }).then((r) => r.data),
  async openPdf(id: number) {
    const win = window.open("", "_blank");
    try {
      const res = await api.get(`/v1/admin/mnh/documents/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      if (win) win.location.href = url; else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      const blob = (e as { response?: { data?: Blob } }).response?.data;
      if (blob instanceof Blob) {
        const msg = await blob.text().then((t) => JSON.parse(t).message as string).catch(() => null);
        if (msg) throw new Error(msg);
      }
      throw e;
    }
  },
};

export const DOC_STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  issued: { cls: "bg-warn-bg text-warn", label: "서명 대기" },
  signed: { cls: "bg-brand-50 text-brand-700", label: "서명 완료" },
  void: { cls: "bg-warm-100 text-warm-500", label: "취소" },
};

/* ───── 양방향 평가·종합평가(4단계) ───── */

export interface HexAxisData {
  key: string;
  label: string;
  score: number | null;
  n: number;
  enough: boolean;
  sources: { source: string; label: string; value: number | null; n: number; rate?: number }[];
}
export interface HexData {
  axes: HexAxisData[];
  overall: number | null;
  counts: { reviews: number; org_evaluations: number; completed_visits: number };
}
export interface MnhEvaluation {
  id: number;
  kind: "caregiver_to_client" | "org_to_caregiver";
  contract_id: number | null;
  caregiver_id: number;
  timing: "interim" | "final";
  timing_label: string;
  items: { key: string; label: string; score: number | null }[];
  average: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  evaluator_name?: string | null;
  caregiver_name?: string | null;
  contract_no?: string | null;
}

export const mnhEvalApi = {
  hexagons: (months?: number) =>
    api.get<Ok<{ caregivers: ({ caregiver_id: number; name: string; status: string } & HexData)[]; team_average: { key: string; label: string; score: number | null }[]; min_samples: number }>>(
      `/v1/admin/mnh/hexagons`, { params: months ? { months } : {} }).then((r) => r.data),
  caregiver: (id: number, months?: number) =>
    api.get<Ok<{ caregiver_id: number; name: string } & HexData & {
      org_evaluations: MnhEvaluation[];
      reviews: { id: number; rating: number; comment: string | null; contract_no: string | null; items: { key: string; label: string; score: number | null }[]; created_at: string }[];
      contracts: { id: number; contract_no: string; status: string; client_name: string | null }[];
      org_items: { key: string; label: string }[];
    }>>(`/v1/admin/mnh/caregivers/${id}/evaluation`, { params: months ? { months } : {} }).then((r) => r.data),
  submitOrg: (body: { caregiver_id: number; contract_id?: number | null; scores: Record<string, number>; comment?: string; timing: "interim" | "final" }) =>
    api.post<Ok<MnhEvaluation>>(`/v1/admin/mnh/evaluations`, body).then((r) => r.data),
  forContract: (id: number) =>
    api.get<Ok<{ evaluations: MnhEvaluation[]; caregivers: { caregiver_id: number; name: string | null }[]; org_items: { key: string; label: string }[] }>>(
      `/v1/admin/mnh/contracts/${id}/evaluations`).then((r) => r.data),
};
