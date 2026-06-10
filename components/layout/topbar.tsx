"use client";

import { Bell, LogOut, Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/store";
import { authApi } from "@/lib/api/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-warm-200 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* 검색 */}
      <div className="relative w-96 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-500 pointer-events-none" />
        <Input
          placeholder="회원, 매칭 ID, 결제 검색..."
          className="pl-10 bg-warm-100 border-warm-200 placeholder:text-warm-500"
        />
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="relative bg-warm-100 border border-warm-200 text-warm-700 hover:bg-warm-200 rounded-md"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-warm-100" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="bg-warm-100 border border-warm-200 text-warm-700 hover:bg-warm-200 rounded-md"
        >
          <Settings className="w-[18px] h-[18px]" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-warm-600 hover:text-danger hover:bg-danger-bg"
        >
          <LogOut className="w-4 h-4" />
          <span className="ml-1">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
