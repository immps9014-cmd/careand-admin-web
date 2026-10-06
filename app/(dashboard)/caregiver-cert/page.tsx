"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { caregiverCertApi, type CertRow } from "@/lib/api/caregiver-cert";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * 케어앤에듀 인증 돌봄전문가(2026-10-07).
 * 기준을 넘으면 매일 06:10·후기 등록 직후 자동 부여. 여기서는 보유자 확인·취소, 기준 충족/근접자 직접 부여.
 * 취소된 사람은 자동으로 다시 받지 않는다(직접 부여만).
 */
type Tab = "certified" | "ready" | "near";
const TAB_LABEL: Record<Tab, string> = { certified: "자격 보유", ready: "기준 충족 · 미부여", near: "기준 근접" };

export default function CaregiverCertPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "caregiver-cert"], queryFn: caregiverCertApi.overview });
  const [tab, setTab] = useState<Tab>("certified");
  const [grantFor, setGrantFor] = useState<CertRow | null>(null);
  const [revokeFor, setRevokeFor] = useState<CertRow | null>(null);
  const [note, setNote] = useState("");

  const done = (msg: string) => {
    toast.success(msg);
    setGrantFor(null);
    setRevokeFor(null);
    setNote("");
    qc.invalidateQueries({ queryKey: ["admin", "caregiver-cert"] });
  };
  const grant = useMutation({
    mutationFn: (r: CertRow) => caregiverCertApi.grant(r.caregiver_id, note.trim() || undefined),
    onSuccess: (res) => done(res.data?.message ?? "자격을 부여했습니다."),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: (r: CertRow) => caregiverCertApi.revoke(r.caregiver_id, note.trim()),
    onSuccess: () => done("자격을 취소했습니다."),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const d = q.data;
  const rows = d ? d[tab] : [];
  const c = d?.criteria;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-warm-800">
          <BadgeCheck className="h-5 w-5 text-amber-600" /> 케어앤에듀 인증
        </h1>
        {c && (
          <p className="mt-1 text-sm text-warm-500">
            기준: 완료 돌봄 <b>{c.min_sessions}회</b> 이상 · 보호자 후기 <b>{c.min_reviews}건</b> 이상 · 평균 평점 <b>{c.min_rating.toFixed(1)}</b> 이상
            {" "}(실제 기록 기준). 자동 부여 {c.auto_grant ? "켜짐 — 매일 06:10, 후기 등록 직후" : "꺼짐"}.
            인증되면 회원 화면 프로필·후보 카드에 금색 「케어앤에듀 인증」 마크가 붙습니다.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold",
              tab === t ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-200 text-warm-600 hover:bg-warm-50",
            )}
          >
            {TAB_LABEL[t]} {d ? d[t].length : ""}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {q.isLoading && <p className="p-6 text-sm text-warm-500">불러오는 중…</p>}
          {q.isError && <p className="p-6 text-sm text-danger">{getApiErrorMessage(q.error)}</p>}
          {d && rows.length === 0 && (
            <p className="p-6 text-sm text-warm-500">
              {tab === "certified" ? "아직 자격을 받은 돌봄전문가가 없습니다." : tab === "ready" ? "기준을 넘었는데 자격이 없는 사람이 없습니다." : "기준에 가까운 사람이 없습니다."}
            </p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>돌봄전문가</TableHead>
                    <TableHead className="text-right">완료 돌봄</TableHead>
                    <TableHead className="text-right">후기</TableHead>
                    <TableHead className="text-right">평점</TableHead>
                    {tab === "certified" && <TableHead>자격</TableHead>}
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const revoked = !!r.certificate?.revoked_at;
                    return (
                      <TableRow key={r.caregiver_id} className={revoked ? "opacity-60" : undefined}>
                        <TableCell>
                          <div className="font-semibold text-warm-800">{r.name}</div>
                          <div className="text-xs text-warm-500">#{r.caregiver_id} · {r.email ?? "-"}{r.status !== "active" ? ` · ${r.status}` : ""}</div>
                        </TableCell>
                        <TableCell className={cn("text-right tabular-nums", c && r.stats.sessions >= c.min_sessions && "font-bold text-brand-700")}>{r.stats.sessions}회</TableCell>
                        <TableCell className={cn("text-right tabular-nums", c && r.stats.reviews >= c.min_reviews && "font-bold text-brand-700")}>{r.stats.reviews}건</TableCell>
                        <TableCell className={cn("text-right tabular-nums", c && r.stats.rating != null && r.stats.rating >= c.min_rating && "font-bold text-brand-700")}>
                          {r.stats.rating != null ? r.stats.rating.toFixed(2) : "-"}
                        </TableCell>
                        {tab === "certified" && (
                          <TableCell>
                            <div className="tabular-nums text-sm">{r.certificate?.number}</div>
                            <div className="text-xs text-warm-500">
                              {r.certificate?.issued_date} · {r.certificate?.basis === "manual" ? "직접 부여" : "자동"}
                              {revoked && <Badge variant="danger" className="ml-1.5">취소됨</Badge>}
                            </div>
                            {revoked && r.certificate?.revoked_reason && <div className="text-xs text-warm-500">사유: {r.certificate.revoked_reason}</div>}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          {tab === "certified" && !revoked ? (
                            <Button size="sm" variant="outline" onClick={() => { setNote(""); setRevokeFor(r); }}>취소</Button>
                          ) : r.status === "active" && (tab !== "certified" || revoked) ? (
                            <Button size="sm" variant={r.meets ? "brand" : "outline"} onClick={() => { setNote(""); setGrantFor(r); }}>
                              {revoked ? "다시 부여" : "부여"}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!grantFor}
        onOpenChange={(o) => !o && setGrantFor(null)}
        title="케어앤에듀 인증 자격 부여"
        target={grantFor && `${grantFor.name} (#${grantFor.caregiver_id}) — 완료 ${grantFor.stats.sessions}회 · 후기 ${grantFor.stats.reviews}건 · 평점 ${grantFor.stats.rating?.toFixed(2) ?? "-"}`}
        impact={<>자격 번호가 발급되고 본인에게 알림이 갑니다. 회원 화면에 인증 마크가 붙습니다.{grantFor && !grantFor.meets && <><br /><b className="text-warn">기준 미달입니다 — 부여 사유를 남겨 주세요.</b></>}</>}
        reversible
        reverseHint="이 화면에서 취소할 수 있습니다(사유 필수)."
        confirmLabel="부여"
        loading={grant.isPending}
        onConfirm={() => {
          if (grantFor && !grantFor.meets && note.trim().length < 2) { toast.error("기준 미달 부여는 사유를 입력해 주세요."); return; }
          if (grantFor) grant.mutate(grantFor);
        }}
      >
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="부여 사유(선택, 기준 미달이면 필수)" maxLength={255} />
      </ConfirmDialog>

      <ConfirmDialog
        open={!!revokeFor}
        onOpenChange={(o) => !o && setRevokeFor(null)}
        title="케어앤에듀 인증 자격 취소"
        target={revokeFor && `${revokeFor.name} (#${revokeFor.caregiver_id}) · ${revokeFor.certificate?.number}`}
        impact="인증 마크가 바로 사라지고, 이후 기준을 넘어도 자동으로 다시 받지 않습니다."
        reversible
        reverseHint="「다시 부여」로 새 자격 번호를 줄 수 있습니다."
        confirmLabel="취소하기"
        tone="danger"
        loading={revoke.isPending}
        onConfirm={() => {
          if (note.trim().length < 2) { toast.error("취소 사유를 입력해 주세요."); return; }
          if (revokeFor) revoke.mutate(revokeFor);
        }}
      >
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="취소 사유(필수)" maxLength={255} />
      </ConfirmDialog>
    </div>
  );
}
