"use client";
import { DOMAIN_LABEL } from "@/lib/caregiverType";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Heart,
  HardHat,
  Building2,
  Sparkles,
  Baby,
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
  KeyRound,
  Ban,
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
import { useAuth } from "@/lib/auth/store";

const ORG_STATUS: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  pending: { variant: "warn", label: "승인 대기" },
  active: { variant: "success", label: "활성" },
  suspended: { variant: "danger", label: "정지" },
};
// 기관 분야 SSOT (코드 → 한글). 기존 care_center/staffing/other 코드 보존.
const ORG_TYPE: Record<string, string> = {
  nursing_hospital: "요양병원",
  hospital: "일반병원",
  nursing_home: "요양원",
  silver_town: "실버타운",
  care_center: "재가센터",
  visiting_care: "방문요양",
  day_night_care: "주야간보호",
  short_stay: "단기보호",
  visiting_bath: "방문목욕",
  visiting_nursing: "방문간호",
  nursing_staffing: "간병센터",
  staffing: "인력파견",
  housekeeping_agency: "가사서비스",
  welfare_center: "노인복지관",
  other: "기타",
};
const ORG_TYPE_OPTIONS = Object.keys(ORG_TYPE);

// 돌봄전문가 직군(service_domains) 편집 옵션
const CG_DOMAIN_OPTIONS = ["senior", "nursing", "living_support", "postpartum", "childcare", "mental_care"];

const ROLE_BADGE: Record<
  string,
  { variant: "warn" | "success" | "danger" | "info" | "outline"; label: string }
> = {
  guardian: { variant: "info", label: "보호자" },
  housekeeping: { variant: "info", label: "가사요청자" },
  postpartum: { variant: "info", label: "산모요청자" },
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
  housekeeping: "bg-info",
  postpartum: "bg-info",
  caregiver: "bg-brand-500",
  organization: "bg-warn",
  admin: "bg-warm-600",
};

/** 행/뱃지 표시용 유효 역할 키 — 가사·산모요청자는 guardian이지만 intent로 구분 */
function effectiveRole(m: { role: string; intent?: string | null }): string {
  if (m.role === "guardian" && (m.intent === "housekeeping" || m.intent === "postpartum")) return m.intent;
  return m.role;
}

// 돌봄전문가 자격검증 상태 (caregiver_status)
const CG_VERIFY: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  pending: { variant: "warn", label: "검증 대기" },
  active: { variant: "success", label: "검증 완료" },
  suspended: { variant: "danger", label: "정지" },
  rejected: { variant: "danger", label: "거절" },
  leave: { variant: "outline", label: "휴직" },
};

function MembersPageInner() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // 상단바 검색은 /members?q=... 로 push한다. 같은 라우트면 리마운트되지 않으므로
  // URL 파라미터 변화를 반응형으로 구독해 q 상태에 동기화한다.
  const urlQ = searchParams.get("q") ?? "";
  useEffect(() => {
    if (urlQ) setQ(urlQ);
  }, [urlQ]);

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
    (s?.guardian ?? 0) + (s?.housekeeping ?? 0) + (s?.postpartum ?? 0) + (s?.caregiver ?? 0) + (s?.organization ?? 0) + (s?.admin ?? 0);

  const TABS: { key: string; label: string; count: number }[] = [
    { key: "", label: "전체", count: roleTotal },
    { key: "guardian", label: "보호자", count: s?.guardian ?? 0 },
    { key: "housekeeping", label: "가사요청자", count: s?.housekeeping ?? 0 },
    { key: "postpartum", label: "산모요청자", count: s?.postpartum ?? 0 },
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

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard
          label="보호자"
          value={s?.guardian ?? 0}
          icon={Heart}
          iconColor="info"
        />
        <KpiCard
          label="가사요청자"
          value={s?.housekeeping ?? 0}
          icon={Sparkles}
          iconColor="info"
        />
        <KpiCard
          label="산모요청자"
          value={s?.postpartum ?? 0}
          icon={Baby}
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
              <TableHead>직군</TableHead>
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
                <TableCell colSpan={8} className="text-center text-warm-400 py-10">
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-warm-400 py-10">
                  회원이 없습니다
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.map((m) => {
              const status = STATUS_BADGE[m.status] ?? STATUS_BADGE.active;
              const er = effectiveRole(m);
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
                          ROLE_AVATAR[er] ?? "bg-warm-500"
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
                    <Badge variant={ROLE_BADGE[er]?.variant ?? "outline"}>
                      {ROLE_BADGE[er]?.label ?? m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.role === "caregiver" ? (
                      (m.service_domains || "").split(",").filter(Boolean).length > 0 ? (
                        <span className="inline-flex flex-wrap gap-1">
                          {(m.service_domains || "").split(",").filter(Boolean).map((d) => (
                            <Badge key={d} variant="brand">{DOMAIN_LABEL[d] ?? d}</Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-warm-300 text-xs">미등록</span>
                      )
                    ) : (
                      <span className="text-warm-600 text-sm">{ROLE_BADGE[er]?.label ?? m.role}</span>
                    )}
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
  const backdropDown = useRef(false);
  const isSuper = useAuth((s) => s.user?.admin?.permission_level) === "super";
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

  const [orgEdit, setOrgEdit] = useState<null | { biz_type: string; contact_phone: string; representative: string }>(null);
  const saveOrg = useMutation({
    mutationFn: ({ orgId, payload }: { orgId: number; payload: { biz_type: string; contact_phone: string; representative: string } }) =>
      operationsApi.updateOrganization(orgId, payload),
    onSuccess: () => { toast.success("기관 정보를 수정했습니다."); setOrgEdit(null); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const setOrgStatus = useMutation({
    mutationFn: ({ orgId, status }: { orgId: number; status: "active" | "suspended" | "pending" }) =>
      operationsApi.updateOrganization(orgId, { status }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "active" ? "기관을 승인했습니다." : v.status === "suspended" ? "기관을 정지(반려)했습니다." : "기관 상태를 변경했습니다.");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const [cgDomainsEdit, setCgDomainsEdit] = useState<string[] | null>(null);
  const saveCgDomains = useMutation({
    mutationFn: ({ cgId, service_domains }: { cgId: number; service_domains: string }) =>
      operationsApi.updateCaregiver(cgId, { service_domains }),
    onSuccess: () => { toast.success("직군을 수정했습니다."); setCgDomainsEdit(null); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const [credEdit, setCredEdit] = useState<null | { email: string; phone: string; password: string }>(null);
  const saveCred = useMutation({
    mutationFn: (payload: { email: string; phone: string; password?: string }) => operationsApi.updateMemberCredentials(id, payload),
    onSuccess: () => { toast.success("계정 정보를 수정했습니다."); setCredEdit(null); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const cg: CaregiverDetail | null = data?.caregiver ?? null;
  const CG_STATUS: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
    pending: { variant: "warn", label: "검증 대기" },
    active: { variant: "success", label: "검증 완료" },
    rejected: { variant: "danger", label: "거절" },
    suspended: { variant: "danger", label: "정지" },
    leave: { variant: "outline", label: "휴직" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-warm-900/40 backdrop-blur-[1px]"
        onMouseDown={(e) => { backdropDown.current = e.target === e.currentTarget; }}
        onClick={(e) => { if (backdropDown.current && e.target === e.currentTarget) onClose(); }}
      />
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
                      <DRow label="자격증 사진">
                        {cg.license_image_url ? (
                          <a href={cg.license_image_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                            <img src={cg.license_image_url} alt="자격증" className="max-h-24 rounded-md border border-warm-200 hover:opacity-90" />
                          </a>
                        ) : (
                          <span className="text-warm-400">미제출</span>
                        )}
                      </DRow>
                      <DRow label="성별 · 나이">{(cg.gender === "M" ? "남성" : cg.gender === "F" ? "여성" : "-")}{calcAge(cg.birth_date) != null ? ` · 만 ${calcAge(cg.birth_date)}세` : ""}</DRow>
                      <DRow label="직군">
                        {cgDomainsEdit === null ? (
                          <span className="inline-flex flex-wrap gap-1 items-center justify-end">
                            {(cg.service_domains || "").split(",").filter(Boolean).map((d) => (
                              <Badge key={d} variant="brand">{DOMAIN_LABEL[d] ?? d}</Badge>
                            ))}
                            {!cg.service_domains && <span className="text-warm-400">-</span>}
                            <button type="button" onClick={() => setCgDomainsEdit((cg.service_domains || "").split(",").filter(Boolean))} className="text-xs font-semibold text-brand-600 hover:underline ml-1">수정</button>
                          </span>
                        ) : (
                          <span className="inline-flex flex-col items-end gap-1.5">
                            <span className="inline-flex flex-wrap gap-1 justify-end">
                              {CG_DOMAIN_OPTIONS.map((d) => {
                                const on = cgDomainsEdit.includes(d);
                                return (
                                  <button key={d} type="button"
                                    onClick={() => setCgDomainsEdit(on ? cgDomainsEdit.filter((x) => x !== d) : [...cgDomainsEdit, d])}
                                    className={cn("px-2.5 py-1 rounded-full border text-xs font-semibold",
                                      on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-300 bg-white text-warm-600")}>
                                    {DOMAIN_LABEL[d]}
                                  </button>
                                );
                              })}
                            </span>
                            <span className="inline-flex gap-1.5">
                              <button type="button" disabled={saveCgDomains.isPending || cgDomainsEdit.length === 0}
                                onClick={() => saveCgDomains.mutate({ cgId: cg.id, service_domains: cgDomainsEdit.join(",") })}
                                className="text-xs font-bold text-brand-700 px-2.5 py-1 rounded bg-brand-50 hover:bg-brand-100 disabled:opacity-60">저장</button>
                              <button type="button" onClick={() => setCgDomainsEdit(null)} className="text-xs font-semibold text-warm-500 px-1">취소</button>
                            </span>
                          </span>
                        )}
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

              {/* 기관 정보 */}
              {data.role === "organization" && (
                data.organization ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-brand-500" />
                      <h3 className="text-sm font-bold text-warm-700">기관 정보</h3>
                      <Badge variant={ORG_STATUS[data.organization.status]?.variant ?? "outline"} className="ml-auto">
                        {ORG_STATUS[data.organization.status]?.label ?? data.organization.status}
                      </Badge>
                      {orgEdit === null ? (
                        <button type="button" onClick={() => setOrgEdit({ biz_type: data.organization!.biz_type ?? "other", contact_phone: data.organization!.contact_phone ?? "", representative: data.organization!.representative ?? "" })} className="text-xs font-semibold text-brand-600 hover:underline">수정</button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button type="button" disabled={saveOrg.isPending} onClick={() => saveOrg.mutate({ orgId: data.organization!.id, payload: orgEdit })} className="text-xs font-bold text-brand-700 px-2.5 py-1 rounded bg-brand-50 hover:bg-brand-100 disabled:opacity-60">저장</button>
                          <button type="button" onClick={() => setOrgEdit(null)} className="text-xs font-semibold text-warm-500 px-1">취소</button>
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-warm-100 px-4">
                      <DRow label="기관명"><span className="font-semibold">{data.organization.name || "-"}</span></DRow>
                      <DRow label="연락처">
                        {orgEdit === null
                          ? <span className="font-en">{data.organization.contact_phone || "-"}</span>
                          : <Input value={orgEdit.contact_phone} onChange={(e) => setOrgEdit({ ...orgEdit, contact_phone: e.target.value })} placeholder="02-000-0000" className="h-8 w-44 text-right" />}
                      </DRow>
                      <DRow label="대표자">
                        {orgEdit === null
                          ? (data.organization.representative || "-")
                          : <Input value={orgEdit.representative} onChange={(e) => setOrgEdit({ ...orgEdit, representative: e.target.value })} placeholder="대표자명" className="h-8 w-44 text-right" />}
                      </DRow>
                      <DRow label="사업자번호"><span className="font-en">{data.organization.biz_no || "-"}</span></DRow>
                      <DRow label="분야">
                        {orgEdit === null
                          ? (ORG_TYPE[data.organization.biz_type ?? ""] ?? data.organization.biz_type ?? "-")
                          : (
                            <select value={orgEdit.biz_type} onChange={(e) => setOrgEdit({ ...orgEdit, biz_type: e.target.value })} className="h-8 rounded-md border border-warm-300 bg-white px-2 text-sm text-warm-800 focus:border-brand-500 focus:outline-none">
                              {ORG_TYPE_OPTIONS.map((k) => <option key={k} value={k}>{ORG_TYPE[k]}</option>)}
                            </select>
                          )}
                      </DRow>
                      <DRow label="주소"><span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-warm-400" />{data.organization.address || "-"}</span></DRow>
                    </div>

                    {/* 승인/정지 처리 */}
                    {orgEdit === null && (
                      <div className="flex gap-2 mt-4">
                        {data.organization.status === "pending" && (
                          <>
                            <Button variant="outline" className="flex-1" disabled={setOrgStatus.isPending}
                              onClick={() => { if (window.confirm("이 기관을 반려(정지)하시겠습니까?")) setOrgStatus.mutate({ orgId: data.organization!.id, status: "suspended" }); }}>
                              <Ban className="w-4 h-4" /> 반려
                            </Button>
                            <Button variant="brand" className="flex-[2]" disabled={setOrgStatus.isPending}
                              onClick={() => setOrgStatus.mutate({ orgId: data.organization!.id, status: "active" })}>
                              <BadgeCheck className="w-4 h-4" /> 승인
                            </Button>
                          </>
                        )}
                        {data.organization.status === "active" && (
                          <Button variant="outline" className="flex-1" disabled={setOrgStatus.isPending}
                            onClick={() => { if (window.confirm("이 기관을 정지하시겠습니까? 매칭 발주가 중단됩니다.")) setOrgStatus.mutate({ orgId: data.organization!.id, status: "suspended" }); }}>
                            <Ban className="w-4 h-4" /> 정지
                          </Button>
                        )}
                        {data.organization.status === "suspended" && (
                          <Button variant="brand" className="flex-1" disabled={setOrgStatus.isPending}
                            onClick={() => setOrgStatus.mutate({ orgId: data.organization!.id, status: "active" })}>
                            <BadgeCheck className="w-4 h-4" /> 활성화
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-warm-100 bg-warm-50 px-4 py-6 text-center text-sm text-warm-500">
                    기관 정보가 아직 등록되지 않았습니다.
                  </div>
                )
              )}

              {/* 보호자 정보 */}
              {data.role === "guardian" && (
                data.guardian ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-brand-500" />
                      <h3 className="text-sm font-bold text-warm-700">보호자 정보</h3>
                    </div>
                    <div className="rounded-lg border border-warm-100 px-4 mb-4">
                      <DRow label="관계">{data.guardian.relation || "-"}</DRow>
                      <DRow label="연락처(주소)"><span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-warm-400" />{data.guardian.contact_address || "-"}</span></DRow>
                      <DRow label="돌봄 대상">
                        {(data.guardian.seniors.length + data.guardian.patients.length) > 0
                          ? `어르신 ${data.guardian.seniors.length}명 · 환자 ${data.guardian.patients.length}명`
                          : <span className="text-warm-400">등록 없음</span>}
                      </DRow>
                    </div>
                    {(data.guardian.seniors.length > 0 || data.guardian.patients.length > 0) && (
                      <div className="rounded-lg border border-warm-100 px-4">
                        {data.guardian.seniors.map((s, i) => (
                          <DRow key={`s${i}`} label="어르신">
                            <span className="inline-flex items-center gap-1.5">{s.name}{s.care_grade != null && <Badge variant="outline">{s.care_grade}등급</Badge>}</span>
                          </DRow>
                        ))}
                        {data.guardian.patients.map((p, i) => (
                          <DRow key={`p${i}`} label="환자">
                            <span className="inline-flex items-center gap-1.5">{p.name}{p.hospital_name && <span className="text-xs text-warm-500">{p.hospital_name}</span>}</span>
                          </DRow>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-warm-100 bg-warm-50 px-4 py-6 text-center text-sm text-warm-500">
                    보호자 정보가 아직 등록되지 않았습니다.
                  </div>
                )
              )}

              {/* 계정 관리 (슈퍼관리자 전용) */}
              {isSuper && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="w-4 h-4 text-danger" />
                    <h3 className="text-sm font-bold text-warm-700">계정 관리</h3>
                    <span className="text-[11px] font-bold text-danger ml-auto">슈퍼관리자 전용</span>
                  </div>
                  {credEdit === null ? (
                    <div className="rounded-lg border border-warm-100 px-4">
                      <DRow label="로그인 ID"><span className="font-en">{data.email || "-"}</span></DRow>
                      <DRow label="연락처"><span className="font-en">{data.phone || "-"}</span></DRow>
                      <DRow label="비밀번호"><span className="text-warm-400">••••••••</span></DRow>
                      <div className="py-2.5">
                        <Button variant="outline" size="sm" onClick={() => setCredEdit({ email: data.email ?? "", phone: data.phone ?? "", password: "" })}>
                          <KeyRound className="w-4 h-4" /> 계정정보 수정
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-warm-200 px-4 py-3 space-y-3 bg-warm-50/40">
                      <div>
                        <label className="text-xs font-semibold text-warm-600 block mb-1">로그인 ID (이메일)</label>
                        <Input type="email" value={credEdit.email} onChange={(e) => setCredEdit({ ...credEdit, email: e.target.value })} placeholder="example@careand.kr" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-warm-600 block mb-1">연락처 (‘-’ 없이)</label>
                        <Input inputMode="numeric" value={credEdit.phone} onChange={(e) => setCredEdit({ ...credEdit, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="01012345678" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-warm-600 block mb-1">새 비밀번호 (변경 시에만 입력, 8자 이상)</label>
                        <Input type="text" value={credEdit.password} onChange={(e) => setCredEdit({ ...credEdit, password: e.target.value })} placeholder="비워두면 변경 안 함" />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => setCredEdit(null)}>취소</Button>
                        <Button variant="brand" size="sm" disabled={saveCred.isPending} onClick={() => {
                          if (!/\S+@\S+\.\S+/.test(credEdit.email)) return toast.error("올바른 이메일을 입력하세요.");
                          if (!/^01[0-9]\d{7,8}$/.test(credEdit.phone)) return toast.error("휴대폰 번호 형식이 올바르지 않습니다.");
                          if (credEdit.password && credEdit.password.length < 8) return toast.error("비밀번호는 8자 이상이어야 합니다.");
                          saveCred.mutate({ email: credEdit.email.trim(), phone: credEdit.phone.trim(), password: credEdit.password || undefined });
                        }}>저장</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/* ===== 회원 추가 모달 ===== */
const ADD_ROLES: { key: string; label: string; role: CreateMemberInput["role"]; domain?: string }[] = [
  { key: "guardian", label: "보호자", role: "guardian" },
  { key: "caregiver:senior", label: "돌봄전문가(요양보호)", role: "caregiver", domain: "senior" },
  { key: "caregiver:nursing", label: "돌봄전문가(간병)", role: "caregiver", domain: "nursing" },
  { key: "caregiver:living_support", label: "돌봄전문가(생활지원)", role: "caregiver", domain: "living_support" },
  { key: "organization", label: "기관", role: "organization" },
  { key: "admin", label: "운영자", role: "admin" },
];

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<CreateMemberInput["role"]>("guardian");
  const [cgDomain, setCgDomain] = useState("senior");
  const [gender, setGender] = useState<"M" | "F" | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [relation, setRelation] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [representative, setRepresentative] = useState("");
  const [bizType, setBizType] = useState("care_center");
  const backdropDown = useRef(false);
  const [permission, setPermission] = useState<NonNullable<CreateMemberInput["permission_level"]>>("operator");

  const create = useMutation({
    mutationFn: () =>
      operationsApi.createMember({
        name: name.trim(), email: email.trim(), phone: phone.trim(), password, role,
        ...(role === "guardian" ? { relation: relation.trim() || undefined } : {}),
        ...(role === "caregiver" ? { gender: gender || undefined, birth_date: birthDate || undefined, base_address: baseAddress.trim() || undefined, service_domains: cgDomain, license_no: licenseNo.trim() || undefined, license_photo: licensePhoto || undefined } : {}),
        ...(role === "organization" ? { biz_no: bizNo.trim() || undefined, representative: representative.trim() || undefined, biz_type: bizType } : {}),
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
  const cgValid = role !== "caregiver" || ((gender === "M" || gender === "F") && !!birthDate && baseAddress.trim().length > 0);
  const valid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phoneValid && password.length >= 8 && cgValid;

  function submit() {
    if (name.trim().length < 2) return toast.error("이름을 2자 이상 입력하세요.");
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error("올바른 이메일을 입력하세요.");
    if (!phoneValid) return toast.error("휴대폰 번호 형식이 올바르지 않습니다.");
    if (password.length < 8) return toast.error("초기 비밀번호는 8자 이상이어야 합니다.");
    if (role === "caregiver") {
      if (gender !== "M" && gender !== "F") return toast.error("성별을 선택하세요.");
      if (!birthDate) return toast.error("생년월일을 입력하세요.");
      if (!baseAddress.trim()) return toast.error("활동 지역을 입력하세요.");
    }
    create.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-warm-900/40 backdrop-blur-[1px]"
        onMouseDown={(e) => { backdropDown.current = e.target === e.currentTarget; }}
        onClick={(e) => { if (backdropDown.current && e.target === e.currentTarget) onClose(); }}
      />
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
              {ADD_ROLES.map((r) => {
                const active = r.role === "caregiver" ? (role === "caregiver" && cgDomain === r.domain) : role === r.role;
                return (
                  <button key={r.key} type="button" onClick={() => { setRole(r.role); if (r.domain) setCgDomain(r.domain); }}
                    className={cn("px-3.5 py-2 rounded-full border text-sm font-semibold transition-colors",
                      active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-300 bg-white text-warm-600")}>
                    {r.label}
                  </button>
                );
              })}
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
            <>
              <AddField label="직군">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-sm font-semibold text-brand-700">
                  {DOMAIN_LABEL[cgDomain] ?? cgDomain}
                </span>
              </AddField>
              <AddField label="성별">
                <div className="flex gap-2">
                  {(["M", "F"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={cn("px-3.5 py-2 rounded-full border text-sm font-semibold",
                        gender === g ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-300 bg-white text-warm-600")}>
                      {g === "M" ? "남성" : "여성"}
                    </button>
                  ))}
                </div>
              </AddField>
              <AddField label="생년월일"><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></AddField>
              <AddField label="활동 지역"><Input value={baseAddress} onChange={(e) => setBaseAddress(e.target.value)} placeholder="서울시 강남구 ..." /></AddField>
              <AddField label="자격증번호 (선택)"><Input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="요양보호사 자격번호 등" /></AddField>
              <AddField label="자격증 사진 (선택)">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLicensePhoto(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-warm-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                />
                {licensePhoto && <p className="text-[11px] text-warm-500 mt-1">{licensePhoto.name}</p>}
              </AddField>
              <p className="text-xs text-warm-500 bg-warm-50 border border-warm-100 rounded-lg px-3 py-2.5">
                자격증 진위확인은 가입 후 <b>돌봄전문가 자격검증</b>에서 검수합니다.
              </p>
            </>
          )}
          {role === "organization" && (
            <>
              <AddField label="기관 분야">
                <select
                  value={bizType}
                  onChange={(e) => setBizType(e.target.value)}
                  className="w-full h-10 rounded-md border border-warm-300 bg-white px-3 text-sm text-warm-800 focus:border-brand-500 focus:outline-none"
                >
                  {ORG_TYPE_OPTIONS.map((k) => (
                    <option key={k} value={k}>{ORG_TYPE[k]}</option>
                  ))}
                </select>
              </AddField>
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

// useSearchParams() 는 Suspense 경계가 필요하다(next build 프리렌더 에러 방지).
export default function MembersPage() {
  return (
    <Suspense fallback={null}>
      <MembersPageInner />
    </Suspense>
  );
}
