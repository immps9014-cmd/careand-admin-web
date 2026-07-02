"use client";

import { useEffect } from "react";

/**
 * 배포 후 구(舊) 번들 세션이 사라진 청크를 로드하려다 실패(ChunkLoadError / 404)하면
 * 한 번만 하드 리로드해 최신 번들을 받게 한다. (재로드 루프 방지 가드 포함)
 *
 * - 동적 import 실패: unhandledrejection / error 이벤트의 ChunkLoadError 메시지로 감지
 * - <script>/<link> 청크 리소스 404: capture 단계 error 이벤트로 감지(_next/static/chunks|css)
 */
const RELOAD_TS_KEY = "ca_chunk_reload_ts";
const RELOAD_GUARD_MS = 15000; // 이 시간 내 재발 시 루프로 보고 리로드 생략

function looksLikeChunkError(input: unknown): boolean {
  const s =
    typeof input === "string"
      ? input
      : (input && ((input as { message?: string; name?: string }).message || (input as { name?: string }).name)) || "";
  return /ChunkLoadError|Loading chunk [^\s]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    String(s),
  );
}

export function ChunkReloader() {
  useEffect(() => {
    let reloaded = false;

    const reloadOnce = () => {
      if (reloaded) return;
      try {
        const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || "0");
        if (Date.now() - last < RELOAD_GUARD_MS) return; // 방금 리로드했으면 루프 방지
        sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
      } catch {
        /* sessionStorage 접근 불가 시에도 1회 리로드는 진행 */
      }
      reloaded = true;
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      if (looksLikeChunkError(e.error) || looksLikeChunkError(e.message)) {
        reloadOnce();
        return;
      }
      // 청크 <script>/<link> 로드 실패(구 해시 404) — 리소스 에러는 capture 단계로만 잡힘
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "SCRIPT" || t.tagName === "LINK")) {
        const url = (t as HTMLScriptElement).src || (t as HTMLLinkElement).href || "";
        if (/\/_next\/static\/(chunks|css)\//.test(url)) reloadOnce();
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (looksLikeChunkError(e.reason)) reloadOnce();
    };

    window.addEventListener("error", onError, true); // capture: 리소스 로드 에러 포착
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
