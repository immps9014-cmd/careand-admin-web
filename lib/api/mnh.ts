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
  /** 취소 때 돌려준 본인부담금(매출에서 뺌) */
  refund_amount: number | null;
  refunded_at: string | null;
  penalty_amount: number | null;
  penalty_due: number | null;
  /** 산모가 건강정보(민감정보) 수집에 동의하지 않음 — 건강 기록만 빼고 진행(상세만) */
  health_consent_refused?: boolean;
  cancel_notice_date: string | null;
  /** 위약금 차액(선납으로 못 채운 것) — 받을 것·받은 것·남은 것·받은 내역(관리자 상세만) */
  penalty_status?: { due: number; collected: number; outstanding: number;
    rows: { id: number; amount: number; method: string; method_label: string; collected_on: string; note: string | null }[] } | null;
  caregiver_id: number | null;
  caregiver_name: string | null;
  member_note: string | null;
  cancel_reason: string | null;
  created_at: string;
  completed_days?: number;
  /** 위약금 차액 중 아직 받지 못한 금액(목록만, 없으면 0) */
  penalty_outstanding?: number;
  /** 추가요금·대여용품(케어앤 자체 가격, 바우처 밖) — 신청 때 금액 그대로 */
  addons?: MnhContractAddon[];
  addon_total?: number | null;
  /** 출산 전 신청한 예비 계약(출산일 등록 뒤 개시일 확정) */
  provisional?: boolean;
  /** 이용자가 출산일 등록 후 요청한 개시일 변경 — 기관 확인 대기 */
  start_change_request?: MnhStartChangeRequest | null;
}

export interface MnhStartChangeRequest {
  start_date: string;
  reason: string;
  /** 예정일과 실제 출산일 차이(일) */
  birth_gap: number | null;
  /** 개시일이 바뀌는 날수 */
  start_gap: number | null;
  /** ISO(+09:00) */
  requested_at: string;
}

export interface MnhContractAddon {
  id: number | null;   // null = 협의해 직접 적은 항목(custom)
  kind: string;
  name: string;
  unit_label: string;
  price: number;
  qty: number;
  amount: number;
  note?: string | null;
  custom?: boolean;
}

export type MnhCustomAddon = { kind: string; name: string; unit_label: string; price: number; qty: number };

/** 소득 판정 기준표(기준중위소득 150%·건보료 본인부담 상한) */
export interface MnhIncomeCriterion {
  id: number;
  year: number;
  household_size: number;
  income_limit: number;
  premium_employee: number;
  premium_regional: number;
  premium_mixed: number;
}

/** 추가요금·대여용품 항목 */
export interface MnhAddonItem {
  id: number;
  kind: string;
  name: string;
  unit_label: string;
  price: number;
  max_qty: number;
  note: string | null;
  sort: number;
  is_active: boolean;
  contracts: number;
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
  /** 산모 비상연락처(2026-10-05) — phone 숫자만 */
  client_emergency_contact: { name: string; relation: string; phone: string } | null;
  cancelled_sessions: { date: string; reason: string | null; caregiver_name: string | null }[];
  /** 출산일 등록 여부(false = 예정일만 있음) */
  birth_confirmed?: boolean;
  expected_delivery_date?: string | null;
  /** 종료일이 출산 후 90일을 넘으면 문구 */
  voucher_warning?: string | null;
  /** 담당 서류 중 계약 종료일까지 손봐야 할 것(CAREN-MNH-02 E) — expiring = 확인됐지만 계약 기간 중 만료 */
  caregiver_doc_issues?: { type: string; label: string; status: "missing" | "submitted" | "rejected" | "expired" | "expiring"; expires_at: string | null }[];
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
  /** 백엔드가 아직 달력에 안 내려줌 — 내려오면 표시 */
  provisional?: boolean;
  start_change_request?: MnhStartChangeRequest | null;
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

  incomeCriteria: (year: number) =>
    api.get<Ok<{ year: number; years: number[]; rows: MnhIncomeCriterion[] }>>(`/v1/admin/mnh/income-criteria`, { params: { year } }).then((r) => r.data),
  saveIncomeCriterion: (body: Omit<MnhIncomeCriterion, "id">) => api.put(`/v1/admin/mnh/income-criteria`, body).then((r) => r.data),
  deleteIncomeCriterion: (id: number) => api.delete(`/v1/admin/mnh/income-criteria/${id}`).then((r) => r.data),

  addons: () => api.get<Ok<{ rows: MnhAddonItem[]; kinds: Record<string, string> }>>(`/v1/admin/mnh/addons`).then((r) => r.data),
  createAddon: (body: Partial<MnhAddonItem>) => api.post(`/v1/admin/mnh/addons`, body).then((r) => r.data),
  updateAddon: (id: number, body: Partial<MnhAddonItem>) => api.patch(`/v1/admin/mnh/addons/${id}`, body).then((r) => r.data),
  deleteAddon: (id: number) => api.delete(`/v1/admin/mnh/addons/${id}`).then((r) => r.data),

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
  confirmStart: (id: number, body: { start_date?: string; force?: boolean }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/confirm-start`, body).then((r) => r.data),
  rejectStartRequest: (id: number, reason: string) =>
    api.delete<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/start-request`, { data: { reason } }).then((r) => r.data),
  collectPenalty: (id: number, body: { amount: number; method: string; collected_on: string; note?: string }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/penalty-collections`, body).then((r) => r.data),
  deletePenaltyCollection: (id: number, rowId: number) =>
    api.delete<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/penalty-collections/${rowId}`).then((r) => r.data),
  setAddons: (id: number, body: { items: { id: number; qty: number }[]; custom: MnhCustomAddon[] }) =>
    api.put<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/addons`, body).then((r) => r.data),
  cancelQuote: (id: number, notice_date?: string) =>
    api.get<Ok<MnhCancelQuote>>(`/v1/admin/mnh/contracts/${id}/cancel-quote`, { params: notice_date ? { notice_date } : {} }).then((r) => r.data),
  cancel: (id: number, body: { reason: string; refund_amount?: number; penalty_amount?: number; notice_date?: string }) =>
    api.post<Ok<MnhContractDetail>>(`/v1/admin/mnh/contracts/${id}/cancel`, body).then((r) => r.data),
};

/** 취소 정산 제안 — 해지 통지 기한 안 지키면 위약금(비율 미등록이면 0), 환불 = 선납 − 받은 서비스분 − 위약금(CAREN-MNH-02 D) */
export interface MnhCancelQuote {
  notice_date: string;
  noticed_days: number;
  notice_days: number;
  late: boolean;
  penalty_pct: number | null;
  total_price: number;
  suggested_penalty: number;
  completed_days: number;
  days: number;
  used_self_pay: number;
  prepaid: boolean;
  prepaid_amount: number;
  suggested_refund: number | null;
}

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
  addons_changed: "추가 서비스·대여 변경",
  penalty_collected: "위약금 차액 받음",
  penalty_collection_deleted: "위약금 차액 기록 지움",
  cancelled: "계약 취소",
  completed: "서비스 종료",
  doc_issued: "서류 발행",
  doc_signed: "서류 서명",
  evaluated: "평가",
  birth_confirmed: "일정 확정",
  start_review: "개시일 확인 요청",
};

/** ISO 시각 → 한국시각 "10/9 14:05" */
export function kstDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

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

/* ───── 서류 보관함 — 회원(산모)별 모아 보기·검색(2026-10-18) ───── */

export interface MnhArchiveRow {
  id: number;
  doc_type: string;
  label: string;
  title: string;
  status: "issued" | "signed" | "void";
  void_reason: string | null;
  issued_at: string;
  signed_at: string | null;
  pdf_ready: boolean;
  session_date: string | null;
  contract_id: number;
  contract_no: string;
  client_id: number;
  client_name: string | null;
  caregiver_name: string | null;
}

export interface MnhArchiveQuery {
  q?: string;
  doc_type?: string;
  status?: "issued" | "signed" | "void" | "all";
  date_kind?: "issued" | "signed" | "session";
  from?: string;
  to?: string;
  page?: number;
}

export interface MnhArchiveDocCell {
  type: string;
  label: string;
  before_start: boolean;
  doc: { id: number; status: "issued" | "signed"; template_version: number | null; issued_at: string; signed_at: string | null; pdf_ready: boolean } | null;
  void_count: number;
}

export interface MnhArchiveProvisionDay {
  session_id: number;
  date: string;
  session_status: string;
  doc: { id: number; status: "issued" | "signed"; pdf_ready: boolean } | null;
  missing: boolean;
}

export interface MnhArchiveClient {
  client: { id: number; name: string | null; phone_tail: string | null; delivery_date: string | null; expected_delivery_date: string | null };
  contracts: {
    id: number;
    contract_no: string;
    status: MnhStatus;
    start_date: string | null;
    days: number;
    caregiver_name: string | null;
    documents: MnhArchiveDocCell[];
    provision: { days: MnhArchiveProvisionDay[]; completed: number; signed: number; missing: number };
  }[];
  pdf_count: number;
}

export const mnhArchiveApi = {
  search: (params: MnhArchiveQuery) =>
    api.get<Ok<{ rows: MnhArchiveRow[]; total: number; page: number; per_page: number; by_type: Record<string, number>; types: { type: string; label: string }[] }>>(
      `/v1/admin/mnh/documents`, { params }).then((r) => r.data),
  client: (id: number) => api.get<Ok<MnhArchiveClient>>(`/v1/admin/mnh/clients/${id}/documents`).then((r) => r.data),
  /** 서명본 PDF 묶음(zip) — 사유 필수, 서버에 감사기록이 남는다 */
  async downloadZip(id: number, reason: string, contractId?: number) {
    try {
      const res = await api.get(`/v1/admin/mnh/clients/${id}/documents/zip`, {
        params: contractId ? { contract_id: contractId } : {},
        headers: { "X-Access-Reason": encodeURIComponent(reason.trim()) },
        responseType: "blob",
      });
      const cd = String(res.headers["content-disposition"] ?? "");
      const star = /filename\*=utf-8''([^;]+)/i.exec(cd)?.[1];
      const name = star ? decodeURIComponent(star) : /filename="?([^";]+)"?/.exec(cd)?.[1] ?? `mnh-documents-${id}.zip`;
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      const blob = (e as { response?: { data?: Blob } }).response?.data;
      if (blob instanceof Blob) {
        const msg = await blob.text().then((t) => JSON.parse(t).message as string).catch(() => null);
        if (msg) throw new Error(msg);
      }
      throw e;
    }
  },
};

/* ───── 모니터링 설문 집계(2026-10-18) ───── */

export interface MnhSurveySummary {
  issued: number;
  signed: number;
  response_rate: number | null;
  overall_avg: number | null;
  eval_avg: number | null;
  questions: { key: string; label: string; section: string | null; avg: number | null; n: number; dist: Record<string, number>; other: { label: string; n: number }[] }[];
  general: { key: string; label: string; counts: { label: string; n: number }[] }[];
  by_caregiver: { caregiver_id: number | null; name: string | null; n: number; eval_avg: number | null; overall_avg: number | null; recommend_avg: number | null }[];
  comments: { document_id: number; contract_id: number; contract_no: string; client_name: string | null; caregiver_name: string | null; question: string; text: string; signed_at: string | null }[];
  pending: { document_id: number; contract_id: number; contract_no: string; client_id: number; client_name: string | null; caregiver_name: string | null; issued_at: string; days: number; reminded: number }[];
}

export const mnhSurveyApi = {
  summary: (params: { from?: string; to?: string; caregiver_id?: number }) =>
    api.get<Ok<MnhSurveySummary>>(`/v1/admin/mnh/satisfaction`, { params }).then((r) => r.data),
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
