"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Send, Bell, Smartphone, MessageSquare, Mail } from "lucide-react";
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
import { operationsApi } from "@/lib/api/operations";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

const TARGETS: { key: "all" | "guardian" | "caregiver"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "guardian", label: "보호자" },
  { key: "caregiver", label: "인력" },
];

// 발송 채널 — 현재 백엔드는 앱 푸시로 발송됩니다(시각 표시용)
const CHANNELS = [
  { key: "push", label: "앱 푸시", icon: Smartphone },
  { key: "sms", label: "문자(SMS)", icon: MessageSquare },
  { key: "email", label: "이메일", icon: Mail },
];

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "guardian" | "caregiver">("all");
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => operationsApi.announcements(),
  });

  const send = useMutation({
    mutationFn: () => operationsApi.broadcast({ title, body, target }),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? "공지를 발송했습니다.");
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !send.isPending;
  const targetLabel = TARGETS.find((t) => t.key === target)?.label ?? "전체";

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          공지 · 푸시 알림
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          보호자·인력 앱에 공지/푸시 알림을 발송하고 발송 이력·읽음률을 관리합니다
        </p>
      </div>

      <div className="grid grid-cols-[400px_1fr] gap-6 items-start">
        {/* 발송 폼 */}
        <Card className="p-6 h-fit">
          <h2 className="text-base font-bold text-warm-800 flex items-center gap-2 mb-5">
            <Megaphone className="w-4 h-4 text-brand-500" />
            새 공지 발송
          </h2>

          {/* 발송 채널 (시각 표시용) */}
          <label className="block text-xs font-semibold text-warm-600 mb-2">발송 채널</label>
          <div className="flex gap-2 mb-4">
            {CHANNELS.map((c, i) => {
              const Icon = c.icon;
              const on = i === 0;
              return (
                <div
                  key={c.key}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-bold whitespace-nowrap select-none",
                    on
                      ? "border-brand-400 bg-brand-50 text-brand-600"
                      : "border-warm-200 bg-white text-warm-400"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {c.label}
                </div>
              );
            })}
          </div>

          {/* 수신 대상 */}
          <label className="block text-xs font-semibold text-warm-600 mb-2">수신 대상</label>
          <div className="flex gap-2 mb-4">
            {TARGETS.map((t) => (
              <Button
                key={t.key}
                variant={target === t.key ? "primary" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setTarget(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-warm-600 mb-2">제목</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목"
            maxLength={200}
            className="mb-4"
          />

          <label className="block text-xs font-semibold text-warm-600 mb-2">내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="공지 내용을 입력하세요"
            maxLength={2000}
            rows={5}
            className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-400 focus-visible:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500/20 mb-4 resize-none leading-relaxed"
          />

          {/* 발송 추정 안내 */}
          <div className="flex items-center gap-2 rounded-lg bg-info-bg text-info px-3 py-2.5 text-xs font-semibold mb-4">
            <Bell className="w-4 h-4 flex-none" />
            <span>
              앱 푸시 · <b className="font-extrabold">{targetLabel}</b> 대상에게 즉시 발송됩니다
            </span>
          </div>

          <Button
            variant="primary"
            className="w-full"
            disabled={!canSend}
            onClick={() => send.mutate()}
          >
            <Send className="w-4 h-4" />
            {send.isPending ? "발송 중…" : "즉시 발송"}
          </Button>
        </Card>

        {/* 발송 이력 + 미리보기 */}
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
              <h2 className="text-base font-bold text-warm-800">발송 이력</h2>
              <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
                총 {query.data?.meta?.total ?? 0}건
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>수신자</TableHead>
                  <TableHead>읽음률</TableHead>
                  <TableHead className="text-right">발송일시</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-warm-400 py-10">
                      불러오는 중…
                    </TableCell>
                  </TableRow>
                )}
                {!query.isLoading && query.data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-warm-400 py-10">
                      발송한 공지가 없습니다
                    </TableCell>
                  </TableRow>
                )}
                {query.data?.data.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-bold text-warm-800">{a.title}</div>
                      <div className="text-xs text-warm-500 max-w-[280px] truncate mt-0.5">
                        {a.body}
                      </div>
                    </TableCell>
                    <TableCell className="font-en text-warm-600">{a.recipients}명</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 h-1.5 rounded-full bg-warm-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.min(Math.max(a.read_rate, 0), 100)}%` }}
                          />
                        </div>
                        <span className="font-en text-xs font-bold text-warm-700 tabular-nums">
                          {a.read_rate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-en text-xs text-warm-500">
                      {a.sent_at ? formatDateTime(a.sent_at) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* 앱 푸시 미리보기 — 작성 중인 제목/내용 실시간 반영 */}
          <Card className="p-5">
            <div className="text-xs font-extrabold text-warm-400 uppercase tracking-wider mb-3">
              앱 푸시 미리보기
            </div>
            <div className="rounded-xl border border-dashed border-warm-200 bg-warm-50 p-4">
              <div className="max-w-[320px] rounded-xl border border-warm-200 bg-white shadow-card px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-warm-400">
                  <span className="w-[18px] h-[18px] rounded bg-brand-500 text-white flex items-center justify-center text-[10px] font-extrabold flex-none">
                    C
                  </span>
                  Care& · 지금
                </div>
                <div className="text-sm font-bold text-warm-800 mt-2">
                  {title.trim() || "공지 제목"}
                </div>
                <div className="text-xs text-warm-600 mt-1 leading-relaxed whitespace-pre-line break-words">
                  {body.trim() || "공지 내용을 입력하세요"}
                </div>
                <div className="mt-2.5">
                  <Badge variant="success">{targetLabel} 대상</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
