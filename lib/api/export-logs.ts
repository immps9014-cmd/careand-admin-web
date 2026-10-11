import { api } from "./client";

/** 다운로드 기록(2026-10-11) — GET /v1/admin/exports/logs. 성공=export.*, 거부=4xx 시도 */
export interface ExportLogRow {
  id: number;
  at: string | null;
  actor_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  kind: string;
  kind_label: string;
  result: "success" | "blocked";
  status: number;
  filters: Record<string, string | number | null> | unknown[];
  rows: number | null;
  reason: string | null;
  ip: string | null;
}

export interface ExportLogSummary {
  from: string;
  to: string;
  success: number;
  blocked: number;
  rows_total: number;
  actors: { id: number; name: string | null; count: number }[];
  kinds: { key: string; label: string }[];
}

export interface ExportLogParams {
  period?: string;
  from?: string;
  to?: string;
  result?: "success" | "blocked";
  actor_id?: number;
  kind?: string;
  page?: number;
}

export const exportLogsApi = {
  async list(params: ExportLogParams) {
    const { data } = await api.get<{
      success: boolean;
      data: ExportLogRow[];
      summary: ExportLogSummary;
      meta: { total: number; per_page: number; current_page: number; last_page: number };
    }>("/v1/admin/exports/logs", { params });
    return data;
  },
};
