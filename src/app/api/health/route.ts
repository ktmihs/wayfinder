import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — 배포 환경에서 어떤 설정이 잡혀 있는지 확인용.
 * 값은 절대 노출하지 않고 설정 여부와 길이만 돌려준다.
 */
export async function GET() {
  const check = (key: string) => {
    const v = process.env[key];
    return v ? { set: true, length: v.length } : { set: false };
  };
  return NextResponse.json({
    ok: true,
    node: process.version,
    env: {
      DATABASE_URL: check("DATABASE_URL"),
      NEXT_PUBLIC_KAKAO_JS_KEY: check("NEXT_PUBLIC_KAKAO_JS_KEY"),
      TMAP_APP_KEY: check("TMAP_APP_KEY"),
      SUPABASE_URL: check("SUPABASE_URL"),
      SUPABASE_SECRET_KEY: check("SUPABASE_SECRET_KEY"),
    },
    // 비슷한 이름으로 잘못 넣은 변수가 있는지 힌트
    similarKeys: Object.keys(process.env).filter((k) => /SUPABASE|TMAP|KAKAO/i.test(k)),
  });
}
