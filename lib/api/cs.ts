import { api, ApiResponse } from "./client";

export interface CsStats {
  reviews_total: number;
  reviews_avg: number;
  reviews_negative: number;
  rating_distribution: Record<string, number>;
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
