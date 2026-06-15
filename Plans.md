# Care& admin-web Plans.md

작성일: 2026-06-14

> 태스크 정본(task ledger). 정답 조건은 `spec.md`(SSOT). 마커: `cc:TODO`→`cc:WIP`→`cc:완료`→`pm:확인済` / `blocked`.
> ※라이브 서비스. 구현 산출물은 `harness-review` 통과 + 사용자 확인 후 `careand-deploy admin`(root)로만 배포.

---

## Phase 0: Harness 도입 (완료)

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 0.1 | harness.toml + .claude-plugin 생성, 안전규칙(sudo/careand-deploy deny) | `harness doctor` 전체 OK | - | cc:완료 |
| 0.2 | spec.md(product SSOT) baseline 역설계 | spec.md에 정체성/계약/불변식/범위 기재 | 0.1 | cc:완료 |

## Phase 1: 품질 베이스라인 (실행 전 게이트) [tdd:skip:setup-task]

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 1.1 | ESLint 베이스라인 설정(eslint v9↔Next14 비호환 해결) | `npm run lint` 비대화형 exit 0 | - | cc:완료 |
| 1.2 | 타입체크 게이트 | `npm run type-check`(tsc --noEmit) 에러 0 | - | cc:완료 |
| 1.3 | 빌드 스모크 게이트(격리빌드, 라이브 .next 무영향) | `npm run build` 성공 + BUILD_ID 생성 | 1.1, 1.2 | cc:완료 |
| 1.4 | API base 잔재 점검 | 빌드 산출물에 `localhost:8000` 미참조(INV-3) | 1.3 | cc:완료 |

> 2026-06-14 결과: member-web과 동일하게 **eslint를 ^8.57.1로 핀 + `.eslintrc.json`** 적용 → 1.1 exit0(단 react-hooks/exhaustive-deps **경고 2건**: care-logs/caregiver-approval page의 `rows`를 useMemo로 감싸라 — 비차단, 선택적 정리). 1.2 에러0 · 1.3 격리빌드 성공(라이브 .next 무영향) · 1.4 localhost:8000 0건.
> ⚠️ 변경분(package.json/package-lock/.eslintrc.json/.gitignore)은 review 후 `careand-deploy admin`(root)로 반영. careand-deploy 스냅샷(git add -A)에 자동 포함될 수 있음.

## Phase 2: 파괴적·오해소지 관리자 액션 안전 정합 (1순위)

> Spec delta: **spec.md §7 + INV-4 구체화 + INV-6~8 신규**(2026-06-15 작성·정합).
> 우선순위 근거: adversarial 검증(보안/아키/회의 3관점) — care-logs는 이미 FE 게이트 존재·caregiver 진위검증은 1차년도 의도적 미연동으로 반례 무효화됨 → **비가역 액션 안전(ai-models·matching) + no-op/mock 제거**가 라이브 최우선 안전공백으로 확정.
> 소유권: **[FE]** = careand-admin-web(claude2 구현). **[BE]** = careand-backend(claude2 읽기전용 → patch 작성+review, 사용자가 `careand-deploy backend`로 반영).
> 라이브 검증 DoD: E2E 프레임워크 부재(spec §6) → **type-check 0 + 격리빌드 성공 + 수동 시나리오**의 3종 게이트.

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 2.1 | **[FE]** 재사용 confirm 다이얼로그 컴포넌트 신설(`components/ui/confirm-dialog.tsx`, radix `@radix-ui/react-dialog` 기반). 대상/영향/되돌리기여부 슬롯. `[tdd:skip:no-e2e-framework-live-manual]` | type-check 0 · 격리빌드 성공 · 컴포넌트 단독 렌더 확인 | Phase 1 | cc:완료 |
| 2.2 | **[FE]** ai-models `promote`에 2.1 confirm 적용 + `rollback` **UI 버튼 신설**(active 모델)에도 confirm 적용(INV-4/6) | 승격·롤백 클릭→confirm→확인시에만 mutate(코드상 직호출 0건) · type-check 0 · 격리빌드 | 2.1 | cc:완료 |
| 2.3 | **[FE]** matching 수동배정 `배정 확정`에 2.1 confirm 적용(INV-6) | 배정확정 직호출 0건, confirm 경유 · type-check 0 · 격리빌드 | 2.1 | cc:완료 |
| 2.4 | **[BE]** promote/rollback **행위 감사기록**(행위자·시각·대상·이전→이후) 저장+조회 API(INV-7). bias_report와 분리. patch+review | git apply 패치 + review 통과 · 액션→audit row 생성 read-only 스모크 확인 | - | cc:완료 |
| 2.5 | **[BE]** `AiModelDetail`(GET `/v1/admin/ai-models/{id}`) 응답에 `recent_review_history[]` 필드 확장(최근 5~10건). patch+review. **+교정**: model_name 실값('matching-recommender') 대응 `str_contains` 가드(audit()도 동반 수정), 배포·라우트 라이브 검증 | 패치+review 통과 · 응답 필드 read-only 스모크 | - | cc:완료 |
| 2.6 | **[FE]** ai-models `model-insights.tsx` **mock 배열 제거** → 2.5 실데이터(`recent_review_history`) 연동, 빈상태 처리(INV-8). **+ model_name 실값('matching-recommender') 대응**: `ModelInsights` 렌더 조건·감사버튼·`MODEL_NAME_KO`를 `includes("matching")`/실키로 수정(아니면 화면에 안 뜸 — [[careand-aimodel-name-mismatch]]) | 하드코딩 배열 0건(grep) · type-check 0 · 격리빌드 | 2.5 | cc:완료 |
| 2.7 | **[FE]** settlements `홈택스 일괄 신고` **no-op 버튼 정직화**(INV-8): 신고 API 미연동 동안 `disabled`+"준비중" 표기(또는 2.8 연동). | no-op 버튼 0건(onClick 없는 활성 버튼 제거) · type-check 0 · 격리빌드 | Phase 1 | cc:완료 |
| 2.8 | **[FE]** mock/no-op 회귀가드: 빌드 산출물 `lint:mock`(`(mock)`·하드코딩 fixture grep, fail-on-match)을 Phase1 1.4 패턴으로 추가 | `npm run lint:mock` 비대화형 exit 0 | 2.6, 2.7 | cc:완료 |

> ⚠️ 라이브 반영: [FE] 산출물은 `harness-review` 통과 + 사용자 확인 후 `careand-deploy admin`(root)로만. [BE] 패치(2.4/2.5)는 careand-backend에 사용자가 `careand-deploy backend`로 반영(claude2 직배포 불가). 최대 리스크 = **[FE] 2.6이 [BE] 2.5(사용자 배포)에 의존** → 2.5 미반영 시 2.6은 mock 제거+빈상태까지만 가능(member-web Phase2 BE 의존교착 패턴 재발 주의).

## Phase 3: 운영 UX·정합성 (후순위 placeholder)

> Phase 2 완료 후 `/harness-plan create`로 구체화. product-impacting 추가 시 spec.md delta 동반.

| Task | 내용 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 3.1 | settlements 홈택스 원천징수(3.3%) **신고 API 자동화**([BE] 별도 과제) | (계획 시 정의) | Phase 2 | cc:TODO |
| 3.2 | caregiver-approval 외부 진위조회 연동(2차년도 스코프) | (계획 시 정의) | Phase 2 | cc:TODO |
| 3.3 | KPI 대시보드·care-monitoring 세부지표 정합성 | (계획 시 정의) | Phase 2 | cc:TODO |
