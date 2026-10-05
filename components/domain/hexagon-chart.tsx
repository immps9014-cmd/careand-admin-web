"use client";

// 종합평가 육각형(레이더) — 산모신생아 4단계(CAREN-MNH-01). 축 6개, 1~5점.
// 본 시리즈(돌봄전문가)는 브랜드색 채움, 비교(팀 평균)는 회색 점선. 꼭짓점마다 큰 투명 히트영역 + 키보드 포커스로 값 표시.
// 값은 옆의 축별 표에도 그대로 있어 툴팁 없이도 읽힌다. 자료 없는 축(null)은 중심점(0)으로 그리고 「자료 없음」 표시.
import { useState } from "react";

export interface HexAxis { key: string; label: string; score: number | null; enough?: boolean }

const MAX = 5;

export function HexagonChart({ axes, compare, size = 260, mini = false, title }: {
  axes: HexAxis[]; compare?: HexAxis[] | null; size?: number; mini?: boolean; title?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const pad = mini ? 6 : 64;
  const W = size + pad * 2;
  const c = W / 2;
  const R = size / 2;
  const n = axes.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * R * (v / MAX), c + Math.sin(a) * R * (v / MAX)] as const;
  };
  const poly = (list: (number | null)[]) => list.map((v, i) => pt(i, v ?? 0).join(",")).join(" ");
  const cmp = compare && compare.length === n ? compare : null;

  return (
    <figure className="m-0" aria-label={title ?? "종합평가 육각형"}>
      <svg viewBox={`0 0 ${W} ${W}`} width="100%" style={{ maxWidth: W }} role="img"
        aria-label={`${title ?? "종합평가"}: ${axes.map((a) => `${a.label} ${a.score ?? "자료 없음"}`).join(", ")}`}>
        {/* 격자 — 1~5 고리(옅게) */}
        {[1, 2, 3, 4, 5].map((g) => (
          <polygon key={g} points={poly(axes.map(() => g))} fill="none" stroke="#E2DFDA" strokeWidth={g === 5 ? 1.2 : 0.8} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, MAX);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#E2DFDA" strokeWidth={0.8} />;
        })}
        {cmp && (
          <polygon points={poly(cmp.map((a) => a.score))} fill="none" stroke="#736D64" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
        )}
        <polygon points={poly(axes.map((a) => a.score))} fill="#D5603E" fillOpacity={0.18} stroke="#D5603E" strokeWidth={2} strokeLinejoin="round" />
        {axes.map((a, i) => {
          const [x, y] = pt(i, a.score ?? 0);
          return (
            <g key={a.key}>
              <circle cx={x} cy={y} r={hover === i ? 6 : 4.5} fill={a.score === null ? "#fff" : "#D5603E"} stroke={a.score === null ? "#736D64" : "#fff"} strokeWidth={2} />
              {!mini && (
                <circle cx={x} cy={y} r={16} fill="transparent" tabIndex={0} aria-label={`${a.label} ${a.score ?? "자료 없음"}`}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  style={{ outline: "none", cursor: "default" }} />
              )}
            </g>
          );
        })}
        {!mini && axes.map((a, i) => {
          const [x, y] = pt(i, MAX + 0.55);
          const anchor = Math.abs(x - c) < 4 ? "middle" : x > c ? "start" : "end";
          return (
            <text key={a.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={12.5} fill="#35312B" fontWeight={600}>
              {a.label}
              <tspan x={x} dy={15} fontSize={12} fontWeight={700} fill={a.score === null ? "#736D64" : "#211E1A"}>
                {a.score === null ? "자료 없음" : a.score.toFixed(1)}{a.score !== null && a.enough === false ? " ·적음" : ""}
              </tspan>
            </text>
          );
        })}
        {!mini && hover !== null && (() => {
          const a = axes[hover];
          const [x, y] = pt(hover, a.score ?? 0);
          const lines = [`${a.score === null ? "자료 없음" : a.score.toFixed(2)}`, a.label, ...(cmp ? [`팀 평균 ${cmp[hover].score?.toFixed(2) ?? "-"}`] : [])];
          const w = 120, h = 16 + lines.length * 16;
          const tx = Math.min(Math.max(x + 10, 4), W - w - 4), ty = Math.min(Math.max(y - h - 8, 4), W - h - 4);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={w} height={h} rx={6} fill="#211E1A" opacity={0.92} />
              {lines.map((l, k) => (
                <text key={k} x={tx + 10} y={ty + 18 + k * 16} fontSize={k === 0 ? 13 : 11.5} fontWeight={k === 0 ? 700 : 400} fill="#fff">{l}</text>
              ))}
            </g>
          );
        })()}
      </svg>
      {!mini && (
        <figcaption className="flex flex-wrap justify-center gap-4 text-xs text-warm-600 mt-1">
          <span className="inline-flex items-center gap-1.5"><svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#D5603E" strokeWidth="2" /></svg>{title ?? "이 돌봄전문가"}</span>
          {cmp && <span className="inline-flex items-center gap-1.5"><svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#736D64" strokeWidth="2" strokeDasharray="5 3" /></svg>팀 평균</span>}
        </figcaption>
      )}
    </figure>
  );
}
