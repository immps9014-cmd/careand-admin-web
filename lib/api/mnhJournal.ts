import { api } from "./client";

/* ===== 산모 이용일지 — 기관 확인(2026-10-05). 백엔드 App\Support\MnhClientJournal, RBAC 영역 mnh-journals ===== */

export interface MnhJournalEntry {
  id: number;
  kind: string;
  kind_label: string;
  newborn_id: number | null;
  newborn_name: string | null;
  logged_at: string;
  values: Record<string, string | number> | null;
  summary: string;
  note: string | null;
  flag: string | null;
  flag_label: string | null;
  checked_at: string | null;
  checked_by_name: string | null;
  check_note: string | null;
  created_at: string;
  postpartum_client_id: number;
  client_name: string;
  contract: { id: number; contract_no: string } | null;
}

export interface MnhJournalList {
  summary: { open: number; flagged_open: number; total: number };
  entries: MnhJournalEntry[];
  options: { kinds: Record<string, string>; flags: Record<string, string> };
}

type Ok<T> = { success: boolean; message?: string; data: T };

export const mnhJournalApi = {
  list: (params: { status?: string; flagged?: 1; client_id?: number; days?: number; q?: string }) =>
    api.get<Ok<MnhJournalList>>(`/v1/admin/mnh-journals`, { params }).then((r) => r.data),
  check: (ids: number[], note?: string) =>
    api.post<Ok<{ checked: number }>>(`/v1/admin/mnh-journals/check`, { ids, ...(note ? { note } : {}) }).then((r) => r.data),
};
