import { tmapPedestrian } from "./tmap";
import { tmapTransit } from "./tmapTransit";
import { osrmFoot } from "./osrm";
import type { LatLng, Route, TravelMode } from "./types";
import { getCachedRoute, routeCacheKey, setCachedRoute } from "./cache";

export type * from "./types";

/**
 * 도보 경로 탐색. Tmap 키가 있으면 Tmap, 없으면 OSRM 폴백.
 * Tmap이 실패해도 OSRM으로 한 번 더 시도한다.
 */
export async function findWalkingRoute(from: LatLng, to: LatLng): Promise<Route> {
  if (process.env.TMAP_APP_KEY) {
    try {
      return await tmapPedestrian(from, to);
    } catch (e) {
      console.error("[route] Tmap 실패, OSRM으로 폴백:", (e as Error).message);
    }
  }
  return osrmFoot(from, to);
}

/** 두 좌표 사이 직선 거리(m). 너무 먼 요청을 거르는 데 사용 */
export function haversine(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 대중교통 경로. Tmap 전용 (폴백 없음) */
export async function findTransitRoute(from: LatLng, to: LatLng): Promise<Route> {
  if (!process.env.TMAP_APP_KEY) throw new TransitUnavailable("대중교통 안내는 아직 준비 중이에요. 도보로 안내해 드릴게요.");
  try {
    return await tmapTransit(from, to);
  } catch (e) {
    const msg = (e as Error).message;
    if (/403|INVALID_API_KEY/.test(msg)) throw new TransitUnavailable("대중교통 안내는 아직 준비 중이에요. 도보로 안내해 드릴게요.");
    if (/429|QUOTA_EXCEEDED|Limit Exceeded/.test(msg)) {
      throw new TransitUnavailable("오늘 대중교통 안내 한도를 다 썼어요. 도보로 보여드릴게요.", "QUOTA");
    }
    throw e;
  }
}

export class TransitUnavailable extends Error {
  constructor(message: string, public reason: "KEY" | "QUOTA" = "KEY") {
    super(message);
  }
}

/** 이동수단별 경로. 같은 출발/도착은 30분간 캐시해서 외부 API 한도를 아낀다 */
export async function findRoute(from: LatLng, to: LatLng, travel: TravelMode) {
  const key = routeCacheKey(from, to, travel);
  const cached = getCachedRoute(key);
  if (cached) return cached;
  const route = travel === "transit" ? await findTransitRoute(from, to) : await findWalkingRoute(from, to);
  setCachedRoute(key, route);
  return route;
}
