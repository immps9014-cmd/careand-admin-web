import { api, ApiResponse } from "./client";
import { User } from "@/lib/auth/store";

interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export const authApi = {
  /**
   * 관리자 로그인
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/v1/auth/login", {
      email,
      password,
    });
    return data;
  },

  /**
   * 내 정보 조회
   */
  async me(): Promise<{ user: User }> {
    const { data } = await api.get<{ success: boolean; user: User }>(
      "/v1/auth/me"
    );
    return { user: data.user };
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    await api.post("/v1/auth/logout").catch(() => {
      // 서버 오류 시에도 클라이언트 토큰은 삭제
    });
  },
};
