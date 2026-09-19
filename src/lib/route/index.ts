import { tmapPedestrian } from "./tmap";
import { tmapTransit } from "./tmapTransit";
import { odsayTransit } from "./odsay";
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

export { haversine } from "./geo";

/**
 * 대중교통 경로. Tmap → (키/한도 문제면) ODsay 순으로 시도.
 * 둘 다 안 되면 TransitUnavailable 로 손님에게 도보 폴백을 안내한다.
 */
export async function findTransitRoute(from: LatLng, to: LatLng): Promise<Route> {
  const hasTmap = !!process.env.TMAP_APP_KEY;
  const hasOdsay = !!process.env.ODSAY_API_KEY;
  if (!hasTmap && !hasOdsay) throw new TransitUnavailable("대중교통 안내는 아직 준비 중이에요. 도보로 안내해 드릴게요.");

  let tmapReason: "KEY" | "QUOTA" | null = null;
  if (hasTmap) {
    try {
      return await tmapTransit(from, to);
    } catch (e) {
      const msg = (e as Error).message;
      if (/403|INVALID_API_KEY/.test(msg)) tmapReason = "KEY";
      else if (/429|QUOTA_EXCEEDED|Limit Exceeded/.test(msg)) tmapReason = "QUOTA";
      else if (!hasOdsay) throw e; // 경로 없음 등은 그대로 (ODsay 있으면 한 번 더 시도)
      console.warn("[route] Tmap 대중교통 실패, ODsay 시도:", msg);
    }
  }
  if (hasOdsay) {
    try {
      return await odsayTransit(from, to);
    } catch (e) {
      const msg = (e as Error).message;
      if (/한도|limit|quota/i.test(msg)) throw new TransitUnavailable("오늘 대중교통 안내 한도를 다 썼어요. 도보로 보여드릴게요.", "QUOTA");
      throw e;
    }
  }
  if (tmapReason === "QUOTA") throw new TransitUnavailable("오늘 대중교통 안내 한도를 다 썼어요. 도보로 보여드릴게요.", "QUOTA");
  throw new TransitUnavailable("대중교통 안내는 아직 준비 중이에요. 도보로 안내해 드릴게요.");
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
