"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminsApi, type AdminAccount, type AdminLevel } from "@/lib/api/admins";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";

/**
 * 관리자 계정·권한 — 슈퍼관리자 전용 (사업계획서 3.3 RBAC 5단계, 2026-09-28 S2-3).
 * 등급별 허용 영역 표는 서버 config/admin_rbac.php 를 그대로 보여 준다(화면과 서버 규칙이 어긋나지 않게).
 */
const LEVEL_ORDER: AdminLevel[] = ["super", "branch", "cs", "analyst", "developer"];

export default function AdminsPage() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const q = useQuery({ queryKey: ["admin", "admins"], queryFn: adminsApi.list });
  const levels = q.data?.levels;
  // 서버가 2단계 인증을 끈 상태(ADMIN_2FA_REQUIRED=false)면 관련 열·버튼·안내를 숨긴다. 응답 전엔 숨김.
  const mfa = q.data?.two_factor_required === true;

  const [form, setForm] = useState({ email: "", name: "", phone: "", password: "", permission_level: "cs" as AdminLevel, department: "" });
  const [resetTarget, setResetTarget] = useState<AdminAccount | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "admins"] });
  const createM = useMutation({
    mutationFn: () => adminsApi.create({ ...form, department: form.department || undefined }),
    onSuccess: () => {
      toast.success(mfa ? "관리자 계정을 만들었습니다. 첫 로그인 때 2단계 인증을 등록합니다." : "관리자 계정을 만들었습니다. 아이디와 비밀번호로 로그인합니다.");
      setForm({ email: "", name: "", phone: "", password: "", permission_level: "cs", department: "" });
      refresh();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const updateM = useMutation({
    mutationFn: (v: { id: number; payload: Parameters<typeof adminsApi.update>[1] }) => adminsApi.update(v.id, v.payload),
    onSuccess: () => { toast.success("변경했습니다. 대상자가 다시 로그인하면 적용됩니다."); refresh(); },
    onError: (e) => { toast.error(getApiErrorMessage(e)); refresh(); },
  });
  const resetM = useMutation({
    mutationFn: (id: number) => adminsApi.resetTwoFactor(id),
    onSuccess: () => { toast.success("2단계 인증을 초기화했습니다."); setResetTarget(null); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const areas = Object.entries(q.data?.areas ?? {});

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">관리자 계정 · 권한</h1>
        <p className="text-sm text-warm-500 mt-1">관리자 계정을 만들고 권한 5단계(슈퍼관리자 · 지점장 · CS 담당자 · 데이터 분석가 · 개발자)를 지정합니다. 모든 변경은 감사로그에 남습니다.</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름 · 아이디</TableHead>
                <TableHead>권한 등급</TableHead>
                <TableHead>부서</TableHead>
                {mfa && <TableHead>2단계 인증</TableHead>}
                <TableHead>상태</TableHead>
                {mfa && <TableHead className="text-right">관리</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && (
                <TableRow><TableCell colSpan={mfa ? 6 : 4} className="text-center text-warm-500 py-8">불러오는 중…</TableCell></TableRow>
              )}
              {(q.data?.data ?? []).map((a) => {
                const isMe = a.user_id === me?.id;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-semibold text-warm-800">{a.name}{isMe && <span className="ml-1.5 text-[11px] text-brand-600">(나)</span>}</div>
                      <div className="text-xs text-warm-500">{a.email}</div>
                    </TableCell>
                    <TableCell>
                      <label htmlFor={`lv-${a.id}`} className="sr-only">{a.name} 권한 등급</label>
                      <select
                        id={`lv-${a.id}`}
                        className="h-9 rounded-md border border-warm-200 bg-white px-2 text-sm"
                        value={a.permission_level}
                        disabled={updateM.isPending}
                        onChange={(e) => updateM.mutate({ id: a.id, payload: { permission_level: e.target.value as AdminLevel } })}
                      >
                        {LEVEL_ORDER.map((l) => <option key={l} value={l}>{levels?.[l] ?? l}</option>)}
                      </select>
                    </TableCell>
                    <TableCell className="text-sm text-warm-700">{a.department ?? "—"}</TableCell>
                    {mfa && (
                      <TableCell>
                        {a.two_factor
                          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">등록됨</span>
                          : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warn-bg text-warn">첫 로그인 때 등록</span>}
                      </TableCell>
                    )}
                    <TableCell>
                      <button
                        type="button"
                        className="text-xs font-semibold text-warm-600 hover:text-warm-800 underline-offset-2 hover:underline disabled:opacity-40"
                        disabled={isMe || updateM.isPending}
                        onClick={() => updateM.mutate({ id: a.id, payload: { status: a.status === "active" ? "suspended" : "active" } })}
                        title={isMe ? "내 계정은 정지할 수 없습니다" : undefined}
                      >
                        {a.status === "active" ? "활성 · 정지하기" : "정지됨 · 활성화"}
                      </button>
                    </TableCell>
                    {mfa && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" disabled={!a.two_factor} onClick={() => setResetTarget(a)}>
                          2단계 인증 초기화
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-bold text-warm-800 mb-1">관리자 계정 추가</h2>
            <p className="text-xs text-warm-500 mb-4">
              {mfa ? "임시 비밀번호를 전달하면, 첫 로그인 때 인증 앱을 등록해야 접속됩니다." : "아이디와 비밀번호를 전달하면 바로 로그인할 수 있습니다."}
            </p>
            <form
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              onSubmit={(e) => { e.preventDefault(); createM.mutate(); }}
            >
              {([
                ["email", "아이디(이메일)", "text", "username"],
                ["name", "이름", "text", "name"],
                ["phone", "휴대폰", "tel", "tel"],
                ["password", "임시 비밀번호(10자 이상)", "password", "new-password"],
                ["department", "부서(선택)", "text", "off"],
              ] as const).map(([k, label, type, ac]) => (
                <div key={k}>
                  <label htmlFor={`new-${k}`} className="text-xs font-semibold text-warm-700 block mb-1">{label}</label>
                  <Input
                    id={`new-${k}`}
                    type={type}
                    autoComplete={ac}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    required={k !== "department"}
                    minLength={k === "password" ? 10 : undefined}
                  />
                </div>
              ))}
              <div>
                <label htmlFor="new-level" className="text-xs font-semibold text-warm-700 block mb-1">권한 등급</label>
                <select
                  id="new-level"
                  className="h-10 w-full rounded-md border border-warm-200 bg-white px-2 text-sm"
                  value={form.permission_level}
                  onChange={(e) => setForm({ ...form, permission_level: e.target.value as AdminLevel })}
                >
                  {LEVEL_ORDER.map((l) => <option key={l} value={l}>{levels?.[l] ?? l}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="brand" disabled={createM.isPending}>
                  {createM.isPending ? "만드는 중..." : "계정 만들기"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-bold text-warm-800 mb-1">등급별 허용 영역</h2>
            <p className="text-xs text-warm-500 mb-4">조회 = 목록·상세 보기, 변경 = 승인·수정·발송 등. 서버 규칙(config/admin_rbac.php)을 그대로 표시합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-warm-500">
                    <th className="text-left font-semibold py-1.5 pr-2">영역</th>
                    {LEVEL_ORDER.map((l) => <th key={l} className="font-semibold py-1.5 px-1 whitespace-nowrap">{levels?.[l] ?? l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {areas.map(([key, a]) => (
                    <tr key={key} className="border-t border-warm-100">
                      <td className="py-1.5 pr-2 text-warm-700">{a.label}</td>
                      {LEVEL_ORDER.map((l) => {
                        const w = a.write.includes(l), r = a.read.includes(l);
                        return (
                          <td key={l} className="text-center py-1.5 px-1">
                            {w ? <span className="font-semibold text-brand-700">변경</span> : r ? <span className="text-warm-600">조회</span> : <span className="text-warm-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={resetTarget !== null}
        onOpenChange={(o) => { if (!o) setResetTarget(null); }}
        onConfirm={() => resetTarget && resetM.mutate(resetTarget.id)}
        title="2단계 인증 초기화"
        description="휴대폰 분실·교체 때 사용합니다. 대상자는 다음 로그인 때 인증 앱을 다시 등록해야 합니다."
        target={resetTarget ? `${resetTarget.name} (${resetTarget.email})` : undefined}
        reversible
        reverseHint="대상자가 다시 로그인해 새로 등록하면 됩니다."
        confirmLabel="초기화"
        tone="danger"
        loading={resetM.isPending}
      />
    </div>
  );
}
