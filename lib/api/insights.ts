import { api } from "./client";

export interface InsightStat {
  label: string;
  value: number;
  unit: string;
}

export interface InsightBreakdown {
  title: string;
  unit: string;
  rows: { label: string; value: number }[];
}

export interface InsightCompare {
  period_label: string;
  value: number;
  unit: string;
  delta: number;
  delta_pct: number | null;
  direction: "up" | "down" | "flat";
}

export interface InsightCard {
  key: "signups" | "matching" | "revenue";
  title: string;
  icon: string;
  primary: InsightStat;
  stats: InsightStat[];
  breakdown: InsightBreakdown | null;
  compare?: InsightCompare;
}

export interface InsightResult {
  query: string;
  intent: { metrics: string[]; period: string; matched: boolean };
  period: { key: string; label: string; start: string; end: string };
  generated_at: string;
  cards: InsightCard[];
  summary: string;
}

export const insightsApi = {
  /** 자연어 인사이트 검색 — 회원가입/매칭/매출 현황 */
  async query(q: string): Promise<InsightResult> {
    const { data } = await api.get("/v1/admin/insights/query", { params: { q } });
    return data.data;
  },
};
