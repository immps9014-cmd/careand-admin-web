"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  Network,
  Search,
  ShieldAlert,
  UserMinus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ontologyApi,
  type CaregiverBrief,
  type OntologyStatus,
} from "@/lib/api/ontology";
import { cn } from "@/lib/utils";

/**
 * 온톨로지 분석 — 돌봄 역량 커버리지와 인력 이탈 영향
 *
 * 그래프는 DB 의 스냅샷(매시 :10 재적재)이라 **데이터 기준 시각을 항상 같이 보여준다.**
 * 그게 안 보이면 오래된 수치를 최신으로 읽는다. 조회 전용 화면이다.
 */

/** 데이터 기준 시각 칩 — 2회분(2시간 10분) 넘게 안 돌았으면 주황 경고 */
function DataAsOf({ status }: { status: OntologyStatus | null }) {
  if (!status?.data_at) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 text-[12px] font-bold text-warn">
        <Clock className="h-3.5 w-3.5" /> 적재 이력 없음
      </span>
    );
  }
  const age =
    status.age_min === null
      ? ""
      : status.age_min < 60
      ? ` · ${status.age_min}분 전`
      : ` · ${Math.floor(status.age_min / 60)}시간 ${status.age_min % 60}분 전`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold",
        status.stale ? "bg-warn-bg text-warn" : "bg-warm-100 text-warm-600"
      )}
      title={
        status.stale
          ? "재적재가 2회분 이상 밀렸습니다. /var/log/caren-ontology.log 를 확인하세요."
          : "매시 10분에 DB 에서 다시 적재합니다."
      }
    >
      <Clock className="h-3.5 w-3.5" />
      데이터 기준 {status.data_at.slice(5, 16)}
      {age}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card className="p-4">
      <div className="text-[11.5px] font-bold uppercase tracking-wider text-warm-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight",
          tone === "warn" ? "text-warn" : "text-warm-900"
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-warm-500">{sub}</div>}
    </Card>
  );
}

export default function OntologyPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ontology", "overview"],
    queryFn: ontologyApi.overview,
    retry: false,
  });

  const { data: impact, isFetching: impactLoading } = useQuery({
    queryKey: ["ontology", "impact", selected],
    queryFn: () => ontologyApi.caregiverImpact(selected as number),
    enabled: selected !== null,
    retry: false,
  });

  const diseases = data?.diseases ?? [];
  const specialties = data?.specialties ?? [];
  const caregivers = data?.caregivers ?? [];

  // 공백 = 실제 대상자가 있는데 필요 특기를 가진 활성 인력이 0명인 질병. 화면의 존재 이유다.
  const gaps = diseases.filter((d) => d.caregivers === 0 && d.recipients > 0);
  const activeCount = caregivers.filter((c) => c.status === "active").length;
  const missingSpecialties = specialties.filter(
    (s) => s.required_by_disease && s.caregivers === 0
  );

  const filtered = caregivers.filter((c) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(needle) ||
      String(c.id) === needle ||
      c.specialties.some((s) => s.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-brand-600">
            <Network className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              온톨로지 분석
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-warm-900">
            돌봄 역량 커버리지와 이탈 영향
          </h1>
          <p className="mt-1 text-sm text-warm-500">
            질병 → 필요 특기 → 보유 인력을 온톨로지로 이어 공급 공백을 찾고, 인력 한 명이
            빠질 때 흔들리는 매칭과 대체 후보를 봅니다.
          </p>
        </div>
        <DataAsOf status={data?.status ?? null} />
      </div>

      {/* 온톨로지 미가용 — 화면은 살아 있고 분석 영역만 빈다 */}
      {(isError || (data && !data.available)) && (
        <Card className="flex items-start gap-3 border-warn/30 bg-warn-bg p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <div className="text-sm text-warm-700">
            <div className="font-bold text-warn">온톨로지 그래프를 읽을 수 없습니다</div>
            <p className="mt-0.5 text-[13px]">
              {data?.error ??
                "Fuseki(moai-fuseki 컨테이너)가 응답하지 않습니다. 매칭·STT 는 폴백으로 계속 동작합니다."}
            </p>
          </div>
        </Card>
      )}

      {isLoading && (
        <div className="p-8 text-sm text-warm-500">불러오는 중…</div>
      )}

      {data?.available && (
        <>
          {/* 요약 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="공급 공백 질병"
              value={gaps.length}
              sub={gaps.length ? gaps.map((g) => g.label).join(" · ") : "없음"}
              tone={gaps.length ? "warn" : "default"}
            />
            <Stat label="활성 인력" value={activeCount} sub={`전체 ${caregivers.length}명`} />
            <Stat
              label="인력 없는 필요 특기"
              value={missingSpecialties.length}
              sub={
                missingSpecialties.length
                  ? missingSpecialties.map((s) => s.label).join(" · ")
                  : "없음"
              }
              tone={missingSpecialties.length ? "warn" : "default"}
            />
            <Stat
              label="그래프 트리플"
              value={(data.status?.triples ?? 0).toLocaleString("ko-KR")}
              sub={`점검 경고 ${data.status?.warnings ?? 0}건`}
            />
          </div>

          {/* 질병별 커버리지 */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-warm-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-warm-800">질병별 공급 커버리지</h2>
                <p className="mt-0.5 text-[12px] text-warm-500">
                  필요 특기는 온톨로지의 상·하위 관계까지 펼쳐 계산합니다(근접 특기 인정).
                </p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>질병</TableHead>
                  <TableHead className="text-right">대상자</TableHead>
                  <TableHead className="text-right">요청</TableHead>
                  <TableHead>필요 특기</TableHead>
                  <TableHead className="text-right">보유 인력</TableHead>
                  <TableHead>판정</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diseases.map((d) => {
                  const gap = d.caregivers === 0 && d.recipients > 0;
                  return (
                    <TableRow key={d.id} className={cn(gap && "bg-warn-bg/60")}>
                      <TableCell className="font-bold text-warm-800">
                        {d.label}
                        {!d.in_db && (
                          <span className="ml-2 text-[11px] font-medium text-warm-400">
                            어휘만 등록
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.recipients}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.requests}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {d.required_specialties.map((s) => (
                            <span
                              key={s}
                              className="rounded-md bg-warm-100 px-1.5 py-0.5 text-[11.5px] text-warm-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-bold tabular-nums",
                          gap ? "text-warn" : "text-warm-800"
                        )}
                      >
                        {d.caregivers}
                      </TableCell>
                      <TableCell>
                        {gap ? (
                          <Badge variant="warn">
                            <AlertTriangle className="h-3 w-3" /> 공백
                          </Badge>
                        ) : d.caregivers === 0 ? (
                          <span className="text-[12px] text-warm-400">대상자 없음</span>
                        ) : (
                          <Badge variant="success">충족</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* 특기별 공급 */}
          <Card className="p-5">
            <h2 className="text-base font-bold text-warm-800">특기별 활성 인력</h2>
            <p className="mt-0.5 text-[12px] text-warm-500">
              질병이 요구하는데 보유 인력이 없는 특기는 주황색입니다 — 위 공백의 원인입니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {specialties.map((s) => (
                <span
                  key={s.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12.5px]",
                    s.caregivers === 0 && s.required_by_disease
                      ? "border-warn/40 bg-warn-bg text-warn"
                      : s.caregivers === 0
                      ? "border-warm-200 bg-warm-50 text-warm-400"
                      : "border-warm-200 bg-white text-warm-700"
                  )}
                >
                  {s.label}
                  <span className="font-bold tabular-nums">{s.caregivers}</span>
                </span>
              ))}
            </div>
          </Card>

          {/* 인력 이탈 영향분석 */}
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card className="overflow-hidden">
              <div className="border-b border-warm-100 px-4 py-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-warm-800">
                  <Users className="h-4 w-4 text-brand-600" /> 인력 선택
                </h2>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="이름·ID·특기로 검색"
                    className="w-full rounded-lg border border-warm-200 bg-warm-50/50 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-brand-400 focus:bg-white"
                  />
                </div>
              </div>
              <div className="max-h-[420px] overflow-auto">
                {filtered.map((c: CaregiverBrief) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 border-b border-warm-100 px-4 py-2.5 text-left transition-colors hover:bg-warm-50",
                      selected === c.id && "bg-brand-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[13px] font-bold text-warm-800">
                        {c.name}
                        <span className="font-mono text-[11px] font-normal text-warm-400">
                          #{c.id}
                        </span>
                        {c.status !== "active" && (
                          <span className="rounded bg-warm-100 px-1 text-[10.5px] text-warm-500">
                            {c.status}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11.5px] text-warm-500">
                        {c.specialties.join(", ") || "특기 미등록"}
                      </div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-4 py-6 text-center text-[13px] text-warm-500">
                    일치하는 인력이 없습니다.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-warm-800">
                <UserMinus className="h-4 w-4 text-brand-600" /> 이탈 영향분석
              </h2>
              {selected === null && (
                <p className="mt-6 text-center text-[13px] text-warm-500">
                  왼쪽에서 인력을 고르면 담당 매칭·세션과 대체 후보를 보여줍니다.
                </p>
              )}
              {selected !== null && impactLoading && (
                <p className="mt-6 text-[13px] text-warm-500">분석 중…</p>
              )}
              {impact?.found && impact.caregiver && (
                <div className="mt-4 space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-extrabold text-warm-900">
                      {impact.caregiver.name}
                    </span>
                    <span className="font-mono text-[12px] text-warm-400">
                      #{impact.caregiver.id}
                    </span>
                    <Badge variant={impact.caregiver.status === "active" ? "success" : "outline"}>
                      {impact.caregiver.status}
                    </Badge>
                    {impact.caregiver.rating !== null && (
                      <span className="text-[12.5px] text-warm-500">
                        평점 {impact.caregiver.rating} · 완료 {impact.caregiver.completed_sessions}회
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {impact.caregiver.specialties.map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11.5px] text-brand-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[11.5px] font-bold uppercase tracking-wider text-warm-500">
                        담당 매칭 {impact.matches?.length ?? 0}건
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {(impact.matches ?? []).map((m) => (
                          <li
                            key={m.match_id}
                            className="flex items-center justify-between rounded-lg bg-warm-50 px-2.5 py-1.5 text-[12.5px]"
                          >
                            <span className="text-warm-700">
                              {m.recipient}
                              <span className="ml-1.5 text-warm-400">
                                {m.scheduled_start?.slice(5, 16).replace("T", " ")}
                              </span>
                            </span>
                            <span className="text-warm-500">{m.status}</span>
                          </li>
                        ))}
                        {!impact.matches?.length && (
                          <li className="text-[12.5px] text-warm-400">없음</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[11.5px] font-bold uppercase tracking-wider text-warm-500">
                        세션 {impact.sessions?.length ?? 0}건
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {(impact.sessions ?? []).map((s) => (
                          <li
                            key={s.session_id}
                            className="flex items-center justify-between rounded-lg bg-warm-50 px-2.5 py-1.5 text-[12.5px]"
                          >
                            <span className="text-warm-700">
                              #{s.session_id}
                              <span className="ml-1.5 text-warm-400">
                                {s.scheduled_start?.slice(5, 16).replace("T", " ")}
                              </span>
                            </span>
                            <span className="text-warm-500">{s.status}</span>
                          </li>
                        ))}
                        {!impact.sessions?.length && (
                          <li className="text-[12.5px] text-warm-400">없음</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {!!impact.recipient_diseases?.length && (
                    <div>
                      <div className="text-[11.5px] font-bold uppercase tracking-wider text-warm-500">
                        담당 대상자의 질병
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {impact.recipient_diseases.map((d) => (
                          <span
                            key={d}
                            className="rounded-md bg-info-bg px-2 py-0.5 text-[12px] text-info"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[11.5px] font-bold uppercase tracking-wider text-warm-500">
                      대체 후보 {impact.alternatives?.length ?? 0}명
                      <span className="ml-1.5 font-medium normal-case tracking-normal text-warm-400">
                        공통 특기는 온톨로지 상·하위까지 펼쳐 셉니다. 거리는 좌표가
                        1.1km 단위로 반올림돼 있어 근사값입니다.
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {(impact.alternatives ?? []).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelected(a.id)}
                          className="flex items-center justify-between rounded-lg border border-warm-200 px-3 py-2 text-left text-[12.5px] transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                        >
                          <span className="font-bold text-warm-800">
                            {a.name}
                            <span className="ml-1 font-mono text-[11px] font-normal text-warm-400">
                              #{a.id}
                            </span>
                          </span>
                          <span className="text-warm-500">
                            공통 {a.shared_specialties}
                            {a.rating !== null && ` · ★${a.rating}`}
                            {a.distance_km !== null && ` · ${a.distance_km}km`}
                          </span>
                        </button>
                      ))}
                      {!impact.alternatives?.length && (
                        <div className="text-[12.5px] text-warn">
                          대체 후보가 없습니다 — 이 인력이 빠지면 공백이 생깁니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {impact && !impact.found && !impactLoading && (
                <p className="mt-6 text-[13px] text-warm-500">
                  그래프에 없는 인력입니다. 최근 등록됐다면 다음 재적재(매시 10분) 뒤에 보입니다.
                </p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
