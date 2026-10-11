"use client";

import { useState } from "react";
import { UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** 사진 대신 캐릭터(2026-10-11) — 서버 CaregiverProfileExtras::AVATARS·앱 avatars.dart 와 같은 키. 그림은 /caregiver-avatars/{key}.jpg(정적) */
export const CAREGIVER_AVATARS: { key: string; label: string }[] = [
  { key: "c1", label: "단발 · 코랄" }, { key: "c2", label: "숏컷 · 초록" }, { key: "c3", label: "묶은 머리 · 하늘" }, { key: "c4", label: "곱슬 · 보라" },
  { key: "c5", label: "은발 · 베이지" }, { key: "c6", label: "포니테일 · 민트" }, { key: "c7", label: "가르마 · 남색" }, { key: "c8", label: "안경 · 주황" },
];

/**
 * 관리자 — 돌봄전문가 프로필 사진 자리에 캐릭터 고르기·지우기(POST /v1/admin/caregivers/{id}/avatar).
 * 본인이 올린 실제 사진이 있으면 서버가 409(HAS_PHOTO)로 막고, 확인을 받으면 force 로 덮는다.
 */
export function CaregiverAvatarPicker({
  caregiverId,
  photoUrl,
  avatarKey,
  onChanged,
  size = 64,
}: {
  caregiverId: number;
  photoUrl: string | null | undefined;
  avatarKey: string | null | undefined;
  onChanged: () => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (key: string | null, force = false) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/v1/admin/caregivers/${caregiverId}/avatar`, { key, ...(force ? { force: true } : {}) });
      toast.success(data?.message ?? "저장했습니다.");
      setOpen(false);
      onChanged();
    } catch (e: unknown) {
      const code = (e as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
      if (code === "HAS_PHOTO" && key) {
        if (window.confirm("본인이 올린 실제 사진이 있어요. 캐릭터로 바꿀까요? (실제 사진은 지워져요)")) {
          setBusy(false);
          return save(key, true);
        }
      } else {
        toast.error(getApiErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-full bg-warm-100 overflow-hidden grid place-items-center" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photoUrl ? <img src={photoUrl} alt={avatarKey ? "캐릭터" : "프로필 사진"} className="w-full h-full object-cover" /> : <UserRound className="w-7 h-7 text-warm-400" />}
      </div>
      <div className="flex flex-col items-start gap-1">
        <span className="text-[11.5px] text-warm-500">{avatarKey ? "캐릭터 사용 중" : photoUrl ? "실제 사진" : "사진 없음"}</span>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50">
            {avatarKey ? "다른 캐릭터" : "캐릭터 고르기"}
          </button>
          {avatarKey && (
            <button type="button" disabled={busy} onClick={() => save(null)} className="text-xs font-semibold text-warm-500 hover:underline disabled:opacity-50">
              캐릭터 지우기
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="캐릭터 고르기" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-base font-bold text-warm-800">캐릭터 고르기</h2>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="p-1 text-warm-500 hover:text-warm-700"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-warm-500 mb-3">사진 대신 보호자 화면에 보여요. 돌봄전문가 본인도 앱에서 바꿀 수 있어요.</p>
            <div className="grid grid-cols-4 gap-2">
              {CAREGIVER_AVATARS.map((a) => (
                <button key={a.key} type="button" disabled={busy} onClick={() => save(a.key)} title={a.label} aria-label={`캐릭터 ${a.label}`}
                  className={cn("aspect-square overflow-hidden rounded-xl border transition", a.key === avatarKey ? "border-brand-500 ring-2 ring-brand-500/30" : "border-warm-200 hover:border-brand-300")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/caregiver-avatars/${a.key}.jpg`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
