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
  match_success_rate?: number;
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

  async regionalDemand(): Promise<{ data: RegionalDemand[] }> {
    const { data } = await api.get("/v1/admin/dashboard/regional-demand");
    return data;
  },

  async recentAlerts(): Promise<{ data: RecentAlert[] }> {
    const { data } = await api.get("/v1/admin/dashboard/recent-alerts");
    return data;
  },
};
