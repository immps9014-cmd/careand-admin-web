# Care& admin-web — Product Spec (SSOT)

> Product contract. 우선순위: **spec.md > sub-spec > Plans.md**. 구현이 흔들릴 때 Plans.md 작성 전 이 문서를 먼저 갱신한다.
> 작성: 2026-06-14 (현 라이브 상태에서 역설계한 baseline)

## 1. 정체성
- **무엇**: Care& 돌봄 플랫폼의 **운영자/관리자용 대시보드** 웹.
- **누구**: 내부 운영자(admin). 회원(보호자/요양보호사)용 화면은 member-web(별도).
- **배포면**: `https://careand.aiclaude.kr/admin` (Next.js `basePath:"/admin"`). ※라이브 서비스.

## 2. 기술 계약
- Next.js 14 App Router + TypeScript + Tailwind. `next start -p 3105`(systemd, MemoryMax 200M).
- 백엔드 API: `NEXT_PUBLIC_API_URL`(=`https://careand.aiclaude.kr`) 기준 `/api/v1/*`, 관리자 기능은 `/api/v1/admin/*`. backend는 careand-backend(root 소유 읽기전용).
- 인증: JWT(member-web과 동일 백엔드). 401 시 client.ts refresh 자동 시도.

## 3. 라우트(현 baseline)
- `app/login` — 관리자 로그인.
- `app/(dashboard)/*` — 인증 필요 운영 영역(12): `dashboard`(KPI), `members`, `matching`, `caregiver-approval`, `contracts`, `settlements`, `care-logs`, `care-monitoring`, `cs`, `reports`, `announcements`, `ai-models`(승급/롤백/감사).

## 4. 불변식(Invariants) — 깨면 안 되는 것
- INV-1 미인증 사용자는 `(dashboard)/*` 접근 불가(로그인 유도).
- INV-2 관리자 전용 API(`/api/v1/admin/*`)는 admin 권한 게이트 하에서만 호출. 권한경계 1차는 백엔드, 프런트는 그에 정합.
- INV-3 모든 API 호출은 `/api/v1` 프록시 경유. `localhost:8000` 하드코딩 잔재가 빌드에 들어가면 안 된다.
- INV-4 ai-models 승급/롤백 등 파괴적 운영 액션은 확인 단계 + 감사(audit) 동반. (구체 계약은 §7 참조)
- INV-5 배포는 `careand-deploy admin`(root)로만. 빌드 실패 시 `.next.prev` 롤백.
- INV-6 파괴적·비가역 관리자 액션(ai-models `promote`/`rollback`, matching 수동배정)은 실행 전 **확인(confirm) 다이얼로그**를 거친다. 다이얼로그는 대상·영향·되돌리기 가능 여부를 명시한다.
- INV-7 파괴적 액션(promote/rollback)은 **실행 행위 자체의 감사기록**(행위자·시각·대상·이전→이후 상태)을 남긴다. 이는 주기적 편향성 통계(`bias_report`)와 **별개**다.
- INV-8 라이브 운영 화면에 **mock/하드코딩 데이터·동작 없는(no-op) 버튼**을 노출하지 않는다. 미연동 기능은 실데이터 연동 또는 명시적 "미지원/준비중" 표기로 대체한다.

## 5. 범위 밖(Non-goals)
- 회원용 기능(member-web), 백엔드 비즈니스 로직(careand-backend), AI 추론 실행(careand-ai-service).

## 6. 미해결/확인 필요 (not_observed != absent)
- 각 대시보드의 admin 권한 분기·표시 항목 상세는 코드 추가 확인 필요(본 baseline은 라우트 존재까지 고정).
- E2E/스모크 테스트 프레임워크 미도입 — Plans Phase 1에서 결정.

## 7. Spec delta — 파괴적·오해소지 관리자 액션 안전 정합 (Phase 2, 2026-06-15)

> 횡단 안전 기능. precedence: 본 delta가 ai-models/matching/settlements 표면의 product contract. INV-4를 구체화하고 INV-6~8을 도입한다.

**제품 의도**: 라이브 운영 대시보드에서 관리자의 **비가역 액션이 무방비로 실행**되거나, **실데이터 없는 화면이 신뢰 가능한 정보처럼 보이는** 상태를 제거한다. 운영자가 실수로 모델을 승격하거나, mock 검수이력을 실데이터로 오인하거나, 동작 없는 버튼을 누르는 일을 막는다.

**현 라이브 공백(2026-06-15 코드 실측):**
- (a) `ai-models/page.tsx:304` — `promote` 버튼이 confirm 없이 `promoteMutation.mutate` 직호출(INV-6 위반). `rollback` API(`aiModelsApi.rollback`)는 있으나 **UI 버튼 부재**(INV-4 롤백 경로 결손).
- (b) `audit` 엔드포인트는 `bias_report`만 반환 — **promote/rollback 행위 자체의 감사기록 없음**(INV-7 결손). BE 의존.
- (c) `ai-models/_components/model-insights.tsx:101` — "최근 추천 결과 검수 **(mock)**" 하드코딩 배열(INV-8 위반). `AiModelDetail` 응답에 검수이력 필드 부재 → BE 의존.
- (d) `matching/page.tsx:307` — 수동 배정 `배정 확정`이 confirm 없이 `assign.mutate` 직호출(INV-6 위반, ai-models와 동일 패턴).
- (e) `settlements/page.tsx:127` — `홈택스 일괄 신고` 버튼이 onClick/mutation 없는 **no-op**(INV-8 위반).

**유지(이미 정합):** `care-logs/page.tsx:418` 품질이상(0분) 일지는 승인버튼 `disabled`로 FE 게이트 존재 → 본 delta 범위 밖(BE 이중방어는 별건).

**소유권 분리:** confirm 다이얼로그(a,d) = **FE-only**(radix `@radix-ui/react-dialog` 기보유, 래퍼만 신규). 검수 실데이터(c)·행위 감사기록(b) = **BE 의존**(careand-backend, claude2 읽기전용 → patch 작성+review, 사용자가 `careand-deploy backend`로 반영). `AiModelDetail` 응답에 `recent_review_history`·action audit 필드 확장 권장(단일 호출 유지).

**범위 밖(이번 delta 비대상, 후순위):** caregiver-approval 외부 진위조회는 **1차년도 의도적 미연동**(수동검증, §본문 명시) — 결함 아님. settlements 홈택스 **신고 API 자동화**는 별도 BE 과제. KPI 대시보드·care-monitoring 세부지표 정합은 Phase 2 후순위.
