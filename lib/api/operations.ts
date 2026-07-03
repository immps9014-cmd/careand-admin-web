import { api, ApiResponse } from "./client";
import type { Paginated } from "./cs";

/* ===== #20 돌봄전문가 자격검증 ===== */
export interface AdminCaregiver {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  specialties: string[];
  service_domains: string;
  status: "pending" | "active" | "suspended" | "rejected" | "leave";
  license_no: string | null;
  license_type: string | null;
  license_verified: boolean;
  career_track: string;
  rating_avg: number;
  completed_sessions: number;
  rejection_reason: string | null;
  created_at: string;
}

/* ===== #21 계약·일정 ===== */
export interface Contract {
  id: number;
  request_id: number;
  caregiver_name: string;
  senior_name: string;
  service_domain: string;
  mode: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_amount: number;
  status: "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  created_at: string;
}

/* ===== #22 AI 일지 검수 ===== */
export interface CareLog {
  id: number;
  match_id: number;
  caregiver_name: string;
  senior_name: string;
  guardian_name: string | null;
  service_domain: string;
  session_status: string;
  review_status: "pending" | "approved" | "rejected";
  review_note: string | null;
  duration_min: number;
  actual_start: string | null;
  actual_end: string | null;
  reviewed_at: string | null;
}
export interface CareSession {
  id: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  review_status: "pending" | "approved" | "rejected";
  caregiver_name: string;
  recipient_name: string;
  guardian_name: string | null;
  service_domain: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  duration_min: number | null;
  is_manual: boolean;
  has_summary: boolean;
}
export interface CareSessionSummary {
  scheduled: number;
  in_progress: number;
  completed_pending: number;
}
export interface CareLogDetail {
  session_id: number;
  guardian_version: string | null;
  medical_version: string | null;
  confidence: number | null;
  llm_model: string | null;
  transcript: string | null;
  stt_confidence: number | null;
  voice_duration_sec: number | null;
}

/* ===== #25 공지·푸시 ===== */
export interface Announcement {
  title: string;
  body: string;
  recipients: number;
  read_count: number;
  read_rate: number;
  sent_at: string;
  /** 개인 지정(1인) 발송이면 true — 그룹 공지는 false */
  is_direct: boolean;
}

/** 개인 지정 발송 대상 검색 결과 */
export interface AnnouncementRecipient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "guardian" | "caregiver";
  /** 보호자 가입 의도(care|housekeeping|postpartum). 돌봄전문가은 null */
  intent: "care" | "housekeeping" | "postpartum" | null;
  /** 돌봄전문가 직군. 보호자은 null */
  service_domains: string | null;
}

/* ===== #18 매칭 모니터링 ===== */
export interface MatchingRequest {
  id: number;
  senior_name: string;
  guardian_name: string | null;
  mode: string;
  service_domain: string;
  scheduled_start: string | null;
  status: string;
  candidate_count: number;
  matched_caregiver_name?: string | null;
  matched_caregiver_id?: number | null;
  created_at: string;
}

export interface MatchingCandidate {
  id: number;
  name: string | null;
  caregiver_id: number;
  source?: string; // ai=시스템 추천, self=돌봄전문가 직접 지원
  ai_score: number;
  rank: number;
  response: string;
  responded_at: string | null;
}
export interface MatchingDetailData {
  id: number;
  recipient_name: string;
  guardian_name: string | null;
  service_domain: string;
  mode: string;
  scheduled_start: string | null;
  duration_min: number;
  status: string;
  special_request: string | null;
  created_at: string;
  matched_at: string | null;
  senior: { gender: string | null; care_grade: string | null; special_notes: string | null } | null;
  address: { label: string | null; address: string | null; entry_note: string | null } | null;
  matched_caregiver: { name: string | null; id: number; status: string; scheduled_start: string | null; scheduled_end: string | null; estimated_amount: number | null } | null;
  candidates: MatchingCandidate[];
}

/* ===== #19 회원 통합관리 ===== */
export interface Member {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "guardian" | "caregiver" | "organization" | "admin";
  /** 보호자(guardian) 가입 의도 — care=보호자, housekeeping=가사요청자, postpartum=산모요청자. 비-보호자은 null */
  intent?: "care" | "housekeeping" | "postpartum" | null;
  status: "active" | "suspended" | "withdrawn";
  /** 돌봄전문가(caregiver) 행의 자격검증 상태 — 비-돌봄전문가은 null */
  caregiver_status?: "pending" | "active" | "suspended" | "leave" | "rejected" | null;
  /** 돌봄전문가 직군(senior/nursing/housekeeping) — 비-돌봄전문가은 null */
  service_domains?: string | null;
  created_at: string;
}
export interface MemberSummary {
  guardian: number;
  /** 가사요청자 (role=guardian + intent=housekeeping) */
  housekeeping: number;
  /** 산모요청자 (role=guardian + intent=postpartum) */
  postpartum: number;
  caregiver: number;
  organization: number;
  admin: number;
}

export interface CaregiverDetail {
  id: number;
  status: "pending" | "active" | "suspended" | "rejected" | "leave";
  gender: "M" | "F" | null;
  birth_date: string | null;
  license_no: string | null;
  license_image_url: string | null;
  license_verified: boolean;
  license_issued_at: string | null;
  specialties: string[];
  service_domains: string | null;
  career_track: string | null;
  base_address: string | null;
  rating_avg: number;
  completed_sessions: number;
  grade_level: number;
  rejection_reason: string | null;
  created_at: string;
}
export interface OrganizationDetail {
  id: number;
  name: string;
  biz_no: string | null;
  representative: string | null;
  contact_phone: string | null;
  address: string | null;
  biz_type: string | null;
  status: string;
}
export interface GuardianDetail {
  id: number;
  relation: string | null;
  contact_address: string | null;
  seniors: { name: string; care_grade: number | null }[];
  patients: { name: string; hospital_name: string | null }[];
}
export interface MemberDetailData extends Member {
  caregiver: CaregiverDetail | null;
  guardian: GuardianDetail | null;
  organization: OrganizationDetail | null;
}

export interface CreateMemberInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "guardian" | "caregiver" | "organization" | "admin";
  relation?: string;
  gender?: "M" | "F";
  birth_date?: string;
  base_address?: string;
  service_domains?: string;
  license_no?: string;
  license_photo?: File;
  biz_no?: string;
  representative?: string;
  biz_type?: string;
  permission_level?: "super" | "operator" | "cs" | "analyst";
}

/* ===== #23 정산 ===== */
export interface Settlement {
  id: number;
  caregiver_name: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  withholding_tax: number;
  net_amount: number;
  status: "draft" | "confirmed" | "paid" | "failed";
  hometax_filing_no: string | null;
  paid_at: string | null;
}
export interface SettlementItem {
  id: number;
  session_id: number | null;
  scheduled_start: string | null;
  hours: number;
  hourly_rate: number;
  amount: number;
  surcharge: number;
}
export interface SettlementDetailData {
  id: number;
  caregiver_name: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  withholding_tax: number;
  net_amount: number;
  status: string;
  hometax_filing_no: string | null;
  bank_tx_id: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  created_at: string;
  items: SettlementItem[];
}
export interface SettlementSummary {
  caregivers: number;
  gross_amount: number;
  withholding_tax: number;
  net_amount: number;
}

function unwrap<T>(data: ApiResponse<T[]>): Paginated<T> {
  return { data: data.data ?? [], meta: data.meta as Paginated<T>["meta"] };
}

export const operationsApi = {
  // #20
  async caregivers(params?: { status?: string; page?: number }): Promise<Paginated<AdminCaregiver>> {
    const { data } = await api.get<ApiResponse<AdminCaregiver[]>>("/v1/admin/caregivers", { params });
    return unwrap(data);
  },
  approveCaregiver: (id: number) => api.post(`/v1/admin/caregivers/${id}/approve`),
  rejectCaregiver: (id: number, reason: string) =>
    api.post(`/v1/admin/caregivers/${id}/reject`, { reason }),

  // #21
  async contracts(params?: { status?: string; domain?: string; page?: number }): Promise<Paginated<Contract> & { counts: Record<string, number> }> {
    const { data } = await api.get<ApiResponse<Contract[]> & { counts?: Record<string, number> }>("/v1/admin/contracts", { params });
    return { ...unwrap(data), counts: data.counts ?? {} };
  },

  // #22
  async careSessions(
    params?: { status?: string; page?: number },
  ): Promise<Paginated<CareSession> & { summary: CareSessionSummary }> {
    const { data } = await api.get<ApiResponse<CareSession[]> & { summary: CareSessionSummary }>(
      "/v1/admin/care-sessions",
      { params },
    );
    return { ...unwrap(data), summary: data.summary };
  },
  async careLogDetail(id: number): Promise<CareLogDetail> {
    const { data } = await api.get<ApiResponse<CareLogDetail>>(`/v1/admin/care-logs/${id}`);
    return data.data as CareLogDetail;
  },
  async careLogs(params?: { review_status?: string; page?: number }): Promise<Paginated<CareLog>> {
    const { data } = await api.get<ApiResponse<CareLog[]>>("/v1/admin/care-logs", { params });
    return unwrap(data);
  },
  approveCareLog: (id: number) => api.post(`/v1/admin/care-logs/${id}/approve`),
  rejectCareLog: (id: number, reason: string) =>
    api.post(`/v1/admin/care-logs/${id}/reject`, { reason }),

  // #25
  async announcements(params?: { page?: number }): Promise<Paginated<Announcement>> {
    const { data } = await api.get<ApiResponse<Announcement[]>>("/v1/admin/announcements", { params });
    return unwrap(data);
  },
  broadcast: (payload: { title: string; body: string; target: "all" | "guardian" | "caregiver" }) =>
    api.post("/v1/admin/announcements", payload),
  // 개인 지정 발송 — 보호자/돌봄전문가 검색
  async searchRecipients(params: { q: string; role?: "guardian" | "caregiver" }): Promise<AnnouncementRecipient[]> {
    const { data } = await api.get<ApiResponse<AnnouncementRecipient[]>>(
      "/v1/admin/announcements/recipients",
      { params },
    );
    return data.data ?? [];
  },
  // 개인 지정 발송 — 지정 1인에게만 푸시
  sendDirect: (payload: { user_id: number; title: string; body: string }) =>
    api.post<ApiResponse<{ recipients: number; user_id: number }>>(
      "/v1/admin/announcements/direct",
      payload,
    ),

  // #18
  async matchingRequests(params?: { status?: string; domain?: string; page?: number }): Promise<Paginated<MatchingRequest> & { counts: Record<string, number> }> {
    const { data } = await api.get<ApiResponse<MatchingRequest[]> & { counts?: Record<string, number> }>("/v1/admin/matching/requests", { params });
    return { ...unwrap(data), counts: data.counts ?? {} };
  },
  async matchingRequestDetail(id: number): Promise<MatchingDetailData> {
    const { data } = await api.get<ApiResponse<MatchingDetailData>>(`/v1/admin/matching/requests/${id}`);
    return data.data as MatchingDetailData;
  },
  manualAssign: (requestId: number, caregiverId: number) =>
    api.post(`/v1/admin/matching/requests/${requestId}/manual-assign`, { caregiver_id: caregiverId }),

  // #19
  async members(params?: { role?: string; q?: string; status?: string; sort?: string; page?: number }): Promise<
    Paginated<Member> & { summary: MemberSummary }
  > {
    const { data } = await api.get<ApiResponse<Member[]> & { summary: MemberSummary }>(
      "/v1/admin/members",
      { params }
    );
    return { ...unwrap(data), summary: data.summary };
  },

  async memberDetail(id: number): Promise<MemberDetailData> {
    const { data } = await api.get<ApiResponse<MemberDetailData>>(`/v1/admin/members/${id}`);
    return data.data as MemberDetailData;
  },

  async createMember(payload: CreateMemberInput): Promise<{ id: number }> {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null || k === "license_photo") return;
      fd.append(k, String(v));
    });
    if (payload.license_photo) fd.append("license_photo", payload.license_photo);
    const { data } = await api.post<ApiResponse<{ id: number }>>("/v1/admin/members", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data as { id: number };
  },

  updateMemberStatus: (id: number, status: "active" | "suspended" | "withdrawn") =>
    api.patch(`/v1/admin/members/${id}/status`, { status }),

  updateOrganization: (
    id: number,
    payload: { biz_type?: string; name?: string; contact_phone?: string; representative?: string; address?: string; status?: string },
  ) => api.patch(`/v1/admin/organizations/${id}`, payload),

  updateCaregiver: (id: number, payload: { service_domains: string }) =>
    api.patch(`/v1/admin/caregivers/${id}`, payload),

  // 슈퍼관리자 전용: 회원 로그인 ID(이메일)·연락처·비밀번호 관리
  updateMemberCredentials: (id: number, payload: { email?: string; phone?: string; password?: string }) =>
    api.patch(`/v1/admin/members/${id}/credentials`, payload),

  // 매칭 변경: 담당 돌봄전문가 교체 / 일정 날짜 수정 (requestId 기준)
  updateMatch: (requestId: number, payload: { caregiver_id?: number; scheduled_start?: string }) =>
    api.patch(`/v1/admin/matching/requests/${requestId}/match`, payload),

  // #23
  async settlements(params?: { status?: string; page?: number }): Promise<
    Paginated<Settlement> & { summary: SettlementSummary }
  > {
    const { data } = await api.get<ApiResponse<Settlement[]> & { summary: SettlementSummary }>(
      "/v1/admin/settlements",
      { params }
    );
    return { ...unwrap(data), summary: data.summary };
  },

  async settlementDetail(id: number): Promise<SettlementDetailData> {
    const { data } = await api.get<ApiResponse<SettlementDetailData>>(`/v1/admin/settlements/${id}`);
    return data.data as SettlementDetailData;
  },

  /** 정산서 일괄 확정 (draft → confirmed). 반환: {confirmed, skipped} */
  bulkConfirmSettlements: (ids: number[]) =>
    api.post<{ success: boolean; message: string; confirmed: number; skipped: number }>(
      "/v1/admin/settlements/bulk-confirm",
      { ids }
    ),
};
