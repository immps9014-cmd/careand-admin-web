"use client";

import { useState } from "react";
import Link from "next/link";
import { MnhJournalTab } from "@/components/domain/mnh-journal";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, BriefcaseBusiness, CalendarX2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/client";
import { ContractDocsCard } from "@/components/domain/mnh-docs";
import { ContractEvalCard } from "@/components/domain/mnh-eval";
import { cn, formatKRW } from "@/lib/utils";
import {
  mnhApi, conflictMessage, dayLabel, todayKst, MNH_EVENT_LABEL, MNH_STATUS_STYLE, DOW_KO,
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
      {c.status === "cancelled" && c.cancel_reason && <p className="text-sm bg-warm-100 rounded-lg px-4 py-2 mb-4">취소 사유: {c.cancel_reason}</p>}

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
  initial_consult: "초기상담 기록지", receipt: "본인부담금 영수증", satisfaction: "서비스 만족도 모니터링",
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
    case "cancelled": return String(p.reason ?? "");
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
      {(c.addons?.length ?? 0) > 0 && (
        <div className="mt-2 pt-2 border-t border-warm-100">
          <p className="text-xs font-semibold text-warm-600 mb-1">추가요금·대여 <span className="font-normal text-warm-500">(바우처 밖, 신청 때 금액)</span></p>
          <ul className="space-y-0.5 text-sm">
            {c.addons!.map((a) => (
              <li key={`${a.kind}-${a.id}`} className="flex justify-between gap-3">
                <span>{a.name} <span className="text-xs text-warm-500">{formatKRW(a.price)} × {a.qty}{a.unit_label}</span></span>
                <span className="whitespace-nowrap">{formatKRW(a.amount)}</span>
              </li>
            ))}
          </ul>
          <Row k="추가요금 합계" v={<b>{formatKRW(c.addon_total ?? c.addons!.reduce((s, a) => s + a.amount, 0))}</b>} />
        </div>
      )}
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

function CancelCard({ c, onDone }: CardProps) {
  const cancel = useMutation({
    mutationFn: (v: { reason: string; refund?: number }) => mnhApi.cancel(c.id, v.reason, v.refund),
    onSuccess: (r) => { toast.success(r.message ?? "취소했어요."); onDone(r.data); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <div className="text-right">
      <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-bg" disabled={cancel.isPending}
        onClick={() => {
          const reason = window.prompt("계약을 취소할까요? 남은 예정 일정이 모두 취소돼요. 사유를 적어 주세요.");
          if (!reason || !reason.trim()) return;
          if (!c.prepaid) { cancel.mutate({ reason: reason.trim() }); return; }
          // 선납한 계약 — 돌려준 금액은 매출에서 빠진다. 제공 전이면 전액을 기본값으로
          const max = c.prepaid_amount ?? 0;
          const input = window.prompt(`돌려준 본인부담금(원)을 적어 주세요. 0 ~ ${max.toLocaleString("ko-KR")}원, 돌려주지 않았으면 0.`, String(c.completed_days > 0 ? "" : max));
          if (input === null) return;
          const refund = Number(input.replace(/[^0-9]/g, ""));
          if (input.trim() === "" || !Number.isFinite(refund) || refund > max) { toast.error(`0 ~ ${max.toLocaleString("ko-KR")}원 사이로 적어 주세요.`); return; }
          cancel.mutate({ reason: reason.trim(), refund });
        }}>
        계약 취소
      </Button>
    </div>
  );
}
