"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, type LoginResponse, type TwoFactorChallenge } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/store";
import { getApiErrorMessage } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuth();

  const [email, setEmail] = useState("admin@careand.co.kr");
  const [password, setPassword] = useState("");
  // 2단계 인증(관리자 필수, 2026-09-28 S2) — 비밀번호가 맞으면 인증 앱 코드를 받는다
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState("");

  const finishLogin = (data: LoginResponse) => {
    // 관리자만 접근 허용
    if (data.user.role !== "admin") {
      toast.error("관리자 계정만 접속 가능합니다.");
      return;
    }
    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    toast.success(`${data.user.name} 님 환영합니다`);
    router.push("/dashboard");
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      return await authApi.login(email, password);
    },
    onSuccess: (data) => {
      if ("requires_2fa" in data && data.requires_2fa) {
        setChallenge(data);
        setCode("");
        return;
      }
      finishLogin(data as LoginResponse);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => authApi.verifyTwoFactor(challenge!.challenge_token, code),
    onSuccess: (data) => {
      if (challenge?.setup_required) toast.success("2단계 인증이 등록되었습니다");
      finishLogin(data);
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(getApiErrorMessage(error));
      setCode("");
      // 시간 초과·5회 실패면 처음부터 다시
      if (status === 401) setChallenge(null);
    },
  });

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-brand-50 to-warm-100 flex items-center justify-center p-4">
      {/* 공개 웹(/www)으로 돌아가기 — basePath(/admin) 바깥이라 일반 a 태그 */}
      <a
        href="/www"
        className="absolute top-4 left-4 inline-flex items-center gap-0.5 text-sm font-semibold text-warm-600 hover:text-brand-600"
        aria-label="Care& 홈으로 돌아가기"
      >
        ← 홈으로
      </a>
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl flex items-center justify-center font-en font-extrabold text-white text-3xl shadow-lg">
              C
            </div>
            <div>
              <div className="font-en font-extrabold text-2xl text-warm-800 tracking-tight leading-none">
                Care&
              </div>
              <div className="text-xs text-warm-500 mt-1.5">관리자 콘솔</div>
            </div>
          </div>
        </div>

        {challenge ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{challenge.setup_required ? "2단계 인증 등록" : "2단계 인증"}</CardTitle>
              <CardDescription>
                {challenge.setup_required
                  ? "관리자 계정은 2단계 인증이 필수입니다. 휴대폰 인증 앱(Google Authenticator, Microsoft Authenticator 등)에 등록한 뒤 표시되는 6자리 코드를 입력하세요."
                  : "휴대폰 인증 앱에 표시된 6자리 코드를 입력하세요."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {challenge.setup_required && (
                <div className="mb-5 space-y-3">
                  {challenge.qr_svg && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/svg+xml;utf8,${encodeURIComponent(challenge.qr_svg)}`}
                        alt="인증 앱 등록 QR 코드"
                        className="w-44 h-44 bg-white p-2 rounded-md border border-warm-200"
                      />
                    </div>
                  )}
                  <div className="rounded-md bg-warm-50 border border-warm-200 p-3">
                    <div className="text-xs font-semibold text-warm-600 mb-1">QR을 찍을 수 없으면 설정 키 직접 입력</div>
                    <div className="font-mono text-sm text-warm-800 break-all select-all">{challenge.secret}</div>
                  </div>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="otp-code" className="text-sm font-semibold text-warm-700 block mb-1.5">
                    인증 코드
                  </label>
                  <Input
                    id="otp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9 ]*"
                    maxLength={7}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="000000"
                    className="font-mono text-lg tracking-[0.4em] text-center"
                    autoFocus
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  className="w-full"
                  disabled={verifyMutation.isPending || code.length !== 6}
                >
                  {verifyMutation.isPending ? "확인 중..." : challenge.setup_required ? "등록하고 로그인" : "확인"}
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-warm-500 hover:text-warm-700"
                  onClick={() => setChallenge(null)}
                >
                  처음으로
                </button>
              </form>
            </CardContent>
          </Card>
        ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">관리자 로그인</CardTitle>
            <CardDescription>등록된 관리자 계정으로 로그인하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-semibold text-warm-700 block mb-1.5">
                  아이디
                </label>
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-warm-700 block mb-1.5">
                  비밀번호
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>
        )}

        <p className="text-center text-xs text-warm-500 mt-6">
          © 2026 Care&. All rights reserved. ·{" "}
          <a href="/www/privacy" target="_blank" rel="noopener" className="font-semibold text-warm-600 hover:text-brand-600">개인정보 처리방침</a>
        </p>
      </div>
    </div>
  );
}
