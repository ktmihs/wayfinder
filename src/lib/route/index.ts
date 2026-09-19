import { tmapPedestrian } from "./tmap";
import { osrmFoot } from "./osrm";
import type { LatLng, Route } from "./types";

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
