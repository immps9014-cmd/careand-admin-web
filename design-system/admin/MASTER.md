# Care& Admin Console — 디자인 노트

`ui-ux-pro-max` 스킬 기준 감사·적용 기록 (2026-08-08). www 감사(hover-only 드롭다운, 저대비 텍스트) 이후
같은 기준을 admin-web에 적용한 것. 팔레트는 admin/member/www 공유 SSOT(`brand` 코랄, `warm` 웜그레이)를
그대로 유지 — 바꾸지 않았다.

## 방향성
- **밀도**: 8/10(조밀) — 내부 운영 대시보드라 정보 밀도를 여백보다 우선한다. 이번 감사에서 여백을 늘리는
  방향의 수정은 하지 않았다(밀도를 핑계로 불필요한 패딩 확장 금지).
- **모션**: 3/10(절제) — 새로 추가한 유일한 모션 관련 규칙은 `prefers-reduced-motion` 킬스위치뿐, 기존
  트랜지션 타이밍은 건드리지 않았다.

## 이번에 고친 것 (23개 파일)
1. `text-warm-400`/`text-warm-300`이 실제 본문/라벨 텍스트로 쓰여 대비 4.5:1 미달이던 곳 → `text-warm-500`로
   상향(기존 팔레트 스케일 안에서만 조정, 새 hex 없음). settlements/cs/care-monitoring/matching/members/
   contracts/announcements/sidebar/topbar 등 약 15개 파일.
2. 마우스 전용 클릭 요소(TableRow/Card, `cursor-pointer`+onClick인데 키보드 접근 불가) 5곳에
   `tabIndex`+`onKeyDown`(Enter/Space)+포커스링 추가.
3. 커스텀 모달 5개(Radix 미사용)에 Escape 닫기 + `role="dialog" aria-modal` 추가.
4. 겉보기엔 클릭 가능한데 실제 핸들러가 없던 "죽은 버튼" 2곳(`AlertItem` 액션 버튼, 대시보드 "전체 알림 N건
   보기") → 실제 라우팅 연결.
5. 모달 닫기(X) 버튼 6곳 터치 타겟 `p-1`(~28px) → `p-2`.
6. `app/globals.css`에 `prefers-reduced-motion: reduce` 전역 규칙 추가.

## 의도적으로 손대지 않은 것
- `text-danger`/`text-warn`/`text-info`를 작은 텍스트로 쓰는 곳(특히 warn은 흰 배경에서 2.15:1)도 대비
  미달이지만, 이 시맨틱 토큰들은 `DEFAULT`/`bg`만 있고 짙은 변형이 없다 — 새 hex를 만들지 말라는 제약과
  충돌해서 그대로 뒀다. **후속 작업 필요**: `danger`/`warn`/`info`에 텍스트용 짙은 변형(예: `-700`)을 추가할지
  제품 결정이 필요.
- `size="icon"` 버튼(40×40px)은 WCAG AA 최소(24px)는 충족하지만 AAA 권장(44px)에는 못 미침 — 밀도-8 의도를
  존중해 그대로 뒀다.
- `*.bak*` 디렉토리(`app.bak_20260625_114633/` 등)는 죽은 코드라 감사 대상에서 제외.

## 검증
`npx tsc --noEmit` 통과(에러 0). `npm run build`는 서버 리소스 제약으로 280초 타임아웃 — 배포 전
`careand-deploy admin`으로 실제 빌드 확인 필요.
