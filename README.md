# KCCC PRS 참여 현황 대시보드

지구별 / 캠퍼스별 참여 인원을 보여주는 공개 대시보드와, 데이터를 수정할 수 있는 관리자 페이지로 구성된 Next.js + Supabase 웹앱입니다.

- `/` : 누구나 접속 가능한 공개 대시보드 (전체 인원, 지구별, 캠퍼스별)
- `/admin` : 로그인한 관리자만 접근 가능한 데이터 관리 페이지 (추가/수정/삭제)
- `/admin/login` : 관리자 로그인

## 1. Supabase 설정

1. [supabase.com](https://supabase.com) 에서 무료 프로젝트 생성
2. 프로젝트의 **SQL Editor**에서 `supabase/schema.sql` 내용을 그대로 실행
   - `groups` 테이블 생성 + RLS 정책 설정 + 초기 데이터(1,914명분) 삽입
3. **Authentication → Users → Add user**에서 관리자로 사용할 이메일/비밀번호 생성
4. **Settings → API**에서 `Project URL`과 `anon public` 키 확인

## 2. 환경 변수

`.env.local.example`을 참고해서 `.env.local` 파일을 만들고 값을 채워주세요.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. 로컬 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인.

## 4. Vercel 배포

1. [vercel.com](https://vercel.com) 에서 깃허브 계정으로 로그인
2. "Add New... → Project" 에서 이 저장소(`kccc-slmhq/kccc-slm`) Import
3. Environment Variables에 위 두 값(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) 등록
4. Deploy

이후로는 이 저장소의 main 브랜치에 푸시할 때마다 Vercel이 자동으로 재배포합니다.

## 예산 집행 현황 (`/budget`)

예산안과 월별 장부를 올리면, 예산 항목별로 얼마나 썼는지 그래프로 보여주는 비공개 페이지입니다. (관리자 로그인 필요)

- `/budget` : 대시보드 (항목별 예산 대비 사용액, 집행률, 월별 누적 추이, 세부 내역)
- `/budget/upload` : 예산안 업로드 / 월별 장부 업로드

**회기**: 매년 8월 ~ 다음 해 7월 (예: "2026년 회기" = 2026.08 ~ 2027.07)

**사용 순서**
1. 예산안(PDF/사진) 업로드 → AI가 항목·금액 추출 → 항목 확인·수정 → **확정**
2. 매달 장부(PDF/사진) 업로드 → AI가 지출 내역을 예산 항목으로 분류 → 확인·수정 → **확정**
3. 대시보드에서 확정된 달까지의 누적 사용액을 예산과 비교

확정 전에는 아무것도 저장되지 않습니다. 이미 확정된 회기/월을 다시 확정하면 새 내용으로 교체됩니다.
파일은 4MB 이하만 올릴 수 있습니다 (Vercel 요청 크기 제한).

**설정**
1. Supabase SQL Editor에서 `supabase/budget_schema.sql` 실행
2. 환경 변수 추가 (`.env.local` 및 Vercel)

```
GEMINI_API_KEY=발급받은-키        # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash     # 선택, 기본값 gemini-2.5-flash
```

`GEMINI_API_KEY`가 없어도 "AI 없이 직접 입력"으로 사용할 수 있습니다.

## 5. 데이터 업데이트 방법 (담당자 인수인계용)

코드를 건드릴 필요 없이, 배포된 사이트의 `/admin` 페이지에 로그인해서:
- 캠퍼스별 인원 수정
- 새 캠퍼스(소그룹) 추가
- 캠퍼스 삭제

화면에서 바로 가능합니다. 저장 즉시 공개 대시보드(`/`)에 반영됩니다.
