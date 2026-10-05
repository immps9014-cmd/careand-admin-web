"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Download, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchMonthlyReports, generateMonthlyReport, type MonthlyReport } from "@/lib/api/dashboard";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils";

/**
 * 월간 결산 (기능 23·26, 2026-09-28 S5) — 매월 1일 02:30 에 전월분이 자동 생성된다(reports:monthly-close).
 * 재생성은 슈퍼관리자만(RBAC reports write). CSV 는 화면에서 바로 만든다(엑셀용 BOM 포함).
 */
function toCsv(r: MonthlyReport): string {
  const d = r.data;
  const rows: (string | number | null)[][] = [
    ["구분", "항목", "값"],
    ["매출", "결제 건수", d.revenue.paid_count], ["매출", "매출 합계", d.revenue.total],
    ["매출", "본인부담", d.revenue.self_pay], ["매출", "장기요양 청구분", d.revenue.ltc_pay],
    ["매출", "취소·환불 건수", d.revenue.cancelled_count], ["매출", "취소·환불 금액", d.revenue.cancelled_amount],
    ...(d.revenue.voucher ? [
      ["매출", "그중 바우처 선납(환불 차감)", d.revenue.voucher.net], ["매출", "바우처 선납 건수", d.revenue.voucher.prepaid_count],
      ["매출", "바우처 환불 금액", d.revenue.voucher.refund_amount],
    ] : []),
    ...d.revenue.by_domain.map((x) => ["도메인 매출", x.label, x.amount]),
    ...d.revenue.by_branch.map((x) => ["지점 매출", x.branch, x.amount]),
    ["정산", "정산서 수", d.settlement.count], ["정산", "지급 총액", d.settlement.gross],
    ["정산", "원천징수(3.3%)", d.settlement.withholding], ["정산", "실지급액", d.settlement.net],
    ["매칭", "요청", d.matching.requests], ["매칭", "성사", d.matching.matched], ["매칭", "만료", d.matching.expired],
    ["매칭", "평균 매칭 소요(시간)", d.matching.avg_match_hours],
    ["돌봄", "완료 돌봄", d.care.sessions_completed], ["돌봄", "돌봄 시간", d.care.care_hours],
    ["돌봄", "보호자 전송 일지", d.care.logs_sent], ["돌봄", "평균 일지 작성(분)", d.care.avg_log_minutes],
    ["회원", "신규 보호자", d.members.new_guardians], ["회원", "신규 돌봄전문가", d.members.new_caregivers], ["회원", "탈퇴", d.members.withdrawn],
    ["후기", "후기 수", d.reviews.count], ["후기", "평균 평점", d.reviews.avg_rating], ["후기", "2점 이하", d.reviews.negative],
  ];
  return "﻿" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(r: MonthlyReport) {
  const url = URL.createObjectURL(new Blob([toCsv(r)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `케어앤_월간결산_${r.month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MonthlyClose() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "reports", "monthly"], queryFn: fetchMonthlyReports });
  const lastMonth = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const [month, setMonth] = useState(lastMonth);
  const gen = useMutation({
    mutationFn: () => generateMonthlyReport(month),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["admin", "reports", "monthly"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CalendarCheck className="w-4 h-4 text-brand-600" />
        <h2 className="font-bold text-warm-800">월간 결산</h2>
        <span className="text-[11px] text-warm-500">매월 1일 02:30 전월분 자동 생성</span>
        <div className="ml-auto flex items-center gap-2">
          <input type="month" aria-label="결산 월" value={month} onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-md border border-warm-200 bg-white px-2.5 text-sm text-warm-700" />
          <Button variant="outline" size="sm" disabled={!month || gen.isPending} onClick={() => gen.mutate()}>
            <RefreshCw className="w-3.5 h-3.5" />{gen.isPending ? "만드는 중…" : "결산 만들기"}
          </Button>
        </div>
      </div>
      {q.isError && <div className="text-xs text-danger">{getApiErrorMessage(q.error)}</div>}
      {q.data?.length === 0 && <div className="py-6 text-center text-sm text-warm-500">아직 만든 결산이 없습니다.</div>}
      {(q.data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-warm-500 border-b border-warm-100">
                <th className="py-2">월</th><th className="py-2 text-right">매출</th><th className="py-2 text-right">결제</th>
                <th className="py-2 text-right">정산 실지급</th><th className="py-2 text-right">매칭 성사/요청</th>
                <th className="py-2 text-right">평균 매칭</th><th className="py-2 text-right">완료 돌봄</th><th className="py-2 text-right">평점</th><th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {q.data!.map((r) => (
                <tr key={r.month} className="border-b border-warm-50">
                  <td className="py-2 font-en font-semibold">{r.month}</td>
                  <td className="py-2 text-right font-en">{formatKRW(r.data.revenue.total)}</td>
                  <td className="py-2 text-right font-en">{r.data.revenue.paid_count}</td>
                  <td className="py-2 text-right font-en">{formatKRW(r.data.settlement.net)}</td>
                  <td className="py-2 text-right font-en">{r.data.matching.matched}/{r.data.matching.requests}</td>
                  <td className="py-2 text-right font-en">{r.data.matching.avg_match_hours != null ? `${r.data.matching.avg_match_hours}h` : "-"}</td>
                  <td className="py-2 text-right font-en">{r.data.care.sessions_completed}</td>
                  <td className="py-2 text-right font-en">{r.data.reviews.avg_rating ?? "-"}</td>
                  <td className="py-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => download(r)} aria-label={`${r.month} CSV`}>
                      <Download className="w-3.5 h-3.5" />CSV
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
