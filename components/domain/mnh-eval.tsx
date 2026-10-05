"use client";

// 산모신생아 양방향 평가·종합평가 육각형 — 관리자(CAREN-MNH-01 4단계, 2026-10-05)
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { HexagonChart } from "@/components/domain/hexagon-chart";
import { mnhEvalApi, type MnhEvaluation } from "@/lib/api/mnh";

const labelCls = "block text-xs font-semibold text-warm-600 mb-1";
const SCORE_LABEL = ["", "매우 미흡", "미흡", "보통", "우수", "매우 우수"];

/** 1~5점 고르기 — 항목마다 한 줄 */
export function ScoreRows({ items, value, onChange }: { items: { key: string; label: string }[]; value: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.key} className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={it.label}>
          <span className="w-28 text-sm font-semibold text-warm-700">{it.label}</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={value[it.key] === n} title={SCORE_LABEL[n]}
              onClick={() => onChange({ ...value, [it.key]: n })}
              className={cn("w-9 h-9 rounded-lg border text-sm font-bold", value[it.key] === n ? "bg-brand-500 border-brand-500 text-white" : "bg-white border-warm-200 text-warm-600 hover:bg-warm-50")}>
              {n}
            </button>
          ))}
          {value[it.key] && <span className="text-xs text-warm-500">{SCORE_LABEL[value[it.key]]}</span>}
        </div>
      ))}
    </div>
  );
}

/** 기관 평가 입력 */
function OrgEvalForm({ caregiverId, items, contracts, fixedContractId, onSaved }: {
  caregiverId: number; items: { key: string; label: string }[];
  contracts?: { id: number; contract_no: string; status: string; client_name: string | null }[];
  fixedContractId?: number; onSaved: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [timing, setTiming] = useState<"interim" | "final">("interim");
  const [contractId, setContractId] = useState<string>(fixedContractId ? String(fixedContractId) : "");
  const save = useMutation({
    mutationFn: () => mnhEvalApi.submitOrg({ caregiver_id: caregiverId, contract_id: contractId ? Number(contractId) : null, scores, comment: comment.trim() || undefined, timing }),
    onSuccess: (r) => { toast.success(r.message ?? "저장했어요."); setScores({}); setComment(""); onSaved(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const complete = items.every((i) => scores[i.key]);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <ScoreRows items={items} value={scores} onChange={setScores} />
      <div className="grid sm:grid-cols-2 gap-2">
        {!fixedContractId && (
          <label><span className={labelCls}>계약(선택 — 종료 평가는 필수)</span>
            <select className="h-10 w-full rounded-lg border border-warm-200 px-2 text-sm" value={contractId} onChange={(e) => setContractId(e.target.value)}>
              <option value="">계약 없이(수시)</option>
              {contracts?.map((c) => <option key={c.id} value={c.id}>{c.contract_no} · {c.client_name ?? ""} · {c.status === "completed" ? "종료" : "진행"}</option>)}
            </select>
          </label>
        )}
        <label><span className={labelCls}>시점</span>
          <select className="h-10 w-full rounded-lg border border-warm-200 px-2 text-sm" value={timing} onChange={(e) => setTiming(e.target.value as "interim" | "final")}>
            <option value="interim">수시</option><option value="final">종료</option>
          </select>
        </label>
      </div>
      <label className="block"><span className={labelCls}>기타사항</span>
        <textarea rows={2} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-lg border border-warm-200 p-2 text-sm" />
      </label>
      <Button type="submit" size="sm" disabled={!complete || save.isPending}>기관 평가 저장</Button>
    </form>
  );
}

function EvalList({ rows, showCaregiver }: { rows: MnhEvaluation[]; showCaregiver?: boolean }) {
  if (!rows.length) return <p className="text-sm text-warm-500">아직 없어요.</p>;
  return (
    <ul className="divide-y divide-warm-100">
      {rows.map((e) => (
        <li key={e.id} className="py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-warm-800">{e.kind === "org_to_caregiver" ? "기관 → 관리사" : "관리사 → 이용자"}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-warm-100 text-warm-700">{e.timing_label}</span>
            {showCaregiver && e.caregiver_name && <span className="text-warm-600">{e.caregiver_name}</span>}
            {e.contract_no && <span className="font-mono text-xs text-warm-500">{e.contract_no}</span>}
            <span className="ml-auto text-xs text-warm-500">{e.evaluator_name ?? ""} · {e.updated_at.slice(0, 10)}</span>
          </div>
          <p className="text-warm-700 mt-0.5">{e.items.map((i) => `${i.label} ${i.score}`).join(" · ")} <b className="ml-1">평균 {e.average?.toFixed(1)}</b></p>
          {e.comment && <p className="text-warm-600 mt-0.5">“{e.comment}”</p>}
        </li>
      ))}
    </ul>
  );
}

/* ───────────── 계약 상세 — 평가 카드 ───────────── */

export function ContractEvalCard({ contractId, status }: { contractId: number; status: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "mnh", "contract-evals", contractId], queryFn: () => mnhEvalApi.forContract(contractId), enabled: status !== "applied" });
  const [target, setTarget] = useState<number | null>(null);
  const d = q.data?.data;
  if (status === "applied" || status === "cancelled") return null;
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-bold text-warm-800 mb-3">양방향 평가</h2>
        <p className="text-xs text-warm-500 mb-2">관리사가 남긴 이용자 평가는 이용자에게 보이지 않아요. 이용자 → 관리사 평가는 후기(6항목)로 받아요.</p>
        {d && <EvalList rows={d.evaluations} showCaregiver />}
        {d && d.caregivers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-warm-100">
            <p className={labelCls}>기관 평가 남기기</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {d.caregivers.map((c) => (
                <Button key={c.caregiver_id} size="sm" variant={target === c.caregiver_id ? "primary" : "outline"} onClick={() => setTarget(target === c.caregiver_id ? null : c.caregiver_id)}>{c.name}</Button>
              ))}
            </div>
            {target && (
              <OrgEvalForm caregiverId={target} items={d.org_items} fixedContractId={contractId}
                onSaved={() => { setTarget(null); qc.invalidateQueries({ queryKey: ["admin", "mnh", "contract-evals", contractId] }); qc.invalidateQueries({ queryKey: ["admin", "mnh", "hex"] }); }} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────── 인력 평가 탭 ───────────── */

export function EvaluationTab() {
  const [months, setMonths] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const q = useQuery({ queryKey: ["admin", "mnh", "hex", months], queryFn: () => mnhEvalApi.hexagons(months || undefined) });
  const d = q.data?.data;
  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        근무 기록(출근 정시율·근무일지/제공기록지 작성률) + 이용자 평가(후기 6항목) + 기관 평가(근태·숙련도·서비스 마인드)를 6개 축으로 모았어요.
        축마다 여러 출처를 똑같은 비중으로 평균하고, 근거가 {d?.min_samples ?? 3}건보다 적으면 「적음」으로 표시해요. 축 구성은 운영 판단으로 바꿀 수 있어요(config/mnh_eval.php).
      </p>
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="mnh-months" className="text-sm font-semibold text-warm-700">기간</label>
        <select id="mnh-months" className="h-9 rounded-lg border border-warm-200 px-2 text-sm" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          <option value={0}>전체</option><option value={3}>최근 3개월</option><option value={6}>최근 6개월</option><option value={12}>최근 12개월</option>
        </select>
      </div>
      {q.isError && <p className="text-sm">{getApiErrorMessage(q.error)}</p>}
      {d && d.caregivers.length === 0 && <p className="text-sm text-warm-500">산모신생아 직군 돌봄전문가가 없어요.</p>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {d?.caregivers.map((c) => (
          <button key={c.caregiver_id} onClick={() => setSel(c.caregiver_id)} className="text-left">
            <Card className="hover:border-brand-300 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-24 shrink-0"><HexagonChart axes={c.axes} size={84} mini /></div>
                <div className="min-w-0">
                  <p className="font-bold text-warm-800">{c.name}{c.status !== "active" && <span className="ml-1 text-xs font-normal text-warm-500">({c.status})</span>}</p>
                  <p className="text-2xl font-extrabold text-warm-800 tabular-nums">{c.overall?.toFixed(1) ?? "-"}<span className="text-sm font-semibold text-warm-500"> / 5</span></p>
                  <p className="text-xs text-warm-500">후기 {c.counts.reviews} · 기관 {c.counts.org_evaluations} · 완료 방문 {c.counts.completed_visits}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
      {sel && d && <CaregiverEvalPanel id={sel} months={months} team={d.team_average} onClose={() => setSel(null)} />}
    </>
  );
}

function CaregiverEvalPanel({ id, months, team, onClose }: { id: number; months: number; team: { key: string; label: string; score: number | null }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "mnh", "hex", "cg", id, months], queryFn: () => mnhEvalApi.caregiver(id, months || undefined) });
  const d = q.data?.data;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="종합평가" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl my-6 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-warm-800 flex-1">{d?.name ?? "불러오는 중…"} · 종합평가</h2>
          {d && <span className="text-2xl font-extrabold tabular-nums">{d.overall?.toFixed(2) ?? "-"}</span>}
          <button onClick={onClose} aria-label="닫기" className="p-1 rounded hover:bg-warm-100"><X className="w-5 h-5" /></button>
        </div>
        {d && (
          <>
            <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
              <HexagonChart axes={d.axes} compare={team} title={d.name} size={240} />
              <table className="w-full text-sm">
                <caption className="sr-only">축별 점수와 근거</caption>
                <thead><tr className="text-xs text-warm-500 text-left"><th className="py-1">축 · 근거</th><th className="text-right">점수</th><th className="text-right">건수</th></tr></thead>
                <tbody>
                  {d.axes.map((a) => (
                    <FragmentRows key={a.key} a={a} team={team.find((t) => t.key === a.key)?.score ?? null} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <section>
                <h3 className="text-sm font-bold text-warm-800 mb-2">기관 평가 남기기</h3>
                <OrgEvalForm caregiverId={id} items={d.org_items} contracts={d.contracts}
                  onSaved={() => { qc.invalidateQueries({ queryKey: ["admin", "mnh", "hex"] }); }} />
              </section>
              <section>
                <h3 className="text-sm font-bold text-warm-800 mb-2">기관 평가 기록</h3>
                <EvalList rows={d.org_evaluations} />
              </section>
            </div>
            <section className="mt-6">
              <h3 className="text-sm font-bold text-warm-800 mb-2">이용자 후기(산모신생아)</h3>
              {d.reviews.length === 0 ? <p className="text-sm text-warm-500">아직 없어요.</p> : (
                <ul className="divide-y divide-warm-100">
                  {d.reviews.map((r) => (
                    <li key={r.id} className="py-2 text-sm">
                      <span className="font-bold">★{r.rating}</span> <span className="text-warm-600">{r.items.filter((i) => i.score).map((i) => `${i.label} ${i.score}`).join(" · ")}</span>
                      <span className="ml-2 text-xs text-warm-500">{r.contract_no ?? ""} {r.created_at.slice(0, 10)}</span>
                      {r.comment && <p className="text-warm-600">“{r.comment}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function FragmentRows({ a, team }: { a: { key: string; label: string; score: number | null; n: number; enough: boolean; sources: { label: string; value: number | null; n: number; rate?: number }[] }; team: number | null }) {
  return (
    <>
      <tr className="border-t border-warm-100">
        <td className="pt-2 font-bold text-warm-800">{a.label}{!a.enough && a.score !== null && <span className="ml-1 text-xs font-normal text-warn">근거 적음</span>}</td>
        <td className="pt-2 text-right font-bold tabular-nums">{a.score?.toFixed(2) ?? "-"}<span className="block text-[11px] font-normal text-warm-500">팀 {team?.toFixed(2) ?? "-"}</span></td>
        <td className="pt-2 text-right tabular-nums text-warm-600">{a.n}</td>
      </tr>
      {a.sources.map((s) => (
        <tr key={s.label} className="text-xs text-warm-600">
          <td className="pl-3 pb-1">{s.label}{s.rate !== undefined && ` (${Math.round(s.rate * 100)}%)`}</td>
          <td className="text-right tabular-nums pb-1">{s.value?.toFixed(2) ?? "-"}</td>
          <td className="text-right tabular-nums pb-1">{s.n}</td>
        </tr>
      ))}
    </>
  );
}
