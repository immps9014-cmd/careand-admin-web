"use client";

// 산모신생아 바우처 서류 보관함(2026-10-18) — 회원(산모)별 계약 서류·제공기록지·모니터링을 모아 보고 찾는다.
// 목록(검색) → 산모 이름을 누르면 산모별 묶음(계약마다 서류 종류별 최신 판 + 제공기록지 방문일 달력).
// 서명본 PDF 묶음 받기는 개인·건강정보 반출이라 사유를 받고 서버에 감사기록이 남는다.
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileArchive, FileDown, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { DocViewer, usePdf } from "@/components/domain/mnh-docs";
import {
  mnhArchiveApi, DOC_STATUS_STYLE, MNH_STATUS_STYLE, dayLabel,
  type MnhArchiveClient, type MnhArchiveProvisionDay, type MnhArchiveQuery,
} from "@/lib/api/mnh";

const selectCls = "h-9 rounded-lg border border-warm-200 bg-white px-2 text-sm";
const kstDay = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)) : "—";

function StatusPill({ status }: { status: string }) {
  const s = DOC_STATUS_STYLE[status] ?? DOC_STATUS_STYLE.issued;
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap", s.cls)}>{s.label}</span>;
}

export function ArchiveTab() {
  const sp = useSearchParams();
  const router = useRouter();
  const clientId = Number(sp.get("client")) || null;
  const openClient = (id: number | null) => router.replace(id ? `/mnh?tab=archive&client=${id}` : "/mnh?tab=archive");

  return clientId ? <ClientArchive id={clientId} onBack={() => openClient(null)} /> : <ArchiveSearch onClient={openClient} />;
}

/* ───────────── 검색 ───────────── */

const EMPTY: MnhArchiveQuery = { page: 1 };

function ArchiveSearch({ onClient }: { onClient: (id: number) => void }) {
  const [form, setForm] = useState<MnhArchiveQuery>(EMPTY);
  const [params, setParams] = useState<MnhArchiveQuery>(EMPTY);
  const [view, setView] = useState<number | null>(null);
  const pdf = usePdf();

  const query = useQuery({ queryKey: ["admin", "mnh-archive", params], queryFn: () => mnhArchiveApi.search(params) });
  const d = query.data?.data;
  const rows = d?.rows ?? [];
  const pages = d ? Math.max(1, Math.ceil(d.total / d.per_page)) : 1;
  const set = (patch: Partial<MnhArchiveQuery>) => setForm((f) => ({ ...f, ...patch }));
  const run = (patch: Partial<MnhArchiveQuery> = {}) => {
    const next = { ...form, ...patch, page: patch.page ?? 1 };
    setForm(next);
    setParams(next);
  };

  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        산모가 서명한(또는 서명할) 바우처 서류를 모두 모았습니다 — 이용계약서·별지 산출내역·준수사항·개인정보 동의서·제공 계획서·영수증·매일 제공기록지·모니터링 설문.
        산모 이름을 누르면 그 산모의 계약별 서류와 제공기록지 빠진 날을 한눈에 볼 수 있고, 서명본 PDF를 한꺼번에 받을 수 있습니다.
        취소된 판은 기본으로 빼고 보여 줍니다(상태 「취소」로 따로 찾기).
      </p>

      <form className="flex flex-wrap items-center gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <Input aria-label="검색어" value={form.q ?? ""} onChange={(e) => set({ q: e.target.value })}
          placeholder="산모 이름 · 계약번호 · 전화 뒤 4자리" className="h-9 w-60" />
        <select aria-label="서류 종류" value={form.doc_type ?? ""} onChange={(e) => run({ doc_type: e.target.value || undefined })} className={selectCls}>
          <option value="">서류 전체</option>
          {d?.types.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
        <select aria-label="상태" value={form.status ?? ""} onChange={(e) => run({ status: (e.target.value || undefined) as MnhArchiveQuery["status"] })} className={selectCls}>
          <option value="">취소 뺀 전체</option>
          <option value="issued">서명 대기</option>
          <option value="signed">서명 완료</option>
          <option value="void">취소</option>
          <option value="all">취소 포함 전체</option>
        </select>
        <select aria-label="기간 기준" value={form.date_kind ?? "issued"} onChange={(e) => set({ date_kind: e.target.value as MnhArchiveQuery["date_kind"] })} className={selectCls}>
          <option value="issued">발행일</option>
          <option value="signed">서명일</option>
          <option value="session">방문일(제공기록지)</option>
        </select>
        <Input type="date" aria-label="시작일" value={form.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} className="h-9 w-40" />
        <span className="text-warm-400">~</span>
        <Input type="date" aria-label="종료일" value={form.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} className="h-9 w-40" />
        <Button type="submit" size="sm"><Search className="w-4 h-4" />검색</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setForm(EMPTY); setParams(EMPTY); }}>초기화</Button>
      </form>

      {d && d.total > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 text-xs" aria-label="서류 종류별 건수">
          {d.types.filter((t) => d.by_type[t.type]).map((t) => (
            <button key={t.type} type="button" onClick={() => run({ doc_type: params.doc_type === t.type ? undefined : t.type })}
              className={cn("px-2.5 py-1 rounded-full border font-semibold",
                params.doc_type === t.type ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-200 hover:bg-warm-50")}>
              {t.label} {d.by_type[t.type]}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">발행일</TableHead>
                <TableHead>산모</TableHead>
                <TableHead className="whitespace-nowrap">계약</TableHead>
                <TableHead>서류</TableHead>
                <TableHead className="whitespace-nowrap">담당</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="whitespace-nowrap">서명일</TableHead>
                <TableHead className="text-right">보기</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-warm-500 py-10">
                  {query.isLoading ? "불러오는 중…" : query.isError ? getApiErrorMessage(query.error) : "조건에 맞는 서류가 없습니다."}
                </TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">{kstDay(r.issued_at)}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => onClient(r.client_id)} className="font-semibold text-brand-700 hover:underline whitespace-nowrap">
                      {r.client_name ?? `산모 #${r.client_id}`}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <Link href={`/mnh/${r.contract_id}`} className="text-warm-700 hover:underline">{r.contract_no}</Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.label}
                    {r.session_date && <span className="text-warm-500"> · {dayLabel(r.session_date)}</span>}
                    {r.status === "void" && r.void_reason && <div className="text-xs text-warm-500">취소 사유: {r.void_reason}</div>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{r.caregiver_name ?? "—"}</TableCell>
                  <TableCell><StatusPill status={r.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{kstDay(r.signed_at)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => setView(r.id)}>보기</Button>
                    {r.pdf_ready && (
                      <Button size="sm" variant="outline" className="ml-1" aria-label="PDF" disabled={pdf.isPending} onClick={() => pdf.mutate(r.id)}>
                        <FileDown className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {d && d.total > d.per_page && (
        <div className="flex items-center justify-center gap-3 mt-3 text-sm">
          <Button size="sm" variant="outline" disabled={d.page <= 1} onClick={() => run({ page: d.page - 1 })}>이전</Button>
          <span className="text-warm-600">{d.page} / {pages} 쪽 · 모두 {d.total}건</span>
          <Button size="sm" variant="outline" disabled={d.page >= pages} onClick={() => run({ page: d.page + 1 })}>다음</Button>
        </div>
      )}
      {d && d.total > 0 && d.total <= d.per_page && <p className="text-xs text-warm-500 mt-2 text-right">모두 {d.total}건</p>}

      {view && <DocViewer id={view} onClose={() => { setView(null); query.refetch(); }} />}
    </>
  );
}

/* ───────────── 산모별 묶음 ───────────── */

function ClientArchive({ id, onBack }: { id: number; onBack: () => void }) {
  const [view, setView] = useState<number | null>(null);
  const [zipFor, setZipFor] = useState<{ contractId?: number; label: string } | null>(null);
  const pdf = usePdf();
  const query = useQuery({ queryKey: ["admin", "mnh-archive-client", id], queryFn: () => mnhArchiveApi.client(id) });
  const d = query.data?.data;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4" />서류 목록</Button>
        {d && (
          <>
            <h2 className="text-lg font-bold text-warm-800 ml-1">{d.client.name ?? `산모 #${d.client.id}`}</h2>
            <span className="text-sm text-warm-500">
              {d.client.phone_tail && `전화 뒤 ${d.client.phone_tail} · `}
              {d.client.delivery_date ? `출산 ${d.client.delivery_date}` : d.client.expected_delivery_date ? `출산 예정 ${d.client.expected_delivery_date}` : "출산일 미등록"}
            </span>
            <Button size="sm" className="ml-auto" disabled={d.pdf_count === 0} onClick={() => setZipFor({ label: "모든 계약" })}>
              <FileArchive className="w-4 h-4" />서명본 PDF 묶음 받기 ({d.pdf_count}건)
            </Button>
          </>
        )}
      </div>

      {query.isLoading && <p className="text-sm text-warm-500 py-10 text-center">불러오는 중…</p>}
      {query.isError && <p className="text-sm text-danger py-10 text-center">{getApiErrorMessage(query.error)}</p>}
      {d && d.contracts.length === 0 && <p className="text-sm text-warm-500 py-10 text-center">바우처 계약이 없습니다.</p>}

      <div className="space-y-4">
        {d?.contracts.map((c) => {
          const st = MNH_STATUS_STYLE[c.status];
          return (
            <Card key={c.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Link href={`/mnh/${c.id}`} className="font-bold text-warm-800 hover:underline">{c.contract_no}</Link>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", st)}>{STATUS_LABEL[c.status]}</span>
                  <span className="text-sm text-warm-500">
                    {c.start_date ? `${c.start_date} 시작` : "시작일 미정"} · {c.days}일 · 담당 {c.caregiver_name ?? "배정 전"}
                  </span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => setZipFor({ contractId: c.id, label: c.contract_no })}>
                    <FileArchive className="w-4 h-4" />이 계약 PDF
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                  {c.documents.map((cell) => {
                    const needed = cell.before_start && cell.doc?.status !== "signed" && c.status !== "cancelled";
                    return (
                      <div key={cell.type} className={cn("rounded-lg border p-3 text-sm", needed ? "border-warn bg-warn-bg/40" : "border-warm-200")}>
                        <div className="font-semibold text-warm-800 mb-1">{cell.label}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {cell.doc ? <StatusPill status={cell.doc.status} /> : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-warm-100 text-warm-500">발행 전</span>}
                          {needed && <span className="text-xs font-semibold text-warn">시작 전 필요</span>}
                        </div>
                        <div className="text-xs text-warm-500 mt-1">
                          {cell.doc ? (cell.doc.signed_at ? `서명 ${kstDay(cell.doc.signed_at)}` : `발행 ${kstDay(cell.doc.issued_at)}`) : " "}
                          {cell.void_count > 0 && ` · 이전 판 ${cell.void_count}건 취소`}
                        </div>
                        {cell.doc && (
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="outline" onClick={() => setView(cell.doc!.id)}>보기</Button>
                            {cell.doc.pdf_ready && (
                              <Button size="sm" variant="outline" aria-label={`${cell.label} PDF`} disabled={pdf.isPending} onClick={() => pdf.mutate(cell.doc!.id)}>
                                <FileDown className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <ProvisionDays days={c.provision.days} summary={c.provision} onOpen={setView} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {view && <DocViewer id={view} onClose={() => { setView(null); query.refetch(); }} />}
      {zipFor && <ZipDialog clientId={id} target={zipFor} onClose={() => setZipFor(null)} />}
    </>
  );
}

const STATUS_LABEL: Record<string, string> = { applied: "신청", confirmed: "배정 완료", active: "서비스 중", completed: "종료", cancelled: "취소" };

function ProvisionDays({ days, summary, onOpen }: {
  days: MnhArchiveProvisionDay[];
  summary: { completed: number; signed: number; missing: number };
  onOpen: (id: number) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2 mb-2">
        <h3 className="text-sm font-bold text-warm-800">서비스 제공기록지</h3>
        <span className="text-xs text-warm-500">완료한 방문 {summary.completed}회 · 서명 {summary.signed}건</span>
        {summary.missing > 0 && <span className="text-xs font-bold text-danger">빠진 날 {summary.missing}일</span>}
      </div>
      {days.length === 0 ? (
        <p className="text-xs text-warm-500">아직 방문 일정이 없습니다(담당 배정 후 생깁니다).</p>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="방문일별 제공기록지">
          {days.map((d) => {
            const signed = d.doc?.status === "signed";
            const cls = d.missing ? "border-danger bg-danger-bg text-danger"
              : signed ? "border-brand-300 bg-brand-50 text-brand-700"
              : d.doc ? "border-warn bg-warn-bg text-warn"
              : "border-warm-200 bg-white text-warm-500";
            const state = d.missing ? "빠짐" : signed ? "서명" : d.doc ? "서명 대기" : d.session_status === "completed" ? "" : "예정";
            return (
              <button key={d.session_id} type="button" role="listitem" disabled={!d.doc} onClick={() => d.doc && onOpen(d.doc.id)}
                title={`${dayLabel(d.date)} ${state}`}
                className={cn("min-w-[64px] rounded-lg border px-2 py-1 text-xs font-semibold text-center", cls, d.doc ? "hover:brightness-95" : "cursor-default")}>
                {d.date.slice(5).replace("-", "/")}
                <span className="block font-normal">{state}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ZipDialog({ clientId, target, onClose }: { clientId: number; target: { contractId?: number; label: string }; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const dl = useMutation({
    mutationFn: () => mnhArchiveApi.downloadZip(clientId, reason, target.contractId),
    onSuccess: () => { toast.success("내려받았습니다. 다운로드 기록이 남았습니다."); onClose(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const ok = reason.trim().length >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="mnh-zip-title">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-2">
          <h2 id="mnh-zip-title" className="text-lg font-bold text-warm-800">서명본 PDF 묶음 받기</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="p-1 text-warm-500 hover:text-warm-700"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-warm-600 mb-3">
          {target.label}의 서명 완료 서류 PDF를 zip 하나로 받습니다. 개인정보·건강정보가 들어 있어 사유와 받은 사람이 기록됩니다.
        </p>
        <label htmlFor="mnh-zip-reason" className="block text-xs font-semibold text-warm-600 mb-1">사유 (5자 이상)</label>
        <Input id="mnh-zip-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="예: 바우처 정기 점검 제출" autoFocus />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>닫기</Button>
          <Button disabled={!ok || dl.isPending} onClick={() => dl.mutate()}>
            <FileArchive className="w-4 h-4" />{dl.isPending ? "만드는 중…" : "내려받기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
