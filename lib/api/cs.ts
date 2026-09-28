import { api, ApiResponse } from "./client";

export interface CsStats {
  reviews_total: number;
  reviews_avg: number;
  reviews_negative: number;
  rating_distribution: Record<string, number>;
  /** 2점 이하 알림 후 미답변 건수 / 답변 기준 시간 / 기준 초과 건수 / 평균 답변 시간(시간) */
  negative_open: number;
  sla_hours: number;
  sla_overdue: number;
  avg_reply_hours: number | null;
  chatbot_total: number;
  chatbot_open: number;
}

export interface CsReview {
  id: number;
  match_id: number;
  reviewer_id: number;
  reviewer_name: string;
  reviewer_role: "guardian" | "caregiver";
  rating: number;
  comment: string | null;
  tags: string[];
  is_negative: boolean;
  service_domain: string | null;
  /** 도메인별 평가 항목 점수 */
  scores: { key: string; label: string; score: number }[];
  flagged_at: string | null;
  /** 2점 이하 미답변일 때 경과 시간(시간) */
  open_hours: number | null;
  /** 관리자 답글 — 없으면 null */
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface CsChatbotSession {
  id: number;
  guardian_id: number;
  guardian_name: string;
  topic: string;
  message_count: number;
  status: "open" | "closed";
  started_at: string;
  last_at: string | null;
  ended_at: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}

export const csApi = {
  async stats(): Promise<CsStats> {
    const { data } = await api.get<{ data: CsStats }>("/v1/admin/cs/stats");
    return data.data;
  },

  async reviews(params?: {
    rating?: number;
    role?: string;
    negative?: boolean;
    unanswered?: boolean;
    page?: number;
  }): Promise<Paginated<CsReview>> {
    const { data } = await api.get<ApiResponse<CsReview[]>>("/v1/admin/cs/reviews", {
      params,
    });
    return { data: data.data ?? [], meta: data.meta as Paginated<CsReview>["meta"] };
  },

  /** 후기에 관리자 답글 저장 */
  replyReview: (id: number, reply: string) =>
    api.post(`/v1/admin/cs/reviews/${id}/reply`, { reply }),

  async chatbotSessions(params?: {
    status?: "open" | "closed";
    page?: number;
  }): Promise<Paginated<CsChatbotSession>> {
    const { data } = await api.get<ApiResponse<CsChatbotSession[]>>(
      "/v1/admin/cs/chatbot-sessions",
      { params }
    );
    return {
      data: data.data ?? [],
      meta: data.meta as Paginated<CsChatbotSession>["meta"],
    };
  },
};
