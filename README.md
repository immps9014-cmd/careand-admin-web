# Care& 관리자 웹 (4주차 - Phase 3-B)

> Next.js 14 (App Router) + TypeScript + Tailwind CSS + TanStack Query
> 케어앤 디자인 시스템 적용 (Sage Green × Warm Beige + Pretendard)

## 📦 산출물 구성

| 영역 | 파일 수 | 설명 |
|---|---|---|
| Pages | 9 | 로그인, 대시보드, 회원, 매칭, 케어모니터링, 정산, AI모델, CS, 리포트 |
| UI 컴포넌트 | 5 | shadcn/ui 기반 (Button, Input, Card, Badge, Table) |
| 도메인 컴포넌트 | 4 | KpiCard, AlertItem, Sidebar, Topbar |
| API 클라이언트 | 4 | client (JWT 자동 갱신), auth, dashboard, ai-models |
| Lib | 3 | utils, auth store (Zustand), providers |
| 차트 | 2 | HourlyRequestsChart (Recharts), ModelInsights |

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18.17+ / 20+
- pnpm 9 또는 npm 10 / yarn

### 설치 및 실행

```bash
cd careand-admin-web
npm install              # 또는 pnpm install / yarn

cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev              # http://localhost:3000
```

### Laravel 백엔드와 통합 실행

```bash
# 1. Laravel 백엔드 실행 (별도 터미널)
cd ../careand-backend
php artisan serve        # → http://localhost:8000

# 2. Next.js 관리자 웹 실행
cd careand-admin-web
npm run dev              # → http://localhost:3000
```

브라우저에서 http://localhost:3000 접속 → 자동으로 로그인 페이지 리다이렉트 → 슈퍼관리자 계정으로 로그인.

기본 계정: `admin@careand.co.kr` / `CareandAdmin2026!@`

## 📐 디자인 토큰 적용

`tailwind.config.ts`에 케어앤 디자인 시스템 토큰이 그대로 적용되어 있습니다:

```ts
colors: {
  brand: { 50: "#F4F8F5", ..., 500: "#3F7D52", ..., 900: "#142A1D" },
  warm: { 50: "#FBF9F4", ..., 700: "#3A352B", ..., 900: "#14110D" },
  danger: { DEFAULT: "#C25450", bg: "#FBEEED" },
  warn: { DEFAULT: "#C68A2E", bg: "#FBF3E4" },
  info: { DEFAULT: "#3D7AB3", bg: "#EBF1F8" },
}
```

사용 예: `<div className="bg-brand-500 text-warm-50">...</div>`

폰트: Pretendard (한글) + Plus Jakarta Sans (영문/숫자)
```tsx
<span className="font-en font-extrabold">142</span>  // 영문 숫자
<h1 className="text-2xl font-bold">대시보드</h1>     // 한글 (기본 Pretendard)
```

## 🔐 인증 흐름

```
1. /login 페이지에서 이메일/비밀번호 입력
2. POST /api/v1/auth/login → 액세스 토큰 + 리프레시 토큰
3. role !== "admin" 이면 거부
4. Zustand store 저장 (localStorage 동기화)
5. 모든 API 요청에 Bearer 토큰 자동 첨부
6. 401 응답 시 리프레시 토큰으로 자동 갱신 → 재시도
7. 갱신 실패 시 로그아웃 + /login 리다이렉트
```

## 📡 페이지 일람

| 라우트 | 기능 | API 연동 |
|---|---|---|
| `/login` | 관리자 로그인 | `POST /v1/auth/login` |
| `/dashboard` | 실시간 KPI · 시간대 차트 · 긴급 알림 · 지역 수요 | `GET /v1/admin/dashboard/*` |
| `/members` | 회원 관리 (보호자/인력/기관/관리자) | `GET /v1/admin/members` |
| `/matching` | 진행중 매칭 모니터링 + 수동 배정 | `GET /v1/admin/matching/requests` · `POST …/{id}/manual-assign` |
| `/care-monitoring` | AI 이상징후 알림 처리 | `GET /v1/admin/dashboard/recent-alerts` |
| `/settlements` | 주간 정산 + 홈택스 일괄 신고 | `POST /v1/admin/settlements/run` 등 |
| `/ai-models` | 5개 AI 모델 운영 + 카나리 + 편향성 감사 | `GET /v1/admin/ai-models` 외 |
| `/caregiver-approval` | 인력 자격검증 승인/반려 | `GET /v1/admin/caregivers` · `POST …/{id}/approve·reject` |
| `/contracts` | 계약·일정 관리 | `GET /v1/admin/contracts` |
| `/care-logs` | AI 일지 검수·승인 | `GET /v1/admin/care-logs` · `POST …/{id}/approve·reject` |
| `/announcements` | 공지·푸시 발송 | `GET·POST /v1/admin/announcements` |
| `/cs` | 후기·CS·챗봇 세션 | `GET /v1/admin/cs/stats·reviews·chatbot-sessions` |
| `/reports` | 정기 리포트 + CSV 다운로드 | 대시보드·CS·AI모델 API 집계 (클라이언트 CSV 생성) |

## 🧩 컴포넌트 카탈로그

### `<KpiCard />`
```tsx
<KpiCard
  variant="brand"                      // "default" | "brand"
  label="진행중 매칭"
  value={142}
  icon={ArrowRightLeft}
  trend={{ pct: 18, label: "전주 대비" }}
/>
```

### `<AlertItem />`
```tsx
<AlertItem
  severity="high"                      // "high" | "warn" | "info"
  title="홍어머님 어르신 - 영양 위험"
  meta="78점 · 2시간 전"
/>
```

### `<HourlyRequestsChart />`
```tsx
<HourlyRequestsChart data={hourlyData} />  // Recharts 막대그래프
```

## 🛠️ 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
npm start                # → http://localhost:3000
```

### Docker

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

### 배포 권장
- Vercel (Next.js 공식 호스팅)
- AWS Amplify
- 자체 K8s + Docker

## 🎯 다음 단계

- ✅ 4주차-2: 보호자/회원 웹 → `careand-member-web`(:3106, `/app`)으로 구현 완료 (2026-06)
- ⏳ 카카오맵 연동: 카카오 디벨로퍼스 승인 대기 — 승인 후 REST 키(백엔드 `KAKAO_REST_API_KEY`)·JS 키(member-web) 주입, `map-preview.tsx` SDK 교체
- ✅ 4주차-3: CI/CD + 운영 인프라 → 단일호스트 git+deploy/backup/monitor 구축 완료 (런북 /root/CAREAND-OPS.md, 2026-06-10)
- 4주차-4: ML 모델 실제 구현 (careand-ai-service stub 교체)

추가로 본 관리자 웹에 필요한 작업:
- TanStack Query Devtools 설정 보완
- E2E 테스트 (Playwright)
- 다국어 (한국어/영어/중국어 - 외국인 인력 지원)
- 다크 모드 (Phase 5)
- 접근성 (WCAG 2.1 AA)

---

© 2026 Care& Inc. 4주차 - 관리자 웹 v1.0
