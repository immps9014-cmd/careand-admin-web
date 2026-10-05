"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Lock, PhoneCall } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { epdsApi, type EpdsClientDetail, type EpdsHistoryRow } from "@/lib/api/epds";
import { RiskPill, ScoreBar } from "@/components/domain/mnh-epds";

/**
 * 산모별 산후우울 검사 이력(2026-10-05). 문항별 응답은 민감정보 — 열람 사유를 적어야 불러오고, 사유는 감사로그에 남는다.
 * 사유와 내용은 이 화면 안에서만 들고 있다(새로 고침하면 다시 묻는다).
 */
export default function EpdsClientPageWrapper() {
  return (
    <Suspense fallback={null}>
      <EpdsClientPage />
    </Suspense>
  );
}

const REASONS = ["고위험 알림 확인 후 연락", "후속 조치 기록", "상담 연결 준비"];

function EpdsClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const focus = Number(useSearchParams().get("a")) || null;
  const [reason, setReason] = useState("");
  const [data, setData] = useState<EpdsClientDetail | null>(null);
  const load = useMutation({
    mutationFn: (r: string) => epdsApi.client(Number(clientId), r),
    onSuccess: (r) => setData(r.data),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/mnh?tab=epds" className="inline-flex items-center gap-1 text-sm text-warm-600 hover:text-warm-800 mb-4"><ArrowLeft className="w-4 h-4" />산후우울 검사 목록</Link>

      {!data ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-warm-600" /><h1 className="text-lg font-bold text-warm-800">열람 사유를 적어 주세요</h1></div>
            <p className="text-sm text-warm-600 mb-4">산후우울 검사의 문항별 응답은 정신건강 민감정보예요. 사유와 열람 기록은 감사로그에 남습니다.</p>
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (reason.trim().length >= 5) load.mutate(reason.trim()); }}>
              <div className="flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <button key={r} type="button" onClick={() => setReason(r)}
                    className={cn("px-3 py-1.5 rounded-full border text-sm", reason === r ? "bg-warm-800 text-white border-warm-800" : "bg-white border-warm-200 text-warm-700 hover:bg-warm-50")}>{r}</button>
                ))}
              </div>
              <label htmlFor="epds-reason" className="text-xs font-semibold text-warm-600">사유(5자 이상)</label>
              <Input id="epds-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="예: 고위험 알림 확인 후 연락" />
              <Button type="submit" className="self-start" disabled={load.isPending || reason.trim().length < 5}>결과 보기</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Detail data={data} focus={focus} onChange={(row) => setData({ ...data, history: data.history.map((h) => (h.id === row.id ? { ...h, ...row } : h)) })} />
      )}
    </div>
  );
}

function Detail({ data, focus, onChange }: { data: EpdsClientDetail; focus: number | null; onChange: (r: Partial<EpdsHistoryRow> & { id: number }) => void }) {
  const c = data.client;
  const anyAlert = data.history.some((h) => h.needs_action && (h.self_harm || h.risk_level === "critical"));
  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">{c.name} 님 · 산후우울 검사</h1>
        <p className="text-sm text-warm-500 mt-1">
          {c.delivery_date ? `출산(예정)일 ${c.delivery_date}` : "출산일 미입력"}
          {data.contract && <> · 바우처 <Link className="text-brand-700 hover:underline" href={`/mnh/${data.contract.id}`}>{data.contract.contract_no}</Link>{data.contract.caregiver_name ? ` (담당 ${data.contract.caregiver_name})` : ""}</>}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <Card><CardContent className="p-4">
          <p className="text-xs font-semibold text-warm-500 mb-1">연락처(신청 회원)</p>
          <p className="font-semibold text-warm-800">{c.guardian?.name ?? "-"}</p>
          <p className="font-en tabular-nums text-warm-800 select-all">{c.guardian?.phone ?? "번호 없음"}</p>
        </CardContent></Card>
        <Card className={cn(anyAlert && "border-danger/40 bg-danger-bg")}><CardContent className="p-4">
          <p className="text-xs font-semibold text-warm-500 mb-1 flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5" />위기 연락처(산모 안내용)</p>
          <ul className="text-sm text-warm-800 space-y-0.5">
            {data.crisis_contacts.map((x) => <li key={x.number}>{x.label} <b className="font-en select-all">{x.number}</b></li>)}
          </ul>
        </CardContent></Card>
      </div>

      <div className="space-y-4">
        {data.history.map((h, i) => (
          <HistoryCard key={h.id} h={h} prev={data.history[i + 1]?.total ?? null} period={data.period} followups={data.followups}
            open={focus ? h.id === focus : i === 0} onChange={onChange} />
        ))}
      </div>
    </>
  );
}

function HistoryCard({ h, prev, period, followups, open: initialOpen, onChange }: {
  h: EpdsHistoryRow; prev: number | null; period: string; followups: Record<string, string>; open: boolean; onChange: (r: Partial<EpdsHistoryRow> & { id: number }) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [status, setStatus] = useState(h.followup_status ?? "contacted");
  const [note, setNote] = useState(h.followup_note ?? "");
  const save = useMutation({
    mutationFn: () => epdsApi.followup(h.id, { status, note: note.trim() || undefined }),
    onSuccess: (r) => { toast.success(r.message ?? "기록했어요."); onChange(r.data); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Card className={cn(h.needs_action && "border-danger/40")}>
      <CardContent className="p-0">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4 text-left hover:bg-warm-50 rounded-xl">
          <span className="font-semibold text-warm-800 w-24">{h.date}</span>
          <RiskPill row={h} />
          {h.self_harm && <span className="text-xs font-bold text-danger">자해 생각 응답</span>}
          <span className="font-en font-bold tabular-nums">{h.total}<span className="text-warm-500 font-normal text-xs">/30</span></span>
          <ScoreBar total={h.total} />
          {prev != null && <span className="text-xs text-warm-500">지난번 {prev}점</span>}
          <span className="ml-auto text-xs">
            {h.followup_label ? <span className="font-semibold text-brand-700">{h.followup_label}</span> : h.needs_action ? <span className="font-bold text-danger">조치 전</span> : null}
          </span>
        </button>
        {open && (
          <div className="px-5 pb-5 border-t border-warm-100">
            <div className="flex flex-wrap gap-2 mt-4">
              {h.subscales.map((s) => (
                <span key={s.key} className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", s.flag ? "bg-danger-bg text-danger" : "bg-warm-50 text-warm-700")}>
                  {s.label} {s.score}/{s.max}{s.flag ? " · 불안 높음" : ""}
                </span>
              ))}
            </div>
            <p className="text-xs text-warm-500 mt-4 mb-1">{period} · 점수 높을수록 나쁨(문항마다 0~3)</p>
            <ol className="divide-y divide-warm-100 text-sm">
              {h.answers.map((a) => (
                <li key={a.no} className={cn("flex items-start gap-3 py-2", a.no === 10 && a.score >= 1 && "bg-danger-bg -mx-2 px-2 rounded")}>
                  <span className="w-6 text-warm-500 tabular-nums">{a.no}</span>
                  <span className="flex-1 min-w-0 text-warm-800">{a.text}<span className="block text-xs text-warm-600">「{a.answer ?? "-"}」</span></span>
                  <span className={cn("w-8 text-right font-en font-bold tabular-nums", a.score >= 2 ? "text-danger" : "text-warm-700")}>{a.score}</span>
                </li>
              ))}
            </ol>

            <form className="mt-4 rounded-lg bg-warm-50 p-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <p className="text-sm font-semibold text-warm-800">후속 조치</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="조치">
                {Object.entries(followups).map(([k, v]) => (
                  <button key={k} type="button" role="radio" aria-checked={status === k} onClick={() => setStatus(k)}
                    className={cn("px-3 py-1.5 rounded-full border text-sm", status === k ? "bg-brand-600 text-white border-brand-600" : "bg-white border-warm-200 text-warm-700 hover:bg-warm-100")}>{v}</button>
                ))}
              </div>
              <label htmlFor={`epds-note-${h.id}`} className="sr-only">메모</label>
              <textarea id={`epds-note-${h.id}`} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="통화 내용, 연결한 상담 기관 등" className="rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm" />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm" disabled={save.isPending}>{h.followup_status ? "조치 고치기" : "조치 기록"}</Button>
                {h.followed_up_at && <span className="text-xs text-warm-500">{h.followed_up_at.slice(0, 16).replace("T", " ")} · {h.followed_up_by_name ?? "관리자"}</span>}
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
