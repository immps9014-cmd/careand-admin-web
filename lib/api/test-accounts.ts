import { api } from "./client";

/** 테스트 계정 아이디·비밀번호 (슈퍼관리자 전용) — 서버가 조회 때마다 실제 비밀번호와 맞춰 본 계정만 준다 */
export interface TestAccount {
  id: number;
  email: string;
  name: string;
  role: "admin" | "guardian" | "caregiver" | "organization" | string;
  status: string;
  password: string;
  note: string | null;
}

export interface TestAccountResponse {
  data: TestAccount[];
  /** 파일의 비밀번호와 맞지 않아 목록에서 뺀 계정 */
  mismatched: string[];
  checked_at: string | null;
}

export const testAccountsApi = {
  async list(): Promise<TestAccountResponse> {
    const { data } = await api.get<TestAccountResponse>("/v1/admin/test-accounts");
    return data;
  },
};
