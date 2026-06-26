import Link from "next/link";
import { ChevronLeft, ArrowRight, ArrowLeft, ArrowDown, ArrowUpRight } from "lucide-react";

export const ROLES = {
  guardian: { label: "보호자", color: "#3D7AB3" },
  caregiver: { label: "돌봄전문가", color: "#3F7D52" },
  admin: { label: "관리자", color: "#C25450" },
  org: { label: "기관", color: "#0E7C86" },
  system: { label: "시스템·AI", color: "#E8A33C" },
  pivot: { label: "핵심 전환점", color: "#7C4DFF" },
} as const;
export type RoleKey = keyof typeof ROLES;
export type Step = { role: RoleKey; n?: string; title: string; desc?: string; note?: string; href?: string };

const COLS = 4;
const CW = 200;
const AW = 54;
const ROW_W = COLS * CW + (COLS - 1) * AW; // 962

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold text-warm-600">
      {Object.values(ROLES).map((r) => (
        <span key={r.label} className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: r.color }} />
          {r.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 text-warm-400">
        <ArrowUpRight className="w-3.5 h-3.5" /> 카드 클릭 시 관리 화면으로 이동
      </span>
    </div>
  );
}

function StepCardInner({ step }: { step: Step }) {
  const r = ROLES[step.role];
  return (
    <>
      <div className="text-[10.5px] font-extrabold uppercase tracking-wide" style={{ color: r.color }}>{r.label}</div>
      <div className="text-[13px] font-bold text-warm-800 mt-1 leading-snug">
        {step.n && <span className="text-warm-400">{step.n} </span>}{step.title}
      </div>
      {step.desc && <div className="text-[10.5px] text-warm-500 mt-1.5 leading-relaxed">{step.desc}</div>}
      {step.href && (
        <div className="mt-auto pt-2 inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: r.color }}>
          관리 화면 <ArrowUpRight className="w-3 h-3" />
        </div>
      )}
    </>
  );
}

function StepCard({ step }: { step: Step }) {
  const r = ROLES[step.role];
  const pivot = step.role === "pivot";
  const style: React.CSSProperties = {
    width: CW, flex: "0 0 auto", borderColor: "#E6E8EC", borderTopColor: r.color, borderTopWidth: 4,
    background: pivot ? "#F6F2FF" : "#fff",
  };
  const base = "flex flex-col rounded-xl border p-3 shadow-sm transition-all";
  if (step.href) {
    return (
      <Link href={step.href} className={`${base} hover:-translate-y-0.5 hover:shadow-md cursor-pointer`} style={style}>
        <StepCardInner step={step} />
      </Link>
    );
  }
  return (
    <div className={base} style={style}>
      <StepCardInner step={step} />
    </div>
  );
}

function HArrow({ dir, note }: { dir: "right" | "left"; note?: string }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ width: AW, flex: "0 0 auto" }}>
      {note && <div className="text-[9px] font-bold text-warm-400 text-center mb-1 leading-tight whitespace-pre-line">{note}</div>}
      {dir === "right" ? <ArrowRight className="w-5 h-5 text-warm-300" /> : <ArrowLeft className="w-5 h-5 text-warm-300" />}
    </div>
  );
}

export function FlowChart({ steps }: { steps: Step[] }) {
  const units = steps.map((s, i) => ({ i, s }));
  const rows: { i: number; s: Step }[][] = [];
  for (let i = 0; i < units.length; i += COLS) rows.push(units.slice(i, i + COLS));

  return (
    <div className="mx-auto" style={{ width: ROW_W, maxWidth: "100%" }}>
      {rows.map((row, ri) => {
        const even = ri % 2 === 0;
        const disp = even ? row : [...row].reverse();
        const isLast = ri === rows.length - 1;
        const downNote = row[row.length - 1].s.note;
        const downMl = even ? ROW_W - CW + (CW - AW) / 2 : (CW - AW) / 2;
        return (
          <div key={ri}>
            <div className="flex items-stretch" style={{ justifyContent: even ? "flex-start" : "flex-end" }}>
              {disp.map((u, k) => {
                const lastInRow = k === disp.length - 1;
                let note: string | undefined;
                if (!lastInRow) {
                  const nxt = disp[k + 1];
                  note = (u.i < nxt.i ? u : nxt).s.note;
                }
                return (
                  <div key={u.i} className="flex items-stretch">
                    <StepCard step={u.s} />
                    {!lastInRow && <HArrow dir={even ? "right" : "left"} note={note} />}
                  </div>
                );
              })}
            </div>
            {!isLast && (
              <div className="flex flex-col items-center py-1.5" style={{ marginLeft: downMl, width: AW }}>
                <ArrowDown className="w-5 h-5 text-warm-300" />
                {downNote && <div className="text-[9px] font-bold text-warm-400 text-center mt-1 leading-tight whitespace-pre-line" style={{ width: 96 }}>{downNote}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WorkflowShell({
  title, desc, accent, children,
}: { title: string; desc: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="p-8">
      <Link href="/workflow" className="inline-flex items-center gap-1 text-sm text-warm-500 hover:text-warm-700 mb-3">
        <ChevronLeft className="w-4 h-4" /> 업무흐름도
      </Link>
      <div className="mb-5 flex items-center gap-3">
        {accent && <span className="w-3.5 h-3.5 rounded-full" style={{ background: accent }} />}
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">{title}</h1>
          <p className="text-sm text-warm-500 mt-1">{desc}</p>
        </div>
      </div>
      <div className="mb-4"><Legend /></div>
      <div className="rounded-xl border border-warm-200 bg-warm-50/40 p-6">
        <p className="text-xs text-warm-400 mb-4">한 줄을 넘으면 아래로 이어집니다 (1행 →, 2행 ← 연속). 단계 카드를 클릭하면 해당 관리 화면으로 이동합니다.</p>
        {children}
      </div>
    </div>
  );
}

/* ===================== 흐름 데이터 (href=관리 화면) ===================== */
export const OVERVIEW_STEPS: Step[] = [
  { role: "guardian", title: "회원가입", desc: "휴대폰 인증·약관", href: "/members" },
  { role: "guardian", title: "어르신 등록", desc: "건강·돌봄정보·주소", href: "/members", note: "돌봄전문가는\n사전 자격검수 승인" },
  { role: "guardian", title: "매칭 요청", desc: "서비스·일정·요구사항", href: "/matching" },
  { role: "system", title: "AI 후보 추천", desc: "점수·1순위 제시", href: "/matching" },
  { role: "guardian", title: "후보 선택", href: "/matching", note: "거절 시\n↻ 재추천" },
  { role: "caregiver", title: "수락", desc: "앱에서 제안 수락", href: "/matching" },
  { role: "pivot", title: "매칭 성사", desc: "케어 세션 생성(scheduled)", href: "/contracts" },
  { role: "caregiver", n: "①", title: "출근 체크인", desc: "GPS 위치검증", href: "/care-monitoring" },
  { role: "caregiver", n: "②", title: "돌봄·기록", desc: "활동·음성일지·사진", href: "/care-monitoring" },
  { role: "caregiver", n: "③", title: "퇴근 체크아웃", desc: "completed·시간 산정", href: "/care-monitoring", note: "AI 일지\n자동 생성" },
  { role: "system", title: "AI 케어일지", desc: "활동·음성·사진 종합", href: "/care-logs", note: "반려 시\n↻ 재생성" },
  { role: "admin", title: "일지 검수", desc: "승인(approved)", href: "/care-logs" },
  { role: "guardian", title: "케어일지 열람", desc: "보호자버전·후기", href: "/care-logs" },
  { role: "system", title: "주간 정산 집계", desc: "총액·원천징수·실수령", href: "/settlements" },
  { role: "admin", title: "정산 확정", desc: "bulk-confirm", href: "/settlements" },
  { role: "caregiver", title: "정산내역·지급", href: "/settlements" },
];

export const GUARDIAN_STEPS: Step[] = [
  { role: "guardian", title: "회원가입", desc: "휴대폰 인증·관계", href: "/members" },
  { role: "guardian", title: "어르신 등록", desc: "건강·돌봄정보·주소", href: "/members" },
  { role: "guardian", title: "매칭 요청", desc: "서비스 종류·일정", href: "/matching" },
  { role: "system", title: "AI 후보 추천", desc: "점수·1순위", href: "/matching" },
  { role: "guardian", title: "후보 비교·선택", desc: "평점·경력·거리", href: "/matching", note: "거절 시\n↻ 다른후보" },
  { role: "caregiver", title: "돌봄전문가 수락", href: "/matching" },
  { role: "pivot", title: "매칭 성사", desc: "세션 예약·알림", href: "/contracts" },
  { role: "guardian", title: "방문 일정 확인", href: "/contracts" },
  { role: "guardian", title: "진행 현황 확인", desc: "출근→돌봄→퇴근", href: "/care-monitoring" },
  { role: "system", title: "이상징후 알림", desc: "건강 이상 감지 시", href: "/care-monitoring" },
  { role: "admin", title: "케어일지(검수완료)", desc: "승인분만 전달", href: "/care-logs" },
  { role: "guardian", title: "케어일지 열람", desc: "식사·복약·활동", href: "/care-logs" },
  { role: "guardian", title: "후기·평점 작성", href: "/cs" },
  { role: "guardian", title: "이용내역·정산 확인", href: "/settlements", note: "정기 돌봄\n↻ 재요청" },
];

export const CAREGIVER_STEPS: Step[] = [
  { role: "caregiver", title: "회원가입", desc: "휴대폰 인증·약관", href: "/members" },
  { role: "caregiver", title: "자격정보 등록", desc: "자격번호·활동지역", href: "/caregiver-approval" },
  { role: "system", title: "진위확인", desc: "보건복지부 연동", href: "/caregiver-approval" },
  { role: "admin", title: "자격 검수", desc: "신원·자격 확인", href: "/caregiver-approval", note: "반려 시\n↻ 재등록" },
  { role: "pivot", title: "활동 시작", desc: "pending → active", href: "/caregiver-approval" },
  { role: "system", title: "매칭 제안 도착", desc: "AI점수·어르신·일시", href: "/matching" },
  { role: "caregiver", title: "제안 수락", href: "/matching", note: "거절 시 ✕\n제안 종료" },
  { role: "caregiver", n: "①", title: "출근 체크인", desc: "GPS 위치검증", href: "/care-monitoring" },
  { role: "caregiver", n: "②", title: "돌봄·기록", desc: "활동·음성·완료사진", href: "/care-monitoring" },
  { role: "caregiver", n: "③", title: "퇴근 체크아웃", desc: "사진 1장↑ 필수", href: "/care-monitoring" },
  { role: "system", title: "AI 케어일지 생성", href: "/care-logs" },
  { role: "caregiver", title: "정산내역·지급", desc: "‘정산’ 탭", href: "/settlements" },
  { role: "caregiver", title: "평점·등급 상승", desc: "grade_level↑", href: "/reports", note: "반복 ↻" },
];

export const ADMIN_STEPS: Step[] = [
  { role: "admin", title: "회원·자격 관리", desc: "보호자·돌봄전문가·기관", href: "/members" },
  { role: "admin", title: "자격 검수", desc: "승인/반려", href: "/caregiver-approval", note: "진위확인 기반" },
  { role: "system", title: "AI 매칭 추천", desc: "요청별 후보 산출", href: "/matching" },
  { role: "admin", title: "매칭 모니터링", desc: "수동 배정(필요시)", href: "/matching" },
  { role: "admin", title: "계약·일정 관리", href: "/contracts" },
  { role: "system", title: "AI 케어일지 생성", desc: "체크아웃 후 자동", href: "/care-logs" },
  { role: "admin", title: "일지 검수", desc: "승인→보호자 공개", href: "/care-logs" },
  { role: "system", title: "주간 정산 집계", desc: "SettlementsRunWeekly", href: "/settlements" },
  { role: "admin", title: "정산 확정", desc: "bulk-confirm·지급", href: "/settlements" },
  { role: "admin", title: "리포트·CS", desc: "운영지표·분쟁 관리", href: "/reports" },
];


export const ORG_STEPS: Step[] = [
  { role: "org", title: "기관 회원가입", desc: "사업자등록번호·대표자·연락처", href: "/members" },
  { role: "admin", title: "기관 검수·승인", desc: "사업자·기관자격 확인", href: "/members", note: "반려 시\n↻ 재신청" },
  { role: "org", title: "소속 돌봄전문가 등록", desc: "org_id 연결·일괄 등록", href: "/members" },
  { role: "admin", title: "소속 인력 자격검수", desc: "인력별 승인/반려", href: "/caregiver-approval" },
  { role: "system", title: "매칭 배정 수신", desc: "소속 인력에 요청 배정", href: "/matching" },
  { role: "org", title: "배정 수락·일정 관리", desc: "소속 인력 배치", href: "/contracts" },
  { role: "caregiver", title: "소속 인력 돌봄 수행", desc: "출퇴근·활동·일지", href: "/care-monitoring" },
  { role: "admin", title: "AI 일지 검수", desc: "승인→보호자 공개", href: "/care-logs" },
  { role: "system", title: "기관 정산 집계", desc: "소속 인력 정산 합산", href: "/settlements" },
  { role: "org", title: "정산 수령·배분", desc: "기관 수령 후 인력 배분", href: "/settlements" },
  { role: "org", title: "실적·리포트 관리", desc: "소속 인력 운영 지표", href: "/reports" },
];
