import { api } from "./client";

/** 케어앤에듀 인증 돌봄전문가(2026-10-07) — 기준: 실제 완료 돌봄·보호자 후기 수·평균 평점 */
export interface CertStats { sessions: number; reviews: number; rating: number | null }
export interface CertRow {
  caregiver_id: number;
  name: string;
  email: string | null;
  status: string;
  stats: CertStats;
  meets: boolean;
  certificate: {
    number: string;
    issued_date: string;
    basis: "auto" | "manual" | null;
    revoked_at: string | null;
    revoked_reason: string | null;
  } | null;
}
export interface CertOverview {
  criteria: { min_sessions: number; min_reviews: number; min_rating: number; auto_grant: boolean; name: string };
  certified: CertRow[];
  ready: CertRow[];
  near: CertRow[];
}

export const caregiverCertApi = {
  async overview(): Promise<CertOverview> {
    const { data } = await api.get("/v1/admin/caregivers/certifications");
    return data.data;
  },
  grant: (id: number, note?: string) => api.post(`/v1/admin/caregivers/${id}/certification`, { note }),
  revoke: (id: number, reason: string) => api.delete(`/v1/admin/caregivers/${id}/certification`, { data: { reason } }),
};
