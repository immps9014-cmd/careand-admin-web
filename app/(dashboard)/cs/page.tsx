"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageCircle,
  Star,
  AlertTriangle,
  MessagesSquare,
  Reply,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/domain/kpi-card";
import { csApi, type CsReview } from "@/lib/api/cs";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate, formatTimeAgo, cn } from "@/lib/utils";

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            dim,
            i <= rating ? "fill-warn text-warn" : "text-warm-200"
          )}
        />
      ))}
    </span>
  );
}

// 후기 작성자 아바타 배경 — 작성자명 기반 결정적 색상
const AVATAR_BG = [
  "bg-brand-500",
  "bg-info",
  "bg-warn",
  "bg-brand-600",
  "bg-warm-500",
];
function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_BG.length;
  return AVATAR_BG[h];
}

export default function CsPage() {
  const [tab, setTab] = useState<"reviews" | "chatbot">("reviews");
  const [onlyNegative, setOnlyNegative] = useState(false);
  // 인라인 답글 에디터 — 열려있는 후기 id와 입력 텍스트
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const qc = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: (vars: { id: number; reply: string }) =>
      csApi.replyReview(vars.id, vars.reply),
    onSuccess: () => {
      toast.success("답글을 저장했습니다.");
      setReplyingId(null);
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["admin", "cs", "reviews", onlyNegative] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function openReply(r: CsReview) {
    setReplyingId(r.id);
    setReplyText(r.admin_reply ?? "");
  }
  function cancelReply() {
    setReplyingId(null);
    setReplyText("");
  }

  const statsQuery = useQuery({
    queryKey: ["admin", "cs", "stats"],
    queryFn: csApi.stats,
    refetchInterval: 60_000,
  });

  const reviewsQuery = useQuery({
    queryKey: ["admin", "cs", "reviews", onlyNegative],
    queryFn: () => csApi.reviews({ negative: onlyNegative }),
    enabled: tab === "reviews",
  });

  const chatbotQuery = useQuery({
    queryKey: ["admin", "cs", "chatbot"],
    queryFn: () => csApi.chatbotSessions(),
    enabled: tab === "chatbot",
  });

  const stats = statsQuery.data;

  // 별점 분포 (5→1), stats.rating_distribution 사용. 최대값 기준으로 막대 폭 계산
  const distRows = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: stats?.rating_distribution?.[String(s)] ?? 0,
  }));
  const positiveCount =
    stats != null ? Math.max(0, stats.reviews_total - stats.reviews_negative) : 0;

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          후기 · CS 관리
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          보호자·인력의 후기와 CS 챗봇 상담을 조회하고, 부정 후기에 대응합니다
        </p>
      </div>

      {/* 요약 KPI */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="전체 후기"
          value={stats?.reviews_total ?? 0}
          icon={Star}
          iconColor="brand"
        />
        <KpiCard
          label="평균 평점"
          value={stats ? stats.reviews_avg.toFixed(2) : "-"}
          icon={Star}
          iconColor="info"
        />
        <KpiCard
          label="부정 후기 (★1~2)"
          value={stats?.reviews_negative ?? 0}
          icon={AlertTriangle}
          iconColor="danger"
        />
        <KpiCard
          label="진행중 CS 상담"
          value={stats?.chatbot_open ?? 0}
          icon={MessagesSquare}
          iconColor="warn"
        />
      </div>

      {/* 툴바: 탭 + 부정 후기 필터 */}
      <div className="flex items-center gap-2 mb-5">
        <div className="inline-flex bg-warm-100 p-1 rounded-md">
          <button
            onClick={() => setTab("reviews")}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors",
              tab === "reviews"
                ? "bg-white text-warm-800 shadow-sm"
                : "text-warm-600 hover:text-warm-800"
            )}
          >
            <Star className="w-3.5 h-3.5" />
            후기
            <span className="font-en text-[10px] font-bold text-warm-500 bg-warm-200/70 px-1.5 py-px rounded-full">
              {stats?.reviews_total ?? 0}
            </span>
          </button>
          <button
            onClick={() => setTab("chatbot")}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded inline-flex items-center gap-1.5 transition-colors",
              tab === "chatbot"
                ? "bg-white text-warm-800 shadow-sm"
                : "text-warm-600 hover:text-warm-800"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            CS 상담
            <span className="font-en text-[10px] font-bold text-warm-500 bg-warm-200/70 px-1.5 py-px rounded-full">
              {stats?.chatbot_total ?? 0}
            </span>
          </button>
        </div>
        {tab === "reviews" && (
          <Button
            variant={onlyNegative ? "danger" : "outline"}
            size="sm"
            className="ml-auto"
            onClick={() => setOnlyNegative((v) => !v)}
          >
            <AlertTriangle className="w-4 h-4" />
            부정 후기만 ({stats?.reviews_negative ?? 0})
          </Button>
        )}
      </div>

      {/* 후기 탭 — 좌: 평점 요약 / 우: 후기 목록 */}
      {tab === "reviews" && (
        <div className="grid grid-cols-[300px_1fr] gap-[18px] items-start">
          {/* 평점 요약 카드 */}
          <Card className="overflow-hidden">
            {/* 큰 평균 평점 */}
            <div className="text-center px-5 pt-6 pb-5 border-b border-warm-100">
              <div className="font-en text-[46px] font-extrabold leading-none tracking-tight text-warm-800">
                {stats ? stats.reviews_avg.toFixed(2) : "-"}
              </div>
              <div className="mt-2 flex justify-center">
                <Stars rating={Math.round(stats?.reviews_avg ?? 0)} size="md" />
              </div>
              <div className="text-xs text-warm-500 mt-2">
                전체 후기 {stats?.reviews_total ?? 0}건 기준
              </div>
            </div>

            {/* 별점 분포 막대 */}
            <div className="px-[18px] py-4">
              {distRows.map((d) => {
                const pct =
                  stats && stats.reviews_total > 0
                    ? (d.count / stats.reviews_total) * 100
                    : 0;
                const barColor =
                  d.star >= 4 ? "bg-brand-500" : d.star === 3 ? "bg-warn" : "bg-danger";
                return (
                  <div key={d.star} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
                    <div className="flex items-center gap-0.5 w-7 text-[11.5px] font-bold text-warm-600">
                      {d.star}
                      <Star className="w-2.5 h-2.5 fill-warn text-warn" />
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-warm-100 overflow-hidden">
                      <span
                        className={cn("block h-full rounded-full", barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="font-en w-5 text-right text-[11.5px] font-bold text-warm-400">
                      {d.count}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 긍정 / 부정 집계 */}
            <div className="px-[18px] py-3.5 border-t border-warm-100 flex gap-2.5">
              <div className="flex-1 text-center rounded-md bg-brand-50 py-2.5">
                <div className="font-en text-xl font-extrabold text-brand-700">
                  {positiveCount}
                </div>
                <div className="text-[11px] font-semibold text-warm-600 mt-0.5">
                  긍정 (★4–5)
                </div>
              </div>
              <div className="flex-1 text-center rounded-md bg-danger-bg py-2.5">
                <div className="font-en text-xl font-extrabold text-danger">
                  {stats?.reviews_negative ?? 0}
                </div>
                <div className="text-[11px] font-semibold text-warm-600 mt-0.5">
                  부정 (★1–2)
                </div>
              </div>
            </div>
          </Card>

          {/* 후기 목록 카드 */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
              <h2 className="text-base font-bold text-warm-800">후기 목록</h2>
              <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
                최신순
              </span>
            </div>

            <div>
              {reviewsQuery.isLoading && (
                <div className="text-center text-warm-400 py-12">불러오는 중…</div>
              )}
              {!reviewsQuery.isLoading && reviewsQuery.data?.data.length === 0 && (
                <div className="text-center text-warm-400 py-12">후기가 없습니다</div>
              )}
              {reviewsQuery.data?.data.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex gap-3.5 px-[18px] py-4 border-b border-warm-100 last:border-b-0",
                    r.is_negative && "bg-danger-bg/40"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-none",
                      avatarBg(r.reviewer_name)
                    )}
                  >
                    {r.reviewer_name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <Stars rating={r.rating} />
                      <span className="text-[12.5px] font-bold text-warm-800 whitespace-nowrap">
                        {r.reviewer_name}
                      </span>
                      <Badge variant="outline" className="px-2 py-0 text-[10px]">
                        {r.reviewer_role === "guardian" ? "보호자" : "인력"}
                      </Badge>
                      <span className="ml-auto text-[11px] text-warm-400 whitespace-nowrap">
                        {formatTimeAgo(r.created_at)}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-warm-700 mt-1.5 leading-relaxed line-clamp-2">
                      {r.comment || "-"}
                    </p>

                    {/* 기존 관리자 답글 */}
                    {r.admin_reply != null && (
                      <div className="mt-2.5 rounded-md border-l-[3px] border-brand-500 bg-brand-50 px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Reply className="w-3 h-3 text-brand-600" />
                          <span className="text-[11px] font-bold text-brand-700">
                            관리자 답글
                          </span>
                          {r.replied_at && (
                            <span className="ml-auto text-[10.5px] text-warm-400">
                              {formatDate(r.replied_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-[12.5px] text-warm-700 leading-relaxed whitespace-pre-wrap">
                          {r.admin_reply}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2.5">
                      {r.tags.map((t) => (
                        <Badge
                          key={t}
                          variant={r.is_negative ? "danger" : "success"}
                          className="rounded-md"
                        >
                          {t}
                        </Badge>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          replyingId === r.id ? cancelReply() : openReply(r)
                        }
                        className={cn(
                          "ml-auto h-[30px] px-3 rounded-md text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors",
                          r.is_negative
                            ? "bg-danger text-white hover:bg-red-600"
                            : "border border-warm-200 bg-white text-warm-600 hover:bg-warm-50"
                        )}
                      >
                        <Reply className="w-3.5 h-3.5" />
                        {r.admin_reply != null
                          ? "답글 수정"
                          : r.is_negative
                          ? "대응"
                          : "답글"}
                      </button>
                    </div>

                    {/* 인라인 답글 에디터 */}
                    {replyingId === r.id && (
                      <div className="mt-2.5 rounded-md border border-warm-200 bg-warm-50 p-2.5">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          placeholder="고객 후기에 대한 답글을 입력하세요"
                          className="w-full resize-y rounded-md border border-warm-200 bg-white px-3 py-2 text-[13px] text-warm-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelReply}
                            disabled={replyMutation.isPending}
                          >
                            취소
                          </Button>
                          <Button
                            variant="brand"
                            size="sm"
                            disabled={
                              replyText.trim().length === 0 ||
                              replyMutation.isPending
                            }
                            onClick={() =>
                              replyMutation.mutate({
                                id: r.id,
                                reply: replyText.trim(),
                              })
                            }
                          >
                            <Reply className="w-3.5 h-3.5" />
                            저장
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* CS 상담 탭 */}
      {tab === "chatbot" && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-100">
            <h2 className="text-base font-bold text-warm-800">CS 챗봇 상담 세션</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>보호자</TableHead>
                <TableHead>주제</TableHead>
                <TableHead>메시지</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">최근 활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chatbotQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-warm-400 py-10">
                    불러오는 중…
                  </TableCell>
                </TableRow>
              )}
              {chatbotQuery.data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-warm-400 py-10">
                    상담 세션이 없습니다
                  </TableCell>
                </TableRow>
              )}
              {chatbotQuery.data?.data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-warm-800">
                    {s.guardian_name}
                  </TableCell>
                  <TableCell className="text-warm-600">{s.topic}</TableCell>
                  <TableCell className="font-en text-warm-600">
                    {s.message_count}건
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "open" ? "warn" : "success"}>
                      {s.status === "open" ? "진행중" : "종료"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-warm-500">
                    {s.last_at ? formatTimeAgo(s.last_at) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
