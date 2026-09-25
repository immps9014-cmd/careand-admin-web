import { api } from "./client";

/**
 * 온톨로지 분석 API
 *
 * 백엔드(`/v1/admin/ontology/*`)가 AI 서비스의 화이트리스트 SPARQL 질의를 프록시한다.
 * 그래프는 DB 의 **스냅샷**(매시 :10 재적재)이라 화면은 조회 전용이고,
 * `status.data_at`(데이터 기준 시각)을 반드시 함께 보여준다.
 */

export interface OntologyStatus {
  state: string | null;
  data_at: string | null;
  triples: number | null;
  warnings: number | null;
  elapsed_sec?: number | null;
  age_min: number | null;
  /** 재적재 2회분(2시간 10분)을 넘겼는가 — 넘겼으면 화면에 경고색으로 표시 */
  stale: boolean;
}

export interface DiseaseCoverage {
  id: string;
  label: string;
  code: string | null;
  /** 어휘에만 있고 실제 DB 대상자 데이터엔 없는 질병인지 */
  in_db: boolean;
  required_specialties: string[];
  caregivers: number;
  recipients: number;
  requests: number;
}

export interface SpecialtySupply {
  id: string;
  label: string;
  caregivers: number;
  required_by_disease: boolean;
}

export interface CaregiverBrief {
  id: number;
  name: string;
  status: string;
  grade: number | null;
  rating: number | null;
  specialties: string[];
}

/** MCP 자연어 질문 처리율 (mcp_kpi.compute 요약, 최근 30일) — 못 푼 질문 원문이 포함되므로 관리자 화면 전용 */
export interface OntologyKpi {
  days: number;
  /** 질문 수는 하한 — 도구를 안 부르고 끝난 질문은 log_unanswered 로만 잡힌다 */
  questions: number;
  processed: number;
  rate: number | null;
  unprocessed_by_reason: {
    unanswered: number;
    unsupported: number;
    ambiguous: number;
    error: number;
  };
  calls: number;
  by_tool: Record<string, number>;
  unprocessed: {
    question: string;
    why: string;
    reason: string | null;
    ts: string;
  }[];
}

export interface OntologyOverview {
  available: boolean;
  status: OntologyStatus | null;
  diseases: DiseaseCoverage[];
  specialties: SpecialtySupply[];
  caregivers: CaregiverBrief[];
  /** ai-service 가 KPI 계산에 실패하면 null — 카드를 숨긴다 */
  kpi?: OntologyKpi | null;
  error?: string;
}

export interface ImpactMatch {
  match_id: number;
  status: string | null;
  scheduled_start: string | null;
  recipient: string;
  recipient_kind: string | null;
  domain: string | null;
}

export interface ImpactSession {
  session_id: number;
  status: string | null;
  scheduled_start: string | null;
  review_status: string | null;
}

export interface Alternative {
  id: number;
  name: string;
  rating: number | null;
  shared_specialties: number;
  distance_km: number | null;
}

export interface CaregiverImpact {
  available: boolean;
  found: boolean;
  caregiver?: CaregiverBrief & { completed_sessions: number };
  matches?: ImpactMatch[];
  sessions?: ImpactSession[];
  recipient_diseases?: string[];
  alternatives?: Alternative[];
  error?: string;
}

export const ontologyApi = {
  async overview(): Promise<OntologyOverview> {
    const { data } = await api.get("/v1/admin/ontology/overview");
    return data.data;
  },

  async caregiverImpact(id: number): Promise<CaregiverImpact> {
    const { data } = await api.get(`/v1/admin/ontology/caregivers/${id}/impact`);
    return data.data;
  },
};
