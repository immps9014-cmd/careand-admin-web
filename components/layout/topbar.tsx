"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/store";
import { authApi } from "@/lib/api/auth";
import { dashboardApi, type RecentAlert } from "@/lib/api/dashboard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SEVERITY_META: Record<RecentAlert["severity"], { label: string; dot: string; text: string }> = {
  critical: { label: "위급", dot: "bg-danger", text: "text-danger" },
  high: { label: "높음", dot: "bg-warn", text: "text-warn" },
  mid: { label: "중간", dot: "bg-info", text: "text-info" },
  low: { label: "낮음", dot: "bg-warm-400", text: "text-warm-500" },
};

export function Topbar() {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    router.push("/login");
  };

  // ===== 검색 =====
  const [term, setTerm] = useState("");
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    router.push(`/members?q=${encodeURIComponent(q)}`);
  };

  // ===== 알림(종) =====
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bellOpen) return;
    const h = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [bellOpen]);

  const alertsQuery = useQuery({
    queryKey: ["admin", "topbar", "alerts"],
    queryFn: () => dashboardApi.monitoringAlerts({ status: "unresolved", page: 1 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unresolved = alertsQuery.data?.meta?.status_total ?? 0;
  const recent = (alertsQuery.data?.data ?? []).slice(0, 5);

  return (
    <header className="h-16 bg-white border-b border-warm-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      {/* 검색 */}
      <form onSubmit={submitSearch} className="relative w-96 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400 pointer-events-none" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="회원 이름·이메일 검색 후 Enter"
          className="pl-10 bg-warm-50 border-warm-200 placeholder:text-warm-400"
        />
      </form>

      {/* 액션 */}
      <div className="flex items-center gap-2">
        {/* 알림 종 */}
        <div className="relative" ref={bellRef}>
          <Button
            variant="secondary"
            size="icon"
            aria-label="알림"
            onClick={() => setBellOpen((o) => !o)}
            className="relative bg-warm-50 border border-warm-200 text-warm-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600 rounded-lg"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unresolved > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold text-white bg-danger rounded-full border-2 border-white">
                {unresolved > 99 ? "99+" : unresolved}
              </span>
            )}
          </Button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-warm-200 bg-white shadow-lg overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-warm-100">
                <span className="text-sm font-bold text-warm-800">미해결 알림</span>
                <span className="text-xs font-semibold text-danger">{unresolved}건</span>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {alertsQuery.isLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-warm-400">불러오는 중…</div>
                ) : recent.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-warm-400">미해결 알림이 없습니다.</div>
                ) : (
                  recent.map((a) => {
                    const sev = SEVERITY_META[a.severity] ?? SEVERITY_META.low;
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setBellOpen(false);
                          router.push("/care-monitoring");
                        }}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-warm-50 border-b border-warm-50 last:border-0"
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sev.dot}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-warm-800 truncate">
                            {a.senior_name}
                          </span>
                          <span className="block text-xs text-warm-500 truncate">
                            <span className={`font-bold ${sev.text}`}>{sev.label}</span>
                            {" · "}
                            {a.detected_ago}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => {
                  setBellOpen(false);
                  router.push("/care-monitoring");
                }}
                className="block w-full px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-50 border-t border-warm-100"
              >
                케어 모니터링에서 전체 보기 →
              </button>
            </div>
          )}
        </div>

        {/* 설정 */}
        <Button
          variant="secondary"
          size="icon"
          aria-label="설정"
          onClick={() => router.push("/settings")}
          className="bg-warm-50 border border-warm-200 text-warm-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600 rounded-lg"
        >
          <Settings className="w-[18px] h-[18px]" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-warm-500 hover:text-danger hover:bg-danger-bg ml-1"
        >
          <LogOut className="w-4 h-4" />
          <span className="ml-1">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
