"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { testAccountsApi, type TestAccount } from "@/lib/api/test-accounts";
import { getApiErrorMessage } from "@/lib/api/client";

/**
 * 테스트 계정 아이디·비밀번호 — 슈퍼관리자 전용 (2026-09-29).
 * 비밀번호는 서버 전용 파일에서 오고, 서버가 실제 해시와 맞춰 본 계정만 내려준다. 조회할 때마다 감사로그가 남는다.
 */
const ROLE_KO: Record<string, string> = { admin: "관리자", guardian: "보호자", caregiver: "돌봄전문가", organization: "기관" };
const ROLE_ORDER = ["admin", "guardian", "caregiver", "organization"];

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what}를 복사했습니다.`);
  } catch {
    toast.error("복사하지 못했습니다. 직접 선택해 복사해 주세요.");
  }
}

export default function TestAccountsPage() {
  const q = useQuery({ queryKey: ["admin", "test-accounts"], queryFn: testAccountsApi.list, staleTime: 60_000 });
  const [role, setRole] = useState<string>("all");
  const [shown, setShown] = useState<Set<number>>(new Set());

  const rows = q.data?.data ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.role] = (c[r.role] ?? 0) + 1; });
    return c;
  }, [rows]);
  const tabs = ["all", ...ROLE_ORDER.filter((r) => counts[r])];
  const list = role === "all" ? rows : rows.filter((r) => r.role === role);

  const toggle = (a: TestAccount) =>
    setShown((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; });

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">테스트 계정</h1>
        <p className="text-sm text-warm-500 mt-1">
          시연·점검용 계정의 아이디와 비밀번호입니다. 슈퍼관리자만 볼 수 있고, 열람할 때마다 감사로그에 남습니다.
          비밀번호가 실제와 맞는 계정만 표시합니다.
        </p>
      </div>

      {q.isError && (
        <Card className="mb-6"><CardContent className="p-6 text-sm text-warm-700">{getApiErrorMessage(q.error)}</CardContent></Card>
      )}

      {!q.isError && (
        <>
          <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="역할">
            {tabs.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={role === t}
                onClick={() => setRole(t)}
                className={
                  "h-9 px-3 rounded-full text-sm font-semibold border transition-colors " +
                  (role === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")
                }
              >
                {t === "all" ? "전체" : ROLE_KO[t] ?? t} {t === "all" ? rows.length : counts[t]}
              </button>
            ))}
          </div>

          <Card className="mb-4">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>역할</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>아이디</TableHead>
                    <TableHead>비밀번호</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.isLoading && (
                    <TableRow><TableCell colSpan={6} className="text-center text-warm-500 py-8">비밀번호를 확인하는 중… (처음엔 몇 초 걸립니다)</TableCell></TableRow>
                  )}
                  {!q.isLoading && list.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-warm-500 py-8">표시할 계정이 없습니다.</TableCell></TableRow>
                  )}
                  {list.map((a) => {
                    const open = shown.has(a.id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm text-warm-700 whitespace-nowrap">{ROLE_KO[a.role] ?? a.role}</TableCell>
                        <TableCell className="text-sm font-semibold text-warm-800 whitespace-nowrap">{a.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-sm text-warm-800">{a.email}</span>
                            <button onClick={() => copy(a.email, "아이디")} aria-label={`${a.email} 아이디 복사`}
                              className="p-1.5 rounded text-warm-500 hover:text-warm-800 hover:bg-warm-100"><Copy className="h-3.5 w-3.5" /></button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-sm text-warm-800 min-w-[6.5rem]">{open ? a.password : "••••••••"}</span>
                            <button onClick={() => toggle(a)} aria-label={open ? "비밀번호 숨기기" : "비밀번호 보기"}
                              className="p-1.5 rounded text-warm-500 hover:text-warm-800 hover:bg-warm-100">
                              {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => copy(a.password, "비밀번호")} aria-label={`${a.email} 비밀번호 복사`}
                              className="p-1.5 rounded text-warm-500 hover:text-warm-800 hover:bg-warm-100"><Copy className="h-3.5 w-3.5" /></button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {a.status === "active"
                            ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-brand-50 text-brand-700">사용 중</span>
                            : <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-warn-bg text-warn">{a.status === "suspended" ? "정지" : a.status}</span>}
                        </TableCell>
                        <TableCell className="text-sm text-warm-600">{a.note ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(q.data?.mismatched.length ?? 0) > 0 && (
            <p className="text-xs text-warm-500">
              비밀번호가 바뀌어 목록에서 뺀 계정: {q.data!.mismatched.join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
