import { api, ApiResponse } from "./client";
import { User } from "@/lib/auth/store";

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** 관리자 로그인 1단계 응답 — 비밀번호가 맞으면 2단계 인증(TOTP)으로 넘어간다 (2026-09-28 S2) */
export interface TwoFactorChallenge {
  requires_2fa: true;
  setup_required: boolean;
  challenge_token: string;
  expires_in: number;
  /** 첫 등록 때만 — 인증 앱 설정 키·QR */
  secret?: string;
  otpauth_uri?: string;
  qr_svg?: string | null;
}

export const authApi = {
  /**
   * 관리자 로그인
   */
  async login(email: string, password: string): Promise<LoginResponse | TwoFactorChallenge> {
    const { data } = await api.post<LoginResponse | TwoFactorChallenge>("/v1/auth/login", {
      email,
      password,
    });
    return data;
  },

  /**
   * 관리자 2단계 인증 — 인증 앱 6자리 코드 확인 후 토큰 발급
   */
  async verifyTwoFactor(challengeToken: string, code: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/v1/auth/2fa/verify", {
      challenge_token: challengeToken,
      code,
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
