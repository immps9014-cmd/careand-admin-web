"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Heart, HardHat, Building2 } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "guardian", label: "보호자" },
  { key: "caregiver", label: "인력" },
  { key: "admin", label: "운영자" },
];

const ROLE_BADGE: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  guardian: { variant: "outline", label: "보호자" },
  caregiver: { variant: "success", label: "인력" },
  organization: { variant: "warn", label: "기관" },
  admin: { variant: "danger", label: "운영자" },
};

const STATUS_BADGE: Record<string, { variant: "success" | "warn" | "danger"; label: string }> = {
  active: { variant: "success", label: "활성" },
  suspended: { variant: "warn", label: "정지" },
  withdrawn: { variant: "danger", label: "탈퇴" },
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

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          회원 · 인력 통합관리
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          보호자·인력·운영자를 통합 조회·검색합니다 (개인정보 마스킹 적용)
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="보호자" value={s?.guardian ?? 0} icon={Heart} iconColor="info" />
        <KpiCard label="인력" value={s?.caregiver ?? 0} icon={HardHat} iconColor="brand" />
        <KpiCard label="기관" value={s?.organization ?? 0} icon={Building2} iconColor="warn" />
        <KpiCard label="운영자" value={s?.admin ?? 0} icon={Users} iconColor="danger" />
      </div>

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <Button
              key={t.key || "all"}
              variant={role === t.key ? "primary" : "outline"}
              size="sm"
              onClick={() => setRole(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·이메일 검색"
          className="max-w-[220px]"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
          <h2 className="text-base font-bold text-warm-800">회원 목록</h2>
          <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
            {query.data?.meta?.total ?? 0}명
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-warm-400 py-10">
                  불러오는 중…
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-warm-400 py-10">
                  회원이 없습니다
                </TableCell>
              </TableRow>
            )}
            {query.data?.data.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-warm-800">{m.name}</TableCell>
                <TableCell className="text-warm-600 font-en text-xs">{m.email || "-"}</TableCell>
                <TableCell className="text-warm-600 font-en text-xs">{m.phone || "-"}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE[m.role]?.variant ?? "outline"}>
                    {ROLE_BADGE[m.role]?.label ?? m.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-warm-500 text-xs">{formatDate(m.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={STATUS_BADGE[m.status]?.variant ?? "success"}>
                    {STATUS_BADGE[m.status]?.label ?? m.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
