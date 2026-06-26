// SSOT: 돌봄전문가 직군(service domain) ↔ 한글 라벨
// senior=요양보호, nursing=간병, housekeeping=가사, postpartum=산후
// (레거시 별칭: care=간병, companion=동행)
// service_domains(복수, 돌봄전문가 본인의 직군)와 service_domain(단수, 요청/세션 유형)
// 모두 동일 분류를 쓰므로 이 한 곳에서 라벨을 관리한다.

export const DOMAIN_LABEL: Record<string, string> = {
  senior: "요양보호",
  nursing: "간병",
  housekeeping: "가사",
  postpartum: "산후",
  companion: "동행",
  care: "간병",
};

/** 단일 도메인 코드 → 한글 라벨 (빈 값은 "-") */
export function domainLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return DOMAIN_LABEL[code] ?? code;
}

/** "senior,housekeeping" → ["요양보호","가사"] */
export function caregiverDomainLabels(serviceDomains: string | null | undefined): string[] {
  return (serviceDomains || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => DOMAIN_LABEL[d] ?? d);
}

/** "senior,housekeeping" → "돌봄전문가(요양보호·가사)" / 빈 값 → "돌봄전문가" */
export function caregiverRoleLabel(serviceDomains: string | null | undefined): string {
  const labels = caregiverDomainLabels(serviceDomains);
  return labels.length ? `돌봄전문가(${labels.join("·")})` : "돌봄전문가";
}
