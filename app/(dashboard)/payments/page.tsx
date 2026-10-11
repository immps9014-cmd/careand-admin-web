"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DOMAIN_LABEL } from "@/lib/caregiverType";
import { paymentsApi, type PaymentListParams, type PaymentPeriod, type PaymentRow } from "@/lib/api/payments";
import { ExportPaymentsButton } from "@/components/domain/export-payments-button";
import { cn, formatKRW, formatDateTime } from "@/lib/utils";

/**
 * 결제 내역(2026-10-11) — 대시보드 「이번 주 매출」의 건별 목록. 조회 전용.
 * 매출 = 카드 결제 완료 + 산모신생아 바우처 본인부담금 선납 − 환불. 기간은 한국 시각.
 */

const PERIODS: { key: PaymentPeriod; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "this_week", label: "이번 주" },
  { key: "last_week", label: "지난주" },
  { key: "this_month", label: "이번 달" },
  { key: "last_month", label: "지난달" },
  { key: "custom", label: "기간 지정" },
];
const KINDS = [
  { key: "", label: "전체" },
  { key: "card", label: "카드 결제" },
  { key: "voucher", label: "바우처 선납·환불" },
] as const;

const KIND_BADGE: Record<PaymentRow["kind"], { label: string; variant: "info" | "brand" | "danger" }> = {
  card: { label: "카드 결제", variant: "info" },
  voucher_prepaid: { label: "바우처 선납", variant: "brand" },
  voucher_refund: { label: "바우처 환불", variant: "danger" },
};
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid: { label: "완료", cls: "text-warm-800" },
  pending: { label: "대기", cls: "text-warn" },
  failed: { label: "실패", cls: "text-danger" },
  cancelled: { label: "취소", cls: "text-warm-500" },
  refunded: { label: "환불", cls: "text-danger" },
};
const METHOD_LABEL: Record<string, string> = { card: "카드", account: "계좌", voucher_only: "바우처만", cash: "현금", local_currency: "지역화폐" };

function readUrlParam(key: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

export default function PaymentsPage() {
  const [period, setPeriod] = useState<PaymentPeriod>("this_week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"" | "card" | "voucher">("");
  const [allStatus, setAllStatus] = useState(false); // false=매출 기준(완료만), true=카드 결제 시도 전부
  const [kw, setKw] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // 대시보드 매출 카드에서 넘어오면 /payments?period=this_week
  useEffect(() => {
    const p = readUrlParam("period");
    if (PERIODS.some((x) => x.key === p)) setPeriod(p as PaymentPeriod);
  }, []);
  useEffect(() => setPage(1), [period, from, to, kind, allStatus, q]);

  const customReady = period !== "custom" || (!!from && !!to);
  // 화면 필터 = 엑셀 다운로드 필터(쪽 번호만 빼고)
  const filters: PaymentListParams = {
    period,
    ...(period === "custom" ? { from, to } : {}),
    ...(kind ? { kind } : {}),
    ...(allStatus ? { status: "all" as const } : {}),
    ...(q ? { q } : {}),
  };
  const query = useQuery({
    queryKey: ["admin", "payments", period, from, to, kind, allStatus, q, page],
    enabled: customReady,
    queryFn: () => paymentsApi.list({ ...filters, page }),
  });
  const s = query.data?.summary;
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">결제 내역</h1>
          <p className="text-sm text-warm-500 mt-1">카드 결제와 산모신생아 바우처 본인부담금 선납·환불을 한곳에서 봅니다. 기간은 한국 시각 기준이에요.</p>
        </div>
        {/* 슈퍼관리자에게만 보인다(개인정보 다운로드 권한) */}
        <ExportPaymentsButton params={filters} rangeLabel={s ? `${s.from} ~ ${s.to}, ${meta?.total ?? 0}건` : undefined} disabled={!customReady} />
      </div>

      {/* 기간 */}
      <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="기간">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}
            className={cn("h-8 px-3 rounded-full text-xs font-semibold border", period === p.key ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")}>
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <span className="inline-flex items-center gap-1.5">
            <input type="date" aria-label="시작일" value={from} onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-md border border-warm-300 bg-white px-2 text-xs font-en" />
            <span className="text-warm-500 text-xs">~</span>
            <input type="date" aria-label="종료일" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-md border border-warm-300 bg-white px-2 text-xs font-en" />
          </span>
        )}
        {s && <span className="ml-1 text-xs text-warm-500 font-en">{s.from} ~ {s.to}</span>}
      </div>

      {/* 종류·상태·검색 */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex bg-warm-100 p-1 rounded-md" role="group" aria-label="종류">
          {KINDS.map((k) => (
            <button key={k.key || "all"} type="button" aria-pressed={kind === k.key} onClick={() => setKind(k.key)}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded", kind === k.key ? "bg-white text-warm-800 shadow-sm" : "text-warm-600 hover:text-warm-800")}>
              {k.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-700 cursor-pointer select-none">
          <input type="checkbox" checked={allStatus} onChange={(e) => setAllStatus(e.target.checked)} className="accent-brand-500" />
          대기·실패·취소 결제도 보기
        </label>
        <div className="flex-1" />
        <form className="relative w-full max-w-[260px]" onSubmit={(e) => { e.preventDefault(); setQ(kw.trim()); }}>
          <Search className="w-4 h-4 text-warm-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="결제자·주문번호·계약번호 (Enter)" className="pl-9 h-9 text-xs" />
        </form>
      </div>

      {/* 합계 — 대시보드 매출과 같은 식 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryTile label="매출 합계" value={s ? formatKRW(s.revenue) : "-"} sub="카드 결제 완료 + 바우처 선납 − 환불" strong />
        <SummaryTile label="카드 결제 완료" value={s ? formatKRW(s.card_paid.amount) : "-"} sub={s ? `${s.card_paid.count}건` : ""} />
        <SummaryTile label="바우처 순매출" value={s ? formatKRW(s.voucher.net) : "-"} sub={s ? `선납 ${s.voucher.prepaid_count}건 · 환불 ${s.voucher.refund_count}건` : ""} />
      </div>

      <Card>
        <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">건별 내역</h2>
          <span className="text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">총 {meta?.total ?? 0}건</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일시</TableHead>
              <TableHead>종류</TableHead>
              <TableHead>결제자</TableHead>
              <TableHead>대상자 · 담당</TableHead>
              <TableHead>분야</TableHead>
              <TableHead>수단</TableHead>
              <TableHead>주문·계약번호</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!customReady ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-warm-500 py-10">시작일과 종료일을 골라 주세요.</TableCell></TableRow>
            ) : query.isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-warm-500 py-10">불러오는 중…</TableCell></TableRow>
            ) : query.isError ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-danger py-10">결제 내역을 불러오지 못했어요. 권한(슈퍼·지점장·분석가)을 확인해 주세요.</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-warm-500 py-10">이 기간에 결제 내역이 없어요.</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const kb = KIND_BADGE[r.kind];
                const st = STATUS_LABEL[r.status] ?? { label: r.status, cls: "text-warm-600" };
                return (
                  <TableRow key={r.key}>
                    <TableCell className="font-en text-xs text-warm-600 whitespace-nowrap">{r.at ? formatDateTime(r.at) : "-"}</TableCell>
                    <TableCell><Badge variant={kb.variant}>{kb.label}</Badge></TableCell>
                    <TableCell className="font-medium text-warm-800">{r.payer_name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-warm-700">
                      {r.recipient_name ?? "-"}
                      {r.caregiver_name && <span className="text-warm-500"> · {r.caregiver_name}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-warm-600">{r.service_domain ? DOMAIN_LABEL[r.service_domain] ?? r.service_domain : "-"}</TableCell>
                    <TableCell className="text-xs text-warm-600">{r.method ? METHOD_LABEL[r.method] ?? r.method : "-"}</TableCell>
                    <TableCell className="font-en text-xs">
                      {r.contract_id ? (
                        <Link href={`/mnh/${r.contract_id}`} className="text-brand-600 hover:underline">{r.ref ?? `#${r.contract_id}`}</Link>
                      ) : (
                        <span className="text-warm-600">{r.ref ?? "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-right font-en font-bold whitespace-nowrap", r.amount < 0 ? "text-danger" : "text-warm-800")}>
                      {r.amount < 0 ? "−" : ""}{formatKRW(Math.abs(r.amount))}
                    </TableCell>
                    <TableCell className={cn("text-xs font-bold", st.cls)}>{st.label}</TableCell>
                  </TableRow>
                );
              })
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

function SummaryTile({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-5", strong ? "bg-white border-brand-200" : "bg-white border-warm-200/60")}>
      <div className="text-xs font-semibold text-warm-500">{label}</div>
      <div className={cn("font-en text-2xl font-extrabold mt-2 tracking-tight", strong ? "text-brand-700" : "text-warm-800")}>{value}</div>
      {sub && <div className="text-xs text-warm-500 mt-1.5">{sub}</div>}
    </div>
  );
}
