"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, FileDown, Sparkles, Users, ArrowRightLeft, DollarSign, Clock, TrendingUp, TrendingDown, Minus, MapPin, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { insightsApi, type InsightCard, type InsightStat } from "@/lib/api/insights";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "오늘 회원가입 현황",
  "오늘 매출 현황",
  "이번주 매칭 현황",
  "지난달 대비 매출 증감",
  "이번달 지역별 매출",
  "지역별 공급률",
];

const CARD_ICON: Record<string, typeof Users> = {
  signups: Users,
  matching: ArrowRightLeft,
  revenue: DollarSign,
  regional_revenue: MapPin,
  supply: Gauge,
};

function fmt(s: InsightStat): string {
  const n = new Intl.NumberFormat("ko-KR").format(s.value);
  return s.unit === "원" ? `${n}원` : `${n}${s.unit}`;
}

function DeltaChip({ c }: { c: import("@/lib/api/insights").InsightCompare }) {
  const up = c.direction === "up";
  const down = c.direction === "down";
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const tone = up
    ? "bg-brand-50 text-brand-700"
    : down
    ? "bg-danger-bg text-danger"
    : "bg-warm-100 text-warm-500";
  const sign = c.delta > 0 ? "+" : c.delta < 0 ? "−" : "±";
  const amt = new Intl.NumberFormat("ko-KR").format(Math.abs(c.delta));
  const pct = c.delta_pct !== null ? ` (${c.delta_pct > 0 ? "+" : c.delta_pct < 0 ? "−" : "±"}${Math.abs(c.delta_pct)}%)` : "";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums", tone)}>
        <Icon className="h-3.5 w-3.5" />
        {sign}
        {amt}
        {c.unit}
        {pct}
      </span>
      <span className="text-[11.5px] text-warm-500">{c.period_label} 대비</span>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-warm-500">불러오는 중…</div>}>
      <InsightsInner />
    </Suspense>
  );
}

function InsightsInner() {
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [input, setInput] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["insights", submitted],
    queryFn: () => insightsApi.query(submitted),
    enabled: submitted.trim().length > 0,
    retry: false,
  });

  function run(q: string) {
    const v = q.trim();
    if (!v) return;
    setInput(v);
    setSubmitted(v);
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="no-print">
        <div className="flex items-center gap-2 text-brand-600">
          <Sparkles className="w-4 h-4" />
          <span className="text-[11px] font-bold uppercase tracking-widest">AI 인사이트 검색</span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-warm-900">
          자연어로 운영 현황을 조회하세요
        </h1>
        <p className="mt-1 text-sm text-warm-500">
          회원가입·매칭·매출 현황을 문장으로 물어보고, 결과를 PDF로 출력할 수 있어요.
        </p>
      </div>

      {/* 검색 입력 */}
      <Card className="p-4 no-print">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-warm-500" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예) 오늘 매출 현황 / 이번주 매칭 현황 / 이번달 전체 요약"
              className="w-full rounded-xl border border-warm-200 bg-warm-50/50 py-3 pl-11 pr-4 text-sm text-warm-800 outline-none transition-colors placeholder:text-warm-500 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            <Search className="h-4 w-4" /> 검색
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => run(ex)}
              className="rounded-full border border-warm-200 bg-white px-3 py-1.5 text-xs font-medium text-warm-600 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {/* 상태 */}
      {isFetching && (
        <Card className="p-8 text-center text-sm text-warm-500 no-print">
          현황을 집계하는 중…
        </Card>
      )}
      {isError && (
        <Card className="p-6 text-center text-sm text-danger no-print">
          조회에 실패했습니다. 잠시 후 다시 시도해 주세요.
        </Card>
      )}
      {!isFetching && !submitted && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center no-print">
          <Sparkles className="h-7 w-7 text-brand-300" />
          <p className="text-sm text-warm-500">
            위 입력창에 질문을 입력하거나 예시를 눌러 시작하세요.
          </p>
        </Card>
      )}

      {/* 결과 리포트 (PDF 출력 대상) */}
      {data && !isFetching && (
        <div id="insights-report" className="space-y-5">
          {/* 리포트 머리말 */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-extrabold text-white">
                  C
                </div>
                <span className="text-base font-extrabold tracking-tight text-warm-900">
                  Care&amp; 운영 현황 리포트
                </span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-warm-700">
                “{data.query}” · <span className="text-brand-700">{data.period.label}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-warm-500">
                <Clock className="h-3 w-3" />
                생성 {new Date(data.generated_at).toLocaleString("ko-KR")}
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="no-print inline-flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm font-bold text-warm-700 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              <FileDown className="h-4 w-4" /> PDF로 저장
            </button>
          </div>

          {/* 요약 배너 */}
          <div className="rounded-xl border-l-4 border-brand-500 bg-brand-50 px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-brand-600">요약</div>
            <p className="mt-1 text-[15px] font-semibold leading-relaxed text-warm-800">
              {data.summary}
            </p>
          </div>

          {/* 지표 카드 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.cards.map((c) => (
              <MetricCard key={c.key} card={c} />
            ))}
          </div>

          {data.cards.length === 0 && (
            <Card className="p-8 text-center text-sm text-warm-500">
              해당 기간에 표시할 데이터가 없습니다.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ card }: { card: InsightCard }) {
  const Icon = CARD_ICON[card.key] ?? Users;
  const maxRow = card.breakdown?.rows.reduce((m, r) => Math.max(m, r.value), 0) ?? 0;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <h3 className="text-sm font-bold text-warm-800">{card.title}</h3>
      </div>

      {/* 대표 지표 */}
      <div className="mt-4">
        <div className="text-[12px] font-medium text-warm-500">{card.primary.label}</div>
        <div className="mt-0.5 text-[28px] font-extrabold leading-tight tracking-tight text-warm-900 tabular-nums">
          {fmt(card.primary)}
        </div>
        {card.compare && <DeltaChip c={card.compare} />}
      </div>

      {/* 보조 지표 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {card.stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-warm-50 px-2.5 py-2">
            <div className="truncate text-[11px] font-medium text-warm-500">{s.label}</div>
            <div className="mt-0.5 text-[13.5px] font-bold text-warm-800 tabular-nums">{fmt(s)}</div>
          </div>
        ))}
      </div>

      {/* 도메인별 분해 */}
      {card.breakdown && card.breakdown.rows.length > 0 && (
        <div className="mt-4 border-t border-warm-100 pt-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-warm-500">
            {card.breakdown.title}
          </div>
          <div className="space-y-1.5">
            {card.breakdown.rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2.5">
                <div className="w-24 shrink-0 truncate text-[12px] font-medium text-warm-600" title={r.label}>{r.label}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-warm-100">
                  <div
                    className="h-full rounded-full bg-brand-400"
                    style={{ width: maxRow > 0 ? `${Math.max(6, (r.value / maxRow) * 100)}%` : "0%" }}
                  />
                </div>
                <div className="w-24 shrink-0 text-right text-[12px] font-bold text-warm-800 tabular-nums">
                  {card.breakdown!.unit === "원"
                    ? `${new Intl.NumberFormat("ko-KR").format(r.value)}원`
                    : `${r.value}${card.breakdown!.unit}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
