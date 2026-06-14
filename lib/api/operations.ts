import { api, ApiResponse } from "./client";
import type { Paginated } from "./cs";

/* ===== #20 인력 자격검증 ===== */
export interface AdminCaregiver {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  specialties: string[];
  service_domains: string;
  status: "pending" | "active" | "suspended" | "rejected" | "leave";
  license_no: string | null;
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
  service_domain: string;
  session_status: string;
  review_status: "pending" | "approved" | "rejected";
  review_note: string | null;
  duration_min: number;
  actual_start: string | null;
  actual_end: string | null;
  reviewed_at: string | null;
}

/* ===== #25 공지·푸시 ===== */
export interface Announcement {
  title: string;
  body: string;
  recipients: number;
  read_count: number;
  read_rate: number;
  sent_at: string;
}

/* ===== #18 매칭 모니터링 ===== */
export interface MatchingRequest {
  id: number;
  senior_name: string;
  mode: string;
  service_domain: string;
  scheduled_start: string | null;
  status: string;
  candidate_count: number;
  created_at: string;
}

/* ===== #19 회원 통합관리 ===== */
export interface Member {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "guardian" | "caregiver" | "organization" | "admin";
  status: "active" | "suspended" | "withdrawn";
  /** 인력(caregiver) 행의 자격검증 상태 — 비-인력은 null */
  caregiver_status?: "pending" | "active" | "suspended" | "leave" | "rejected" | null;
  created_at: string;
}
export interface MemberSummary {
  guardian: number;
  caregiver: number;
  organization: number;
  admin: number;
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

  // #18
  async matchingRequests(params?: { status?: string; domain?: string; page?: number }): Promise<Paginated<MatchingRequest> & { counts: Record<string, number> }> {
    const { data } = await api.get<ApiResponse<MatchingRequest[]> & { counts?: Record<string, number> }>("/v1/admin/matching/requests", { params });
    return { ...unwrap(data), counts: data.counts ?? {} };
  },
  manualAssign: (requestId: number, caregiverId: number) =>
    api.post(`/v1/admin/matching/requests/${requestId}/manual-assign`, { caregiver_id: caregiverId }),

  // #19
  async members(params?: { role?: string; q?: string; page?: number }): Promise<
    Paginated<Member> & { summary: MemberSummary }
  > {
    const { data } = await api.get<ApiResponse<Member[]> & { summary: MemberSummary }>(
      "/v1/admin/members",
      { params }
    );
    return { ...unwrap(data), summary: data.summary };
  },

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
};
