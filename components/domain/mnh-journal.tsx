"use client";

// 산모 이용일지 — 기관 확인 탭(2026-10-05). 산모가 회원 웹·앱에서 수시로 쓴 기록을 운영팀이 확인한다.
// 주의 기록(아기 발열·저체온, 산모 발열·컨디션 나쁨, 서비스 의견)은 맨 위·빨간 줄, 저장 즉시 알림이 이미 갔다.
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { mnhJournalApi, type MnhJournalEntry } from "@/lib/api/mnhJournal";

const STATUS_TABS = [
  { key: "open", label: "확인 전" },
  { key: "all", label: "전체" },
  { key: "done", label: "확인함" },
] as const;

const kst = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso)).slice(5);

/** 탭 전체(clientId 없음) 또는 계약 상세 카드(clientId 고정, 간단 모드) */
export function MnhJournalTab({ clientId, compact = false }: { clientId?: number; compact?: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>(compact ? "all" : "open");
  const [flagged, setFlagged] = useState(false);
  const [days, setDays] = useState(compact ? 7 : 30);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [note, setNote] = useState("");

  const query = useQuery({
    queryKey: ["admin", "mnh-journals", status, flagged, days, term, clientId ?? 0],
    queryFn: () => mnhJournalApi.list({
      status, days, ...(flagged ? { flagged: 1 as const } : {}), ...(term ? { q: term } : {}), ...(clientId ? { client_id: clientId } : {}),
    }),
  });
  const d = query.data?.data;
  const rows = d?.entries ?? [];
  const open = rows.filter((r) => !r.checked_at);

  const check = useMutation({
    mutationFn: (ids: number[]) => mnhJournalApi.check(ids, note.trim() || undefined),
    onSuccess: (r) => {
      toast.success(r.message ?? "확인했어요.");
      setSel([]); setNote("");
      qc.invalidateQueries({ queryKey: ["admin", "mnh-journals"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOpenSelected = open.length > 0 && open.every((r) => sel.includes(r.id));

  return (
    <>
      {!compact && (
        <>
          <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
            산모가 회원 웹·앱에서 수시로 쓰는 이용일지(아기 수유·기저귀·수면·체온, 산모 상태, 서비스 의견)입니다. 아기 37.5℃ 이상·36.0℃ 미만, 산모 38.0℃ 이상,
            산모 컨디션 「안 좋음」, 서비스 의견은 저장 즉시 알림이 가고 맨 위에 빨갛게 보입니다. 그 밖의 기록은 산모별 하루 첫 기록 때만 알림이 갑니다.
            읽고 필요하면 연락한 뒤 「확인」을 누르세요 — 확인한 기록은 산모가 지울 수 없습니다.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="확인 전" value={d?.summary.open} />
            <Stat label="주의 · 확인 전" value={d?.summary.flagged_open} tone={d && d.summary.flagged_open > 0 ? "danger" : undefined} />
            <Stat label={`기록 (${days}일)`} value={d?.summary.total} />
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1" role="tablist" aria-label="확인 상태">
          {STATUS_TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={status === t.key} onClick={() => { setStatus(t.key); setSel([]); }}
              className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border",
                status === t.key ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")}>
              {t.label}{t.key === "open" && d ? ` ${d.summary.open}` : ""}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-warm-700">
          <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} className="h-4 w-4" />주의 기록만
        </label>
        <select aria-label="기간" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-lg border border-warm-200 px-2 text-sm">
          <option value={7}>최근 7일</option><option value={30}>최근 30일</option><option value={90}>최근 90일</option>
        </select>
        {!compact && (
          <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); }}>
            <Input id="journal-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="산모 이름" className="h-9 w-36" />
            <button type="submit" aria-label="검색" className="h-9 w-9 grid place-items-center rounded-lg border border-warm-200 hover:bg-warm-50"><Search className="w-4 h-4" /></button>
          </form>
        )}
      </div>

      {open.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="확인 메모(선택) — 예: 보호자 통화, 소아과 안내" className="h-9 flex-1 min-w-[220px]" aria-label="확인 메모" />
          <Button size="sm" disabled={sel.length === 0 || check.isPending} onClick={() => check.mutate(sel)}>
            <CheckCircle2 className="w-4 h-4" />선택 {sel.length}건 확인
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" aria-label="확인 전 기록 모두 선택" className="h-4 w-4" disabled={open.length === 0}
                    checked={allOpenSelected} onChange={() => setSel(allOpenSelected ? [] : open.map((r) => r.id))} />
                </TableHead>
                <TableHead>시각</TableHead>
                {!compact && <TableHead>산모</TableHead>}
                <TableHead>종류</TableHead><TableHead>내용</TableHead><TableHead>확인</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={compact ? 5 : 6} className="text-center text-warm-500 py-10">
                  {query.isLoading ? "불러오는 중…" : query.isError ? getApiErrorMessage(query.error) : status === "open" ? "확인할 기록이 없습니다." : "기록이 없습니다."}
                </TableCell></TableRow>
              )}
              {rows.map((r) => <JournalRow key={r.id} r={r} compact={compact} selected={sel.includes(r.id)} onToggle={() => toggle(r.id)}
                onCheck={() => check.mutate([r.id])} busy={check.isPending} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function JournalRow({ r, compact, selected, onToggle, onCheck, busy }: {
  r: MnhJournalEntry; compact: boolean; selected: boolean; onToggle: () => void; onCheck: () => void; busy: boolean;
}) {
  const alert = !!r.flag && !r.checked_at;
  return (
    <TableRow className={cn(alert && "bg-danger-bg/50")}>
      <TableCell>
        {!r.checked_at && <input type="checkbox" aria-label={`${r.client_name} ${r.kind_label} 선택`} className="h-4 w-4" checked={selected} onChange={onToggle} />}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm tabular-nums">{kst(r.logged_at)}</TableCell>
      {!compact && (
        <TableCell className="whitespace-nowrap">
          <span className="font-semibold">{r.client_name}</span>
          {r.contract && <Link href={`/mnh/${r.contract.id}`} className="block text-[11px] text-brand-700 hover:underline">{r.contract.contract_no}</Link>}
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap">
        <span className="font-semibold text-warm-800">{r.kind_label}</span>
        {r.newborn_name && <span className="block text-[11px] text-warm-500">{r.newborn_name}</span>}
        {r.flag_label && (
          <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold text-danger"><AlertTriangle className="w-3 h-3" />{r.flag_label}</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-warm-700 min-w-[220px] max-w-[460px]">
        {r.summary && <p className="font-semibold">{r.summary}</p>}
        {r.note && <p className="whitespace-pre-wrap break-words text-warm-600">{r.note}</p>}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {r.checked_at ? (
          <span className="text-xs text-brand-700 font-semibold">
            {r.checked_by_name ?? "확인"} · {kst(r.checked_at)}
            {r.check_note && <span className="block font-normal text-warm-600 max-w-[220px] whitespace-normal">{r.check_note}</span>}
          </span>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={onCheck}>확인</Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | undefined; tone?: "danger" }) {
  return (
    <div className={cn("rounded-xl border p-4", tone === "danger" ? "border-danger/30 bg-danger-bg" : "border-warm-200/60 bg-white")}>
      <p className="text-xs font-semibold text-warm-500">{label}</p>
      <p className={cn("font-en text-2xl font-extrabold tabular-nums mt-1", tone === "danger" ? "text-danger" : "text-warm-800")}>{value ?? "-"}</p>
    </div>
  );
}
