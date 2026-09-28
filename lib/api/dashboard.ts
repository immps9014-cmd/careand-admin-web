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

/* ===== 지점·도메인·기간 필터 현황(기능 17, S5) — GET /v1/admin/dashboard/breakdown ===== */
export interface DashboardBreakdown {
  filter: { period: string; from: string; branch_id: number | null; domain: string | null };
  requests: number;
  matched: number;
  match_rate: number | null;
  revenue: number;
  sessions_completed: number;
  active_caregivers: number;
  utilization: number | null;
  rating_avg: number | null;
  by_branch: { branch_id: number; name: string; revenue: number; active_caregivers: number }[];
  unassigned_caregivers: number;
  by_domain: { domain: string; label: string; requests: number; matched: number }[];
}
export async function fetchBreakdown(params: { period: string; branch_id?: string; domain?: string }): Promise<DashboardBreakdown> {
  const { data } = await api.get("/v1/admin/dashboard/breakdown", {
    params: { period: params.period, branch_id: params.branch_id || undefined, domain: params.domain || undefined },
  });
  return data.data;
}

/* ===== 월간 결산(기능 23·26, S5) ===== */
export interface MonthlyReport {
  month: string;
  generated_at: string;
  data: {
    revenue: { paid_count: number; total: number; self_pay: number; ltc_pay: number; cancelled_count: number; cancelled_amount: number;
      by_domain: { domain: string; label: string; count: number; amount: number }[]; by_branch: { branch: string; count: number; amount: number }[] };
    settlement: { count: number; gross: number; withholding: number; net: number; paid_count: number };
    matching: { requests: number; matched: number; expired: number; avg_match_hours: number | null };
    care: { sessions_completed: number; care_hours: number; logs_sent: number; avg_log_minutes: number | null };
    members: { new_guardians: number; new_caregivers: number; withdrawn: number };
    reviews: { count: number; avg_rating: number | null; negative: number };
  };
}
export async function fetchMonthlyReports(): Promise<MonthlyReport[]> {
  const { data } = await api.get("/v1/admin/reports/monthly");
  return data.data ?? [];
}
export async function generateMonthlyReport(month: string): Promise<{ message: string }> {
  const { data } = await api.post("/v1/admin/reports/monthly", { month });
  return data;
}
