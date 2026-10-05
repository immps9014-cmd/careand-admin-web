"use client";

// CS — 보호자의 돌봄전문가 교체 요청·신고(2026-10-05). 접수 → 처리 중 → 처리 완료/반려, 답변을 남기면 보호자에게 알림.
// 실제 교체(남은 일정 재배정)는 매칭 관리에서 처리한다. 같은 돌봄전문가 누적 건수를 함께 보여 반복 여부를 판단하게 한다.
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { careIssueApi, type CareIssueRow } from "@/lib/api/cs";

const STATUS_TABS = [
  { key: "active", label: "처리 전" },
  { key: "all", label: "전체" },
  { key: "resolved", label: "처리 완료" },
  { key: "rejected", label: "반려" },
];
const STATUS_CLS: Record<string, string> = {
  open: "bg-danger-bg text-danger",
  in_progress: "bg-info-bg text-info",
  resolved: "bg-brand-50 text-brand-700",
  rejected: "bg-warm-100 text-warm-600",
};
const kst = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).slice(5);

export function CareIssuesTab() {
  const [status, setStatus] = useState("active");
  const [kind, setKind] = useState("");
  const q = useQuery({ queryKey: ["admin", "care-issues", status, kind], queryFn: () => careIssueApi.list({ status, ...(kind ? { kind } : {}) }) });
  const d = q.data;

  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        보호자가 매칭된 요청 화면에서 남긴 교체 요청·신고입니다. 보호자에게 연락해 확인하고, 교체는 매칭 관리에서 남은 일정을 다른 돌봄전문가로 바꾼 뒤 「처리 완료」와 답변을 남기세요.
        답변을 저장하면 보호자에게 알림이 갑니다. 돌봄전문가에게는 누가 남겼는지 알리지 마세요.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1" role="tablist" aria-label="처리 상태">
          {STATUS_TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={status === t.key} onClick={() => setStatus(t.key)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border",
                status === t.key ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")}>
              {t.label}{t.key === "active" && d ? ` ${d.summary.open + d.summary.in_progress}` : ""}
            </button>
          ))}
        </div>
        <select aria-label="종류" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-lg border border-warm-200 px-2 text-sm">
          <option value="">교체·신고 모두</option><option value="replace">교체 요청</option><option value="report">신고</option>
        </select>
      </div>
      {q.isLoading && <Card><CardContent className="p-8 text-center text-sm text-warm-500">불러오는 중…</CardContent></Card>}
      {q.isError && <Card><CardContent className="p-6 text-sm text-warm-600">{getApiErrorMessage(q.error)}</CardContent></Card>}
      {d && d.issues.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-warm-500">{status === "active" ? "처리할 교체 요청·신고가 없습니다." : "내역이 없습니다."}</CardContent></Card>}
      <div className="space-y-3">
        {d?.issues.map((i) => <IssueCard key={i.id} i={i} statuses={d.statuses} />)}
      </div>
    </>
  );
}

function IssueCard({ i, statuses }: { i: CareIssueRow; statuses: Record<string, string> }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState(i.admin_reply ?? "");
  const [next, setNext] = useState<string>(i.status === "open" ? "in_progress" : i.status);
  const save = useMutation({
    mutationFn: () => careIssueApi.handle(i.id, { status: next, ...(reply.trim() ? { reply: reply.trim() } : {}) }),
    onSuccess: (r) => { toast.success(r.message ?? "저장했어요."); qc.invalidateQueries({ queryKey: ["admin", "care-issues"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const needReply = (next === "resolved" || next === "rejected") && !reply.trim();
  return (
    <Card className={cn(i.status === "open" && "border-danger/30")}>
      <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", STATUS_CLS[i.status])}>{i.status_label}</span>
            <span className={cn("font-bold", i.kind === "report" ? "text-danger" : "text-warm-800")}>{i.kind_label}</span>
            <span className="text-warm-600">· {i.category_label}</span>
            <span className="text-xs text-warm-500 tabular-nums">{kst(i.created_at)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-warm-800">{i.detail}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-warm-600">
            <dt className="text-warm-500">보호자</dt><dd>{i.reporter_name} <span className="font-en tabular-nums select-all">{i.reporter_phone ?? ""}</span></dd>
            <dt className="text-warm-500">돌봄전문가</dt>
            <dd>{i.caregiver_name}{i.caregiver_issue_count > 1 && <b className="ml-1 text-danger">누적 {i.caregiver_issue_count}건</b>}</dd>
            <dt className="text-warm-500">요청</dt>
            <dd><Link href={`/matching?request=${i.request_id}`} className="text-brand-700 hover:underline">#{i.request_id}</Link> · {i.service_label}</dd>
            {i.handled_by_name && (<><dt className="text-warm-500">처리</dt><dd>{i.handled_by_name}{i.handled_at ? ` · ${kst(i.handled_at)}` : ""}</dd></>)}
          </dl>
        </div>
        <form className="grid gap-2 content-start" aria-label={`#${i.id} 처리`} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <select aria-label="처리 상태" value={next} onChange={(e) => setNext(e.target.value)} className="h-9 rounded-lg border border-warm-200 px-2 text-sm">
            {Object.entries(statuses).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <textarea aria-label="보호자에게 보낼 답변" value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={2000}
            placeholder="보호자에게 보낼 답변(처리 완료·반려는 필수)" className="rounded-lg border border-warm-200 px-3 py-2 text-sm" />
          <Button type="submit" size="sm" disabled={save.isPending || needReply}>{save.isPending ? "저장 중…" : "저장"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
