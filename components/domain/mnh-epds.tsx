"use client";

// 산후우울(에딘버러) 검사 결과 — 관리자 목록 탭(2026-10-05). 문항별 응답은 산모 상세(/mnh/epds/[clientId])에서 열람 사유를 받고 보여 준다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { epdsApi, EPDS_RISK_STYLE, type EpdsRisk, type EpdsRow } from "@/lib/api/epds";

const STATUS_TABS = [
  { key: "open", label: "조치 필요" },
  { key: "all", label: "전체" },
  { key: "done", label: "조치 완료" },
] as const;

const RISKS: { key: string; label: string }[] = [
  { key: "", label: "모든 판정" },
  { key: "critical", label: "즉시 도움 필요" },
  { key: "high", label: "상담 권고" },
  { key: "medium", label: "주의" },
  { key: "low", label: "양호" },
];

const RISK_ORDER: EpdsRisk[] = ["critical", "high", "medium", "low"];
const RISK_LABEL: Record<EpdsRisk, string> = { critical: "즉시 도움 필요", high: "상담 권고", medium: "주의", low: "양호" };

export function RiskPill({ row }: { row: Pick<EpdsRow, "risk_level" | "risk_label"> }) {
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap", EPDS_RISK_STYLE[row.risk_level])}>{row.risk_label}</span>;
}

/** 총점 0~30 막대 — 10·13점(주의·상담 권고 경계) 눈금 */
export function ScoreBar({ total }: { total: number }) {
  const pct = (v: number) => `${(v / 30) * 100}%`;
  const tone = total >= 13 ? "bg-danger" : total >= 10 ? "bg-warn" : "bg-brand-500";
  return (
    <div className="relative h-1.5 w-24 rounded-full bg-warm-100" aria-hidden>
      <div className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: pct(total) }} />
      <div className="absolute -top-0.5 h-2.5 w-px bg-warm-400" style={{ left: pct(10) }} />
      <div className="absolute -top-0.5 h-2.5 w-px bg-warm-400" style={{ left: pct(13) }} />
    </div>
  );
}

function Trend({ total, prev }: { total: number; prev: number | null | undefined }) {
  if (prev == null) return <span className="text-xs text-warm-500">첫 검사</span>;
  const d = total - prev;
  if (d === 0) return <span className="text-xs text-warm-500">지난번과 같음</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", d > 0 ? "text-danger" : "text-brand-700")}>
      {d > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(d)}점 (지난번 {prev})
    </span>
  );
}

export function EpdsTab() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("open");
  const [risk, setRisk] = useState("");
  const [days, setDays] = useState(90);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const query = useQuery({
    queryKey: ["admin", "epds", status, risk, days, term],
    queryFn: () => epdsApi.list({ status, ...(risk ? { risk } : {}), days, ...(term ? { q: term } : {}) }),
  });
  const d = query.data?.data;
  const rows = d?.rows ?? [];

  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        산모가 회원 웹·앱에서 한 에딘버러 산후우울 검사(10문항, 0~30점) 결과입니다. 13점 이상이면 「상담 권고」, 자해 생각 문항에 응답하면 「즉시 도움 필요」로 판정되고 CS 담당자에게 알림이 갑니다.
        연락한 뒤 조치를 기록하세요. 문항별 응답은 민감정보라 산모 상세에서 열람 사유를 적어야 보입니다.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="조치 필요" value={d?.summary.open} tone={d && d.summary.open > 0 ? "danger" : undefined} hint={d && d.summary.open_self_harm > 0 ? `자해 생각 응답 ${d.summary.open_self_harm}건` : "상담 권고 이상 · 조치 전"} />
        <Stat label={`검사 수 (${days}일)`} value={d?.summary.tests} hint={`산모 ${d?.summary.clients ?? 0}명`} />
        <div className="col-span-2 rounded-xl border border-warm-200/60 bg-white p-4">
          <p className="text-xs font-semibold text-warm-500 mb-2">판정 분포</p>
          <div className="flex flex-wrap gap-2">
            {RISK_ORDER.map((k) => (
              <span key={k} className={cn("px-2.5 py-1 rounded-full text-xs font-bold", EPDS_RISK_STYLE[k])}>
                {RISK_LABEL[k]} {d?.summary.by_risk[k] ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1" role="tablist" aria-label="조치 상태">
          {STATUS_TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={status === t.key} onClick={() => setStatus(t.key)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border",
                status === t.key ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")}>
              {t.label}{t.key === "open" && d ? ` ${d.summary.open}` : ""}
            </button>
          ))}
        </div>
        <select aria-label="판정" value={risk} onChange={(e) => setRisk(e.target.value)} className="h-9 rounded-lg border border-warm-200 px-2 text-sm">
          {RISKS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select aria-label="기간" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-lg border border-warm-200 px-2 text-sm">
          <option value={30}>최근 30일</option><option value={90}>최근 90일</option><option value={365}>최근 1년</option>
        </select>
        <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); }}>
          <Input id="epds-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="산모 이름" className="h-9 w-36" />
          <button type="submit" aria-label="검색" className="h-9 w-9 grid place-items-center rounded-lg border border-warm-200 hover:bg-warm-50"><Search className="w-4 h-4" /></button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>검사일</TableHead><TableHead>산모</TableHead><TableHead>판정</TableHead>
                <TableHead>총점</TableHead><TableHead>변화</TableHead><TableHead>하위척도</TableHead><TableHead>조치</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-warm-500 py-10">
                  {query.isLoading ? "불러오는 중…" : status === "open" ? "조치가 필요한 검사가 없습니다." : "검사 결과가 없습니다."}
                </TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className={cn("cursor-pointer hover:bg-warm-50", r.needs_action && "bg-danger-bg/40")}
                  onClick={() => router.push(`/mnh/epds/${r.client_id}?a=${r.id}`)}>
                  <TableCell className="whitespace-nowrap text-sm">{r.date}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-semibold">{r.client_name}</span>
                    <span className="block text-[11px] text-warm-500">검사 {r.tests}회</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <RiskPill row={r} />
                      {r.self_harm && <span className="text-[11px] font-bold text-danger whitespace-nowrap">자해 생각 응답</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-en font-bold tabular-nums w-10">{r.total}<span className="text-warm-500 font-normal text-xs">/30</span></span>
                      <ScoreBar total={r.total} />
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap"><Trend total={r.total} prev={r.prev_total} /></TableCell>
                  <TableCell className="text-xs text-warm-600 whitespace-nowrap">
                    {r.subscales.map((s) => (
                      <span key={s.key} className={cn("mr-2", s.flag && "text-danger font-semibold")}>{s.label} {s.score}/{s.max}</span>
                    ))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.followup_label
                      ? <span className="text-xs font-semibold text-brand-700">{r.followup_label}<span className="block font-normal text-warm-500">{r.followed_up_at?.slice(0, 10)}</span></span>
                      : r.needs_action ? <span className="text-xs font-bold text-danger">조치 전</span> : <span className="text-xs text-warm-500">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number | undefined; hint?: string; tone?: "danger" }) {
  return (
    <div className={cn("rounded-xl border p-4", tone === "danger" ? "border-danger/30 bg-danger-bg" : "border-warm-200/60 bg-white")}>
      <p className="text-xs font-semibold text-warm-500">{label}</p>
      <p className={cn("font-en text-2xl font-extrabold tabular-nums mt-1", tone === "danger" ? "text-danger" : "text-warm-800")}>{value ?? "-"}</p>
      {hint && <p className="text-[11px] text-warm-500 mt-0.5">{hint}</p>}
    </div>
  );
}
