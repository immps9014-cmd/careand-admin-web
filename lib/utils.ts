import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind 클래스 병합 (shadcn/ui 표준)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 한국 통화 포맷
 */
export function formatKRW(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("ko-KR").format(num) + "원";
}

/**
 * 큰 숫자 압축 (1.2M, 187K)
 */
export function formatCompact(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

/**
 * 시간 ago (5분 전, 2시간 전)
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString("ko-KR");
}

/**
 * 날짜 포맷 (2026-05-03)
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 일시 포맷 (2026-05-03 14:30)
 */
export function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  return `${d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })} ${d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

/**
 * 한국어 라벨 매핑
 */
export const ko = {
  caregiverStatus: {
    pending: "검수 대기",
    active: "활성",
    suspended: "정지",
    leave: "휴직",
    rejected: "거절",
  },
  matchStatus: {
    confirmed: "확정",
    in_progress: "진행중",
    completed: "완료",
    cancelled: "취소",
    no_show: "노쇼",
  },
  paymentStatus: {
    pending: "대기",
    paid: "완료",
    failed: "실패",
    cancelled: "취소",
    refunded: "환불",
  },
  severity: {
    low: "낮음",
    mid: "중간",
    high: "높음",
    critical: "긴급",
  },
  riskType: {
    fall: "낙상",
    delirium: "섬망",
    depression: "우울",
    nutrition: "영양",
    other: "기타",
  },
} as const;

/**
 * 거리 포맷 (1.8km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
