"use client";

// 산모신생아 바우처 전자서명 서류 — 관리자(CAREN-MNH-01 3단계, 2026-10-05)
// 계약 서류 카드 · 서류 보기 창 · 서식 판 관리 · 인력 계약(근로·프리랜서) 발행
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { mnhDocAdminApi, DOC_STATUS_STYLE, type MnhDocBrief, type MnhDocFieldDef, type MnhTemplate } from "@/lib/api/mnh";

const DOC_CSS =
  "[&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:font-bold [&_h3]:text-warm-800 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_b]:font-bold text-sm leading-relaxed text-warm-700";
const TABLE_CSS = "[&_table]:w-full [&_th]:w-1/3 [&_th]:bg-warm-50 [&_th]:p-2 [&_th]:text-left [&_th]:align-top [&_th]:text-xs [&_td]:p-2 [&_td]:text-sm [&_tr]:border-b [&_tr]:border-warm-100";
const labelCls = "block text-xs font-semibold text-warm-600 mb-1";
const selectCls = "h-10 w-full rounded-lg border border-warm-200 bg-white px-2 text-sm";

function StatusPill({ status }: { status: string }) {
  const s = DOC_STATUS_STYLE[status] ?? DOC_STATUS_STYLE.issued;
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap", s.cls)}>{s.label}</span>;
}

export function usePdf() {
  return useMutation({ mutationFn: (id: number) => mnhDocAdminApi.openPdf(id), onError: (e) => toast.error(getApiErrorMessage(e)) });
}

/** 관리자가 채우는 칸 입력(초기상담·근로계약) */
function AdminFields({ fields, value, onChange }: { fields: MnhDocFieldDef[]; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {fields.map((f) => {
        const opts = f.options ? (Array.isArray(f.options) ? f.options.map((o) => [o, o]) : Object.entries(f.options)) : [];
        const set = (v: string) => onChange({ ...value, [f.key]: v });
        return (
          <label key={f.key} className={cn(f.type === "textarea" && "sm:col-span-2")}>
            <span className={labelCls}>{f.label}{f.type !== "textarea" && " *"}</span>
            {f.type === "select" ? (
              <select className={selectCls} value={value[f.key] ?? ""} onChange={(e) => set(e.target.value)}>
                <option value="">고르세요</option>
                {opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea rows={3} maxLength={2000} value={value[f.key] ?? ""} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-warm-200 p-2 text-sm" />
            ) : (
              <Input type={f.type === "date" ? "date" : "text"} maxLength={100} value={value[f.key] ?? ""} onChange={(e) => set(e.target.value)} />
            )}
          </label>
        );
      })}
    </div>
  );
}

/** 서류 한 건 보기(본문·입력값·무결성) */
export function DocViewer({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useQuery({ queryKey: ["admin", "mnh", "doc", id], queryFn: () => mnhDocAdminApi.get(id) });
  const pdf = usePdf();
  const d = q.data?.data;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="서류 보기" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl my-8 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-warm-800">{d?.title ?? "불러오는 중…"}</h2>
            {d && <p className="text-xs text-warm-500">MNHD-{String(d.id).padStart(6, "0")} · 서식 v{d.template_version} · 발행 {d.issued_at.slice(0, 16).replace("T", " ")}</p>}
          </div>
          {d && <StatusPill status={d.status} />}
          <button onClick={onClose} aria-label="닫기" className="p-1 rounded hover:bg-warm-100"><X className="w-5 h-5" /></button>
        </div>
        {d && (
          <>
            <div className={DOC_CSS} dangerouslySetInnerHTML={{ __html: d.content_html }} />
            {d.fields_html && <div className={cn("mt-3 rounded-lg border border-warm-100 overflow-hidden", TABLE_CSS)} dangerouslySetInnerHTML={{ __html: d.fields_html }} />}
            {d.status === "signed" && (
              <div className="mt-4 rounded-lg bg-warm-50 p-3 text-xs text-warm-600 space-y-1">
                <p>서명 {d.signer_name} · {d.signed_at?.slice(0, 19).replace("T", " ")} · IP {d.signed_ip}</p>
                <p className="break-all">SHA-256 {d.content_hash}</p>
                <p className={cn("flex items-center gap-1 font-bold", d.integrity ? "text-brand-700" : "text-danger")}>
                  {d.integrity ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {d.integrity ? "무결성 확인 — 서명 뒤 바뀐 내용 없음" : "무결성 불일치 — 서명 뒤 내용·서명 파일이 달라졌어요"}
                </p>
              </div>
            )}
            {d.void_reason && <p className="mt-3 text-sm text-warm-500">취소 사유: {d.void_reason}</p>}
            {d.status === "signed" && (
              <Button className="mt-4" variant="outline" size="sm" disabled={pdf.isPending || !d.pdf_ready} onClick={() => pdf.mutate(d.id)}>
                <FileDown />{d.pdf_ready ? "PDF" : "PDF 만드는 중"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 계약 상세 — 서류 카드 */
export function ContractDocsCard({ contractId, closed }: { contractId: number; closed: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "mnh", "contract-docs", contractId], queryFn: () => mnhDocAdminApi.forContract(contractId) });
  const [view, setView] = useState<number | null>(null);
  const [issueType, setIssueType] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [showVoid, setShowVoid] = useState(false);
  const pdf = usePdf();
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "mnh", "contract-docs", contractId] });
  const issue = useMutation({
    mutationFn: () => mnhDocAdminApi.issue(contractId, issueType, form),
    onSuccess: (r) => { toast.success(r.message ?? "발행했어요."); setIssueType(""); setForm({}); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const reissue = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => mnhDocAdminApi.reissue(id, reason),
    onSuccess: (r) => { toast.success(r.message ?? "다시 발행했어요."); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const d = q.data?.data;
  const docs = (d?.documents ?? []).filter((x) => showVoid || x.status !== "void");
  const main = docs.filter((x) => x.doc_type !== "provision_record");
  const records = docs.filter((x) => x.doc_type === "provision_record");
  const chosen = d?.issuable.find((t) => t.type === issueType);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-warm-800">전자서명 서류</h2>
          <label className="flex items-center gap-1.5 text-xs text-warm-500"><input type="checkbox" checked={showVoid} onChange={(e) => setShowVoid(e.target.checked)} />취소된 서류</label>
        </div>
        {d && d.missing_before_start.length > 0 && (
          <p className="text-xs bg-warn-bg text-warm-800 rounded-lg px-3 py-2 mb-3">
            개시 전 서명이 남았어요: {d.missing_before_start.join(", ")}
            {d.enforce ? " — 서명 전엔 출근이 막혀요." : " (지금은 출근 차단 꺼짐 · MNH_DOCS_ENFORCE)"}
          </p>
        )}
        {main.length === 0 && <p className="text-sm text-warm-500">아직 발행한 서류가 없어요. 담당을 배정하면 이용계약서·개인정보 동의서·준수사항이 자동으로 발행돼요.</p>}
        <ul className="divide-y divide-warm-100">
          {main.map((x) => (
            <DocRow key={x.id} x={x} closed={closed} onView={() => setView(x.id)} onPdf={() => pdf.mutate(x.id)}
              onReissue={() => { const r = window.prompt(`「${x.title}」을 새로 발행할까요? 이전 서류는 취소로 남아요. 사유:`); if (r?.trim()) reissue.mutate({ id: x.id, reason: r.trim() }); }} />
          ))}
        </ul>
        {records.length > 0 && (
          <div className="mt-3 pt-3 border-t border-warm-100">
            <p className={labelCls}>서비스 제공기록지 {records.filter((r) => r.status === "signed").length}/{records.length} 서명</p>
            <div className="flex flex-wrap gap-1.5">
              {records.map((r) => (
                <button key={r.id} onClick={() => setView(r.id)} className={cn("px-2 py-1 rounded-md text-xs font-semibold", DOC_STATUS_STYLE[r.status]?.cls)}>
                  {(r.session_date ?? r.issued_at).slice(5, 10).replace("-", "/")}
                </button>
              ))}
            </div>
          </div>
        )}
        {!closed && d && (
          <form className="mt-4 pt-3 border-t border-warm-100 space-y-2" onSubmit={(e) => { e.preventDefault(); if (issueType) issue.mutate(); }}>
            <label className={labelCls} htmlFor="mnh-issue">서류 발행</label>
            <div className="flex gap-2">
              <select id="mnh-issue" className={selectCls} value={issueType} onChange={(e) => { setIssueType(e.target.value); setForm({}); }}>
                <option value="">발행할 서류 고르기</option>
                {d.issuable.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
              <Button type="submit" size="md" disabled={!issueType || issue.isPending}>발행</Button>
            </div>
            {chosen && chosen.admin_fields.length > 0 && <AdminFields fields={chosen.admin_fields} value={form} onChange={setForm} />}
          </form>
        )}
      </CardContent>
      {view && <DocViewer id={view} onClose={() => { setView(null); refresh(); }} />}
    </Card>
  );
}

function DocRow({ x, closed, onView, onPdf, onReissue }: { x: MnhDocBrief; closed: boolean; onView: () => void; onPdf: () => void; onReissue: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
      <button onClick={onView} className="flex-1 min-w-[140px] text-left font-semibold text-warm-800 hover:underline">{x.title}</button>
      <StatusPill status={x.status} />
      {x.signed_at && <span className="text-xs text-warm-500">{x.signed_at.slice(5, 16).replace("T", " ")}</span>}
      {x.status === "signed" && <Button size="sm" variant="ghost" onClick={onPdf} disabled={!x.pdf_ready} aria-label={`${x.title} PDF`}><FileDown /></Button>}
      {!closed && x.status !== "void" && <Button size="sm" variant="ghost" onClick={onReissue}>다시 발행</Button>}
    </li>
  );
}

/* ───────────── 서식 판 관리 ───────────── */

const AUTO_LABEL: Record<string, string> = { assigned: "담당 배정 때 자동", prepaid: "선납 기록 때 자동", completed: "서비스 종료 때 자동", session: "방문마다(관리사 화면)" };

export function TemplatesTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "mnh", "templates"], queryFn: mnhDocAdminApi.templates });
  const list = q.data?.data.templates ?? [];
  const [sel, setSel] = useState<string>("");
  const cur = list.find((t) => t.doc_type === sel) ?? list[0];
  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        서류 본문 서식입니다. 처음 들어 있는 문안은 <b>운영사 검토 전 초안</b>이에요 — 법무 검토를 거친 문안으로 고쳐 저장하세요.
        저장하면 새 판(v2, v3…)이 되고, 이미 발행한 서류는 발행 당시 판 그대로 남아요. 제공기관 사업자번호·대표·주소·연락처는 서버 설정(MNH_PROVIDER_*)이 비어 있으면 「(미등록)」으로 나와요.
      </p>
      <div className="grid lg:grid-cols-[240px_1fr] gap-4 items-start">
        <Card>
          <CardContent className="p-2">
            {list.map((t) => (
              <button key={t.doc_type} onClick={() => setSel(t.doc_type)}
                className={cn("w-full text-left rounded-lg px-3 py-2 text-sm", cur?.doc_type === t.doc_type ? "bg-brand-50 text-brand-800 font-bold" : "hover:bg-warm-50 text-warm-700")}>
                {t.label}<span className="block text-xs font-normal text-warm-500">v{t.version} · {t.signer === "caregiver" ? "관리사 서명" : "이용자 서명"}{t.before_start ? " · 개시 전" : ""}</span>
              </button>
            ))}
          </CardContent>
        </Card>
        {cur && <TemplateEditor key={`${cur.doc_type}-${cur.version}`} t={cur} variables={q.data?.data.variables ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "mnh", "templates"] })} />}
      </div>
    </>
  );
}

function TemplateEditor({ t, variables, onSaved }: { t: MnhTemplate; variables: string[]; onSaved: () => void }) {
  const [title, setTitle] = useState(t.title);
  const [body, setBody] = useState(t.body);
  const [note, setNote] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const dirty = title !== t.title || body !== t.body;
  const preview = useMutation({ mutationFn: () => mnhDocAdminApi.preview(t.doc_type, body), onSuccess: (r) => setHtml(r.data.html), onError: (e) => toast.error(getApiErrorMessage(e)) });
  const save = useMutation({
    mutationFn: () => mnhDocAdminApi.saveTemplate(t.doc_type, { title, body, note: note || undefined }),
    onSuccess: (r) => { toast.success(r.message); onSaved(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-warm-500">
          <span>현재 v{t.version}{t.note ? ` — ${t.note}` : ""}</span>
          {t.auto && <span>· {AUTO_LABEL[t.auto] ?? t.auto} 발행</span>}
          {t.fields.length > 0 && <span>· 입력 칸 {t.fields.map((f) => f.label).join(", ")}</span>}
        </div>
        <label className="block"><span className={labelCls}>제목</span><Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block">
          <span className={labelCls}>본문 — 빈 줄로 문단, 「## 」 소제목, 「- 」 목록, {"{{변수}}"} 치환</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="w-full rounded-lg border border-warm-200 p-3 font-mono text-[13px] leading-relaxed" />
        </label>
        <details className="text-xs text-warm-600">
          <summary className="cursor-pointer font-semibold">쓸 수 있는 변수 {variables.length}개</summary>
          <p className="mt-1 font-mono break-words">{variables.map((v) => `{{${v}}}`).join("  ")}</p>
        </details>
        <label className="block"><span className={labelCls}>바꾼 내용(판 메모)</span><Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="예: 법무 검토 반영" /></label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => preview.mutate()} disabled={preview.isPending}>미리보기</Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending || !title.trim() || !body.trim()}>새 판으로 저장</Button>
          {dirty && <Button variant="ghost" size="sm" onClick={() => { setTitle(t.title); setBody(t.body); }}>되돌리기</Button>}
        </div>
        {html && <div className={cn("rounded-lg border border-warm-200 p-4", DOC_CSS)} dangerouslySetInnerHTML={{ __html: html }} />}
        <p className="text-xs text-warm-500">판 이력: {t.versions.map((v) => `v${v.version}(${v.created_at.slice(0, 10)}${v.note ? ` ${v.note}` : ""})`).join(" · ")}</p>
      </CardContent>
    </Card>
  );
}

/* ───────────── 인력 계약 ───────────── */

export function EmploymentTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "mnh", "employment"], queryFn: mnhDocAdminApi.employment });
  // 계약서 칸 정의는 서버(config/mnh_docs.php) 한 곳에서 — 서식 목록 응답에 실려 온다
  const tpl = useQuery({ queryKey: ["admin", "mnh", "templates"], queryFn: mnhDocAdminApi.templates });
  const empFields = (tpl.data?.data.templates.find((t) => t.doc_type === "employment_contract")?.fields ?? []).filter((f) => f.filled_by === "admin");
  const [target, setTarget] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [view, setView] = useState<number | null>(null);
  const pdf = usePdf();
  const issue = useMutation({
    mutationFn: () => mnhDocAdminApi.issueEmployment(target!, form),
    onSuccess: (r) => { toast.success(r.message ?? "발행했어요."); setTarget(null); setForm({}); qc.invalidateQueries({ queryKey: ["admin", "mnh", "employment"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const rows = q.data?.data ?? [];
  return (
    <>
      <p className="text-sm text-warm-700 bg-info-bg rounded-lg px-4 py-3 mb-4">
        산모신생아 건강관리사와 제공기관(케어앤)이 맺는 근로·프리랜서 계약서입니다. 발행하면 관리사에게 서명 요청이 가고,
        서명하면 PDF가 돌봄전문가 서류의 「근로계약서 또는 프리랜서 계약서」에 확인 완료로 들어가요.
      </p>
      <Card>
        <CardContent className="p-0 divide-y divide-warm-100">
          {rows.length === 0 && <p className="p-6 text-sm text-warm-500 text-center">{q.isLoading ? "불러오는 중…" : "산모신생아 직군 돌봄전문가가 없어요."}</p>}
          {rows.map((r) => {
            const latest = r.documents[0];
            return (
              <div key={r.caregiver_id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-warm-800 flex-1 min-w-[120px]">{r.name}{r.status !== "active" && <span className="ml-1 text-xs text-warm-500">({r.status})</span>}</span>
                  {latest ? <StatusPill status={latest.status} /> : <span className="text-xs text-warm-500">계약서 없음</span>}
                  {latest && <Button size="sm" variant="ghost" onClick={() => setView(latest.id)}>보기</Button>}
                  {latest?.status === "signed" && <Button size="sm" variant="ghost" onClick={() => pdf.mutate(latest.id)} disabled={!latest.pdf_ready} aria-label="PDF"><FileDown /></Button>}
                  {latest?.status !== "issued" && (
                    <Button size="sm" variant={latest ? "outline" : "brand"} onClick={() => { setTarget(target === r.caregiver_id ? null : r.caregiver_id); setForm({}); }}>
                      {latest ? "새 계약(갱신)" : "계약서 발행"}
                    </Button>
                  )}
                </div>
                {target === r.caregiver_id && (
                  <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); issue.mutate(); }}>
                    <AdminFields fields={empFields} value={form} onChange={setForm} />
                    <div className="flex gap-2"><Button type="submit" size="sm" disabled={issue.isPending}>발행</Button><Button type="button" size="sm" variant="outline" onClick={() => setTarget(null)}>닫기</Button></div>
                  </form>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      {view && <DocViewer id={view} onClose={() => setView(null)} />}
    </>
  );
}
