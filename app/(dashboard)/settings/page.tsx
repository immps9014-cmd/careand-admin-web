"use client";

import { useRouter } from "next/navigation";
import {
  Megaphone,
  Cpu,
  Activity,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  organization: "기관",
  guardian: "보호자",
  caregiver: "돌봄전문가",
};

const SHORTCUTS = [
  { label: "공지사항 관리", desc: "회원 대상 공지 등록·관리", href: "/announcements", icon: Megaphone },
  { label: "AI 모델 설정", desc: "매칭·이상탐지·예측 모델 운영", href: "/ai-models", icon: Cpu },
  { label: "케어 모니터링", desc: "이상징후 알림 확인·처리", href: "/care-monitoring", icon: Activity },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    router.push("/login");
  };

  const initial = (user?.name ?? "?").trim().charAt(0) || "?";

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900">설정</h1>
        <p className="mt-1 text-sm text-warm-500">내 계정 정보와 운영 설정을 확인합니다.</p>
      </div>

      {/* 내 계정 */}
      <section className="card-soft p-6">
        <h2 className="text-sm font-bold text-warm-700 mb-4">내 계정</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xl font-bold">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-warm-900 truncate">{user?.name ?? "—"}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700">
                <ShieldCheck className="w-3 h-3" />
                {ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? "—"}
              </span>
            </div>
            <div className="text-sm text-warm-500 truncate">{user?.email ?? "—"}</div>
          </div>
        </div>
      </section>

      {/* 운영 설정 바로가기 */}
      <section className="card-soft p-6">
        <h2 className="text-sm font-bold text-warm-700 mb-4">운영 설정</h2>
        <div className="divide-y divide-warm-100">
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.href}
                onClick={() => router.push(s.href)}
                className="w-full flex items-center gap-4 py-3.5 text-left hover:bg-warm-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <span className="w-10 h-10 rounded-lg bg-warm-50 text-warm-600 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-warm-800">{s.label}</span>
                  <span className="block text-xs text-warm-500">{s.desc}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-warm-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </section>

      {/* 계정 작업 */}
      <section className="card-soft p-6">
        <h2 className="text-sm font-bold text-warm-700 mb-4">계정</h2>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-warm-600 hover:text-danger hover:bg-danger-bg"
        >
          <LogOut className="w-4 h-4" />
          <span className="ml-1">로그아웃</span>
        </Button>
      </section>
    </div>
  );
}
