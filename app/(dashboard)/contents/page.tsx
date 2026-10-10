"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FileText, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  contentsApi,
  type ContentBlock,
  type ContentInput,
  type ContentLabels,
  type ContentRow,
  type ContentTone,
} from "@/lib/api/contents";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

/**
 * 영역별 안내 콘텐츠·FAQ·지역 공지(CAREN-REF-01 3단계, 2026-10-10). 권한 영역 'contents'.
 * 게시본을 고치면 회원 웹·앱에 바로 반영된다. 제목·본문·지역·기간을 고치면 서버가 검수 표시를 푼다.
 */

const KIND_TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "guide", label: "안내" },
  { key: "faq", label: "FAQ" },
  { key: "notice", label: "공지" },
];
const STATUS_LABEL: Record<string, string> = { draft: "초안", published: "게시" };
const ROLE_LABEL: Record<string, string> = {
  provided: "제공해요",
  not_provided: "제공하지 않아요",
  ineligible: "이용이 어려운 경우",
};

/** 서버 시각(ISO+시간대)을 한국시각으로 표시 */
function kst(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e) && e.response?.status === 422) {
    const d = e.response.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    const first = d?.errors ? Object.values(d.errors).flat()[0] : undefined;
    return first ?? d?.message ?? "입력값을 확인해 주세요.";
  }
  return getApiErrorMessage(e);
}

// ── 블록 편집용 표현(텍스트 기반) ─────────────────────────────
type BlockType = ContentBlock["type"];
interface BlockDraft {
  key: number;
  type: BlockType;
  text: string; // p, note
  tone: ContentTone | ""; // note
  itemsText: string; // list — 한 줄에 하나
  role: string; // list
  headText: string; // table — a | b | c
  rowsText: string; // table — 한 줄에 한 행, 칸은 |
  label: string; // link
  href: string; // link
}

let blockSeq = 1;
function emptyBlock(type: BlockType): BlockDraft {
  return { key: blockSeq++, type, text: "", tone: "", itemsText: "", role: "", headText: "", rowsText: "", label: "", href: "" };
}
const splitCells = (line: string) => line.split("|").map((c) => c.trim());
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function toDraft(b: ContentBlock): BlockDraft {
  const d = emptyBlock(b.type);
  switch (b.type) {
    case "p":
      d.text = b.text ?? "";
      break;
    case "note":
      d.text = b.text ?? "";
      d.tone = b.tone ?? "";
      break;
    case "list":
      d.itemsText = (b.items ?? []).join("\n");
      d.role = b.role ?? "";
      break;
    case "table":
      d.headText = (b.head ?? []).join(" | ");
      d.rowsText = (b.rows ?? []).map((r) => r.join(" | ")).join("\n");
      break;
    case "link":
      d.label = b.label ?? "";
      d.href = b.href ?? "";
      break;
  }
  return d;
}

function fromDraft(d: BlockDraft): ContentBlock {
  switch (d.type) {
    case "p":
      return { type: "p", text: d.text.trim() };
    case "note":
      return d.tone ? { type: "note", text: d.text.trim(), tone: d.tone } : { type: "note", text: d.text.trim() };
    case "list":
      return d.role ? { type: "list", items: lines(d.itemsText), role: d.role } : { type: "list", items: lines(d.itemsText) };
    case "table":
      return { type: "table", head: d.headText.trim() ? splitCells(d.headText) : [], rows: lines(d.rowsText).map(splitCells) };
    case "link":
      return { type: "link", label: d.label.trim(), href: d.href.trim() };
  }
}

interface FormState {
  kind: string;
  placement: string;
  domain: string; // '' = 공통
  audience: string;
  platform: string;
  regions: string[];
  title: string;
  tone: ContentTone | "";
  sort: number;
  status: "draft" | "published";
  starts_on: string;
  ends_on: string;
  source_url: string;
  source_note: string;
  blocks: BlockDraft[];
}

function toForm(r: ContentRow | null): FormState {
  return {
    kind: r?.kind ?? "notice",
    placement: r?.placement ?? "home",
    domain: r?.domain ?? "",
    audience: r?.audience ?? "all",
    platform: r?.platform ?? "all",
    regions: r?.regions ?? [],
    title: r?.title ?? "",
    tone: r?.tone ?? "",
    sort: r?.sort ?? 0,
    status: r?.status ?? "draft",
    starts_on: r?.starts_on ?? "",
    ends_on: r?.ends_on ?? "",
    source_url: r?.source_url ?? "",
    source_note: r?.source_note ?? "",
    blocks: r ? (r.blocks ?? []).map(toDraft) : [emptyBlock("p")],
  };
}

function toPayload(f: FormState): Required<Pick<ContentInput, "kind" | "placement" | "title" | "blocks">> & ContentInput {
  return {
    kind: f.kind as ContentRow["kind"],
    placement: f.placement,
    domain: f.domain || null,
    audience: f.audience,
    platform: f.platform,
    regions: f.regions.length ? f.regions : null,
    title: f.title.trim(),
    blocks: f.blocks.map(fromDraft),
    tone: f.tone || "info",
    sort: Number(f.sort) || 0,
    status: f.status,
    starts_on: f.starts_on || null,
    ends_on: f.ends_on || null,
    source_url: f.source_url.trim() || null,
    source_note: f.source_note.trim() || null,
  };
}

/** PATCH 는 바뀐 칸만 보낸다 — 그대로인 제목·본문을 보내도 서버가 검수 표시를 풀기 때문 */
function diffPayload(orig: ContentRow, next: ReturnType<typeof toPayload>): ContentInput {
  const base = toPayload(toForm(orig));
  const out: Record<string, unknown> = {};
  (Object.keys(next) as (keyof typeof next)[]).forEach((k) => {
    if (JSON.stringify(next[k]) !== JSON.stringify(base[k])) out[k] = next[k];
  });
  return out as ContentInput;
}

// ── 페이지 ─────────────────────────────────────────────
export default function ContentsPage() {
  const qc = useQueryClient();
  const perms = useAuth((s) => s.user?.admin_permissions);
  const canWrite = !perms || !!perms.contents?.write;

  const [kind, setKind] = useState("");
  const [placement, setPlacement] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");

  const q = useQuery({
    queryKey: ["admin", "contents", { kind, placement, domain, status }],
    queryFn: () => contentsApi.list({ kind, placement, domain, status }),
  });
  const labels = q.data?.labels;
  const rows = q.data?.rows ?? [];

  const [editing, setEditing] = useState<ContentRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ContentRow | null>(null);

  const remove = useMutation({
    mutationFn: (r: ContentRow) => contentsApi.remove(r.id),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? "지웠어요.");
      setDeleting(null);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "contents"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const selectCls = "h-9 rounded-md border border-warm-200 bg-white px-2.5 text-sm text-warm-700";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-warm-800">
            <FileText className="h-5 w-5 text-brand-600" /> 안내 콘텐츠 · FAQ · 지역 공지
          </h1>
          <p className="mt-1 text-sm text-warm-500">
            서비스 범위 안내, 고객센터·이용 가이드 FAQ, 바우처 안내, 지역 공지를 관리합니다. 게시된 글을 고치면 회원 웹·앱에 바로 반영됩니다.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setEditing("new")}>
            <Plus /> 새 콘텐츠
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {KIND_TABS.map((t) => (
          <button
            key={t.key || "all"}
            type="button"
            onClick={() => setKind(t.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold",
              kind === t.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-200 text-warm-600 hover:bg-warm-50",
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-warm-200 sm:block" />
        <select aria-label="위치" className={selectCls} value={placement} onChange={(e) => setPlacement(e.target.value)}>
          <option value="">위치 전체</option>
          {labels && Object.entries(labels.placements).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="영역" className={selectCls} value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="">영역 전체</option>
          <option value="common">공통</option>
          {labels && Object.entries(labels.domains).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="상태" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">상태 전체</option>
          <option value="draft">초안</option>
          <option value="published">게시</option>
        </select>
        {q.data && <span className="text-sm text-warm-500">{rows.length}건</span>}
      </div>

      <Card>
        <CardContent className="p-0">
          {q.isLoading && <p className="p-6 text-sm text-warm-500">불러오는 중…</p>}
          {q.isError && <p className="p-6 text-sm text-danger">{getApiErrorMessage(q.error)}</p>}
          {q.data && rows.length === 0 && <p className="p-6 text-sm text-warm-500">조건에 맞는 콘텐츠가 없습니다.</p>}
          {rows.length > 0 && labels && (
            <div className="overflow-x-auto">
              <Table data-testid="contents-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>종류</TableHead>
                    <TableHead>위치</TableHead>
                    <TableHead>영역</TableHead>
                    <TableHead>대상 · 플랫폼</TableHead>
                    <TableHead>지역</TableHead>
                    <TableHead>기간</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>검수</TableHead>
                    <TableHead>수정</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[280px]">
                        <button type="button" onClick={() => setEditing(r)} className="text-left font-semibold text-warm-800 hover:text-brand-700 hover:underline">
                          {r.title}
                        </button>
                        <div className="text-xs text-warm-500">#{r.id} · 블록 {r.blocks?.length ?? 0}개</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{labels.kinds[r.kind] ?? r.kind}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{labels.placements[r.placement] ?? r.placement}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.domain ? labels.domains[r.domain] ?? r.domain : "공통"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {labels.audiences[r.audience] ?? r.audience}
                        <div className="text-xs text-warm-500">{labels.platforms[r.platform] ?? r.platform}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.regions?.length ? r.regions.join(", ") : "전국"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-warm-600">
                        {r.starts_on || r.ends_on ? `${r.starts_on ?? ""} ~ ${r.ends_on ?? ""}` : "상시"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "published" ? "success" : "outline"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.reviewed ? (
                          <Badge variant="info" title={kst(r.reviewed_at)}>검수 완료{r.reviewed_by_name ? ` · ${r.reviewed_by_name}` : ""}</Badge>
                        ) : (
                          <Badge variant="warn">검수 필요</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-warm-600">
                        {kst(r.updated_at)}
                        {r.updated_by_name && <div className="text-warm-500">{r.updated_by_name}</div>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>{canWrite ? "편집" : "보기"}</Button>
                        {canWrite && (
                          <Button size="sm" variant="ghost" className="ml-1 text-danger hover:bg-danger-bg hover:text-danger" aria-label="삭제" onClick={() => setDeleting(r)}>
                            <Trash2 />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && labels && (
        <ContentEditor
          key={editing === "new" ? "new" : editing.id}
          row={editing === "new" ? null : editing}
          labels={labels}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            qc.invalidateQueries({ queryKey: ["admin", "contents"] });
            if (r) setEditing(r);
          }}
          onDelete={(r) => setDeleting(r)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        loading={remove.isPending}
        tone="danger"
        title="콘텐츠 삭제"
        target={deleting?.title}
        impact={deleting?.status === "published" ? "게시 중인 글입니다. 지우면 회원 화면에서 바로 사라집니다." : "초안을 지웁니다."}
        reversible={false}
        confirmLabel="삭제"
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}

// ── 편집기 ─────────────────────────────────────────────
function ContentEditor({
  row,
  labels,
  canWrite,
  onClose,
  onSaved,
  onDelete,
}: {
  row: ContentRow | null;
  labels: ContentLabels;
  canWrite: boolean;
  onClose: () => void;
  onSaved: (r: ContentRow | null) => void;
  onDelete: (r: ContentRow) => void;
}) {
  const [f, setF] = useState<FormState>(() => toForm(row));
  const [error, setError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const payload = useMemo(() => toPayload(f), [f]);
  const changes = useMemo(() => (row ? diffPayload(row, payload) : payload), [row, payload]);
  const dirty = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => (row ? contentsApi.update(row.id, changes) : contentsApi.create(payload)),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? "저장했어요.");
      setError(null);
      setConfirmPublish(false);
      // 목록을 새로 읽어 서버 값(검수 표시 해제 등)을 반영한다
      onSaved(null);
      onClose();
    },
    onError: (e) => {
      const m = errorMessage(e);
      setError(m);
      setConfirmPublish(false);
      toast.error(m);
    },
  });
  const review = useMutation({
    mutationFn: (undo: boolean) => contentsApi.review(row!.id, undo),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? "처리했어요.");
      onSaved(null);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const willPublishNotice = f.kind === "notice" && f.status === "published" && (!row || row.status !== "published");
  const submit = () => {
    setError(null);
    if (!payload.title) return setError("제목을 입력해 주세요.");
    if (!payload.blocks.length) return setError("본문 블록을 하나 이상 넣어 주세요.");
    if (willPublishNotice) return setConfirmPublish(true);
    save.mutate();
  };

  const updateBlock = (i: number, patch: Partial<BlockDraft>) =>
    setF((s) => ({ ...s, blocks: s.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const moveBlock = (i: number, dir: -1 | 1) =>
    setF((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.blocks.length) return s;
      const next = [...s.blocks];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, blocks: next };
    });
  const removeBlock = (i: number) => setF((s) => ({ ...s, blocks: s.blocks.filter((_, j) => j !== i) }));
  const addBlock = (t: BlockType) => setF((s) => ({ ...s, blocks: [...s.blocks, emptyBlock(t)] }));

  const placementOptions = { ...labels.placements, ...(f.placement && !labels.placements[f.placement] ? { [f.placement]: f.placement } : {}) };
  const isServiceScope = f.placement === "service_scope";
  const field = "block text-xs font-bold text-warm-600 mb-1";
  const ctl = "w-full rounded-md border border-warm-200 bg-white px-2.5 py-1.5 text-sm text-warm-800 disabled:bg-warm-50";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-warm-900/30" role="dialog" aria-modal="true" aria-label="콘텐츠 편집">
      <div className="flex h-full w-full max-w-6xl flex-col bg-white shadow-xl" data-testid="content-editor">
        <div className="flex items-center gap-3 border-b border-warm-100 px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-warm-500">{row ? `#${row.id} 편집` : "새 콘텐츠"}</div>
            <div className="truncate text-base font-bold text-warm-800">{f.title || "(제목 없음)"}</div>
          </div>
          {row && (row.reviewed ? <Badge variant="info">검수 완료{row.reviewed_by_name ? ` · ${row.reviewed_by_name}` : ""}</Badge> : <Badge variant="warn">검수 필요</Badge>)}
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-2 text-warm-500 hover:bg-warm-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          {/* 입력 */}
          <fieldset disabled={!canWrite} className="space-y-4 p-5 lg:overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className={field}>종류</label>
                <select className={ctl} value={f.kind} onChange={(e) => set("kind", e.target.value)}>
                  {Object.entries(labels.kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={field}>위치</label>
                <select className={ctl} value={f.placement} onChange={(e) => set("placement", e.target.value)}>
                  {Object.entries(placementOptions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={field}>영역</label>
                <select className={ctl} value={f.domain} onChange={(e) => set("domain", e.target.value)}>
                  <option value="">공통</option>
                  {Object.entries(labels.domains).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={field}>대상</label>
                <select className={ctl} value={f.audience} onChange={(e) => set("audience", e.target.value)}>
                  {Object.entries(labels.audiences).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={field}>플랫폼</label>
                <select className={ctl} value={f.platform} onChange={(e) => set("platform", e.target.value)}>
                  {Object.entries(labels.platforms).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={field}>정렬 순서</label>
                <Input type="number" min={0} max={9999} value={f.sort} onChange={(e) => set("sort", Number(e.target.value))} className="h-9" />
              </div>
            </div>

            <div>
              <label className={field}>제목</label>
              <Input value={f.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className={field}>상태</label>
                <div className="flex overflow-hidden rounded-md border border-warm-200">
                  {(["draft", "published"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("status", s)}
                      className={cn(
                        "flex-1 py-1.5 text-sm font-semibold",
                        f.status === s ? (s === "published" ? "bg-brand-500 text-white" : "bg-warm-700 text-white") : "bg-white text-warm-600 hover:bg-warm-50",
                      )}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={field}>표시 톤</label>
                <select className={ctl} value={f.tone} onChange={(e) => set("tone", e.target.value as ContentTone | "")}>
                  <option value="info">일반(info)</option>
                  <option value="warn">주의(warn)</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={field}>게시 기간</label>
                <div className="flex items-center gap-1">
                  <input type="date" className={ctl} value={f.starts_on} onChange={(e) => set("starts_on", e.target.value)} aria-label="시작일" />
                  <span className="text-warm-500">~</span>
                  <input type="date" className={ctl} value={f.ends_on} onChange={(e) => set("ends_on", e.target.value)} aria-label="종료일" />
                </div>
              </div>
            </div>

            <div>
              <label className={field}>
                지역 <span className="font-normal text-warm-500">— 아무것도 고르지 않으면 전국</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {labels.regions.map((r) => {
                  const on = f.regions.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("regions", on ? f.regions.filter((x) => x !== r) : [...f.regions, r])}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 text-warm-600 hover:bg-warm-50",
                      )}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 text-xs text-warm-500">현재: {f.regions.length ? f.regions.join(", ") : "전국"}</div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="mb-2 text-xs font-bold text-amber-800">출처·근거 — 고시·공고 원문 링크를 남겨 주세요</div>
              <Input placeholder="https://…" value={f.source_url} maxLength={500} onChange={(e) => set("source_url", e.target.value)} className="mb-2 h-9 bg-white" />
              <textarea className={cn(ctl, "min-h-[56px]")} placeholder="근거 메모(고시 번호, 확인한 날짜 등)" value={f.source_note} maxLength={500} onChange={(e) => set("source_note", e.target.value)} />
            </div>

            {/* 블록 편집 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-warm-700">본문 블록 {f.blocks.length}개</span>
              </div>
              <ol className="space-y-3">
                {f.blocks.map((b, i) => (
                  <li key={b.key} className="rounded-md border border-warm-200 p-3" data-testid="block">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-bold tabular-nums text-warm-500">{i + 1}</span>
                      <select
                        className="h-8 rounded-md border border-warm-200 bg-white px-2 text-sm"
                        value={b.type}
                        aria-label="블록 종류"
                        onChange={(e) => updateBlock(i, { type: e.target.value as BlockType })}
                      >
                        {Object.entries(labels.block_types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <div className="ml-auto flex gap-1">
                        <Button type="button" size="sm" variant="outline" aria-label="위로" disabled={i === 0} onClick={() => moveBlock(i, -1)}><ArrowUp /></Button>
                        <Button type="button" size="sm" variant="outline" aria-label="아래로" disabled={i === f.blocks.length - 1} onClick={() => moveBlock(i, 1)}><ArrowDown /></Button>
                        <Button type="button" size="sm" variant="outline" aria-label="블록 삭제" onClick={() => removeBlock(i)}><Trash2 /></Button>
                      </div>
                    </div>
                    {(b.type === "p" || b.type === "note") && (
                      <>
                        {b.type === "note" && (
                          <select className="mb-2 h-8 rounded-md border border-warm-200 bg-white px-2 text-sm" value={b.tone} aria-label="강조 톤" onChange={(e) => updateBlock(i, { tone: e.target.value as ContentTone | "" })}>
                            <option value="">기본</option>
                            <option value="info">안내(info)</option>
                            <option value="warn">주의(warn)</option>
                          </select>
                        )}
                        <textarea className={cn(ctl, "min-h-[72px]")} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} />
                      </>
                    )}
                    {b.type === "list" && (
                      <>
                        {(isServiceScope || b.role) && (
                          <select className="mb-2 h-8 rounded-md border border-warm-200 bg-white px-2 text-sm" value={b.role} aria-label="목록 구분" onChange={(e) => updateBlock(i, { role: e.target.value })}>
                            <option value="">구분 없음</option>
                            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        )}
                        <textarea className={cn(ctl, "min-h-[96px]")} placeholder="한 줄에 한 항목" value={b.itemsText} onChange={(e) => updateBlock(i, { itemsText: e.target.value })} />
                      </>
                    )}
                    {b.type === "table" && (
                      <>
                        <Input className="mb-2 h-9" placeholder="머리줄: 구분 | 내용 | 비고" value={b.headText} onChange={(e) => updateBlock(i, { headText: e.target.value })} />
                        <textarea className={cn(ctl, "min-h-[96px] font-mono text-xs")} placeholder={"한 줄에 한 행, 칸은 | 로 나눔\n가형 | 90% | …"} value={b.rowsText} onChange={(e) => updateBlock(i, { rowsText: e.target.value })} />
                      </>
                    )}
                    {b.type === "link" && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input className="h-9" placeholder="링크 이름" value={b.label} onChange={(e) => updateBlock(i, { label: e.target.value })} />
                        <Input className="h-9" placeholder="/app/... 또는 https://..." value={b.href} onChange={(e) => updateBlock(i, { href: e.target.value })} />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(labels.block_types).map(([k, v]) => (
                  <Button key={k} type="button" size="sm" variant="secondary" onClick={() => addBlock(k as BlockType)}>
                    <Plus /> {v}
                  </Button>
                ))}
              </div>
            </div>
          </fieldset>

          {/* 미리보기 */}
          <div className="border-t border-warm-100 bg-warm-50 p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="mb-2 text-xs font-bold text-warm-500">회원 화면 미리보기</div>
            <ContentPreview title={f.title} tone={f.tone || "info"} kind={f.kind} blocks={payload.blocks} />
            {row && (
              <div className="mt-4 space-y-1 text-xs text-warm-500">
                <div>수정 {kst(row.updated_at)}{row.updated_by_name ? ` · ${row.updated_by_name}` : ""}</div>
                {row.reviewed && <div>검수 {kst(row.reviewed_at)}{row.reviewed_by_name ? ` · ${row.reviewed_by_name}` : ""}</div>}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-warm-100 px-5 py-3">
          {error && <p className="mb-2 rounded-md bg-danger-bg px-3 py-2 text-sm font-semibold text-danger" role="alert">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {row && canWrite && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={review.isPending || dirty}
                  title={dirty ? "저장한 뒤에 검수 표시를 바꿀 수 있어요." : undefined}
                  onClick={() => review.mutate(row.reviewed)}
                >
                  {row.reviewed ? "검수 표시 풀기" : "검수 완료로 표시"}
                </Button>
                <span className="text-xs text-warm-500">내용을 고치면 검수 표시가 풀려요</span>
              </>
            )}
            <div className="ml-auto flex gap-2">
              {row && canWrite && (
                <Button type="button" variant="outline" className="text-danger" onClick={() => onDelete(row)}>
                  <Trash2 /> 삭제
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>닫기</Button>
              {canWrite && (
                <Button type="button" disabled={save.isPending || (!!row && !dirty)} onClick={submit}>
                  {row ? (dirty ? "저장" : "바뀐 내용 없음") : "만들기"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={(o) => !o && setConfirmPublish(false)}
        loading={save.isPending}
        title="공지 게시"
        description="게시하면 해당 지역 회원 홈에 바로 보여요. 출처를 확인했나요?"
        target={f.title}
        impact={`지역: ${f.regions.length ? f.regions.join(", ") : "전국"}${f.source_url ? ` · 출처: ${f.source_url}` : " · 출처 링크 없음"}`}
        reversible
        reverseHint="상태를 초안으로 바꾸면 회원 화면에서 내려갑니다."
        confirmLabel="게시"
        onConfirm={() => save.mutate()}
      />
    </div>
  );
}

// ── 미리보기(회원 앱 표시를 단순화) ─────────────────────────
function ContentPreview({ title, tone, kind, blocks }: { title: string; tone: ContentTone; kind: string; blocks: ContentBlock[] }) {
  return (
    <div
      data-testid="content-preview"
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm",
        kind === "notice" && tone === "warn" ? "border-amber-300" : "border-warm-200",
      )}
    >
      {kind === "notice" && (
        <div className={cn("mb-1 text-[11px] font-bold", tone === "warn" ? "text-amber-700" : "text-brand-600")}>공지</div>
      )}
      <h3 className="mb-3 text-[15px] font-bold leading-snug text-warm-900">{title || "(제목)"}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-warm-700">
        {blocks.map((b, i) => {
          switch (b.type) {
            case "p":
              return <p key={i} className="whitespace-pre-line">{b.text}</p>;
            case "note":
              return (
                <div key={i} className={cn("whitespace-pre-line rounded-xl px-3 py-2 text-[13px]", b.tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-sky-50 text-sky-900")}>
                  {b.text}
                </div>
              );
            case "list":
              return (
                <div key={i}>
                  {b.role && (
                    <div className={cn("mb-1 text-xs font-bold", b.role === "provided" ? "text-brand-700" : b.role === "not_provided" ? "text-danger" : "text-amber-700")}>
                      {ROLE_LABEL[b.role] ?? b.role}
                    </div>
                  )}
                  <ul className="list-disc space-y-0.5 pl-5">
                    {b.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                </div>
              );
            case "table":
              return (
                <div key={i} className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    {b.head.length > 0 && (
                      <thead>
                        <tr>{b.head.map((h, j) => <th key={j} className="border border-warm-200 bg-warm-50 px-2 py-1 text-left font-bold">{h}</th>)}</tr>
                      </thead>
                    )}
                    <tbody>
                      {b.rows.map((r, j) => (
                        <tr key={j}>{r.map((c, k) => <td key={k} className="border border-warm-200 px-2 py-1">{c}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case "link":
              return (
                <div key={i}>
                  <span className={cn("inline-flex items-center gap-1 font-semibold text-brand-700 underline underline-offset-2", !/^(\/|https:\/\/)/.test(b.href) && "text-danger")}>
                    {b.label || "(링크 이름)"} ›
                  </span>
                  {!/^(\/|https:\/\/)/.test(b.href) && <div className="text-xs text-danger">주소는 / 또는 https:// 로 시작해야 해요</div>}
                </div>
              );
          }
        })}
        {blocks.length === 0 && <p className="text-warm-500">본문이 비어 있어요.</p>}
      </div>
    </div>
  );
}
