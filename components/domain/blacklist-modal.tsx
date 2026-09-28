"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

/**
 * 회원 블랙리스트 (기능 19, 2026-09-29) — 등록된 회원은 계정 정지 + 같은 휴대폰 번호 재가입 차단.
 * 등록은 회원 목록의 ⋮ 메뉴에서, 해제는 여기서(사유 필수·감사로그).
 */
type Row = { id: number; user_id: number | null; name: string | null; role: string | null; reason: string; created_at: string; created_by_name: string | null; released_at: string | null; release_reason: string | null };

export const blacklistApi = {
  add: (userId: number, reason: string) => api.post("/v1/admin/blacklist", { user_id: userId, reason }),
  release: (id: number, reason: string) => api.post(`/v1/admin/blacklist/${id}/release`, { reason }),
  async list(all: boolean): Promise<Row[]> {
    const { data } = await api.get("/v1/admin/blacklist", { params: all ? { all: 1 } : {} });
    return data.data ?? [];
  },
};

export function BlacklistModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "blacklist"], queryFn: () => blacklistApi.list(true) });
  const release = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => blacklistApi.release(id, reason),
    onSuccess: (r) => { toast.success(r.data?.message ?? "해제했습니다."); qc.invalidateQueries({ queryKey: ["admin", "blacklist"] }); qc.invalidateQueries({ queryKey: ["admin", "members"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const ROLE: Record<string, string> = { guardian: "보호자", caregiver: "돌봄전문가", organization: "기관" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-warm-900/40" />
      <div role="dialog" aria-modal="true" aria-label="블랙리스트" className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-warm-200 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-warm-100 bg-white px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-warm-800"><Ban className="h-4 w-4 text-danger" />블랙리스트</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-md p-2 text-warm-500 hover:bg-warm-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">
          <p className="mb-3 text-xs text-warm-500">등록된 회원은 계정이 정지되고 같은 휴대폰 번호로 다시 가입할 수 없습니다. 등록은 회원 목록의 ⋮ 메뉴에서 합니다.</p>
          {q.isLoading && <div className="py-8 text-center text-sm text-warm-500">불러오는 중…</div>}
          {q.data?.length === 0 && <div className="py-8 text-center text-sm text-warm-500">블랙리스트가 비어 있습니다.</div>}
          <div className="space-y-2">
            {q.data?.map((r) => (
              <div key={r.id} className="rounded-lg border border-warm-100 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-warm-800">{r.name ?? "(탈퇴 회원)"}</span>
                  <span className="text-xs text-warm-500">{ROLE[r.role ?? ""] ?? r.role}</span>
                  <span className="ml-auto text-xs text-warm-500">{formatDateTime(r.created_at)} · {r.created_by_name ?? "-"}</span>
                </div>
                <p className="mt-1 text-warm-700">{r.reason}</p>
                {r.released_at ? (
                  <p className="mt-1 text-xs text-brand-700">해제됨 {formatDateTime(r.released_at)} — {r.release_reason}</p>
                ) : (
                  <Button size="sm" variant="outline" className="mt-2" disabled={release.isPending}
                    onClick={() => { const t = window.prompt("해제 사유"); if (t && t.trim().length >= 2) release.mutate({ id: r.id, reason: t.trim() }); }}>해제</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
