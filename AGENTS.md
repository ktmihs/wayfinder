<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Wayfinder — 프로젝트 메모

주소 하나로 만드는 모바일 길안내 페이지. 관리자(집주인)가 도착지를 설정해 링크/QR을 배포하면, 손님이 출발지를 입력해 경로를 본다.

## 구조
- `src/app/new` — 관리자: 도착지 생성 폼
- `src/app/admin/[adminKey]` — 관리자: 공유 링크/QR, 수정, 삭제. `adminKey`는 비밀 관리 키(로그인 대체)
- `src/app/go/[id]` — 손님: 출발지 입력 → `RouteRenderer`가 `place.mode`에 따라 렌더러 분기
- `src/lib/modes.ts` — 안내 방식 목록 (map / tile2d / fps3d / video). `ready: false`면 지도로 폴백
- `src/lib/kakao.ts` — 카카오맵 SDK 로더 + 주소/장소 검색
- `src/lib/route/` — 공통 경로 JSON(`types.ts`), Tmap 보행자(`tmap.ts`)·대중교통(`tmapTransit.ts`)·OSRM 폴백(`osrm.ts`). `/api/route?from=&to=&travel=walk|transit`
- `src/lib/sprites.json` + `charSprite.ts` — 픽셀 캐릭터(4방향 2프레임) → data URL. 캐릭터 안내 모드는 KakaoMap 위 CustomOverlay
- 2D 타일 마을 지도(tile2d)는 제거됨 — 필요하면 커밋 803385f 참고
- `src/components/Cover.tsx` — 손님 온보딩 커버 (hostName/eventAt/greeting/imageUrl/theme). 관리자 폼 미리보기에도 재사용
- `src/lib/supabase.ts` — 서버 전용 Storage 클라이언트 (`covers` 버킷, public). `SUPABASE_URL`/`SUPABASE_SECRET_KEY` 없으면 업로드 비활성
- `src/lib/db.ts` — Prisma 7 + pg 어댑터 (Supabase Postgres, Session pooler URL). `src/generated/prisma`는 생성물(커밋 안 함)

## 규칙
- 손님 페이지로 `adminKey`를 절대 내려보내지 않는다 (`toPublicPlace` 사용)
- 모든 렌더러는 같은 경로 데이터(좌표 배열 + 턴 안내)를 받아 그린다. 렌더러 안에서 경로 API를 직접 호출하지 않는다
- Node 24 사용 (`~/.nvm/versions/node/v24.16.0`). Node 18은 Next 16을 못 돌린다
- 스키마 변경 시 `npx prisma migrate dev --name <이름>` (로컬도 Supabase DB를 바라봄). 배포 시 `npm start`가 `migrate deploy` 실행
- 배포: Railway (GitHub 연동, main push → 자동 배포)

- 시간대는 Asia/Seoul 고정 (`formatEventAt`, `toDatetimeLocal`). 폼은 `+09:00` 붙여서 전송
- 커버 이미지는 클라이언트에서 1600px WebP로 리사이즈 후 폼과 함께 전송 (server action bodySizeLimit 4mb)

## 완료
1. 도착지 설정/관리/손님 페이지 골격
2. 도보 경로 탐색 (Tmap/OSRM) + 지도 폴리라인 + 턴바이턴
3. 온보딩 L1: 커버 화면 (사진·초대자·일시·인사말·테마)

## 다음 단계
- 온보딩 L2: Claude API로 인사말/테마 생성 (관리자 폼에 버튼)
- tile2d → video → fps3d 렌더러 (모두 `Route` JSON 소비)
