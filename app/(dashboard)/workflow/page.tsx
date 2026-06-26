import Link from "next/link";
import { Workflow, HeartHandshake, Stethoscope, ShieldCheck, Building2, ArrowRight } from "lucide-react";

const ROLE_CARDS = [
  { href: "/workflow/guardian", label: "보호자", color: "#3D7AB3",
    desc: "가입·어르신 등록 → 매칭 요청 → 돌봄 모니터링 → 케어일지·후기 → 정산", icon: HeartHandshake },
  { href: "/workflow/caregiver", label: "돌봄전문가", color: "#3F7D52",
    desc: "가입·자격검증 → 매칭 제안 → 출퇴근·기록 → 정산 → 성장(등급)", icon: Stethoscope },
  { href: "/workflow/operations", label: "관리자 (운영)", color: "#C25450",
    desc: "자격검수 → 매칭 모니터링 → AI 일지 검수 → 정산 확정 → 리포트", icon: ShieldCheck },
  { href: "/workflow/organization", label: "기관", color: "#0E7C86",
    desc: "기관 가입·검수 → 소속 인력 등록 → 매칭 배정 → 돌봄 모니터링 → 기관 정산", icon: Building2 },
];

export default function WorkflowIndexPage() {
  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">업무흐름도</h1>
        <p className="text-sm text-warm-500 mt-1">
          서비스 전체 업무 흐름과 접속자(역할)별 업무 흐름을 가로형 다이어그램으로 제공합니다.
        </p>
      </div>

      {/* 전체 */}
      <div className="mb-3 text-[11px] font-bold text-warm-400 uppercase tracking-widest">전체 업무흐름도</div>
      <Link href="/workflow/overview"
        className="group flex items-center gap-4 rounded-xl border border-warm-200 bg-white p-5 shadow-sm hover:-translate-y-px hover:shadow-md transition-all mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-none" style={{ background: "#7C4DFF" }}>
          <Workflow className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-extrabold text-warm-800">전체 업무흐름도 (생애 전체 주기)</div>
          <div className="text-sm text-warm-500 mt-0.5">가입·온보딩 → 매칭 → 돌봄 수행 → 기록·검수 → 정산까지 한눈에</div>
        </div>
        <ArrowRight className="w-5 h-5 text-warm-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
      </Link>

      {/* 접속자별 */}
      <div className="mb-3 text-[11px] font-bold text-warm-400 uppercase tracking-widest">접속자별 업무흐름도</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLE_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}
              className="group rounded-xl border bg-white p-5 shadow-sm hover:-translate-y-px hover:shadow-md transition-all flex flex-col"
              style={{ borderTopColor: c.color, borderTopWidth: 4, borderColor: "#E6E8EC" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white mb-3" style={{ background: c.color }}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-base font-extrabold text-warm-800">{c.label}</div>
              <div className="text-[13px] text-warm-500 mt-1 leading-relaxed flex-1">{c.desc}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: c.color }}>
                흐름 보기 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 text-xs text-warm-400">
        통합본 이미지가 필요하면 <a href="/admin/workflow.png" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold hover:underline">전체 통합본 PNG ↗</a> 를 내려받을 수 있습니다.
      </div>
    </div>
  );
}
