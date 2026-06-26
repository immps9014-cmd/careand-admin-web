"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Heart,
  HardHat,
  Building2,
  Plus,
  Filter,
  ArrowDownUp,
  ChevronDown,
  Search,
  Download,
  MoreVertical,
  X,
  ShieldCheck,
  IdCard,
  MapPin,
  Star,
  Phone as PhoneIcon,
  Mail,
  Calendar,
  BadgeCheck,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/domain/kpi-card";
import { operationsApi, type CaregiverDetail, type CreateMemberInput, type Member } from "@/lib/api/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn, formatDate } from "@/lib/utils";

const ROLE_BADGE: Record<
  string,
  { variant: "warn" | "success" | "danger" | "info" | "outline"; label: string }
> = {
  guardian: { variant: "info", label: "보호자" },
  caregiver: { variant: "success", label: "돌봄전문가" },
  organization: { variant: "warn", label: "기관" },
  admin: { variant: "danger", label: "운영자" },
};

const STATUS_BADGE: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  active: { dot: "bg-brand-500", text: "text-brand-700", label: "활성" },
  suspended: { dot: "bg-warn", text: "text-warn", label: "정지" },
  withdrawn: { dot: "bg-danger", text: "text-danger", label: "탈퇴" },
};

const ROLE_AVATAR: Record<string, string> = {
  guardian: "bg-info",
  caregiver: "bg-brand-500",
  organization: "bg-warn",
  admin: "bg-warm-600",
};

// 돌봄전문가 자격검증 상태 (caregiver_status)
const CG_VERIFY: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  pending: { variant: "warn", label: "검증 대기" },
  active: { variant: "success", label: "검증 완료" },
  suspended: { variant: "danger", label: "정지" },
  rejected: { variant: "danger", label: "거절" },
  leave: { variant: "outline", label: "휴직" },
};

export default function MembersPage() {
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const urlQ = new URLSearchParams(window.location.search).get("q");
    if (urlQ) setQ(urlQ);
  }, []);

  const query = useQuery({
    queryKey: ["admin", "members", role, q, status, sort],
    queryFn: () =>
      operationsApi.members({
        ...(role ? { role } : {}),
        ...(q ? { q } : {}),
        ...(status ? { status } : {}),
        sort,
      }),
  });

  const s = query.data?.summary;
  const total = query.data?.meta?.total ?? 0;
  const roleTotal =
    (s?.guardian ?? 0) + (s?.caregiver ?? 0) + (s?.organization ?? 0) + (s?.admin ?? 0);

  const TABS: { key: string; label: string; count: number }[] = [
    { key: "", label: "전체", count: roleTotal },
    { key: "guardian", label: "보호자", count: s?.guardian ?? 0 },
    { key: "caregiver", label: "돌봄전문가", count: s?.caregiver ?? 0 },
    { key: "organization", label: "기관", count: s?.organization ?? 0 },
    { key: "admin", label: "운영자", count: s?.admin ?? 0 },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            회원 · 돌봄전문가 통합관리
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            보호자·돌봄전문가·운영자를 통합 조회·검색합니다 (개인정보 마스킹 적용)
          </p>
        </div>
        <Button variant="brand" size="md" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          회원 추가
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="보호자"
          value={s?.guardian ?? 0}
          icon={Heart}
          iconColor="info"
        />
        <KpiCard
          label="돌봄전문가 (케어 제공자)"
          value={s?.caregiver ?? 0}
          icon={HardHat}
          iconColor="brand"
        />
        <KpiCard
          label="기관"
          value={s?.organization ?? 0}
          icon={Building2}
          iconColor="warn"
        />
        <KpiCard
          label="운영자"
          value={s?.admin ?? 0}
          icon={Users}
          iconColor="danger"
        />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="inline-flex bg-warm-100 p-1 rounded-md">
          {TABS.map((t) => (
            <button
              key={t.key || "all"}
              onClick={() => setRole(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors",
                role === t.key
                  ? "bg-white text-warm-800 shadow-sm"
                  : "text-warm-600 hover:text-warm-800"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "font-en text-[10px] px-1.5 py-0.5 rounded-full",
                  role === t.key
                    ? "bg-brand-50 text-brand-600"
                    : "bg-warm-200 text-warm-500"
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <StatusFilter value={status} onChange={setStatus} />
        <SortFilter value={sort} onChange={setSort} />

        <div className="flex-1" />

        <div className="relative max-w-[240px] w-full">
          <Search className="w-4 h-4 text-warm-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·이메일 검색"
            className="pl-9 h-9"
          />
        </div>
        <Button variant="outline" size="sm" disabled>
          <Download className="w-4 h-4" />
          내보내기
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">회원 목록</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            총 {total}명
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>회원</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>자격검증</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-warm-400 py-10">
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-warm-400 py-10">
                  회원이 없습니다
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.map((m) => {
              const status = STATUS_BADGE[m.status] ?? STATUS_BADGE.active;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
                          ROLE_AVATAR[m.role] ?? "bg-warm-500"
                        )}
                      >
                        {m.name?.charAt(0) ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-warm-800 truncate">
                          {m.name}
                        </div>
                        <div className="text-warm-500 font-en text-xs truncate">
                          {m.email || "-"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE[m.role]?.variant ?? "outline"}>
                      {ROLE_BADGE[m.role]?.label ?? m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.role === "caregiver" && m.caregiver_status && CG_VERIFY[m.caregiver_status] ? (
                      <Badge variant={CG_VERIFY[m.caregiver_status].variant}>
                        {CG_VERIFY[m.caregiver_status].label}
                      </Badge>
                    ) : (
                      <span className="text-warm-300 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-warm-600 font-en text-xs">
                    {m.phone || "-"}
                  </TableCell>
                  <TableCell className="text-warm-500 font-en text-xs">
                    {formatDate(m.created_at)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-bold",
                        status.text
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDetailId(m.id)}>
                        상세
                      </Button>
                      <RowMenu m={m} onDetail={() => setDetailId(m.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="px-6 py-4 flex justify-between items-center border-t border-warm-100">
          <div className="text-xs text-warm-500">
            <span className="font-en font-bold text-warm-700">
              {query.data?.data.length ?? 0}
            </span>{" "}
            / 총 <span className="font-en">{total}</span>명
          </div>
        </div>
      </Card>

      {detailId != null && (
        <MemberDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
      {addOpen && <AddMemberModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

/* ===== 회원 상세 모달 (돌봄전문가 자격검증 포함) ===== */
function calcAge(birth?: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const md = now.getMonth() - b.getMonth() || now.getDate() - b.getDate();
  if (md < 0) age -= 1;
  return age;
}

const DOMAIN_LABEL: Record<string, string> = {
  senior: "시니어", postpartum: "산후", nursing: "간병", housekeeping: "가사", care: "간병", companion: "동행",
};

function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-warm-100 last:border-0">
      <span className="text-xs font-semibold text-warm-500 flex-none pt-0.5">{label}</span>
      <span className="text-sm text-warm-800 text-right min-w-0">{children}</span>
    </div>
  );
}

function MemberDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "member-detail", id],
    queryFn: () => operationsApi.memberDetail(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "members"] });
    qc.invalidateQueries({ queryKey: ["admin", "caregivers"] });
    qc.invalidateQueries({ queryKey: ["admin", "member-detail", id] });
  };
  const approve = useMutation({
    mutationFn: (cgId: number) => operationsApi.approveCaregiver(cgId),
    onSuccess: () => { toast.success("돌봄전문가를 승인했습니다."); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const reject = useMutation({
    mutationFn: ({ cgId, reason }: { cgId: number; reason: string }) => operationsApi.rejectCaregiver(cgId, reason),
    onSuccess: () => { toast.success("돌봄전문가를 반려했습니다."); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  function handleReject(cgId: number) {
    const reason = window.prompt("반려 사유를 입력하세요:");
    if (reason && reason.trim()) reject.mutate({ cgId, reason: reason.trim() });
  }

  const cg: CaregiverDetail | null = data?.caregiver ?? null;
  const CG_STATUS: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
    pending: { variant: "warn", label: "검증 대기" },
    active: { variant: "success", label: "검증 완료" },
    rejected: { variant: "danger", label: "거절" },
    suspended: { variant: "danger", label: "정지" },
    leave: { variant: "outline", label: "휴직" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-warm-900/40 backdrop-blur-[1px]" />
      <div
        className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-xl border border-warm-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-warm-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-warm-800">회원 상세</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-md p-1 text-warm-400 hover:bg-warm-50 hover:text-warm-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading && <div className="py-10 text-center text-warm-400 text-sm">불러오는 중…</div>}
          {isError && <div className="py-10 text-center text-danger text-sm">상세 정보를 불러오지 못했습니다.</div>}

          {data && (
            <>
              {/* 기본 정보 */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-xl font-extrabold flex-none">
                  {data.name?.charAt(0) ?? "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-warm-800 flex items-center gap-2">
                    {data.name}
                    <Badge variant={ROLE_BADGE[data.role]?.variant ?? "outline"}>{ROLE_BADGE[data.role]?.label ?? data.role}</Badge>
                  </div>
                  <div className="text-xs text-warm-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /><span className="font-en">{data.email || "-"}</span></span>
                    <span className="inline-flex items-center gap-1"><PhoneIcon className="w-3.5 h-3.5" /><span className="font-en">{data.phone || "-"}</span></span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-warm-100 bg-warm-50/60 px-4 mb-5">
                <DRow label="역할"><Badge variant={ROLE_BADGE[data.role]?.variant ?? "outline"}>{ROLE_BADGE[data.role]?.label ?? data.role}</Badge></DRow>
                <DRow label="계정 상태">{data.status}</DRow>
                <DRow label="가입일"><span className="font-en">{formatDate(data.created_at)}</span></DRow>
              </div>

              {/* 돌봄전문가 자격정보 */}
              {data.role === "caregiver" && (
                cg ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-brand-500" />
                      <h3 className="text-sm font-bold text-warm-700">자격검증 정보</h3>
                      <Badge variant={CG_STATUS[cg.status]?.variant ?? "outline"} className="ml-auto">
                        {CG_STATUS[cg.status]?.label ?? cg.status}
                      </Badge>
                    </div>

                    <div className="rounded-lg border border-warm-100 px-4 mb-4">
                      <DRow label="자격번호">
                        <span className="font-en font-semibold inline-flex items-center gap-1.5">
                          <IdCard className="w-3.5 h-3.5 text-warm-400" />{cg.license_no || "미제출"}
                          {cg.license_verified && <BadgeCheck className="w-4 h-4 text-brand-500" />}
                        </span>
                      </DRow>
                      <DRow label="진위확인">{cg.license_verified ? "확인됨" : "미확인 (수동 검증 필요)"}</DRow>
                      <DRow label="성별 · 나이">{(cg.gender === "M" ? "남성" : cg.gender === "F" ? "여성" : "-")}{calcAge(cg.birth_date) != null ? ` · 만 ${calcAge(cg.birth_date)}세` : ""}</DRow>
                      <DRow label="서비스 도메인">
                        <span className="inline-flex flex-wrap gap-1 justify-end">
                          {(cg.service_domains || "").split(",").filter(Boolean).map((d) => (
                            <Badge key={d} variant="brand">{DOMAIN_LABEL[d] ?? d}</Badge>
                          ))}
                          {!cg.service_domains && <span className="text-warm-400">-</span>}
                        </span>
                      </DRow>
                      <DRow label="가능 서비스 · 특기">
                        <span className="inline-flex flex-wrap gap-1 justify-end">
                          {cg.specialties.length > 0 ? cg.specialties.map((sp) => (
                            <Badge key={sp} variant="outline">{sp}</Badge>
                          )) : <span className="text-warm-400">등록 없음</span>}
                        </span>
                      </DRow>
                      <DRow label="활동 지역"><span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-warm-400" />{cg.base_address || "-"}</span></DRow>
                      <DRow label="평점 · 완료"><span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 text-warn" />{cg.rating_avg.toFixed(1)} · {cg.completed_sessions}회</span></DRow>
                      <DRow label="신청일"><span className="font-en">{formatDate(cg.created_at)}</span></DRow>
                    </div>

                    {cg.status === "rejected" && cg.rejection_reason && (
                      <div className="flex items-start gap-2 text-xs font-semibold text-danger bg-danger-bg rounded-lg px-3 py-2.5 mb-4">
                        <XCircle className="w-4 h-4 flex-none mt-px" /><span>반려 사유: {cg.rejection_reason}</span>
                      </div>
                    )}

                    {cg.status === "pending" ? (
                      <div className="flex gap-2.5">
                        <Button variant="danger" className="flex-1" disabled={reject.isPending} onClick={() => handleReject(cg.id)}>
                          <XCircle className="w-4 h-4" /> 반려
                        </Button>
                        <Button variant="brand" className="flex-1" disabled={approve.isPending} onClick={() => approve.mutate(cg.id)}>
                          <BadgeCheck className="w-4 h-4" /> 승인
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-warm-500">
                        <CheckCircle2 className="w-4 h-4 text-brand-500" /> 검토 완료된 돌봄전문가입니다.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-warm-100 bg-warm-50 px-4 py-6 text-center text-sm text-warm-500">
                    아직 자격정보를 등록하지 않은 돌봄전문가입니다.
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/* ===== 회원 추가 모달 ===== */
const ADD_ROLES: { key: CreateMemberInput["role"]; label: string }[] = [
  { key: "guardian", label: "보호자" },
  { key: "caregiver", label: "돌봄전문가" },
  { key: "organization", label: "기관" },
  { key: "admin", label: "운영자" },
];

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<CreateMemberInput["role"]>("guardian");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [relation, setRelation] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [representative, setRepresentative] = useState("");
  const [permission, setPermission] = useState<NonNullable<CreateMemberInput["permission_level"]>>("operator");

  const create = useMutation({
    mutationFn: () =>
      operationsApi.createMember({
        name: name.trim(), email: email.trim(), phone: phone.trim(), password, role,
        ...(role === "guardian" ? { relation: relation.trim() || undefined } : {}),
        ...(role === "organization" ? { biz_no: bizNo.trim() || undefined, representative: representative.trim() || undefined } : {}),
        ...(role === "admin" ? { permission_level: permission } : {}),
      }),
    onSuccess: () => {
      toast.success("회원이 추가되었습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const phoneValid = /^01[0-9]\d{7,8}$/.test(phone);
  const valid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phoneValid && password.length >= 8;

  function submit() {
    if (name.trim().length < 2) return toast.error("이름을 2자 이상 입력하세요.");
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error("올바른 이메일을 입력하세요.");
    if (!phoneValid) return toast.error("휴대폰 번호 형식이 올바르지 않습니다.");
    if (password.length < 8) return toast.error("초기 비밀번호는 8자 이상이어야 합니다.");
    create.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-warm-900/40 backdrop-blur-[1px]" />
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-xl border border-warm-200 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-warm-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-warm-800">회원 추가</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded-md p-1 text-warm-400 hover:bg-warm-50 hover:text-warm-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-warm-700 block mb-1.5">역할</label>
            <div className="flex flex-wrap gap-2">
              {ADD_ROLES.map((r) => (
                <button key={r.key} type="button" onClick={() => setRole(r.key)}
                  className={cn("px-3.5 py-2 rounded-full border text-sm font-semibold transition-colors",
                    role === r.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-300 bg-white text-warm-600")}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <AddField label="이름"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" /></AddField>
          <AddField label="이메일"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@careand.kr" /></AddField>
          <AddField label="휴대폰 (‘-’ 없이)"><Input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="01012345678" /></AddField>
          <AddField label="초기 비밀번호 (8자 이상)"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" /></AddField>

          {role === "guardian" && (
            <AddField label="어르신과의 관계 (선택)"><Input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="자녀·배우자 등" /></AddField>
          )}
          {role === "caregiver" && (
            <p className="text-xs text-warm-500 bg-warm-50 border border-warm-100 rounded-lg px-3 py-2.5">
              자격정보(자격번호·활동지역 등)는 가입 후 <b>돌봄전문가 자격검증</b>에서 등록·검수합니다.
            </p>
          )}
          {role === "organization" && (
            <>
              <AddField label="사업자등록번호 (선택)"><Input value={bizNo} onChange={(e) => setBizNo(e.target.value)} placeholder="000-00-00000" /></AddField>
              <AddField label="대표자 (선택)"><Input value={representative} onChange={(e) => setRepresentative(e.target.value)} placeholder="대표자명" /></AddField>
            </>
          )}
          {role === "admin" && (
            <AddField label="권한">
              <div className="flex flex-wrap gap-2">
                {(["super", "operator", "cs", "analyst"] as const).map((pl) => (
                  <button key={pl} type="button" onClick={() => setPermission(pl)}
                    className={cn("px-3 py-1.5 rounded-full border text-xs font-semibold",
                      permission === pl ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-300 bg-white text-warm-600")}>
                    {pl}
                  </button>
                ))}
              </div>
            </AddField>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-warm-100 px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="brand" disabled={!valid || create.isPending} onClick={submit}>
            {create.isPending ? "추가 중..." : "회원 추가"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-warm-700 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}


/* ===== 회원 행 더보기 메뉴 ===== */
function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("w-full text-left px-3.5 py-2 text-sm hover:bg-warm-50 transition-colors", danger ? "text-danger font-semibold" : "text-warm-700")}>
      {children}
    </button>
  );
}

function RowMenu({ m, onDetail }: { m: Member; onDetail: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const setStatus = useMutation({
    mutationFn: (status: "active" | "suspended" | "withdrawn") => operationsApi.updateMemberStatus(m.id, status),
    onSuccess: () => {
      toast.success("회원 상태가 변경되었습니다.");
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen((o) => !o);
  }
  function act(status: "active" | "suspended" | "withdrawn", confirmMsg?: string) {
    setOpen(false);
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setStatus.mutate(status);
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle}
        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-warm-400 hover:bg-warm-100 hover:text-warm-600 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="fixed z-50 w-44 rounded-lg border border-warm-200 bg-white shadow-lg py-1 text-left"
          style={{ top: pos.top, right: pos.right }} onClick={(e) => e.stopPropagation()}>
          <MenuItem onClick={() => { setOpen(false); onDetail(); }}>상세 보기</MenuItem>
          <div className="my-1 border-t border-warm-100" />
          {m.status !== "suspended" ? (
            <MenuItem onClick={() => act("suspended", `${m.name} 회원을 정지하시겠습니까?`)}>정지</MenuItem>
          ) : (
            <MenuItem onClick={() => act("active")}>정지 해제 (활성화)</MenuItem>
          )}
          {m.status !== "withdrawn" ? (
            <MenuItem danger onClick={() => act("withdrawn", `${m.name} 회원을 탈퇴 처리하시겠습니까?`)}>탈퇴 처리</MenuItem>
          ) : (
            <MenuItem onClick={() => act("active")}>계정 활성화</MenuItem>
          )}
        </div>
      )}
    </>
  );
}


/* ===== 회원 상태 필터 ===== */
const STATUS_OPTS = [
  { key: "", label: "전체" },
  { key: "active", label: "활성" },
  { key: "suspended", label: "정지" },
  { key: "withdrawn", label: "탈퇴" },
];

function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [open]);
  const cur = STATUS_OPTS.find((o) => o.key === value) ?? STATUS_OPTS[0];
  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <Filter className="w-4 h-4" />
        상태: {cur.label}
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-32 rounded-lg border border-warm-200 bg-white shadow-lg py-1">
          {STATUS_OPTS.map((o) => (
            <button key={o.key || "all"} type="button"
              onClick={() => { onChange(o.key); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-warm-50 transition-colors",
                value === o.key ? "text-brand-700 font-semibold bg-brand-50/60" : "text-warm-700")}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ===== 회원 정렬 ===== */
const SORT_OPTS = [
  { key: "recent", label: "최신가입" },
  { key: "oldest", label: "오래된가입" },
  { key: "name", label: "이름순" },
];

function SortFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [open]);
  const cur = SORT_OPTS.find((o) => o.key === value) ?? SORT_OPTS[0];
  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <ArrowDownUp className="w-4 h-4" />
        정렬: {cur.label}
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-36 rounded-lg border border-warm-200 bg-white shadow-lg py-1">
          {SORT_OPTS.map((o) => (
            <button key={o.key} type="button"
              onClick={() => { onChange(o.key); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-warm-50 transition-colors",
                value === o.key ? "text-brand-700 font-semibold bg-brand-50/60" : "text-warm-700")}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
