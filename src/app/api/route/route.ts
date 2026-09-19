import { NextResponse } from "next/server";
import { findWalkingRoute, haversine } from "@/lib/route";

const MAX_WALK_M = 30_000; // 30km 넘으면 도보 안내 의미가 없다

function parseLatLng(s: string | null) {
  if (!s) return null;
  const [lat, lng] = s.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** GET /api/route?from=lat,lng&to=lat,lng */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = parseLatLng(searchParams.get("from"));
  const to = parseLatLng(searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "from, to 좌표가 필요해요 (lat,lng)" }, { status: 400 });
  }
  if (haversine(from, to) > MAX_WALK_M) {
    return NextResponse.json({ error: "도보로 안내하기엔 너무 멀어요 (30km 이상)" }, { status: 422 });
  }

  try {
    const route = await findWalkingRoute(from, to);
    return NextResponse.json(route, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (e) {
    console.error("[route]", e);
    return NextResponse.json({ error: "경로를 찾지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
