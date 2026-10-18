"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MnhJournalTab } from "@/components/domain/mnh-journal";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, BriefcaseBusiness, CalendarClock, CalendarX2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/client";
import { ContractDocsCard } from "@/components/domain/mnh-docs";
import { ContractEvalCard } from "@/components/domain/mnh-eval";
import { cn, formatKRW } from "@/lib/utils";
import {
  mnhApi, conflictMessage, dayLabel, todayKst, kstDateTime, MNH_EVENT_LABEL, MNH_STATUS_STYLE, DOW_KO,
  type MnhContractDetail,
} from "@/lib/api/mnh";

/** 바우처 계약 상세 — 선납 확인·담당 배정/교체·연기·일정 변경·특이사항(CAREN-MNH-01 2단계) */
export default function MnhContractPage() {
  const { id } = useParams<{ id: string }>();
  const cid = Number(id);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "mnh", "contract", cid], queryFn: () => mnhApi.contract(cid) });
  const c = q.data?.data;

  const apply = (data: MnhContractDetail) => {
    qc.setQueryData(["admin", "mnh", "contract", cid], { success: true, data });
    qc.invalidateQueries({ queryKey: ["admin", "mnh", "contracts"] });
    qc.invalidateQueries({ queryKey: ["admin", "mnh", "calendar"] });
  };

  if (q.isError) return <div className="p-8 text-sm">{getApiErrorMessage(q.error)}</div>;
  if (!c) return <div className="p-8 text-sm text-warm-500">불러오는 중…</div>;
  const closed = c.status === "completed" || c.status === "cancelled";

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <Link href="/mnh" className="inline-flex items-center gap-1 text-sm text-warm-500 hover:text-warm-800 mb-3"><ArrowLeft className="w-4 h-4" />바우처 목록</Link>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">{c.client_name ?? "산모"} 님</h1>
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", MNH_STATUS_STYLE[c.status])}>{c.status_label}</span>
        <span className="font-mono text-xs text-warm-500">{c.contract_no}</span>
      </div>
      <p className="text-sm text-warm-600 mb-6">
        {c.start_date} ~ {c.end_date ?? "?"} · {c.days}일({c.completed_days}일 완료) · 매일 {c.daily_start}부터 {Math.round(c.daily_minutes / 60 * 10) / 10}시간 ·
        제공 요일 {c.weekdays.map((d) => DOW_KO[d % 7]).join("")}
      </p>
      {c.status === "cancelled" && c.cancel_reason && (
        <p className="text-sm bg-warm-100 rounded-lg px-4 py-2 mb-4">
          취소 사유: {c.cancel_reason}
          {c.cancel_notice_date && <> · 해지 통지 {c.cancel_notice_date}</>}
          {c.penalty_amount ? <> · 위약금 {formatKRW(c.penalty_amount)}</> : null}
        </p>
      )}
      {c.voucher_warning && (
        <p role="alert" className="flex items-start gap-2 text-sm text-warm-800 bg-warn-bg rounded-lg px-4 py-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />{c.voucher_warning}
        </p>
      )}
      {!closed && (c.provisional || c.start_change_request) && <ProvisionalPanel c={c} onDone={apply} />}

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <ScheduleCard c={c} closed={closed} onDone={apply} />
          <ContractDocsCard contractId={c.id} closed={c.status === "cancelled"} />
          <ContractEvalCard contractId={c.id} status={c.status} />
          <Section title="이용일지" aside={<Link href="/mnh?tab=journal" className="text-xs text-brand-700 hover:underline">전체 보기</Link>}>
            <MnhJournalTab clientId={c.postpartum_client_id} compact />
          </Section>
          <NotesCard c={c} onDone={apply} />
        </div>
        <div className="space-y-5 min-w-0">
          <ClientCard c={c} />
          <SupportCard c={c} closed={closed} onDone={apply} />
          <AddonsCard c={c} closed={closed} onDone={apply} />
          <PrepaidCard c={c} closed={closed} onDone={apply} refetch={() => q.refetch()} />
          <CaregiverCard c={c} closed={closed} onDone={apply} />
          {!closed && <SettingsCard c={c} onDone={apply} />}
          {!closed && <CancelCard c={c} onDone={apply} />}
        </div>
      </div>
    </div>
  );
}

type CardProps = { c: MnhContractDetail; closed?: boolean; onDone: (d: MnhContractDetail) => void };

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-warm-800">{title}</h2>
          {aside}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 text-sm py-1"><span className="text-warm-500 shrink-0">{k}</span><span className="text-right text-warm-800 min-w-0 break-words">{v}</span></div>;
}

const selectCls = "h-10 w-full rounded-lg border border-warm-200 bg-white px-2 text-sm";
const labelCls = "block text-xs font-semibold text-warm-600 mb-1";

/** 일정 충돌(409)이면 확인 후 force 로 다시 */
function useForceable<T>(fn: (vars: T & { force?: boolean }) => Promise<{ data: MnhContractDetail; message?: string }>, onDone: (d: MnhContractDetail) => void, after?: () => void) {
  const m = useMutation({
    mutationFn: fn,
    onSuccess: (r) => { toast.success(r.message ?? "저장했어요."); onDone(r.data); after?.(); },
    onError: (e, vars) => {
      const msg = conflictMessage(e);
      if (msg && !vars.force) {
        if (window.confirm(`${msg}\n\n그래도 진행할까요?`)) m.mutate({ ...vars, force: true });
        return;
      }
      toast.error(getApiErrorMessage(e));
    },
  });
  return m;
}

/* ───── 출산 전 예비 계약(2단계) ───── */

function ProvisionalPanel({ c, onDone }: CardProps) {
  const req = c.start_change_request ?? null;
  const [mode, setMode] = useState<"" | "date" | "reject">("");
  const [date, setDate] = useState(req?.start_date ?? c.start_date);
  const [reason, setReason] = useState("");
  const confirm = useForceable((v: { start_date?: string }) => mnhApi.confirmStart(c.id, v), onDone, () => setMode(""));
  const reject = useMutation({
    mutationFn: () => mnhApi.rejectStartRequest(c.id, reason.trim()),
    onSuccess: (r) => { toast.success(r.message ?? "반려했어요."); onDone(r.data); setMode(""); setReason(""); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const busy = confirm.isPending || reject.isPending;
  const ask = (start: string, label: string) => {
    if (window.confirm(`개시일을 ${dayLabel(start)}로 ${label}할까요? 이용자에게 알림이 가요.`)) confirm.mutate({ start_date: start });
  };

  return (
    <Card className={cn("mb-5 border-2", req ? "border-warn" : "border-info")}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <CalendarClock className={cn("w-5 h-5", req ? "text-warn" : "text-info")} />
          <h2 className="text-sm font-bold text-warm-800">{req ? "개시일 확인 요청" : "출산 전 예비 계약"}</h2>
          {c.provisional && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-info-bg text-info">예비</span>}
        </div>

        {req ? (
          <>
            <div className="grid sm:grid-cols-2 gap-x-6">
              <Row k="요청 개시일" v={<b>{dayLabel(req.start_date)} <span className="font-normal text-warm-500">({req.start_date})</span></b>} />
              <Row k="현재 개시일" v={`${dayLabel(c.start_date)} (${c.start_date})`} />
              <Row k="출산일 차이" v={req.birth_gap != null ? `${req.birth_gap}일` : "-"} />
              <Row k="개시일 변경" v={req.start_gap != null ? `${req.start_gap}일` : "-"} />
              <Row k="요청 시각" v={kstDateTime(req.requested_at)} />
              <Row k="출산일" v={c.delivery_date ? `${c.delivery_date}${c.expected_delivery_date ? ` (예정 ${c.expected_delivery_date})` : ""}` : "-"} />
            </div>
            <p className="text-sm text-warm-700 bg-warm-50 rounded-lg px-3 py-2 mt-2">사유: {req.reason || "-"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" disabled={busy} onClick={() => ask(req.start_date, "확정")}>요청대로 확정</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode(mode === "date" ? "" : "date")}>다른 날짜로 확정</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode(mode === "reject" ? "" : "reject")}>반려</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-warm-700">
              {c.birth_confirmed
                ? <>출산일 등록됨 <b>{c.delivery_date ?? "-"}</b>{c.expected_delivery_date ? `(예정 ${c.expected_delivery_date})` : ""} — 이용자 확정 대기</>
                : <>출산 전 예비 계약 — 출산 예정일 <b>{c.expected_delivery_date ?? c.delivery_date ?? "-"}</b>. 이용자가 출산일을 등록하면 개시일을 확정해요.</>}
            </p>
            <p className="text-xs text-warm-500 mt-1">현재 개시일 {dayLabel(c.start_date)} ({c.start_date})</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" disabled={busy} onClick={() => ask(c.start_date, "확정")}>지금 확정</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode(mode === "date" ? "" : "date")}>다른 날짜로 확정</Button>
            </div>
          </>
        )}

        {mode === "date" && (
          <form className="flex flex-wrap items-end gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); if (date) ask(date, "확정"); }}>
            <div>
              <label className={labelCls} htmlFor="mnh-confirm-date">개시일</label>
              <Input id="mnh-confirm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" required />
            </div>
            <Button type="submit" size="sm" disabled={busy || !date}>이 날짜로 확정</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("")}>닫기</Button>
          </form>
        )}
        {mode === "reject" && req && (
          <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) reject.mutate(); }}>
            <label className={labelCls} htmlFor="mnh-reject-reason">반려 사유(특이사항에 남아요 · 예비 계약은 유지)</label>
            <textarea id="mnh-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} required
              className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm" placeholder="예: 담당 일정이 맞지 않아 전화로 다시 조율" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="danger" disabled={busy || !reason.trim()}>반려</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setMode("")}>닫기</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* ───── 일정표 ───── */

const DAY_STYLE: Record<string, { cls: string; label: string }> = {
  planned: { cls: "bg-warm-100 text-warm-600", label: "담당 미배정" },
  scheduled: { cls: "bg-info-bg text-info", label: "예정" },
  in_progress: { cls: "bg-brand-500 text-white", label: "출근" },
  completed: { cls: "bg-brand-50 text-brand-700", label: "완료" },
};

function hm(iso: string | null) {
  return iso ? iso.slice(11, 16) : null;
}

function ScheduleCard({ c, closed, onDone }: CardProps) {
  const today = todayKst();
  const postpone = useForceable((v: { date: string; reason: string }) => mnhApi.postpone(c.id, v), onDone);
  const restore = useForceable((v: { date: string }) => mnhApi.restore(c.id, v), onDone);
  const holidayWork = useForceable((v: { date: string; work: boolean }) => mnhApi.holidayWork(c.id, v), onDone);

  return (
    <Section title={`일정표 · ${c.days}일`} aside={<span className="text-xs text-warm-500">연기·공휴일은 그날이 빠지고 끝에 하루가 붙어요</span>}>
      <ol className="divide-y divide-warm-100">
        {c.schedule.map((d) => {
          const st = DAY_STYLE[d.status] ?? DAY_STYLE.planned;
          const canPostpone = !closed && d.date >= today && (d.status === "planned" || d.status === "scheduled");
          return (
            <li key={d.date} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-12 text-xs text-warm-500">{d.seq}일차</span>
              <span className={cn("w-24 font-semibold", d.date === today && "text-brand-700")}>{dayLabel(d.date)}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", st.cls)}>{st.label}</span>
              {d.holiday && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-danger-bg text-danger">{d.holiday} 근무</span>}
              <span className="text-warm-700">{d.caregiver_name ?? ""}</span>
              {(d.actual_start || d.actual_end) && (
                <span className="text-xs text-warm-500">{hm(d.actual_start) ?? "?"} ~ {hm(d.actual_end) ?? ""}</span>
              )}
              {d.journal && <span className="basis-full text-xs text-warm-500 pl-[3.75rem] line-clamp-2">근무일지: {d.journal}</span>}
              {canPostpone && d.holiday && (
                <Button size="sm" variant="ghost" className="ml-auto" disabled={holidayWork.isPending}
                  onClick={() => { if (window.confirm(`${dayLabel(d.date)} ${d.holiday}을 다시 쉬는 날로 둘까요? 끝에 하루가 붙어요.`)) holidayWork.mutate({ date: d.date, work: false }); }}>
                  <RotateCcw />휴무로
                </Button>
              )}
              {canPostpone && !d.holiday && (
                <Button size="sm" variant="ghost" className="ml-auto" disabled={postpone.isPending}
                  onClick={() => {
                    const reason = window.prompt(`${dayLabel(d.date)}을 연기할까요? 사유(공휴일·행사 등)를 적어 주세요.`);
                    if (reason && reason.trim()) postpone.mutate({ date: d.date, reason: reason.trim() });
                  }}>
                  <CalendarX2 />연기
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {c.holidays.length > 0 && (
        <div className="mt-3 pt-3 border-t border-warm-100">
          <p className={labelCls}>공휴일이라 빠진 날</p>
          <div className="flex flex-wrap gap-2">
            {c.holidays.map((h) => (
              <span key={h.date} className="inline-flex items-center gap-1 rounded-full bg-danger-bg text-warm-800 text-xs font-semibold pl-3 pr-1 py-0.5">
                {dayLabel(h.date)} {h.name}
                {!closed && h.date >= today ? (
                  <button className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-full hover:bg-white/70 text-danger" aria-label={`${dayLabel(h.date)} 공휴일 근무로 지정`} disabled={holidayWork.isPending}
                    onClick={() => { if (window.confirm(`${dayLabel(h.date)} ${h.name}에도 제공할까요? 끝에서 하루가 줄어요.`)) holidayWork.mutate({ date: h.date, work: true }); }}>
                    <BriefcaseBusiness className="w-3.5 h-3.5" />근무
                  </button>
                ) : <span className="w-1" />}
              </span>
            ))}
          </div>
        </div>
      )}
      {c.postponed.length > 0 && (
        <div className="mt-3 pt-3 border-t border-warm-100">
          <p className={labelCls}>연기된 날</p>
          <div className="flex flex-wrap gap-2">
            {c.postponed.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full bg-warn-bg text-warm-800 text-xs font-semibold pl-3 pr-1 py-0.5">
                {dayLabel(d)}
                {!closed && d >= today && (
                  <button className="p-1 rounded-full hover:bg-white/70" aria-label={`${dayLabel(d)} 연기 되돌리기`} disabled={restore.isPending}
                    onClick={() => { if (window.confirm(`${dayLabel(d)} 연기를 되돌릴까요? 끝에 붙은 날이 빠져요.`)) restore.mutate({ date: d }); }}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      {c.cancelled_sessions.length > 0 && (
        <p className="mt-3 text-xs text-warm-500">취소된 회차 {c.cancelled_sessions.length}건(연기·교체·취소 기록)</p>
      )}
    </Section>
  );
}

/* ───── 특이사항·이력 ───── */

const DOC_TYPE_LABEL: Record<string, string> = {
  service_contract: "서비스 이용계약서", privacy_consent: "개인정보 수집·이용 동의서", user_rules: "서비스 이용자 준수사항",
  initial_consult: "초기상담 기록지", service_plan: "사회서비스 제공 계획서", receipt: "본인부담금 영수증", satisfaction: "서비스 만족도 모니터링",
};

function eventText(e: MnhContractDetail["events"][number]): string {
  const p = e.payload ?? {};
  switch (e.type) {
    case "note": return String(p.text ?? "");
    case "postponed": return `${e.date ? dayLabel(e.date) : ""} 연기 — ${String(p.reason ?? "")}${p.new_end ? ` (종료 ${String(p.new_end)})` : ""}`;
    case "restored": return `${e.date ? dayLabel(e.date) : ""} 연기 되돌림`;
    case "holiday_work": return `${e.date ? dayLabel(e.date) : ""} ${String(p.name ?? "")} 근무 지정${p.new_end ? ` (종료 ${String(p.new_end)})` : ""}`;
    case "holiday_off": return `${e.date ? dayLabel(e.date) : ""} ${String(p.name ?? "")} 휴무로 되돌림${p.new_end ? ` (종료 ${String(p.new_end)})` : ""}`;
    case "holiday_changed": return `${e.date ? dayLabel(e.date) : ""} 공휴일 ${p.name ? `추가(${String(p.name)})` : "삭제"}${p.new_end ? ` (종료 ${String(p.new_end)})` : ""}`;
    case "swapped": return `${e.date ? dayLabel(e.date) : ""}부터 교체 · ${String(p.sessions ?? "")}회 — ${String(p.reason ?? "")}`;
    case "prepaid": return `${formatKRW(Number(p.amount ?? 0))} · ${String(p.method ?? "")}${p.receipt_no ? ` · 영수증 ${String(p.receipt_no)}` : ""}`;
    case "support_set": return `본인부담금 ${formatKRW(Number(p.self_pay ?? 0))}`;
    case "start_changed": return `변경: ${Object.keys((p.after as Record<string, unknown>) ?? {}).join(", ")}`;
    case "addons_changed": return `${formatKRW(Number(p.before ?? 0))} → ${formatKRW(Number(p.after ?? 0))} · ${String(p.count ?? 0)}개 항목`;
    case "cancelled": return `${String(p.reason ?? "")}${p.notice_date ? ` · ${dayLabel(String(p.notice_date))} 통지` : ""}${p.penalty_amount ? ` · 위약금 ${formatKRW(Number(p.penalty_amount))}` : ""}`;
    case "birth_confirmed": return `${p.by === "member" ? "이용자" : "기관"} 확정${e.date ? ` · 개시 ${dayLabel(e.date)}` : ""}`;
    case "start_review": return `${p.start_date ? `${dayLabel(String(p.start_date))} 개시 요청 — ` : ""}${String(p.reason ?? "")}`;
    case "evaluated": return `${p.kind === "org_to_caregiver" ? "기관 → 관리사" : "관리사 → 이용자"} · ${p.timing === "final" ? "종료" : "수시"}`;
    case "doc_issued": case "doc_signed": return DOC_TYPE_LABEL[String(p.doc_type ?? "")] ?? String(p.doc_type ?? "");
    default: return e.date ? dayLabel(e.date) : "";
  }
}

function NotesCard({ c, onDone }: CardProps) {
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const add = useMutation({
    mutationFn: () => mnhApi.note(c.id, { ...(date ? { date } : {}), text: text.trim() }),
    onSuccess: (r) => { toast.success(r.message ?? "남겼어요."); onDone(r.data); setText(""); setDate(""); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <Section title="특이사항 · 이력">
      <form className="flex flex-wrap gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate(); }}>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" aria-label="날짜(선택)" />
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="행사·연락·요청 등 (날짜를 넣으면 달력에 표시)" className="flex-1 min-w-[200px]" aria-label="특이사항" />
        <Button type="submit" size="md" disabled={add.isPending || !text.trim()}>남기기</Button>
      </form>
      <ol className="space-y-2">
        {[...c.events].reverse().map((e) => (
          <li key={e.id} className="text-sm flex gap-3">
            <span className="text-xs text-warm-500 w-24 shrink-0">{e.created_at.slice(5, 16).replace("T", " ")}</span>
            <span className="font-semibold text-warm-700 w-24 shrink-0">{MNH_EVENT_LABEL[e.type] ?? e.type}</span>
            <span className="text-warm-700 min-w-0 break-words">{e.type === "note" && e.date ? `[${dayLabel(e.date)}] ` : ""}{eventText(e)}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ───── 이용자 ───── */

const fmtPhone = (p?: string | null) => (p ?? "").replace(/^(02|0\d{2})(\d{3,4})(\d{4})$/, "$1-$2-$3");

function ClientCard({ c }: { c: MnhContractDetail }) {
  return (
    <Section title="이용자">
      <Row k="산모" v={c.client_name ?? "-"} />
      <Row k="신청 회원" v={c.user?.name ?? "-"} />
      <Row k="출산(예정)일" v={c.delivery_date ?? "-"} />
      <Row k="주소" v={c.address || "-"} />
      <Row k="비상연락처" v={c.client_emergency_contact
        ? `${c.client_emergency_contact.name}(${c.client_emergency_contact.relation}) ${fmtPhone(c.client_emergency_contact.phone)}`
        : <span className="text-warm-500">미등록</span>} />
      {c.care_profile_summary && <Row k="가정 정보" v={c.care_profile_summary} />}
      {c.member_note && <Row k="이용자 메모" v={c.member_note} />}
    </Section>
  );
}

/* ───── 추가 서비스·대여(계약서 별지 ③④, CAREN-MNH-02 C) ───── */

type CustomRow = { kind: string; name: string; unit_label: string; price: string; qty: string };

function AddonsCard({ c, closed, onDone }: CardProps) {
  const list = c.addons ?? [];
  const [edit, setEdit] = useState(false);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const catalog = useQuery({ queryKey: ["admin", "mnh", "addons"], queryFn: () => mnhApi.addons(), enabled: edit });
  const kinds = catalog.data?.data.kinds ?? { extra: "추가 서비스", rental: "대여용품" };
  const start = () => {
    setQty(Object.fromEntries(list.filter((a) => a.id != null).map((a) => [a.id as number, String(a.qty)])));
    setCustom(list.filter((a) => a.id == null).map((a) => ({ kind: a.kind, name: a.name, unit_label: a.unit_label, price: String(a.price), qty: String(a.qty) })));
    setEdit(true);
  };
  const save = useMutation({
    mutationFn: () => mnhApi.setAddons(c.id, {
      items: Object.entries(qty).map(([id, q]) => ({ id: Number(id), qty: Number(q || 0) })).filter((x) => x.qty > 0),
      custom: custom.filter((x) => x.name.trim()).map((x) => ({ kind: x.kind, name: x.name.trim(), unit_label: x.unit_label.trim() || "회", price: Number(x.price || 0), qty: Number(x.qty || 1) })),
    }),
    onSuccess: (r) => { toast.success(r.message ?? "저장했어요."); setEdit(false); onDone(r.data); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  // 계약에 이미 있는 항목은 판매 중지여도 보이고(신청 때 금액), 새로 넣을 수 있는 건 판매 중인 항목만
  const inContract = new Map(list.filter((a) => a.id != null).map((a) => [a.id as number, a]));
  const rows = (catalog.data?.data.rows ?? []).filter((r) => r.is_active || inContract.has(r.id));
  const setCustomAt = (i: number, patch: Partial<CustomRow>) => setCustom(custom.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  return (
    <Section title="추가 서비스 · 대여" aside={!closed && !edit && <Button size="sm" variant="ghost" onClick={start}>수정</Button>}>
      <p className="text-xs text-warm-500 mb-2">바우처 밖이라 전액 본인부담 · 계약서 별지 ③④에 그대로 들어가요.</p>
      {!edit && (list.length === 0 ? <p className="text-sm text-warm-500">없음</p> : (
        <>
          <ul className="space-y-0.5 text-sm">
            {list.map((a, i) => (
              <li key={`${a.kind}-${a.id ?? `c${i}`}`} className="flex justify-between gap-3">
                <span>
                  {a.name}{a.custom && <span className="ml-1 text-[11px] text-warm-500">(협의)</span>}{" "}
                  <span className="text-xs text-warm-500">{formatKRW(a.price)} × {a.qty}{a.unit_label}</span>
                </span>
                <span className="whitespace-nowrap">{formatKRW(a.amount)}</span>
              </li>
            ))}
          </ul>
          <Row k="합계" v={<b>{formatKRW(c.addon_total ?? list.reduce((s, a) => s + a.amount, 0))}</b>} />
        </>
      ))}
      {edit && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          {catalog.isLoading && <p className="text-sm text-warm-500">불러오는 중…</p>}
          {catalog.data && rows.length === 0 && (
            <p className="text-sm text-warm-500">가격표가 비어 있어요. 「산모신생아 › 추가요금·대여용품」에서 먼저 등록하거나 아래에 직접 적으세요.</p>
          )}
          {rows.length > 0 && (
            <ul className="space-y-1.5">
              {rows.map((r) => {
                const kept = inContract.get(r.id);
                return (
                  <li key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 min-w-0">
                      <span className="text-[11px] text-warm-500 mr-1">{kinds[r.kind] ?? r.kind}</span>{r.name}
                      <span className="block text-xs text-warm-500">
                        {formatKRW(kept ? kept.price : r.price)} / {r.unit_label}{kept && kept.price !== r.price && " (계약 때 금액)"}{!r.is_active && " · 판매 중지"}
                      </span>
                    </span>
                    <Input aria-label={`${r.name} 수량`} inputMode="numeric" className="w-16 text-right" value={qty[r.id] ?? ""} placeholder="0"
                      onChange={(e) => setQty({ ...qty, [r.id]: e.target.value.replace(/[^0-9]/g, "") })} />
                    <span className="w-6 text-xs text-warm-500">{r.unit_label}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="pt-2 border-t border-warm-100 space-y-2">
            <p className="text-xs font-semibold text-warm-600">협의해 직접 적는 항목</p>
            {custom.map((x, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr] gap-x-1.5 gap-y-1 items-end rounded-lg border border-warm-100 p-2">
                <label>
                  <span className="block text-[11px] text-warm-500 mb-0.5">종류</span>
                  <select className={cn(selectCls, "w-24")} value={x.kind} onChange={(e) => setCustomAt(i, { kind: e.target.value })}>
                    {Object.entries(kinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
                <label>
                  <span className="block text-[11px] text-warm-500 mb-0.5">항목 이름</span>
                  <Input maxLength={60} value={x.name} placeholder="예: 큰아이 돌봄" onChange={(e) => setCustomAt(i, { name: e.target.value })} />
                </label>
                <div className="col-span-2 flex gap-1.5 items-end">
                  <label className="flex-1 min-w-0">
                    <span className="block text-[11px] text-warm-500 mb-0.5">단가(원)</span>
                    <Input inputMode="numeric" value={x.price} onChange={(e) => setCustomAt(i, { price: e.target.value.replace(/[^0-9]/g, "") })} />
                  </label>
                  <label className="w-16">
                    <span className="block text-[11px] text-warm-500 mb-0.5">수량</span>
                    <Input inputMode="numeric" className="text-right" value={x.qty} onChange={(e) => setCustomAt(i, { qty: e.target.value.replace(/[^0-9]/g, "") })} />
                  </label>
                  <label className="w-16">
                    <span className="block text-[11px] text-warm-500 mb-0.5">단위</span>
                    <Input maxLength={10} value={x.unit_label} onChange={(e) => setCustomAt(i, { unit_label: e.target.value })} />
                  </label>
                  <Button type="button" size="sm" variant="ghost" aria-label="이 항목 빼기" onClick={() => setCustom(custom.filter((_, k) => k !== i))}>✕</Button>
                </div>
                {x.price !== "" && (
                  <p className="col-span-2 text-xs text-warm-600 text-right">
                    {formatKRW(Number(x.price))} × {x.qty || 1}{x.unit_label || "회"} = <b>{formatKRW(Number(x.price) * Number(x.qty || 1))}</b>
                  </p>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" disabled={custom.length >= 10}
              onClick={() => setCustom([...custom, { kind: "extra", name: "", unit_label: "회", price: "", qty: "1" }])}>＋ 직접 적기</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEdit(false)}>닫기</Button>
            <Button type="submit" size="sm" variant="outline" disabled={save.isPending}>저장</Button>
          </div>
        </form>
      )}
    </Section>
  );
}

/* ───── 지원유형·금액 ───── */

function SupportCard({ c, closed, onDone }: CardProps) {
  const [edit, setEdit] = useState<"" | "table" | "manual">("");
  const [typeId, setTypeId] = useState("");
  const [total, setTotal] = useState(String(c.total_price ?? ""));
  const [gov, setGov] = useState(String(c.gov_support ?? ""));
  const types = useQuery({ queryKey: ["admin", "mnh", "rates", c.year], queryFn: () => mnhApi.supportTypes(c.year), enabled: edit === "table" });
  const labels = types.data?.data.labels;
  const save = useForceable((v: Record<string, unknown>) => mnhApi.update(c.id, v), onDone, () => setEdit(""));
  const selfPay = total !== "" && gov !== "" ? Number(total) - Number(gov) : null;

  return (
    <Section title="지원유형 · 금액" aside={!closed && !edit && (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEdit("table")}>기준표에서</Button>
        <Button size="sm" variant="ghost" onClick={() => setEdit("manual")}>직접 입력</Button>
      </div>
    )}>
      <Row k="유형" v={c.support_label ?? "-"} />
      <Row k="서비스 가격" v={c.total_price != null ? formatKRW(c.total_price) : "-"} />
      <Row k="정부지원금" v={c.gov_support != null ? formatKRW(c.gov_support) : "-"} />
      <Row k="본인부담금" v={c.rates_set ? <b>{formatKRW(c.self_pay)}</b> : <span className="text-warn font-semibold">요율 미설정</span>} />
      {edit === "table" && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (typeId) save.mutate({ support_type_id: Number(typeId) }); }}>
          <label className={labelCls} htmlFor="mnh-type">{c.year}년 기준표</label>
          <select id="mnh-type" className={selectCls} value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
            <option value="">{types.isLoading ? "불러오는 중…" : (types.data?.data.rows.length ?? 0) === 0 ? "기준표가 비어 있어요" : "고르세요"}</option>
            {types.data?.data.rows.filter((r) => r.is_active).map((r) => (
              <option key={r.id} value={r.id}>
                {labels?.fetus_types[r.fetus_type]} · {labels?.birth_orders[r.birth_order]} · {r.income_tier} · {labels?.periods[r.period]} {r.days}일 — 본인 {formatKRW(r.self_pay)}
              </option>
            ))}
          </select>
          <p className="text-xs text-warm-500">일수가 다르면 계약 일수도 함께 바뀌어요.</p>
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={!typeId || save.isPending}>적용</Button><Button type="button" size="sm" variant="outline" onClick={() => setEdit("")}>닫기</Button></div>
        </form>
      )}
      {edit === "manual" && (
        <form className="mt-3 grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); if (selfPay !== null && selfPay >= 0) save.mutate({ total_price: Number(total), gov_support: Number(gov), self_pay: selfPay }); }}>
          <label><span className={labelCls}>서비스 가격</span><Input type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} required /></label>
          <label><span className={labelCls}>정부지원금</span><Input type="number" min={0} value={gov} onChange={(e) => setGov(e.target.value)} required /></label>
          <p className="col-span-2 text-sm">본인부담금 <b>{selfPay === null ? "-" : selfPay < 0 ? "지원금이 더 커요" : formatKRW(selfPay)}</b> <span className="text-xs text-warm-500">(고시 예외·지자체 추가지원 등)</span></p>
          <div className="col-span-2 flex gap-2"><Button type="submit" size="sm" disabled={selfPay === null || selfPay < 0 || save.isPending}>저장</Button><Button type="button" size="sm" variant="outline" onClick={() => setEdit("")}>닫기</Button></div>
        </form>
      )}
    </Section>
  );
}

/* ───── 본인부담금 선납 ───── */

const METHODS: Record<string, string> = { cash: "현금", card: "카드", local_currency: "지역화폐" };

function PrepaidCard({ c, closed, onDone, refetch }: CardProps & { refetch: () => void }) {
  const [amount, setAmount] = useState(String(c.self_pay ?? ""));
  const [method, setMethod] = useState(c.payment_method);
  const [receipt, setReceipt] = useState("");
  const [paidOn, setPaidOn] = useState(todayKst());
  const rec = useMutation({
    mutationFn: () => mnhApi.prepaid(c.id, { amount: Number(amount), method, ...(receipt ? { receipt_no: receipt } : {}), paid_on: paidOn }),
    onSuccess: (r) => { toast.success(r.message ?? "기록했어요."); onDone(r.data); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const clear = useMutation({
    mutationFn: () => mnhApi.clearPrepaid(c.id),
    onSuccess: (r) => { toast.success(r.message); refetch(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (c.prepaid) {
    return (
      <Section title="본인부담금 선납" aside={<span className="text-xs font-bold text-brand-700">확인 완료</span>}>
        <Row k="금액" v={formatKRW(c.prepaid_amount)} />
        <Row k="수단" v={c.payment_method_label} />
        <Row k="납부일" v={c.prepaid_at?.slice(0, 10) ?? "-"} />
        {c.prepaid_receipt_no && <Row k="영수증 번호" v={c.prepaid_receipt_no} />}
        {c.refund_amount != null && (
          <Row k="취소 환불" v={c.refund_amount > 0 ? `${formatKRW(c.refund_amount)} (${c.refunded_at?.slice(0, 10) ?? ""})` : "돌려주지 않음"} />
        )}
        {c.self_pay != null && c.prepaid_amount !== c.self_pay && <p className="text-xs text-warn mt-1">본인부담금 {formatKRW(c.self_pay)}과 금액이 달라요.</p>}
        {(c.status === "applied" || c.status === "confirmed") && (
          <Button size="sm" variant="ghost" className="mt-2 text-danger hover:bg-danger-bg" disabled={clear.isPending}
            onClick={() => { if (window.confirm("선납 기록을 지울까요? 담당이 출근할 수 없게 돼요.")) clear.mutate(); }}>기록 지우기</Button>
        )}
      </Section>
    );
  }
  return (
    <Section title="본인부담금 선납" aside={<span className="text-xs font-semibold text-warn">미확인 — 출근 불가</span>}>
      {closed ? <p className="text-sm text-warm-500">기록 없음</p> : (
        <form className="grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); rec.mutate(); }}>
          <label><span className={labelCls}>금액(원)</span><Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
          <label><span className={labelCls}>수단</span>
            <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label><span className={labelCls}>납부일</span><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required /></label>
          <label><span className={labelCls}>영수증 번호(선택)</span><Input value={receipt} maxLength={50} onChange={(e) => setReceipt(e.target.value)} /></label>
          <Button type="submit" size="sm" className="col-span-2" disabled={rec.isPending || amount === ""}>선납 확인</Button>
        </form>
      )}
    </Section>
  );
}

/* ───── 담당 ───── */

function CaregiverCard({ c, closed, onDone }: CardProps) {
  const [all, setAll] = useState(false);
  const [cg, setCg] = useState("");
  const [from, setFrom] = useState(() => {
    const t = todayKst();
    return c.schedule.find((d) => d.date > t && d.status === "scheduled")?.date ?? t;
  });
  const [reason, setReason] = useState("");
  const list = useQuery({ queryKey: ["admin", "mnh", "caregivers", all], queryFn: () => mnhApi.caregivers(all), enabled: !closed });
  const options = (list.data?.data ?? []).filter((o) => o.id !== c.caregiver_id);
  const assign = useForceable((v: { caregiver_id: number; force?: boolean }) => mnhApi.assign(c.id, v.caregiver_id, v.force), onDone, () => setCg(""));
  const swap = useForceable((v: { caregiver_id: number; from_date: string; reason: string }) => mnhApi.swap(c.id, v), onDone, () => { setCg(""); setReason(""); });
  const assigned = !!c.match_request_id;

  const picker = (
    <>
      <select className={selectCls} value={cg} onChange={(e) => setCg(e.target.value)} required aria-label="돌봄전문가">
        <option value="">{list.isLoading ? "불러오는 중…" : options.length ? "돌봄전문가 고르기" : "후보가 없어요"}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}{o.region ? ` · ${o.region}` : ""}{o.rating != null ? ` · ★${o.rating}` : ""} · {o.completed_sessions}회{!o.postpartum ? " · 산모신생아 직군 아님" : ""}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-xs text-warm-600">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />산모신생아 직군 아닌 돌봄전문가도 보기
      </label>
    </>
  );

  return (
    <Section title="담당 산모신생아 건강관리사">
      <Row k="현재 담당" v={c.caregiver_name ?? <span className="text-warm-400">미배정</span>} />
      {!!c.caregiver_doc_issues?.length && <DocIssues issues={c.caregiver_doc_issues} caregiverId={c.caregiver_id} />}
      {!closed && !assigned && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (cg) assign.mutate({ caregiver_id: Number(cg) }); }}>
          {picker}
          <p className="text-xs text-warm-500">배정하면 제공일마다 방문 일정이 만들어지고 담당과 이용자에게 알림이 가요.</p>
          <Button type="submit" size="sm" className="w-full" disabled={!cg || assign.isPending}>배정</Button>
        </form>
      )}
      {!closed && assigned && (
        <form className="mt-3 space-y-2 border-t border-warm-100 pt-3"
          onSubmit={(e) => { e.preventDefault(); if (cg && reason.trim()) swap.mutate({ caregiver_id: Number(cg), from_date: from, reason: reason.trim() }); }}>
          <p className="text-xs font-bold text-warm-700">인력 교체</p>
          {picker}
          <label><span className={labelCls}>이날부터</span><Input type="date" value={from} min={todayKst()} onChange={(e) => setFrom(e.target.value)} required /></label>
          <label><span className={labelCls}>사유</span><Input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="산모 요청·관리사 사정 등" required /></label>
          <p className="text-xs text-warm-500">그날 이후 예정 일정만 옮겨요. 지난 기록은 원래 담당에 남아요.</p>
          <Button type="submit" size="sm" variant="primary" className="w-full" disabled={!cg || !reason.trim() || swap.isPending}>교체</Button>
        </form>
      )}
    </Section>
  );
}

const ISSUE_WORD = { missing: "미제출", submitted: "확인 대기", rejected: "반려", expired: "만료됨" } as const;

/** 담당 서류 경고 — 계약 끝날 때까지 문제 되는 서류(만료·기간 중 만료를 먼저). 배정은 막지 않는다. */
function DocIssues({ issues, caregiverId }: { issues: NonNullable<MnhContractDetail["caregiver_doc_issues"]>; caregiverId: number | null }) {
  const sorted = [...issues].sort((a, b) => Number(a.status === "missing" || a.status === "submitted") - Number(b.status === "missing" || b.status === "submitted"));
  return (
    <div role="alert" className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warm-800">
      <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="w-4 h-4 text-warn shrink-0" />담당 서류 확인 필요 {issues.length}건</p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {sorted.map((i) => (
          <li key={i.type}>
            {i.label} · <b>{i.status === "expiring" ? `${i.expires_at} 만료(계약 기간 중)` : ISSUE_WORD[i.status]}</b>
          </li>
        ))}
      </ul>
      {caregiverId && <Link href="/caregiver-approval" className="mt-1 inline-block text-xs font-semibold text-brand-700 underline">자격검증에서 서류 보기</Link>}
    </div>
  );
}

/* ───── 일정 설정 ───── */

function SettingsCard({ c, onDone }: CardProps) {
  const started = c.schedule.some((d) => d.status === "in_progress" || d.status === "completed");
  const [start, setStart] = useState(c.start_date);
  const [days, setDays] = useState(String(c.days));
  const [wd, setWd] = useState<number[]>(c.weekdays);
  const [time, setTime] = useState(c.daily_start);
  const [hours, setHours] = useState(String(c.daily_minutes / 60));
  const save = useForceable((v: Record<string, unknown>) => mnhApi.update(c.id, v), onDone);
  const toggle = (d: number) => setWd((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));

  return (
    <Section title="일정 설정">
      <form className="grid grid-cols-2 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const body: Record<string, unknown> = { days: Number(days), weekdays: wd };
          if (!started) Object.assign(body, { start_date: start, daily_start: time, daily_minutes: Math.round(Number(hours) * 60) });
          save.mutate(body);
        }}>
        <label><span className={labelCls}>개시일</span><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} disabled={started} /></label>
        <label><span className={labelCls}>일수(5~40)</span><Input type="number" min={5} max={40} value={days} onChange={(e) => setDays(e.target.value)} /></label>
        <label><span className={labelCls}>시작 시각</span><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={started} /></label>
        <label><span className={labelCls}>하루 시간</span>
          <select className={selectCls} value={hours} onChange={(e) => setHours(e.target.value)} disabled={started}>
            {[4, 5, 6, 7, 8, 9, 10, 12].map((h) => <option key={h} value={String(h)}>{h}시간</option>)}
          </select>
        </label>
        <fieldset className="col-span-2">
          <legend className={labelCls}>제공 요일</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button type="button" key={d} onClick={() => toggle(d)} aria-pressed={wd.includes(d)}
                className={cn("w-9 h-9 rounded-lg text-sm font-semibold border", wd.includes(d) ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-200")}>
                {DOW_KO[d % 7]}
              </button>
            ))}
          </div>
        </fieldset>
        {started && <p className="col-span-2 text-xs text-warm-500">서비스가 시작돼 개시일·시간은 바꿀 수 없어요. 하루씩 빼려면 일정표의 「연기」를 쓰세요.</p>}
        <Button type="submit" size="sm" variant="outline" className="col-span-2" disabled={save.isPending || wd.length === 0}>일정 저장</Button>
      </form>
    </Section>
  );
}

/** 계약 취소 — 해지 통지일로 위약금·환불을 제안받고 고쳐서 확정(CAREN-MNH-02 D) */
function CancelCard({ c, onDone }: CardProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState(todayKst());
  const [penalty, setPenalty] = useState("");
  const [refund, setRefund] = useState("");
  const quote = useQuery({
    queryKey: ["admin", "mnh", "cancel-quote", c.id, notice],
    queryFn: () => mnhApi.cancelQuote(c.id, notice),
    enabled: open && /^\d{4}-\d{2}-\d{2}$/.test(notice),
  });
  const qd = quote.data?.data;
  // 통지일을 바꾸면 제안값으로 다시 채운다
  useEffect(() => {
    if (!qd) return;
    setPenalty(String(qd.suggested_penalty));
    if (qd.suggested_refund != null) setRefund(String(qd.suggested_refund));
  }, [qd]);
  const cancel = useMutation({
    mutationFn: () => mnhApi.cancel(c.id, {
      reason: reason.trim(), notice_date: notice,
      penalty_amount: Number(penalty.replace(/[^0-9]/g, "") || 0),
      ...(c.prepaid ? { refund_amount: Number(refund.replace(/[^0-9]/g, "")) } : {}),
    }),
    onSuccess: (r) => { toast.success(r.message ?? "취소했어요."); setOpen(false); onDone(r.data); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const max = c.prepaid_amount ?? 0;
  const refundNum = Number(refund.replace(/[^0-9]/g, ""));
  const refundBad = c.prepaid && (refund.trim() === "" || refundNum > max);
  const penaltyNum = Number(penalty.replace(/[^0-9]/g, "") || 0);
  // 선납에서 받은 서비스분을 빼고 남은 돈보다 위약금이 크면 그 차액은 따로 받아야 한다(위약금 기준은 총 요금이라 본인부담보다 클 수 있음)
  const leftover = qd ? (qd.prepaid ? Math.max(0, qd.prepaid_amount - qd.used_self_pay) : 0) : null;
  const shortfall = leftover != null && penaltyNum > leftover ? penaltyNum - leftover : 0;
  const won = (v: string) => (v.trim() !== "" && /^[0-9,]+$/.test(v.trim()) ? formatKRW(Number(v.replace(/[^0-9]/g, ""))) : null);

  if (!open) {
    return (
      <div className="text-right">
        <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-bg" onClick={() => setOpen(true)}>계약 취소</Button>
      </div>
    );
  }
  return (
    <Section title="계약 취소">
      <form className="grid sm:grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason.trim()) { toast.error("취소 사유를 적어 주세요."); return; }
          if (refundBad) { toast.error(`환불액은 0 ~ ${max.toLocaleString("ko-KR")}원 사이로 적어 주세요.`); return; }
          if (window.confirm("계약을 취소할까요? 남은 예정 일정이 모두 취소돼요.")) cancel.mutate();
        }}>
        <label className="sm:col-span-2">
          <span className="block text-xs font-semibold text-warm-600 mb-1">취소 사유 *</span>
          <Input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="예: 이용자 사정(입원)" />
        </label>
        <label>
          <span className="block text-xs font-semibold text-warm-600 mb-1">이용자가 해지를 알린 날</span>
          <Input type="date" value={notice} max={todayKst()} onChange={(e) => setNotice(e.target.value)} />
        </label>
        <label>
          <span className="block text-xs font-semibold text-warm-600 mb-1">위약금(원)</span>
          <Input inputMode="numeric" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
          {won(penalty) && <span className="block text-[11px] text-warm-500 mt-0.5">{won(penalty)}</span>}
        </label>
        {c.prepaid && (
          <label>
            <span className="block text-xs font-semibold text-warm-600 mb-1">돌려준 본인부담금(원) *</span>
            <Input inputMode="numeric" value={refund} onChange={(e) => setRefund(e.target.value)} aria-invalid={refundBad} />
            {won(refund) && <span className="block text-[11px] text-warm-500 mt-0.5">{won(refund)} (선납 {formatKRW(max)} 중)</span>}
          </label>
        )}
        {qd && (
          <div className="sm:col-span-2 text-xs text-warm-600 bg-warm-50 rounded-lg px-3 py-2 space-y-0.5">
            <p>
              {qd.noticed_days === 0 ? "오늘 알림" : `${qd.noticed_days}일 전에 알림`}({qd.notice_days}일 전까지 알려야 함) —{" "}
              {qd.late
                ? qd.penalty_pct == null
                  ? "기한을 못 지켰지만 위약금 비율이 아직 정해지지 않아(운영 설정 필요) 0원으로 제안했어요. 받을 위약금이 있으면 직접 적으세요."
                  : `기한을 못 지켜 위약금 = 서비스 총 요금 ${formatKRW(qd.total_price)} × ${qd.penalty_pct}% = ${formatKRW(qd.suggested_penalty)}`
                : "기한을 지켜 위약금 없음."}
            </p>
            {qd.prepaid && (
              <p>
                환불 제안: 선납 {formatKRW(qd.prepaid_amount)} − 받은 서비스 {qd.completed_days}/{qd.days}일분 {formatKRW(qd.used_self_pay)} − 위약금 {formatKRW(qd.suggested_penalty)} = {formatKRW(qd.suggested_refund ?? 0)}
              </p>
            )}
            {shortfall > 0 && (
              <p role="alert" className="flex items-start gap-1 font-semibold text-warn">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {qd.prepaid
                  ? `위약금이 돌려줄 선납 잔액(${formatKRW(leftover ?? 0)})보다 ${formatKRW(shortfall)} 많아요. 환불은 0원, 차액 ${formatKRW(shortfall)}은 이용자에게 따로 받아야 해요.`
                  : `선납 전이라 위약금 ${formatKRW(shortfall)}은 이용자에게 따로 받아야 해요.`}
              </p>
            )}
            <p className="text-warm-500">제공기관 사정으로 해지하면 위약금을 0으로 고치세요.</p>
          </div>
        )}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>닫기</Button>
          <Button type="submit" size="sm" variant="outline" className="text-danger border-danger/40 hover:bg-danger-bg" disabled={cancel.isPending}>계약 취소 확정</Button>
        </div>
      </form>
    </Section>
  );
}
