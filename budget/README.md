# SLM 예산 집행 현황

> `kccc-slm` 저장소의 `budget/` 폴더에 있는 **별도 앱**입니다. PRS 대시보드(저장소 루트)와 Supabase·Vercel 프로젝트를 따로 씁니다.

예산안과 월별 장부를 올리면, 예산 항목별로 얼마나 썼는지 그래프로 보여주는 웹앱입니다.
재정 자료라서 모든 화면은 로그인한 사람만 볼 수 있습니다.

- `/` : 대시보드 (항목별 예산 대비 사용액, 집행률, 월별 누적 추이, 세부 내역)
- `/upload` : 예산안 업로드 / 월별 장부 업로드
- `/login` : 로그인 (아이디 + 비밀번호)

**회기**: 매년 8월 ~ 다음 해 7월 (예: "2026년 회기" = 2026.08 ~ 2027.07)

## 사용 방법

1. **예산안 업로드**: 예산안(PDF/사진)을 올리면 AI가 항목·금액을 뽑아줍니다 → 항목 확인·수정 → **확정**
2. **월별 장부 업로드**: 매달 장부(PDF/사진)를 올리면 AI가 지출 내역을 예산 항목으로 분류합니다 → 확인·수정 → **확정**
3. **대시보드**에서 확정된 달까지의 누적 사용액을 예산과 비교

- 확정 전에는 아무것도 저장되지 않습니다.
- 이미 확정한 회기/월을 다시 확정하면 새 내용으로 교체됩니다.
- 파일은 4MB 이하만 올릴 수 있습니다 (Vercel 요청 크기 제한).
- AI 없이 "직접 입력"도 가능합니다.

## 기술 스택

Next.js 16 (App Router) · Supabase (Postgres + Auth) · Recharts · Gemini API · Vercel

## 처음 설정하기

### 1. Supabase

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성 (리전: Northeast Asia (Seoul) 권장)
2. **SQL Editor** 에서 `supabase/schema.sql` 내용을 그대로 붙여넣고 **Run**
3. **Authentication → Users → Add user** 에서 재정 담당자 계정 생성. **Auto Confirm User** 체크
   - 로그인 화면은 아이디로 받습니다. 아이디 `abc` 로 로그인하려면 이메일을 `abc@slm-budget.local` 로 만드세요 (실제 메일 주소를 넣으면 그 주소 전체로 로그인)
4. **Authentication → Sign In / Providers** 에서 **Allow new users to sign up** 을 꺼두세요 (아무나 가입하지 못하게)
5. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키 확인

### 2. 환경 변수

`.env.local.example` 을 복사해 `.env.local` 을 만들고 값을 채웁니다. (`.env.local` 은 GitHub에 올라가지 않습니다)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=발급받은-키          # https://aistudio.google.com/apikey , 여러 개면 쉼표로 구분
EDIT_PASSWORD=재정담당자-비밀번호   # 업로드·확정·수정·삭제할 때마다 확인 (기억하지 않음)
```

### 3. 로컬 실행

```bash
cd budget
npm install
npm run dev
```

http://localhost:3000 에서 확인.

### 4. Vercel 배포

PRS 대시보드와 **별도의 Vercel 프로젝트**로 만듭니다.

1. [vercel.com](https://vercel.com) 에서 **Add New → Project** → `kccc-slmhq/kccc-slm` 저장소 Import
2. **Root Directory** 를 `budget` 으로 지정 (중요 — 지정하지 않으면 PRS 앱이 배포됨)
3. **Environment Variables** 에 위 값들(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `EDIT_PASSWORD`) 등록
4. **Deploy**

이후 기본 브랜치에 푸시할 때마다 자동으로 재배포됩니다.

**자주 겪는 문제**

- 탭 제목이 "KCCC PRS 참여 현황 대시보드"로 나옴 → Root Directory 가 `./` 로 되어 있어 PRS 앱이 배포된 것. **Settings → Build and Deployment → Root Directory** 를 `budget` 으로 바꾸고 다시 배포
- "설정 오류" 화면 → 화면에 적힌 환경 변수를 고친 뒤 다시 배포 (`NEXT_PUBLIC_` 값은 빌드할 때 들어가므로, 환경 변수를 바꾸면 **반드시 Redeploy**)
- 같은 프로젝트 설정의 **Skip deployments** 를 켜두면 PRS 쪽만 바뀐 푸시에는 예산 앱을 다시 배포하지 않습니다

## 폴더 구조

```
app/(app)/page.tsx         대시보드
app/(app)/upload/page.tsx  업로드 화면
app/login/page.tsx         로그인
app/api/parse/route.ts     문서 AI 분석 (Gemini)
components/                화면 컴포넌트
lib/budget/                회기 계산, 집계, Gemini 연동, 데이터 조회
supabase/schema.sql        테이블 / 보안 정책(RLS) / 저장 함수
proxy.ts                   로그인 확인
```
