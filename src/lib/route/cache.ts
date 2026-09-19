import type { LatLng, Route, TravelMode } from "./types";

// 경로 결과 메모리 캐시. 외부 API 일일 한도(특히 대중교통)를 아끼기 위해
// 같은 출발/도착(약 50m 격자)은 TTL 동안 다시 묻지 않는다. 서버 프로세스가 살아 있는 동안만 유지.
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500;
const store = new Map<string, { at: number; route: Route }>();
const raw = new Map<string, { at: number; value: unknown }>(); // 제공자 원본 검색 결과 (대안 경로 전환용)

function cellKey(p: LatLng) {
  // 소수 4자리 ≈ 11m, 여기선 0.0005 (≈ 50m) 격자
  const q = (v: number) => Math.round(v / 0.0005) * 0.0005;
  return `${q(p.lat).toFixed(4)},${q(p.lng).toFixed(4)}`;
}

export function routeCacheKey(from: LatLng, to: LatLng, travel: TravelMode, alt = 0) {
  return `${travel}|${alt}|${cellKey(from)}|${cellKey(to)}`;
}

/** 제공자 원본 응답 캐시 (같은 출발/도착의 다른 대안을 고를 때 검색 API 를 다시 안 부른다) */
export function getCachedRaw<T>(key: string): T | null {
  const hit = raw.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    raw.delete(key);
    return null;
  }
  return hit.value as T;
}
export function setCachedRaw(key: string, value: unknown) {
  if (raw.size >= MAX_ENTRIES) raw.clear();
  raw.set(key, { at: Date.now(), value });
}
export function rawKey(provider: string, from: LatLng, to: LatLng) {
  return `${provider}|${cellKey(from)}|${cellKey(to)}`;
}

export function getCachedRoute(key: string): Route | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit.route;
}

export function setCachedRoute(key: string, route: Route) {
  if (store.size >= MAX_ENTRIES) {
    // 가장 오래된 것부터 정리
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 50);
    for (const [k] of oldest) store.delete(k);
  }
  store.set(key, { at: Date.now(), route });
}
