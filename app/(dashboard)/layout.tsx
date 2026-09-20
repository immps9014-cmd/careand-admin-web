"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/store";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * persist 복원이 끝나기 **전에는 인증 판정을 하지 않는다.**
   *
   * 이게 없으면 첫 렌더의 isAuthenticated(false)를 보고 바로 /login 으로 replace 해서,
   * 로그인 상태인데도 URL 직접 진입·새로고침이 전부 로그인 화면으로 튕겼다
   * (2026-09-20 실측: API 는 200 이고 localStorage 도 그대로인데 replaceState /admin/login).
   * 사이드바 클릭(SPA 이동)은 스토어가 이미 메모리에 있어 멀쩡했기 때문에 잘 드러나지 않았다.
   *
   * 플래그는 스토어의 onRehydrateStorage 가 세운다 — member-web 과 같은 패턴이다.
   * ⚠ `authStore.persist.hasHydrated()` 를 렌더 중에 읽는 방식은 쓰지 말 것:
   *   zustand 4.5 는 localStorage 가 없는 환경(SSR·prerender)에서 persist 를 건너뛰고
   *   `.persist` 를 아예 붙이지 않아 next build 프리렌더가 전부 깨진다(2026-09-20 실측).
   */

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "admin") {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // 복원 대기 + 인증 확인 전 로딩
  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-warm-500">인증 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-warm-50">{children}</main>
      </div>
    </div>
  );
}
