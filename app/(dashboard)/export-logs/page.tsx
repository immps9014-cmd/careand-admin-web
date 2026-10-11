"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportLogsApi, type ExportLogRow } from "@/lib/api/export-logs";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * 다운로드 기록(2026-10-11) — 회원·결제·정산·목록 엑셀을 누가 언제 무슨 사유로 몇 건 받았는지, 거부된 시도까지.
 * 감사로그(audit_logs) 조회 전용. 슈퍼관리자만(서버 'exports' 영역).
 */

const PERIODS = [
  { key: "today", label: "오늘" },
  { key: "this_week", label: "이번 주" },
  { key: "last_week", label: "지난주" },
  { key: "this_month", label: "이번 달" },
  { key: "last_month", label: "지난달" },
  { key: "custom", label: "기간 지정" },
];
const RESULTS = [
  { key: "", label: "전체" },
  { key: "success", label: "다운로드" },
  { key: "blocked", label: "거부된 시도" },
] as const;
const STATUS_TEXT: Record<number, string> = { 401: "로그인 필요", 403: "권한 없음", 404: "없는 목록", 422: "사유 없음", 429: "요청 과다", 500: "서버 오류" };

function filtersText(f: ExportLogRow["filters"]): string {
  if (!f || Array.isArray(f)) return "없음";
  const e = Object.entries(f).filter(([, v]) => v !== null && v !== "");
  return e.length ? e.map(([k, v]) => `${k}=${v}`).join(" · ") : "없음";
}

export default function ExportLogsPage() {
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<"" | "success" | "blocked">("");
  const [actor, setActor] = useState<number | null>(null);
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [period, from, to, result, actor, kind]);

  const ready = period !== "custom" || (!!from && !!to);
  const q = useQuery({
    queryKey: ["admin", "export-logs", period, from, to, result, actor, kind, page],
    enabled: ready,
    queryFn: () =>
      exportLogsApi.list({
        period,
        ...(period === "custom" ? { from, to } : {}),
        ...(result ? { result } : {}),
        ...(actor ? { actor_id: actor } : {}),
        ...(kind ? { kind } : {}),
        page,
      }),
  });
  const s = q.data?.summary;
  const rows = q.data?.data ?? [];
  const meta = q.data?.meta;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">다운로드 기록</h1>
        <p className="text-sm text-warm-500 mt-1">
          회원·결제·정산·목록 엑셀을 누가, 언제, 무슨 사유로, 몇 건 받았는지 봅니다. 사유 없이 시도하거나 권한이 없어 막힌 기록도 함께 보여요.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="기간">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}
            className={cn("h-8 px-3 rounded-full text-xs font-semibold border", period === p.key ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")}>
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <span className="inline-flex items-center gap-1.5">
            <input type="date" aria-label="시작일" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-warm-300 bg-white px-2 text-xs font-en" />
            <span className="text-warm-500 text-xs">~</span>
            <input type="date" aria-label="종료일" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-warm-300 bg-white px-2 text-xs font-en" />
          </span>
        )}
        {s && <span className="ml-1 text-xs text-warm-500 font-en">{s.from} ~ {s.to}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex bg-warm-100 p-1 rounded-md" role="group" aria-label="결과">
          {RESULTS.map((r) => (
            <button key={r.key || "all"} type="button" aria-pressed={result === r.key} onClick={() => setResult(r.key)}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded", result === r.key ? "bg-white text-warm-800 shadow-sm" : "text-warm-600 hover:text-warm-800")}>
              {r.label}
            </button>
          ))}
        </div>
        <select aria-label="종류" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-md border border-warm-200 bg-white px-2 text-xs">
          <option value="">종류: 전체</option>
          {(s?.kinds ?? []).map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
        <select aria-label="관리자" value={actor ?? ""} onChange={(e) => setActor(e.target.value ? Number(e.target.value) : null)} className="h-9 rounded-md border border-warm-200 bg-white px-2 text-xs">
          <option value="">관리자: 전체</option>
          {(s?.actors ?? []).map((a) => <option key={a.id} value={a.id}>{a.name ?? `#${a.id}`} ({a.count})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Tile label="다운로드" value={s ? `${s.success}회` : "-"} sub="사유를 남기고 받은 횟수" />
        <Tile label="내려받은 행" value={s ? `${s.rows_total.toLocaleString("ko-KR")}건` : "-"} sub="파일에 담긴 건수 합" />
        <Tile label="거부된 시도" value={s ? `${s.blocked}회` : "-"} sub="사유 없음·권한 없음 등" warn={!!s && s.blocked > 0} />
      </div>

      <Card>
        <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">기록</h2>
          <span className="text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">총 {meta?.total ?? 0}건</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일시</TableHead>
              <TableHead>관리자</TableHead>
              <TableHead>결과</TableHead>
              <TableHead>종류</TableHead>
              <TableHead>조건</TableHead>
              <TableHead className="text-right">건수</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!ready ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-warm-500 py-10">시작일과 종료일을 골라 주세요.</TableCell></TableRow>
            ) : q.isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-warm-500 py-10">불러오는 중…</TableCell></TableRow>
            ) : q.isError ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-danger py-10">기록을 불러오지 못했어요. 슈퍼관리자만 볼 수 있어요.</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-warm-500 py-10">이 기간에 다운로드 기록이 없어요.</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-en text-xs text-warm-600 whitespace-nowrap">{r.at ? formatDateTime(r.at) : "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-warm-800">{r.actor_name ?? "-"}</div>
                    <div className="text-[11px] text-warm-500 font-en">{r.actor_email}</div>
                  </TableCell>
                  <TableCell>
                    {r.result === "success"
                      ? <Badge variant="success">다운로드</Badge>
                      : <Badge variant="danger" title={`응답 ${r.status}`}>거부 · {STATUS_TEXT[r.status] ?? r.status}</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-warm-700 whitespace-nowrap">{r.kind_label}</TableCell>
                  <TableCell className="text-xs text-warm-600 font-en max-w-[220px] break-all">{filtersText(r.filters)}</TableCell>
                  <TableCell className="text-right font-en text-sm text-warm-800">{r.rows ?? "-"}</TableCell>
                  <TableCell className="text-sm text-warm-700 max-w-[240px]">{r.reason ?? <span className="text-warm-400">-</span>}</TableCell>
                  <TableCell className="text-xs text-warm-500 font-en">{r.ip ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {meta && meta.last_page > 1 && (
          <div className="px-6 py-3 border-t border-warm-100 flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
            <span className="text-xs text-warm-600 font-en">{meta.current_page} / {meta.last_page}</span>
            <Button size="sm" variant="outline" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>다음</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-white p-5", warn ? "border-danger/40" : "border-warm-200/60")}>
      <div className="text-xs font-semibold text-warm-500">{label}</div>
      <div className={cn("font-en text-2xl font-extrabold mt-2 tracking-tight", warn ? "text-danger" : "text-warm-800")}>{value}</div>
      <div className="text-xs text-warm-500 mt-1.5">{sub}</div>
    </div>
  );
}
