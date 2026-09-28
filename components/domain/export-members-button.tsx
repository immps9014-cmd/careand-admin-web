"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";

/**
 * 회원 CSV 다운로드 — 슈퍼관리자 전용, 다운로드 사유 필수, 이름·이메일·휴대폰 마스킹
 * (사업계획서 3.3 · 기능 19, 2026-09-28 구현계획 S2-5). 사유와 건수는 서버 감사로그에 남는다.
 */
export function ExportMembersButton() {
  const canExport = useAuth((s) => s.user?.admin_permissions?.exports?.read ?? false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  if (!canExport) return null;

  const download = async () => {
    setBusy(true);
    try {
      const res = await api.get("/v1/admin/exports/members", {
        params: role ? { role } : {},
        headers: { "X-Access-Reason": encodeURIComponent(reason.trim()) },
        responseType: "blob",
      });
      const name = /filename="([^"]+)"/.exec(res.headers["content-disposition"] ?? "")?.[1] ?? "careand_members.csv";
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("마스킹된 회원 목록을 내려받았습니다. 다운로드 기록이 남았습니다.");
      setOpen(false);
      setReason("");
    } catch (e: unknown) {
      // blob 응답의 오류 본문은 JSON 텍스트 — 메시지를 꺼내 보여 준다
      const data = (e as { response?: { data?: Blob } })?.response?.data;
      if (data instanceof Blob) {
        try { toast.error(JSON.parse(await data.text()).message); } catch { toast.error("다운로드에 실패했습니다."); }
      } else {
        toast.error(getApiErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="md" onClick={() => setOpen(true)}>
        <Download className="w-4 h-4" />
        CSV 다운로드
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="export-title">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between mb-2">
              <h2 id="export-title" className="text-lg font-bold text-warm-800">회원 목록 다운로드</h2>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="p-1 text-warm-500 hover:text-warm-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-warm-500 mb-4">
              이름·이메일·휴대폰은 가려서 내려받습니다. 다운로드한 사람·시각·사유·건수가 감사로그에 남습니다.
            </p>
            <label htmlFor="export-role" className="text-xs font-semibold text-warm-700 block mb-1">대상</label>
            <select id="export-role" value={role} onChange={(e) => setRole(e.target.value)}
              className="mb-3 h-10 w-full rounded-md border border-warm-200 bg-white px-2 text-sm">
              <option value="">전체(보호자·돌봄전문가·기관)</option>
              <option value="guardian">보호자</option>
              <option value="caregiver">돌봄전문가</option>
              <option value="organization">기관</option>
            </select>
            <label htmlFor="export-reason" className="text-xs font-semibold text-warm-700 block mb-1">다운로드 사유 (필수, 5자 이상)</label>
            <textarea id="export-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300}
              placeholder="예: 10월 정기 회원 현황 보고"
              className="w-full rounded-md border border-warm-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button variant="brand" disabled={busy || reason.trim().length < 5} onClick={download}>
                {busy ? "내려받는 중..." : "내려받기"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
