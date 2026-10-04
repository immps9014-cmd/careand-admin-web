"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, FileCheck2, Landmark, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { operationsApi, type CgDocStatus } from "@/lib/api/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * 돌봄전문가 제출 서류 검토 (기능 20, 2026-09-28 S5)
 * 원본은 열람 사유를 입력해야 열리고(감사로그), 새 탭에서 blob 으로만 보여 준다(서버에 캐시 안 남김).
 */
const STATUS: Record<CgDocStatus, { label: string; cls: string }> = {
  missing: { label: "미제출", cls: "bg-warm-100 text-warm-600" },
  submitted: { label: "검토 대기", cls: "bg-warn-bg text-warn" },
  verified: { label: "확인 완료", cls: "bg-brand-50 text-brand-700" },
  rejected: { label: "반려", cls: "bg-danger-bg text-danger" },
  expired: { label: "기간 만료", cls: "bg-danger-bg text-danger" },
};

export function CaregiverDocumentsPanel({ caregiverId }: { caregiverId: number }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "caregiver-docs", caregiverId],
    queryFn: () => operationsApi.caregiverDocuments(caregiverId),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "caregiver-docs", caregiverId] });
    qc.invalidateQueries({ queryKey: ["admin", "caregivers"] });
  };

  const verify = useMutation({
    mutationFn: (docId: number) => operationsApi.verifyCaregiverDocument(caregiverId, docId),
    onSuccess: () => { toast.success("확인 완료로 처리했습니다."); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const reject = useMutation({
    mutationFn: ({ docId, reason }: { docId: number; reason: string }) =>
      operationsApi.rejectCaregiverDocument(caregiverId, docId, reason),
    onSuccess: () => { toast.success("반려하고 돌봄전문가에게 알림을 보냈습니다."); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  async function view(docId: number) {
    const reason = window.prompt("열람 사유를 입력하세요 (5자 이상, 감사로그에 남습니다)", "자격 심사 서류 확인");
    if (!reason || reason.trim().length < 5) {
      if (reason != null) toast.error("열람 사유를 5자 이상 입력해 주세요.");
      return;
    }
    const win = window.open("", "_blank");
    try {
      const blob = await operationsApi.caregiverDocumentFile(caregiverId, docId, reason.trim());
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      toast.error(getApiErrorMessage(e));
    }
  }

  if (q.isLoading) return <div className="text-xs text-warm-500">서류 불러오는 중…</div>;
  if (q.isError || !q.data) return <div className="text-xs text-danger">서류 정보를 불러오지 못했습니다.</div>;
  const d = q.data;

  return (
    <div className="border border-warm-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileCheck2 className="w-4 h-4 text-brand-600" />
        <span className="text-[13px] font-bold text-warm-800">제출 서류</span>
        {d.missing_required.length > 0 ? (
          <span className="ml-auto text-[11px] font-bold text-danger">
            미확인 필수: {d.missing_required.join(", ")}
            {d.enforce_on_approve ? " — 승인 불가" : ""}
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-brand-700">
            <CheckCircle2 className="w-3.5 h-3.5" />필수 서류 확인 완료
          </span>
        )}
      </div>
      <div className="divide-y divide-warm-100">
        {d.checklist.map((c) => {
          const st = STATUS[c.status];
          const doc = c.document;
          return (
            <div key={c.type} className="py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-warm-800">
                  {c.label}
                  {c.required && <span className="ml-1 text-[10.5px] text-danger">필수</span>}
                  {c.public && <span className="ml-1 text-[10.5px] text-brand-600">이용자 공개</span>}
                </div>
                <div className="text-[11px] text-warm-500 truncate">
                  {doc
                    ? `${doc.original_name ?? "파일"} · ${Math.round(doc.size_bytes / 1024)}KB · 제출 ${doc.created_at?.slice(0, 10)}${doc.expires_at ? ` · ${doc.expires_at}까지` : ""}`
                    : "제출 전"}
                  {c.status === "rejected" && doc?.reject_reason ? ` · 반려: ${doc.reject_reason}` : ""}
                </div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", st.cls)}>{st.label}</span>
              {doc && (
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => view(doc.id)} aria-label={`${c.label} 열람`}>
                    <Eye className="w-3.5 h-3.5" />열람
                  </Button>
                  {c.status !== "verified" && (
                    <Button variant="brand" size="sm" disabled={verify.isPending} onClick={() => verify.mutate(doc.id)}>
                      확인
                    </Button>
                  )}
                  {c.status !== "rejected" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reject.isPending}
                      onClick={() => {
                        const reason = window.prompt(`${c.label} 반려 사유 (돌봄전문가에게 전달됩니다)`);
                        if (reason && reason.trim().length >= 2) reject.mutate({ docId: doc.id, reason: reason.trim() });
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5" />반려
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-warm-50 px-3 py-2 text-[12px] text-warm-600">
        <Landmark className="w-3.5 h-3.5 text-warm-500" />
        정산 계좌:{" "}
        {d.payout.bank_account_masked ? (
          <span className="font-en">{d.payout.bank_name} {d.payout.bank_account_masked} ({d.payout.bank_holder})</span>
        ) : (
          <span className="text-danger font-semibold">미등록</span>
        )}
      </div>
    </div>
  );
}
