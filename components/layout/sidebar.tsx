"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Brain,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DollarSign,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Network,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/store";

interface NavItem {
  href: string;
  label: string;
  /** 권한 영역(config/admin_rbac.php) — 조회 권한이 없으면 메뉴를 숨긴다 */
  area?: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
}

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", area: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/members", area: "members", label: "회원 관리", icon: Users },
  { href: "/matching", area: "matching", label: "매칭 관리", icon: ArrowRightLeft },
  { href: "/care-monitoring", area: "monitoring", label: "케어 모니터링", icon: ClipboardList },
  { href: "/settlements", area: "settlements", label: "정산", icon: DollarSign },
];

const OPS_NAV: NavItem[] = [
  { href: "/caregiver-approval", area: "caregivers", label: "돌봄전문가 자격검증", icon: ShieldCheck },
  { href: "/contracts", area: "contracts", label: "계약·일정", icon: CalendarClock },
  { href: "/care-sessions", area: "care-sessions", label: "케어 진행 현황", icon: Activity },
  { href: "/care-logs", area: "care-logs", label: "AI 일지 검수", icon: ClipboardCheck },
  { href: "/announcements", area: "announcements", label: "공지·푸시", icon: Megaphone },
  { href: "/workflow", label: "업무흐름도", icon: Workflow },
];

const AI_NAV: NavItem[] = [
  { href: "/insights", area: "insights", label: "AI 인사이트 검색", icon: Sparkles },
  { href: "/ai-models", area: "ai-models", label: "AI 모델", icon: Brain },
  { href: "/ontology", area: "ontology", label: "온톨로지 분석", icon: Network },
  { href: "/cs", area: "cs", label: "CS / 분쟁", icon: MessageCircle },
  { href: "/reports", area: "reports", label: "리포트", icon: BarChart3 },
  { href: "/admins", area: "admins", label: "관리자 계정·권한", icon: UserCog },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  // 권한 5단계(S2-3): 조회 권한 없는 메뉴 숨김. 권한 정보가 없는 옛 로그인 정보면 그대로 보여 주고 서버가 막는다
  const perms = user?.admin_permissions;
  const visible = (items: NavItem[]) => items.filter((i) => !perms || !i.area || perms[i.area]?.read);

  return (
    <aside
      className={cn(
        "w-60 bg-white border-r border-warm-200 flex flex-col",
        // 모바일: 오프캔버스(슬라이드) / 데스크톱: 고정 표시
        "fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* 로고 */}
      <div className="px-6 py-5 border-b border-warm-100 flex items-center gap-2.5">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center font-en font-extrabold text-white text-base shadow-md">
          C
        </div>
        <div>
          <div className="font-en font-extrabold text-warm-900 text-base tracking-tight leading-none">
            Care&
          </div>
          <div className="text-[11px] font-medium text-warm-500 mt-0.5">
            관리자 콘솔
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="ml-auto -mr-2 p-2 text-warm-500 hover:text-warm-700 lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 메인 메뉴 */}
      <NavSection title="메인" items={visible(MAIN_NAV)} pathname={pathname} onNavigate={onClose} />

      {/* 운영 관리 */}
      <NavSection title="운영 관리" items={visible(OPS_NAV)} pathname={pathname} onNavigate={onClose} />

      {/* AI 운영 */}
      <NavSection title="AI 운영" items={visible(AI_NAV)} pathname={pathname} onNavigate={onClose} />

      {/* 사용자 */}
      <div className="mt-auto px-6 py-4 border-t border-warm-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {user?.name?.[0] || "관"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-warm-800 truncate">
            {user?.name || "관리자"}
          </div>
          <div className="text-[11px] text-warm-500 truncate">
            {user?.admin_level_label ?? "관리자"}
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="pt-4 pb-2">
      <div className="px-6 pb-2 text-[10px] font-bold text-warm-500 uppercase tracking-widest">
        {title}
      </div>
      <nav>
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-6 py-2.5 text-sm font-medium border-l-[3px] transition-all",
                isActive
                  ? "text-brand-700 bg-brand-50 border-brand-500 font-semibold"
                  : "text-warm-500 border-transparent hover:bg-warm-50 hover:text-warm-800"
              )}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px]",
                  isActive ? "text-brand-500" : "text-warm-500"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 bg-danger text-white text-[10px] font-bold rounded-full font-en">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
