"use client";

// 산모신생아 바우처 모니터링 설문(서비스 만족도 모니터링 B형) 결과 — 관리자(2026-10-18).
// 계약 종료 때 자동 발행된 설문을 발행일 기간·담당 관리사로 모아 응답률·문항별 평균·관리사별 평균·서술 의견을 본다.
// 답이 없는 설문은 발행 1·3일 뒤 산모에게 자동으로 다시 알리고(매일 10:00), 3일째에도 없으면 담당 관리자에게 알린다.
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { ExportXlsxButton } from "@/components/domain/export-xlsx-button";
import { mnhApi, mnhSurveyApi, todayKst, type MnhSurveySummary } from "@/lib/api/mnh";

const selectCls = "h-9 rounded-lg border border-warm-200 bg-white px-2 text-sm";
const fmt = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(2));
const kstDay = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)) : "—";

/** 오늘 기준 n개월 전 1일(한국 날짜) */
function monthsAgo(n: number): string {
  const [y, m] = todayKst().split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return d.toISOString().slice(0, 10);
}

const PERIODS = [
  { key: "m0", label: "이번 달", from: () => monthsAgo(0) },
  { key: "m3", label: "최근 3개월", from: () => monthsAgo(2) },
  { key: "m12", label: "최근 12개월", from: () => monthsAgo(11) },
  { key: "all", label: "전체", from: () => undefined },
] as const;

export function SurveyTab() {
  const [period, setPeriod] = useState<string>("m3");
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const [cg, setCg] = useState<number | undefined>();
  const range = period === "custom" ? custom : { from: PERIODS.find((p) => p.key === period)?.from() };
  const params = { ...range, ...(cg ? { caregiver_id: cg } : {}) };

  const query = useQuery({ queryKey: ["admin", "mnh-survey", params], queryFn: () => mnhSurveyApi.summary(params) });
  const cgs = useQuery({ queryKey: ["admin", "mnh-caregivers", "all"], queryFn: () => mnhApi.caregivers(true) });
  const d = query.data?.data;

  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        계약이 끝나면 산모에게 「서비스 만족도 모니터링」(B형 19문항)이 자동으로 발행됩니다. 답이 없으면 발행 1일·3일 뒤 산모에게 다시 알리고(매일 오전 10시),
        3일째에도 없으면 담당 관리자에게 알립니다 — 아래 「아직 답하지 않은 설문」에서 전화 모니터링 대상을 확인하세요. 기간은 발행일 기준입니다.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1" role="tablist" aria-label="기간">
          {[...PERIODS, { key: "custom", label: "직접 지정" }].map((p) => (
            <button key={p.key} type="button" role="tab" aria-selected={period === p.key} onClick={() => setPeriod(p.key)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border",
                period === p.key ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")}>
              {p.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <>
            <Input type="date" aria-label="시작일" value={custom.from ?? ""} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value || undefined }))} className="h-9 w-40" />
            <span className="text-warm-400">~</span>
            <Input type="date" aria-label="종료일" value={custom.to ?? ""} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value || undefined }))} className="h-9 w-40" />
          </>
        )}
        <select aria-label="담당 관리사" value={cg ?? ""} onChange={(e) => setCg(e.target.value ? Number(e.target.value) : undefined)} className={selectCls}>
          <option value="">관리사 전체</option>
          {cgs.data?.data.filter((c) => c.postpartum).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="ml-auto">
          <ExportXlsxButton endpoint="/v1/admin/exports/mnh-satisfaction" params={params} title="모니터링 설문 엑셀"
            scopeLabel="지금 고른 기간·관리사" fallbackName="careand_mnh_satisfaction.xlsx" placeholder="예: 분기 모니터링 결과 보고" />
        </div>
      </div>

      {query.isLoading && <p className="text-sm text-warm-500 py-10 text-center">불러오는 중…</p>}
      {query.isError && <p className="text-sm text-danger py-10 text-center">{getApiErrorMessage(query.error)}</p>}
      {d && <SurveyBody d={d} />}
    </>
  );
}

function SurveyBody({ d }: { d: MnhSurveySummary }) {
  const sections = d.questions.reduce<{ name: string; items: MnhSurveySummary["questions"] }[]>((acc, q) => {
    const name = q.section ?? "문항";
    const last = acc[acc.length - 1];
    if (last && last.name === name) last.items.push(q); else acc.push({ name, items: [q] });
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="발행한 설문" value={`${d.issued}건`} />
        <Stat label="응답" value={`${d.signed}건`} sub={d.response_rate == null ? undefined : `응답률 ${d.response_rate}%`} />
        <Stat label="전반적 만족 (5점)" value={fmt(d.overall_avg)} />
        <Stat label="서비스 평가 10문항 평균" value={fmt(d.eval_avg)} />
      </div>

      {d.signed === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-warm-500">이 기간에 응답한 설문이 없습니다.</CardContent></Card>
      ) : (
        <>
          {sections.map((s) => (
            <Card key={s.name}>
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-bold text-warm-800 mb-3">{s.name}</h3>
                <ul className="space-y-3">
                  {s.items.map((q) => <QuestionRow key={q.key} q={q} />)}
                </ul>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-bold text-warm-800 mb-3">응답자·선택 경로</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {d.general.map((g) => {
                  const max = Math.max(1, ...g.counts.map((c) => c.n));
                  return (
                    <div key={g.key}>
                      <div className="text-sm font-semibold text-warm-700 mb-1.5">{g.label}</div>
                      <ul className="space-y-1">
                        {g.counts.map((c) => (
                          <li key={c.label} className="flex items-center gap-2 text-xs">
                            <span className="w-36 shrink-0 text-warm-600 truncate" title={c.label}>{c.label}</span>
                            <span className="flex-1 h-2 rounded-full bg-warm-100 overflow-hidden">
                              <span className="block h-full bg-brand-500" style={{ width: `${(c.n / max) * 100}%` }} />
                            </span>
                            <span className="w-8 text-right tabular-nums text-warm-700">{c.n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <h3 className="font-bold text-warm-800 px-4 sm:px-5 pt-4">건강관리사별</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>건강관리사</TableHead><TableHead className="text-right">응답</TableHead>
                    <TableHead className="text-right whitespace-nowrap">서비스 평가 평균</TableHead>
                    <TableHead className="text-right whitespace-nowrap">전반적 만족</TableHead><TableHead className="text-right">추천</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.by_caregiver.map((c) => (
                    <TableRow key={c.caregiver_id ?? 0}>
                      <TableCell className="whitespace-nowrap">{c.name ?? "담당 없음"}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.n}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", c.eval_avg != null && c.eval_avg < 3 && "text-danger font-bold")}>{fmt(c.eval_avg)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", c.overall_avg != null && c.overall_avg < 3 && "text-danger font-bold")}>{fmt(c.overall_avg)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(c.recommend_avg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-warm-500 px-4 sm:px-5 py-3">응답 수가 적으면 평균이 크게 흔들립니다. 3점 미만은 빨간색입니다.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-bold text-warm-800 mb-3">서술 의견 <span className="text-sm font-normal text-warm-500">최근 {d.comments.length}건</span></h3>
              {d.comments.length === 0 ? <p className="text-sm text-warm-500">남긴 의견이 없습니다.</p> : (
                <ul className="divide-y divide-warm-100">
                  {d.comments.map((c, i) => (
                    <li key={`${c.document_id}-${i}`} className="py-2.5">
                      <div className="text-xs text-warm-500 mb-0.5">
                        {kstDay(c.signed_at)} · <Link href={`/mnh/${c.contract_id}`} className="hover:underline">{c.contract_no}</Link> · {c.client_name ?? "-"} 산모 · 관리사 {c.caregiver_name ?? "-"} · {c.question}
                      </div>
                      <p className="text-sm text-warm-800 whitespace-pre-wrap">{c.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <h3 className="font-bold text-warm-800 px-4 sm:px-5 pt-4">아직 답하지 않은 설문 <span className="text-sm font-normal text-warm-500">{d.pending.length}건</span></h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>산모</TableHead><TableHead className="whitespace-nowrap">계약</TableHead><TableHead className="whitespace-nowrap">건강관리사</TableHead>
                <TableHead className="whitespace-nowrap">발행일</TableHead><TableHead className="whitespace-nowrap">다시 알림</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.pending.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-warm-500 py-6">모두 답했습니다.</TableCell></TableRow>}
              {d.pending.map((p) => (
                <TableRow key={p.document_id}>
                  <TableCell className="whitespace-nowrap">
                    <Link href={`/mnh?tab=archive&client=${p.client_id}`} className="font-semibold text-brand-700 hover:underline">{p.client_name ?? `산모 #${p.client_id}`}</Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap"><Link href={`/mnh/${p.contract_id}`} className="hover:underline">{p.contract_no}</Link></TableCell>
                  <TableCell className="whitespace-nowrap">{p.caregiver_name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{kstDay(p.issued_at)} <span className="text-warm-500">({p.days}일째)</span></TableCell>
                  <TableCell className={cn("whitespace-nowrap", p.reminded >= 2 && "text-danger font-semibold")}>
                    {p.reminded === 0 ? "아직" : p.reminded === 1 ? "1차(1일 뒤)" : "2차(3일 뒤) — 전화 권장"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionRow({ q }: { q: MnhSurveySummary["questions"][number] }) {
  const total = Object.values(q.dist).reduce((a, b) => a + b, 0);
  const low = q.avg != null && q.avg < 3;
  return (
    <li className="grid grid-cols-1 md:grid-cols-[1fr_260px_56px] gap-1.5 md:gap-3 md:items-center">
      <span className="text-sm text-warm-700">{q.label}</span>
      <span className="flex h-3 rounded-full overflow-hidden bg-warm-100" role="img"
        aria-label={`5점 ${q.dist["5"]}명, 4점 ${q.dist["4"]}명, 3점 ${q.dist["3"]}명, 2점 ${q.dist["2"]}명, 1점 ${q.dist["1"]}명`}>
        {["5", "4", "3", "2", "1"].map((k) => total > 0 && q.dist[k] > 0 && (
          <span key={k} className={DIST_CLS[k]} style={{ width: `${(q.dist[k] / total) * 100}%` }} title={`${k}점 ${q.dist[k]}명`} />
        ))}
      </span>
      <span className={cn("text-sm font-bold tabular-nums md:text-right", low ? "text-danger" : "text-warm-800")}>
        {fmt(q.avg)}
        {q.other.filter((o) => o.n > 0).map((o) => <span key={o.label} className="block text-[11px] font-normal text-warm-500 whitespace-nowrap">{o.label} {o.n}</span>)}
      </span>
    </li>
  );
}

// 5점 → 1점: 브랜드 진한색 → 옅은색 → 중립 → 위험색
const DIST_CLS: Record<string, string> = { "5": "bg-brand-700", "4": "bg-brand-500", "3": "bg-warm-300", "2": "bg-danger/60", "1": "bg-danger" };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-semibold text-warm-500">{label}</div>
        <div className="text-2xl font-extrabold text-warm-800 tabular-nums mt-1">{value}</div>
        {sub && <div className="text-xs text-warm-500 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
