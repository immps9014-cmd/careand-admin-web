"use client";

import { useState } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";

/**
 * 엑셀(.xlsx) 다운로드 공용 버튼 — 화면에 걸린 필터 그대로(2026-10-11, 결제 내역·정산).
 * 회원 다운로드와 같은 규칙: 슈퍼관리자만('exports' 영역), 사유 필수, 이름 마스킹, 감사로그(서버 /v1/admin/exports/*).
 */
export function ExportXlsxButton({
  endpoint,
  params,
  title,
  scopeLabel,
  fallbackName,
  placeholder,
  disabled,
}: {
  endpoint: string; // 예: /v1/admin/exports/payments
  params: Record<string, string | number | undefined>;
  title: string; // 창 제목
  scopeLabel?: string; // 「지금 화면의 … 그대로」 뒤 괄호 설명
  fallbackName: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const canExport = useAuth((s) => s.user?.admin_permissions?.exports?.read ?? false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!canExport) return null;

  const download = async () => {
    setBusy(true);
    try {
      const { page: _page, ...filters } = params; // 엑셀은 쪽 나눔 없이 전부
      const res = await api.get(endpoint, {
        params: filters,
        headers: { "X-Access-Reason": encodeURIComponent(reason.trim()) },
        responseType: "blob",
      });
      const name = /filename="([^"]+)"/.exec(res.headers["content-disposition"] ?? "")?.[1] ?? fallbackName;
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${title}을 내려받았습니다. 다운로드 기록이 남았습니다.`);
      setOpen(false);
      setReason("");
    } catch (e: unknown) {
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
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <FileSpreadsheet className="w-4 h-4" />
        엑셀 다운로드
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="export-pay-title">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between mb-2">
              <h2 id="export-pay-title" className="text-lg font-bold text-warm-800">{title}</h2>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="p-1 text-warm-500 hover:text-warm-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-warm-500 mb-1">
              지금 화면의 조건 그대로 전부 내려받습니다{scopeLabel ? ` (${scopeLabel})` : ""}.
            </p>
            <p className="text-xs text-warm-500 mb-4">
              사람 이름은 가려서 내려받고, 다운로드한 사람·시각·사유·건수가 감사로그에 남습니다.
            </p>
            <label htmlFor="export-pay-reason" className="text-xs font-semibold text-warm-700 block mb-1">다운로드 사유 (필수, 5자 이상)</label>
            <textarea id="export-pay-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300}
              placeholder={placeholder ?? "예: 10월 마감 확인"}
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
