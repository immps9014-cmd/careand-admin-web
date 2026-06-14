"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Heart,
  HardHat,
  Building2,
  Plus,
  Filter,
  ArrowDownUp,
  Search,
  Download,
  MoreVertical,
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
import { operationsApi } from "@/lib/api/operations";
import { cn, formatDate } from "@/lib/utils";

const ROLE_BADGE: Record<
  string,
  { variant: "warn" | "success" | "danger" | "info" | "outline"; label: string }
> = {
  guardian: { variant: "info", label: "보호자" },
  caregiver: { variant: "success", label: "인력" },
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

// 인력 자격검증 상태 (caregiver_status)
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

  const query = useQuery({
    queryKey: ["admin", "members", role, q],
    queryFn: () =>
      operationsApi.members({
        ...(role ? { role } : {}),
        ...(q ? { q } : {}),
      }),
  });

  const s = query.data?.summary;
  const total = query.data?.meta?.total ?? 0;
  const roleTotal =
    (s?.guardian ?? 0) + (s?.caregiver ?? 0) + (s?.organization ?? 0) + (s?.admin ?? 0);

  const TABS: { key: string; label: string; count: number }[] = [
    { key: "", label: "전체", count: roleTotal },
    { key: "guardian", label: "보호자", count: s?.guardian ?? 0 },
    { key: "caregiver", label: "인력", count: s?.caregiver ?? 0 },
    { key: "admin", label: "운영자", count: s?.admin ?? 0 },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
            회원 · 인력 통합관리
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            보호자·인력·운영자를 통합 조회·검색합니다 (개인정보 마스킹 적용)
          </p>
        </div>
        <Button variant="brand" size="md">
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
          label="인력 (케어 제공자)"
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

        <Button variant="outline" size="sm" disabled>
          <Filter className="w-4 h-4" />
          상태
        </Button>
        <Button variant="outline" size="sm" disabled>
          <ArrowDownUp className="w-4 h-4" />
          정렬: 최신가입
        </Button>

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
                      <Button variant="outline" size="sm">
                        상세
                      </Button>
                      <button
                        type="button"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-warm-400 hover:bg-warm-100 hover:text-warm-600 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
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
    </div>
  );
}
