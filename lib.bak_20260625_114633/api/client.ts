import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { authStore } from "@/lib/auth/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Axios 인스턴스
 * - 모든 요청에 JWT Bearer 토큰 자동 첨부
 * - 401 시 토큰 자동 갱신 후 재시도
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// === Request: JWT 첨부 ===
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// === Response: 401 자동 갱신 ===
let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];

function processQueue(token: string) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/v1/auth/refresh" &&
      originalRequest.url !== "/v1/auth/login"
    ) {
      if (isRefreshing) {
        // 다른 요청이 갱신 중이면 큐 대기
        return new Promise((resolve) => {
          pendingQueue.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = authStore.getState().refreshToken;
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        const newToken = data.access_token;
        authStore.getState().setTokens(newToken, refreshToken);
        processQueue(newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // 갱신 실패 → 로그아웃
        authStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/admin/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Care& API 표준 응답 형식
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error_code?: string;
  meta?: {
    total?: number;
    current_page?: number;
    last_page?: number;
    per_page?: number;
    [key: string]: unknown;
  };
}

/**
 * API 에러 추출
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse | undefined;
    return data?.message || error.message || "알 수 없는 오류가 발생했습니다.";
  }
  return error instanceof Error ? error.message : "알 수 없는 오류";
}
