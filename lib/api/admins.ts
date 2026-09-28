import { api } from "./client";

/** 관리자 계정·권한 (슈퍼관리자 전용) — 권한 5단계 S2-3 */
export type AdminLevel = "super" | "branch" | "cs" | "analyst" | "developer";

export interface AdminAccount {
  id: number;
  user_id: number;
  email: string;
  name: string;
  status: "active" | "suspended" | string;
  permission_level: AdminLevel;
  level_label: string;
  department: string | null;
  two_factor: boolean;
  created_at: string;
}

export interface AdminArea {
  label: string;
  read: AdminLevel[];
  write: AdminLevel[];
}

export interface AdminListResponse {
  data: AdminAccount[];
  levels: Record<AdminLevel, string>;
  areas: Record<string, AdminArea>;
}

export const adminsApi = {
  async list(): Promise<AdminListResponse> {
    const { data } = await api.get<AdminListResponse>("/v1/admin/admins");
    return data;
  },
  create: (payload: { email: string; name: string; phone: string; password: string; permission_level: AdminLevel; department?: string }) =>
    api.post("/v1/admin/admins", payload),
  update: (id: number, payload: Partial<{ permission_level: AdminLevel; department: string | null; status: "active" | "suspended" }>) =>
    api.patch(`/v1/admin/admins/${id}`, payload),
  resetTwoFactor: (id: number) => api.post(`/v1/admin/admins/${id}/reset-2fa`),
};
