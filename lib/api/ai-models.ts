import { api } from "./client";

export interface AiModel {
  id: number;
  model_name: string;
  version: string;
  status: "active" | "shadow" | "deprecated";
  accuracy: number;
  avg_latency_ms: number;
  audited_at: string | null;
  has_bias_report: boolean;
}

export interface AiModelDetail extends AiModel {
  metadata: Record<string, unknown> | null;
  bias_report: {
    audited_at: string;
    window_days: number;
    gender_distribution: Record<string, number>;
    age_distribution: Record<string, number>;
    max_diff_pct: number;
    max_diff_threshold_pct: number;
    passed: boolean;
  } | null;
  recent_stats_7d: {
    total_inferences: number;
    success_rate_pct: number;
    avg_latency_ms: number;
    max_latency_ms: number;
  };
}

export const aiModelsApi = {
  async list(): Promise<{
    summary: { total: number; active: number; shadow: number; deprecated: number };
    data: AiModel[];
  }> {
    const { data } = await api.get("/v1/admin/ai-models");
    return data;
  },

  async show(id: number): Promise<{ data: AiModelDetail }> {
    const { data } = await api.get(`/v1/admin/ai-models/${id}`);
    return data;
  },

  async promote(id: number): Promise<{ message: string }> {
    const { data } = await api.post(`/v1/admin/ai-models/${id}/promote`);
    return data;
  },

  async rollback(id: number): Promise<{ message: string }> {
    const { data } = await api.post(`/v1/admin/ai-models/${id}/rollback`);
    return data;
  },

  async audit(id: number): Promise<{ message: string; data: AiModelDetail["bias_report"] }> {
    const { data } = await api.post(`/v1/admin/ai-models/${id}/audit`);
    return data;
  },
};
