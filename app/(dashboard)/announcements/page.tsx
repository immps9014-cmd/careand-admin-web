"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Send } from "lucide-react";
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
import { formatDateTime } from "@/lib/utils";

const TARGETS: { key: "all" | "guardian" | "caregiver"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "guardian", label: "보호자" },
  { key: "caregiver", label: "인력" },
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

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">
          공지 · 푸시 알림
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          보호자·인력 앱에 공지/푸시 알림을 발송하고 발송 이력을 관리합니다
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 발송 폼 */}
        <Card className="p-6 col-span-1 h-fit">
          <h2 className="text-base font-bold text-warm-800 flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4 text-brand-500" />
            새 공지 발송
          </h2>

          <label className="block text-xs font-semibold text-warm-600 mb-1.5">대상</label>
          <div className="flex gap-2 mb-4">
            {TARGETS.map((t) => (
              <Button
                key={t.key}
                variant={target === t.key ? "primary" : "outline"}
                size="sm"
                onClick={() => setTarget(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-warm-600 mb-1.5">제목</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목"
            maxLength={200}
            className="mb-4"
          />

          <label className="block text-xs font-semibold text-warm-600 mb-1.5">내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="공지 내용을 입력하세요"
            maxLength={2000}
            rows={5}
            className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-400 focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/15 mb-4 resize-none"
          />

          <Button
            variant="primary"
            className="w-full"
            disabled={!canSend}
            onClick={() => send.mutate()}
          >
            <Send className="w-4 h-4" />
            {send.isPending ? "발송 중…" : "발송"}
          </Button>
        </Card>

        {/* 발송 이력 */}
        <Card className="overflow-hidden col-span-2">
          <div className="px-6 py-4 flex justify-between items-center border-b border-warm-100">
            <h2 className="text-base font-bold text-warm-800">발송 이력</h2>
            <span className="font-en text-[11px] text-warm-500 px-2.5 py-1 bg-warm-100 rounded-full">
              {query.data?.meta?.total ?? 0}건
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>수신자</TableHead>
                <TableHead>읽음률</TableHead>
                <TableHead className="text-right">발송일</TableHead>
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
              {query.data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-warm-400 py-10">
                    발송한 공지가 없습니다
                  </TableCell>
                </TableRow>
              )}
              {query.data?.data.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="font-medium text-warm-800">{a.title}</div>
                    <div className="text-xs text-warm-500 max-w-[280px] truncate">{a.body}</div>
                  </TableCell>
                  <TableCell className="font-en text-warm-600">{a.recipients}명</TableCell>
                  <TableCell>
                    <Badge variant={a.read_rate >= 50 ? "success" : "outline"}>
                      {a.read_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-warm-500">
                    {a.sent_at ? formatDateTime(a.sent_at) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
