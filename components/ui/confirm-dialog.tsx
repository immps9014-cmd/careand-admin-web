"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ConfirmTone = "brand" | "danger";

export interface ConfirmDialogProps {
  /** 다이얼로그 열림 상태 (controlled) */
  open: boolean;
  /** 열림 상태 변경 (취소·Esc·오버레이 클릭 포함) */
  onOpenChange: (open: boolean) => void;
  /**
   * 확인 버튼 클릭 시 호출. 다이얼로그를 **자동으로 닫지 않는다** —
   * 뮤테이션 성공 후 호출측이 onOpenChange(false)로 닫고, 진행 중에는 loading으로 표시한다.
   */
  onConfirm: () => void;

  /** 제목(액션명). 예: "모델 승격" */
  title: string;
  /** 보조 설명(자유 서술) */
  description?: React.ReactNode;

  /** 액션 대상 슬롯. 예: "matching v2.1 → v2.2" */
  target?: React.ReactNode;
  /** 액션이 미치는 영향 슬롯 */
  impact?: React.ReactNode;

  /**
   * 되돌리기 가능 여부(INV-6: 되돌리기 가능 여부 명시).
   * - false → "되돌릴 수 없습니다" 비가역 경고를 강조
   * - true  → 되돌릴 수 있음 + reverseHint 안내
   * - 생략  → 되돌리기 안내를 표시하지 않음
   */
  reversible?: boolean;
  /** 되돌리는 방법 안내(reversible=true일 때 표시) */
  reverseHint?: React.ReactNode;

  confirmLabel?: string;
  cancelLabel?: string;
  /** 파괴적 액션이면 "danger"(기본 "brand") */
  tone?: ConfirmTone;
  /** 진행 중(뮤테이션 pending). 확인 버튼 로딩·비활성 + 닫기 차단 */
  loading?: boolean;

  /** 추가 커스텀 콘텐츠(슬롯 아래에 렌더) */
  children?: React.ReactNode;
}

const SLOT_LABEL =
  "text-[11px] font-extrabold uppercase tracking-wide text-warm-500";

/**
 * 파괴적·비가역 관리자 액션 실행 전 확인 다이얼로그(spec.md INV-6).
 * 대상·영향·되돌리기 가능 여부를 슬롯으로 표시한다. radix Dialog 기반, controlled.
 *
 * 사용 패턴(뮤테이션 연동):
 *   const [pending, setPending] = useState<Model | null>(null);
 *   <Button onClick={() => setPending(model)}>승격</Button>
 *   <ConfirmDialog
 *     open={!!pending}
 *     onOpenChange={(o) => !o && setPending(null)}
 *     loading={promote.isPending}
 *     tone="danger"
 *     title="모델 승격"
 *     target={`${pending?.model_name} → active`}
 *     reversible
 *     reverseHint="승격 후 '롤백'으로 되돌릴 수 있습니다."
 *     confirmLabel="승격"
 *     onConfirm={() => pending && promote.mutate(pending.id)}
 *   />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  target,
  impact,
  reversible,
  reverseHint,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "brand",
  loading = false,
  children,
}: ConfirmDialogProps) {
  // 진행 중에는 Esc·오버레이·취소로 닫히지 않도록 가드.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (loading && !next) return;
      onOpenChange(next);
    },
    [loading, onOpenChange]
  );

  const irreversible = reversible === false;
  const hasSlots = target != null || impact != null || reversible !== undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-warm-900/40 backdrop-blur-[1px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => {
            if (loading) e.preventDefault();
          }}
          // onInteractOutside는 pointer-down/focus outside를 모두 포괄하므로 단일 가드로 충분.
          onInteractOutside={(e) => {
            if (loading) e.preventDefault();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-warm-200 bg-white p-6 shadow-lg focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
          )}
        >
          {/* 헤더 */}
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-9 w-9 flex-none items-center justify-center rounded-full",
                tone === "danger"
                  ? "bg-danger-bg text-danger"
                  : "bg-brand-50 text-brand-600"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogPrimitive.Title className="text-base font-bold text-warm-800">
                {title}
              </DialogPrimitive.Title>
              {description != null ? (
                <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-warm-500">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {title} 작업을 확인합니다.
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                disabled={loading}
                className="flex-none rounded-md p-2 text-warm-500 transition-colors hover:bg-warm-50 hover:text-warm-600 disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          {/* 슬롯: 대상 / 영향 / 되돌리기 가능 여부 */}
          {hasSlots ? (
            <div className="mt-4 space-y-2.5 rounded-md border border-warm-100 bg-warm-50 p-3.5">
              {target != null ? (
                <div className="flex flex-col gap-0.5">
                  <span className={SLOT_LABEL}>대상</span>
                  <div className="text-sm font-semibold text-warm-800">
                    {target}
                  </div>
                </div>
              ) : null}
              {impact != null ? (
                <div className="flex flex-col gap-0.5">
                  <span className={SLOT_LABEL}>영향</span>
                  <div className="text-sm text-warm-600">{impact}</div>
                </div>
              ) : null}
              {reversible !== undefined ? (
                irreversible ? (
                  <div className="flex items-center gap-2 rounded-md bg-danger-bg px-2.5 py-2 text-xs font-semibold text-danger">
                    <AlertTriangle className="h-4 w-4 flex-none" />
                    이 작업은 되돌릴 수 없습니다.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md bg-info-bg px-2.5 py-2 text-xs font-medium text-info">
                    <RotateCcw className="h-4 w-4 flex-none" />
                    {reverseHint ?? "되돌릴 수 있습니다."}
                  </div>
                )
              ) : null}
            </div>
          ) : null}

          {children != null ? <div className="mt-3">{children}</div> : null}

          {/* 액션 */}
          <div className="mt-5 flex justify-end gap-2">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline" size="md" disabled={loading}>
                {cancelLabel}
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              variant={tone === "danger" ? "danger" : "brand"}
              size="md"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

ConfirmDialog.displayName = "ConfirmDialog";
