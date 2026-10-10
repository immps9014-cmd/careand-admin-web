import { api } from "./client";

/** 영역별 안내 콘텐츠·FAQ·지역 공지(CAREN-REF-01 3단계, 2026-10-10) — 권한 영역 'contents' */
export type ContentKind = "guide" | "faq" | "notice";
export type ContentStatus = "draft" | "published";
export type ContentTone = "info" | "warn";

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[]; role?: string | null }
  | { type: "note"; text: string; tone?: ContentTone | null }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "link"; label: string; href: string };

export interface ContentRow {
  id: number;
  kind: ContentKind;
  placement: string;
  domain: string | null;
  audience: string;
  platform: string;
  regions: string[] | null;
  title: string;
  blocks: ContentBlock[];
  tone: ContentTone | null;
  sort: number;
  starts_on: string | null;
  ends_on: string | null;
  reviewed: boolean;
  updated_at: string | null;
  status: ContentStatus;
  source_url: string | null;
  source_note: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  updated_by_name: string | null;
}

export interface ContentLabels {
  kinds: Record<string, string>;
  placements: Record<string, string>;
  domains: Record<string, string>;
  audiences: Record<string, string>;
  platforms: Record<string, string>;
  regions: string[];
  block_types: Record<string, string>;
}

export interface ContentFilters {
  kind?: string;
  placement?: string;
  domain?: string;
  status?: string;
}

export type ContentInput = Partial<Omit<ContentRow, "id" | "reviewed" | "updated_at" | "reviewed_at" | "reviewed_by_name" | "updated_by_name">>;

export const contentsApi = {
  async list(f: ContentFilters): Promise<{ rows: ContentRow[]; labels: ContentLabels }> {
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    const { data } = await api.get("/v1/admin/contents", { params });
    return data.data;
  },
  create: (body: ContentInput) => api.post("/v1/admin/contents", body),
  update: (id: number, body: ContentInput) => api.patch(`/v1/admin/contents/${id}`, body),
  review: (id: number, undo = false) => api.post(`/v1/admin/contents/${id}/review`, undo ? { undo: true } : {}),
  remove: (id: number) => api.delete(`/v1/admin/contents/${id}`),
};
