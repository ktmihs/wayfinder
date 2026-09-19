# Wayfinder — 오시는 길 페이지

주소 하나로 만드는 모바일 길안내 페이지.
관리자(집주인)가 도착지를 정해 링크/QR을 나눠주면, 손님은 출발지만 입력해 관리자가 고른 방식(지도 / 2D 타일 / 1인칭 3D / 영상)으로 길을 본다.

## 시작하기

```bash
# Node 24 필요
nvm use 24

npm install
cp .env.example .env       # DATABASE_URL, 카카오 키 채우기
npx prisma migrate deploy  # Supabase에 테이블 생성
npm run dev                # http://localhost:3000
```

## 카카오맵 키 설정

1. https://developers.kakao.com → 내 애플리케이션 → 애플리케이션 추가
2. **앱 키 > JavaScript 키** 복사 → `.env`의 `NEXT_PUBLIC_KAKAO_JS_KEY`에 넣기
3. **플랫폼 > Web > 사이트 도메인**에 `http://localhost:3000` 등록 (배포 도메인도 나중에 추가)
4. 제품 설정 > **카카오맵** 활성화

키를 넣은 뒤 dev 서버를 재시작하세요.

## 흐름

| 누가 | 어디서 | 무엇을 |
|---|---|---|
| 관리자 | `/new` | 이름, 도착지 주소(검색), 도착 후 안내, 안내 방식 입력 |
| 관리자 | `/admin/[adminKey]` | 손님용 링크/QR 확인, 수정, 삭제 — **이 링크는 비밀** |
| 손님 | `/go/[id]` | 출발지 입력(검색 또는 현재 위치) → 경로 보기 |

로그인 없이 동작하며, 관리 권한은 `adminKey`가 들어간 URL을 아는 사람에게만 있다.

## 배포 (Railway + Supabase)

1. **Supabase**: 새 프로젝트 → Project Settings > Database > Connection string > **Session pooler** URL 복사
2. **Railway**: New Project > Deploy from GitHub repo → 이 저장소 선택
3. Railway Variables에 추가:
   - `DATABASE_URL` = Supabase Session pooler URL
   - `NEXT_PUBLIC_KAKAO_JS_KEY` = 카카오 JavaScript 키
4. Settings > Networking > **Generate Domain** → `xxx.up.railway.app`
5. 카카오 콘솔 플랫폼 > Web 에 `https://xxx.up.railway.app` 추가

`npm start`가 `prisma migrate deploy`를 먼저 실행하므로 스키마는 배포 때 자동 반영된다.

## 스택

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 7 + Supabase Postgres · Railway · 카카오맵 JS SDK · qrcode.react
