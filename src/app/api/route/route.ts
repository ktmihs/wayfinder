import { NextResponse } from "next/server";
import { findRoute, TransitUnavailable } from "@/lib/route";
import { haversine } from "@/lib/route/geo";

const MAX_WALK_M = 30_000; // 30km 넘으면 도보 안내 의미가 없다
const MAX_TRANSIT_M = 200_000;

function parseLatLng(s: string | null) {
  if (!s) return null;
  const [lat, lng] = s.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** GET /api/route?from=lat,lng&to=lat,lng&travel=walk|transit&alt=0 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = parseLatLng(searchParams.get("from"));
  const to = parseLatLng(searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "from, to 좌표가 필요해요 (lat,lng)" }, { status: 400 });
  }
  const travel = searchParams.get("travel") === "transit" ? "transit" : "walk";
  const alt = Math.max(0, Math.min(9, Number(searchParams.get("alt") ?? 0) || 0));
  const straight = haversine(from, to);
  if (travel === "walk" && straight > MAX_WALK_M) {
    return NextResponse.json({ error: "도보로 안내하기엔 너무 멀어요 (30km 이상). 대중교통을 선택해 보세요." }, { status: 422 });
  }
  if (travel === "transit" && straight > MAX_TRANSIT_M) {
    return NextResponse.json({ error: "너무 먼 거리예요 (200km 이상)" }, { status: 422 });
  }

  try {
    const route = await findRoute(from, to, travel, alt);
    return NextResponse.json(route, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (e) {
    if (e instanceof TransitUnavailable) {
      return NextResponse.json(
        { error: e.message, code: "TRANSIT_UNAVAILABLE", reason: e.reason },
        { status: e.reason === "QUOTA" ? 429 : 501 },
      );
    }
    console.error("[route]", e);
    return NextResponse.json({ error: "경로를 찾지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
