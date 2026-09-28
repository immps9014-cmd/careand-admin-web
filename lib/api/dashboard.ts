import { api } from "./client";

export interface DashboardKpi {
  matches_in_progress: number;
  matches_today: number;
  revenue_today: number;
  revenue_this_week: number;
  revenue_change_pct: number;
  high_alerts_unresolved: number;
  pending_caregivers: number;
  active_users: number;
  active_seniors: number;
  active_caregivers: number;
  by_domain?: Record<string, DomainKpi>;
}

export interface DomainKpi {
  matches_in_progress: number;
  requests_this_week: number;
  revenue_this_week: number;
}

export interface HourlyRequest {
  hour: number;
  count: number;
}

export interface HourlyRequestsResponse {
  period: string;
  data: HourlyRequest[];
  peak_hour: number | null;
  peak_count: number;
  total_count: number;
  /** 매칭 성공률(%) — 백엔드 미제공 시 undefined → UI에 "—" 표시 */
  match_success_rate?: number | null;
  /** 평균 매칭 소요(분) — 요청→매칭 평균, 데이터 없으면 null → "—" 표시 */
  avg_match_minutes?: number | null;
}

/** 사업계획서(협약) 핵심성과지표 — GET /v1/admin/dashboard/business-kpi */
export interface BusinessKpi {
  key: "stt_term_rate" | "match_lead_hours" | "care_log_minutes";
  name: string;
  label: string;
  unit: "%" | "h" | "min";
  weight: number;
  baseline: number | null;
  target: number;
  /** up = 높을수록 좋음(인식률), down = 낮을수록 좋음(소요시간) */
  direction: "up" | "down";
  /** 측정값 — 표본이 없으면 null("측정 전") */
  value: number | null;
  n: number;
  n_label: string | null;
  measured_at: string | null;
  note: string;
}

export interface RegionalDemand {
  region: string;
  senior_count: number;
  caregiver_count: number;
  weekly_requests: number;
  supply_rate_pct: number;
  status: "good" | "warning" | "critical";
}

export interface RecentAlert {
  id: number;
  senior_id: number;
  senior_name: string;
  risk_type: string;
  risk_score: number;
  severity: "low" | "mid" | "high" | "critical";
  status: string;
  detected_at: string;
  detected_ago: string;
}

export const dashboardApi = {
  async kpi(): Promise<{ data: DashboardKpi; updated_at: string }> {
    const { data } = await api.get("/v1/admin/dashboard/kpi");
    return data;
  },

  async hourlyRequests(period: "today" | "7d" | "30d" = "today"): Promise<HourlyRequestsResponse> {
    const { data } = await api.get("/v1/admin/dashboard/hourly-requests", {
      params: { period },
    });
    return data;
  },

  async businessKpi(period: "all" | "30d" | "7d" = "all"): Promise<{ period: string; data: BusinessKpi[] }> {
    const { data } = await api.get("/v1/admin/dashboard/business-kpi", { params: { period } });
    return data;
  },

  async regionalDemand(): Promise<{ data: RegionalDemand[] }> {
    const { data } = await api.get("/v1/admin/dashboard/regional-demand");
    return data;
  },

  async monitoringAlerts(params?: { status?: string; severity?: string; page?: number }): Promise<{
    data: RecentAlert[];
    meta: { total: number; current_page: number; last_page: number; per_page: number; status_total: number; by_severity: Record<string, number> };
  }> {
    const { data } = await api.get("/v1/admin/monitoring/alerts", { params });
    return data;
  },
  acknowledgeAlert: (id: number, actionNote?: string) =>
    api.post(`/v1/admin/monitoring/alerts/${id}/acknowledge`, actionNote ? { action_note: actionNote } : {}),
  resolveAlert: (id: number, note: string) =>
    api.post(`/v1/admin/monitoring/alerts/${id}/resolve`, { resolution_note: note }),

  async recentAlerts(): Promise<{ data: RecentAlert[] }> {
    const { data } = await api.get("/v1/admin/dashboard/recent-alerts");
    return data;
  },
};
