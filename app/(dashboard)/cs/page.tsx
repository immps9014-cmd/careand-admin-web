"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  Star,
  AlertTriangle,
  MessagesSquare,
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
import { csApi } from "@/lib/api/cs";
import { formatTimeAgo, cn } from "@/lib/utils";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i <= rating ? "fill-warn text-warn" : "text-warm-200"
          )}
        />
      ))}
    </span>
  );
}

export default function CsPage() {
  const [tab, setTab] = useState<"reviews" | "chatbot">("reviews");
  const [onlyNegative, setOnlyNegative] = useState(false);

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

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          후기 · CS 관리
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          보호자·인력의 후기와 CS 챗봇 상담을 조회·관리합니다
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

      {/* 탭 */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={tab === "reviews" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("reviews")}
        >
          <Star className="w-4 h-4" />
          후기 ({stats?.reviews_total ?? 0})
        </Button>
        <Button
          variant={tab === "chatbot" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("chatbot")}
        >
          <MessageCircle className="w-4 h-4" />
          CS 상담 ({stats?.chatbot_total ?? 0})
        </Button>
      </div>

      {/* 후기 탭 */}
      {tab === "reviews" && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
            <h2 className="text-base font-bold text-warm-800">후기 목록</h2>
            <Button
              variant={onlyNegative ? "primary" : "outline"}
              size="sm"
              onClick={() => setOnlyNegative((v) => !v)}
            >
              <AlertTriangle className="w-4 h-4" />
              부정 후기만
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>평점</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>내용</TableHead>
                <TableHead>태그</TableHead>
                <TableHead className="text-right">작성</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-warm-400 py-10">
                    불러오는 중…
                  </TableCell>
                </TableRow>
              )}
              {reviewsQuery.data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-warm-400 py-10">
                    후기가 없습니다
                  </TableCell>
                </TableRow>
              )}
              {reviewsQuery.data?.data.map((r) => (
                <TableRow key={r.id} className={cn(r.is_negative && "bg-danger-bg/30")}>
                  <TableCell>
                    <Stars rating={r.rating} />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-warm-800">{r.reviewer_name}</span>
                    <Badge variant="outline" className="ml-2">
                      {r.reviewer_role === "guardian" ? "보호자" : "인력"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    <span className="text-warm-600 line-clamp-2">{r.comment || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.tags.map((t) => (
                        <Badge
                          key={t}
                          variant={r.is_negative ? "danger" : "success"}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-warm-500">
                    {formatTimeAgo(r.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
