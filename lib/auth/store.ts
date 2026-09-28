import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "guardian" | "caregiver" | "organization" | "admin";
  status: string;
  admin?: {
    /** 권한 5단계(S2-3): 슈퍼관리자·지점장·CS 담당자·데이터 분석가·개발자 */
    permission_level: "super" | "branch" | "cs" | "analyst" | "developer";
    department: string | null;
  };
  /** 영역별 권한 — 메뉴 표시용(실제 차단은 서버). 로그인·내 정보 응답에 포함 */
  admin_permissions?: Record<string, { read: boolean; write: boolean }>;
  admin_level_label?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** persist 복원 완료 여부 — 이게 true 가 되기 전에는 인증 판정을 하면 안 된다 */
  hasHydrated: boolean;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setHasHydrated: (v: boolean) => void;
  logout: () => void;
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "careand-admin-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // persist 복원 완료 후에만 인증 판정을 하도록 플래그 세팅
        // (member-web lib/auth/store.ts 와 같은 패턴 — 두 앱의 가드 방식을 맞춘다)
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * React 훅 (컴포넌트 내부 사용)
 */
export const useAuth = authStore;
