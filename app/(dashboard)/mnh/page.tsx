"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/client";
import { EmploymentTab, TemplatesTab } from "@/components/domain/mnh-docs";
import { EvaluationTab } from "@/components/domain/mnh-eval";
import { cn, formatKRW } from "@/lib/utils";
import {
  mnhApi, MNH_STATUS_STYLE, DOW_KO, todayKst,
  type MnhCalendarRow, type MnhContractSummary, type MnhLabels, type MnhSupportType,
} from "@/lib/api/mnh";

/**
 * 산모신생아 바우처(CAREN-MNH-01 2단계, 2026-10-05). 제공기관 = 케어앤 운영사.
 * 탭: 계약(신청~종료) · 달력(이용자별 제공일·연기·담당) · 지원유형 기준표(복지부 연도별 고시값 입력).
 */
const TABS = [
  { key: "contracts", label: "계약" },
  { key: "calendar", label: "달력" },
  { key: "rates", label: "지원유형 기준표" },
  { key: "templates", label: "서류 서식" },
  { key: "employment", label: "인력 계약" },
  { key: "evaluation", label: "인력 평가" },
] as const;
type Tab = (typeof TABS)[number]["key"];

// useSearchParams() 는 Suspense 경계가 필요하다(next build 프리렌더 에러 방지).
export default function MnhPageWrapper() {
  return (
    <Suspense fallback={null}>
      <MnhPage />
    </Suspense>
  );
}

function MnhPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (TABS.some((t) => t.key === sp.get("tab")) ? sp.get("tab") : "contracts") as Tab;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">산모신생아 바우처</h1>
        <p className="text-sm text-warm-500 mt-1">
          5~40일 기간형 계약을 케어앤이 제공기관으로 관리합니다. 본인부담금 선납을 확인해야 담당이 출근할 수 있어요.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="바우처 메뉴">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => router.replace(`/mnh?tab=${t.key}`)}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-semibold border transition-colors",
              tab === t.key ? "bg-brand-600 text-white border-brand-600" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "contracts" && <ContractsTab />}
      {tab === "calendar" && <CalendarTab />}
      {tab === "rates" && <RatesTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "employment" && <EmploymentTab />}
      {tab === "evaluation" && <EvaluationTab />}
    </div>
  );
}

/* ───────────── 계약 목록 ───────────── */

const STATUS_FILTERS = [
  { key: "", label: "전체" },
  { key: "applied", label: "신청" },
  { key: "confirmed", label: "배정 완료" },
  { key: "active", label: "서비스 중" },
  { key: "completed", label: "종료" },
  { key: "cancelled", label: "취소" },
];

function StatusPill({ status, label }: { status: MnhContractSummary["status"]; label: string }) {
  return <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap", MNH_STATUS_STYLE[status])}>{label}</span>;
}

function ContractsTab() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [kw, setKw] = useState("");
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["admin", "mnh", "contracts", status, q],
    queryFn: () => mnhApi.contracts({ ...(status ? { status } : {}), ...(q ? { q } : {}) }),
  });
  const rows = query.data?.data ?? [];
  const counts = query.data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);
  const needs = rows.filter((r) => r.status === "applied" || (!r.prepaid && r.status === "confirmed")).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            aria-pressed={status === f.key}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold border",
              status === f.key ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50",
            )}
          >
            {f.label} {f.key ? counts[f.key] ?? 0 : total}
          </button>
        ))}
        <form
          className="flex items-center gap-2 ml-auto w-full sm:w-auto"
          onSubmit={(e) => { e.preventDefault(); setQ(kw.trim()); }}
        >
          <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="계약번호·산모 이름" className="h-9 sm:w-56" aria-label="계약 검색" />
          <Button type="submit" size="sm" variant="outline" aria-label="검색"><Search /></Button>
        </form>
      </div>
      {needs > 0 && !status && (
        <p className="text-sm text-warn bg-warn-bg rounded-lg px-4 py-2 mb-4">처리할 계약 {needs}건 — 담당 배정 또는 본인부담금 선납 확인이 남았어요.</p>
      )}
      {query.isError && <Card className="mb-4"><CardContent className="p-6 text-sm">{getApiErrorMessage(query.error)}</CardContent></Card>}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계약</TableHead>
                <TableHead>산모</TableHead>
                <TableHead>지원유형</TableHead>
                <TableHead>기간</TableHead>
                <TableHead className="text-right">본인부담금</TableHead>
                <TableHead>선납</TableHead>
                <TableHead>담당</TableHead>
                <TableHead>진행</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-warm-500 py-10">{query.isLoading ? "불러오는 중…" : "계약이 없습니다."}</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-warm-50" onClick={() => router.push(`/mnh/${r.id}`)}>
                  <TableCell className="font-mono text-xs"><Link href={`/mnh/${r.id}`} className="text-brand-700 hover:underline" onClick={(e) => e.stopPropagation()}>{r.contract_no}</Link></TableCell>
                  <TableCell className="font-semibold">{r.client_name ?? "-"}</TableCell>
                  <TableCell className="text-xs text-warm-600">{r.support_label ?? "-"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.start_date} ~ {r.end_date ?? "?"}<span className="text-warm-500"> · {r.days}일</span></TableCell>
                  <TableCell className="text-right whitespace-nowrap">{r.rates_set ? formatKRW(r.self_pay) : <span className="text-warn text-xs font-semibold">요율 미설정</span>}</TableCell>
                  <TableCell>{r.prepaid ? <span className="text-brand-700 text-xs font-bold">확인</span> : <span className="text-warm-500 text-xs">미확인</span>}<span className="block text-[11px] text-warm-500">{r.payment_method_label}</span></TableCell>
                  <TableCell className="text-sm">{r.caregiver_name ?? <span className="text-warm-400">미배정</span>}</TableCell>
                  <TableCell className="text-xs">{r.completed_days ?? 0}/{r.days}일</TableCell>
                  <TableCell><StatusPill status={r.status} label={r.status_label} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

/* ───────────── 달력 ───────────── */

const CELL: Record<string, string> = {
  planned: "bg-warm-100 text-warm-500",
  scheduled: "bg-info-bg text-info",
  in_progress: "bg-brand-500 text-white",
  completed: "bg-brand-100 text-brand-800",
};

function monthDays(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function CalendarTab() {
  const today = todayKst();
  const [month, setMonth] = useState(today.slice(0, 7));
  const q = useQuery({ queryKey: ["admin", "mnh", "calendar", month], queryFn: () => mnhApi.calendar(month) });
  const rows = q.data?.data.contracts ?? [];
  const days = useMemo(() => monthDays(month), [month]);
  const [y, m] = month.split("-").map(Number);

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="이전 달"><ChevronLeft /></Button>
        <span className="text-lg font-bold text-warm-800 w-32 text-center">{y}년 {m}월</span>
        <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="다음 달"><ChevronRight /></Button>
        <Button size="sm" variant="ghost" onClick={() => setMonth(today.slice(0, 7))}>이번 달</Button>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-warm-600 mb-3" aria-label="범례">
        <Legend cls={CELL.planned} label="담당 미배정" />
        <Legend cls={CELL.scheduled} label="예정" />
        <Legend cls={CELL.in_progress} label="출근" />
        <Legend cls={CELL.completed} label="완료" />
        <Legend cls="bg-warn-bg text-warn" label="연기" text="연" />
        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-danger" />특이사항</span>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr className="bg-warm-50">
                <th className="sticky left-0 z-10 bg-warm-50 text-left px-3 py-2 min-w-[150px] font-semibold text-warm-600">이용자 · 담당</th>
                {days.map((d) => {
                  const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
                  return (
                    <th key={d} className={cn("w-8 min-w-[2rem] py-1 font-semibold", dow === 0 ? "text-danger" : dow === 6 ? "text-info" : "text-warm-600", d === today && "bg-brand-50")}>
                      <div>{Number(d.slice(8))}</div>
                      <div className="font-normal">{DOW_KO[dow]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={days.length + 1} className="text-center text-warm-500 py-10">{q.isLoading ? "불러오는 중…" : "이 달에 걸친 계약이 없습니다."}</td></tr>
              )}
              {rows.map((r) => <CalendarRow key={r.id} r={r} days={days} today={today} />)}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function Legend({ cls, label, text }: { cls: string; label: string; text?: string }) {
  return <span className="inline-flex items-center gap-1"><span className={cn("w-5 h-4 rounded text-[10px] grid place-items-center font-bold", cls)}>{text ?? ""}</span>{label}</span>;
}

function CalendarRow({ r, days, today }: { r: MnhCalendarRow; days: string[]; today: string }) {
  const cells = new Map(r.cells.map((c) => [c.date, c]));
  const postponed = new Set(r.postponed);
  const notes = new Map<string, string[]>();
  r.events.forEach((e) => {
    if (!e.date) return;
    const text = e.type === "note" ? String(e.payload?.text ?? "") : e.type === "postponed" ? `연기: ${String(e.payload?.reason ?? "")}` : "담당 교체";
    notes.set(e.date, [...(notes.get(e.date) ?? []), text]);
  });
  return (
    <tr className="border-t border-warm-100">
      <td className="sticky left-0 z-10 bg-white px-3 py-2">
        <Link href={`/mnh/${r.id}`} className="font-semibold text-warm-800 hover:underline">{r.client_name ?? r.contract_no}</Link>
        <div className="text-[11px] text-warm-500">{r.caregiver_name ?? "미배정"} · {r.days}일{!r.prepaid && <span className="text-warn"> · 선납 미확인</span>}</div>
      </td>
      {days.map((d) => {
        const c = cells.get(d);
        const n = notes.get(d);
        const title = [c ? `${c.seq}일차 ${c.caregiver_name ?? ""}` : null, postponed.has(d) ? "연기된 날" : null, ...(n ?? [])].filter(Boolean).join("\n");
        return (
          <td key={d} className={cn("p-0.5 text-center", d === today && "bg-brand-50/50")} title={title || undefined}>
            <div className={cn("relative h-7 rounded grid place-items-center font-semibold",
              c ? CELL[c.status] : postponed.has(d) ? "bg-warn-bg text-warn" : "")}>
              {c ? c.seq : postponed.has(d) ? "연" : ""}
              {n && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-danger" aria-label="특이사항" />}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

/* ───────────── 지원유형 기준표 ───────────── */

type Draft = { id?: number; fetus_type: string; birth_order: string; income_tier: string; period: string; days: string; total_price: string; gov_support: string; note: string };
const EMPTY: Draft = { fetus_type: "single", birth_order: "first", income_tier: "", period: "standard", days: "10", total_price: "", gov_support: "", note: "" };

function RatesTab() {
  const qc = useQueryClient();
  const thisYear = Number(todayKst().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const q = useQuery({ queryKey: ["admin", "mnh", "rates", year], queryFn: () => mnhApi.supportTypes(year) });
  const rows = q.data?.data.rows ?? [];
  const labels = q.data?.data.labels as MnhLabels | undefined;
  const years = Array.from(new Set([thisYear + 1, thisYear, ...(q.data?.data.years ?? [])])).sort((a, b) => b - a);
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => setDraft(null), [year]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "mnh", "rates"] });
  const save = useMutation({
    mutationFn: (d: Draft) => {
      const total = Number(d.total_price), gov = Number(d.gov_support);
      const body = { year, fetus_type: d.fetus_type, birth_order: d.birth_order, income_tier: d.income_tier.trim(), period: d.period,
        days: Number(d.days), total_price: total, gov_support: gov, self_pay: total - gov, note: d.note.trim() || null } as Partial<MnhSupportType>;
      return d.id ? mnhApi.updateSupportType(d.id, body) : mnhApi.createSupportType(body);
    },
    onSuccess: () => { toast.success("저장했어요."); setDraft(null); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const del = useMutation({
    mutationFn: (id: number) => mnhApi.deleteSupportType(id),
    onSuccess: (r) => { toast.success(r.message); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const copy = useMutation({
    mutationFn: () => mnhApi.copySupportTypes(year - 1, year),
    onSuccess: (r) => { toast.success(r.message); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const selfPay = draft && draft.total_price !== "" && draft.gov_support !== "" ? Number(draft.total_price) - Number(draft.gov_support) : null;

  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        보건복지부가 해마다 고시하는 산모신생아 건강관리 지원유형(태아 유형·출산 순위·소득 유형·기간별 서비스 가격과 정부지원금)을 <b>고시 원문 그대로</b> 입력하세요.
        이용자가 고른 조건으로 본인부담금이 계산됩니다. 그 해 기준표가 비어 있으면 이용자 신청은 「요율 미설정」으로 접수되고 계약 상세에서 금액을 직접 넣을 수 있어요.
        이미 맺은 계약 금액은 기준표를 고쳐도 바뀌지 않습니다.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm font-semibold text-warm-700" htmlFor="mnh-year">연도</label>
        <select id="mnh-year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 rounded-lg border border-warm-200 px-2 text-sm">
          {years.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <Button size="sm" onClick={() => setDraft({ ...EMPTY })}><Plus />행 추가</Button>
        {rows.length === 0 && (q.data?.data.years ?? []).includes(year - 1) && (
          <Button size="sm" variant="outline" disabled={copy.isPending} onClick={() => copy.mutate()}><Copy />{year - 1}년 행 복사</Button>
        )}
      </div>

      {draft && labels && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <form
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
              onSubmit={(e) => { e.preventDefault(); save.mutate(draft); }}
            >
              <Field label="태아 유형">
                <select className="h-10 w-full rounded-lg border border-warm-200 px-2 text-sm" value={draft.fetus_type} onChange={(e) => setDraft({ ...draft, fetus_type: e.target.value })}>
                  {Object.entries(labels.fetus_types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="출산 순위">
                <select className="h-10 w-full rounded-lg border border-warm-200 px-2 text-sm" value={draft.birth_order} onChange={(e) => setDraft({ ...draft, birth_order: e.target.value })}>
                  {Object.entries(labels.birth_orders).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="소득 유형(고시 명칭)">
                <Input required maxLength={30} value={draft.income_tier} onChange={(e) => setDraft({ ...draft, income_tier: e.target.value })} placeholder="예: A-가형" />
              </Field>
              <Field label="기간">
                <select className="h-10 w-full rounded-lg border border-warm-200 px-2 text-sm" value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })}>
                  {Object.entries(labels.periods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label={`일수(${labels.min_days}~${labels.max_days})`}>
                <Input required type="number" min={labels.min_days} max={labels.max_days} value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value })} />
              </Field>
              <Field label="서비스 가격(원)">
                <Input required type="number" min={0} value={draft.total_price} onChange={(e) => setDraft({ ...draft, total_price: e.target.value })} />
              </Field>
              <Field label="정부지원금(원)">
                <Input required type="number" min={0} value={draft.gov_support} onChange={(e) => setDraft({ ...draft, gov_support: e.target.value })} />
              </Field>
              <Field label="본인부담금(자동)">
                <div className={cn("h-10 flex items-center px-3 rounded-lg bg-warm-50 text-sm font-bold", selfPay !== null && selfPay < 0 && "text-danger")}>
                  {selfPay === null ? "-" : selfPay < 0 ? "지원금이 가격보다 커요" : formatKRW(selfPay)}
                </div>
              </Field>
              <Field label="비고" className="col-span-2 md:col-span-3">
                <Input maxLength={200} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="고시 번호·근거 등" />
              </Field>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={save.isPending || selfPay === null || selfPay < 0}>{draft.id ? "고치기" : "추가"}</Button>
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>닫기</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>태아</TableHead><TableHead>출산 순위</TableHead><TableHead>소득 유형</TableHead><TableHead>기간</TableHead>
                <TableHead className="text-right">일수</TableHead><TableHead className="text-right">서비스 가격</TableHead>
                <TableHead className="text-right">정부지원금</TableHead><TableHead className="text-right">본인부담금</TableHead>
                <TableHead>비고</TableHead><TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-warm-500 py-10">{q.isLoading ? "불러오는 중…" : `${year}년 기준표가 비어 있어요. 고시를 보고 행을 추가하세요.`}</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className={cn(!r.is_active && "opacity-50")}>
                  <TableCell>{labels?.fetus_types[r.fetus_type] ?? r.fetus_type}</TableCell>
                  <TableCell>{labels?.birth_orders[r.birth_order] ?? r.birth_order}</TableCell>
                  <TableCell className="font-semibold">{r.income_tier}</TableCell>
                  <TableCell>{labels?.periods[r.period] ?? r.period}</TableCell>
                  <TableCell className="text-right">{r.days}</TableCell>
                  <TableCell className="text-right">{formatKRW(r.total_price)}</TableCell>
                  <TableCell className="text-right">{formatKRW(r.gov_support)}</TableCell>
                  <TableCell className="text-right font-bold">{formatKRW(r.self_pay)}</TableCell>
                  <TableCell className="text-xs text-warm-500">{!r.is_active && "사용 중지 · "}{r.note}{r.contracts > 0 && ` · 계약 ${r.contracts}건`}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label="고치기" onClick={() => setDraft({ id: r.id, fetus_type: r.fetus_type, birth_order: r.birth_order, income_tier: r.income_tier, period: r.period, days: String(r.days), total_price: String(r.total_price), gov_support: String(r.gov_support), note: r.note ?? "" })}><Pencil /></Button>
                      <Button size="sm" variant="ghost" aria-label="삭제" className="text-danger hover:bg-danger-bg" onClick={() => { if (window.confirm(`${r.income_tier} ${labels?.periods[r.period] ?? ""} 행을 지울까요?`)) del.mutate(r.id); }}><Trash2 /></Button>
                    </div>
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs font-semibold text-warm-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
