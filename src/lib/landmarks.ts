"use client";

import { loadKakao } from "@/lib/kakao";
import { distanceM } from "@/lib/geo";
import type { LatLng } from "@/lib/route/types";

export type LandmarkKind = "subway" | "store" | "cafe" | "bank" | "pharmacy";
export type Landmark = { id: string; name: string; kind: LandmarkKind; lat: number; lng: number };

// 약도에 쓸 만한 카테고리만 (음식점은 너무 많아서 제외)
const CATEGORIES: Array<{ code: "SW8" | "CS2" | "CE7" | "BK9" | "PM9"; kind: LandmarkKind }> = [
  { code: "SW8", kind: "subway" },
  { code: "CS2", kind: "store" },
  { code: "CE7", kind: "cafe" },
  { code: "BK9", kind: "bank" },
  { code: "PM9", kind: "pharmacy" },
];

const CHUNK_M = 250; // 경로를 이 길이씩 잘라 각 구간의 사각형 안에서 검색
const NEAR_M = 45; // 경로에서 이 거리 안에 있는 곳만 랜드마크로 채택
const PAD_DEG = 0.0006; // 사각형 여유 (~60m)

function chunksOf(path: LatLng[]) {
  const out: LatLng[][] = [];
  let cur: LatLng[] = [path[0]];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += distanceM(path[i - 1], path[i]);
    cur.push(path[i]);
    if (acc >= CHUNK_M) {
      out.push(cur);
      cur = [path[i]];
      acc = 0;
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

function distToPath(path: LatLng[], p: LatLng) {
  let best = Infinity;
  for (const q of path) best = Math.min(best, distanceM(p, q));
  return best;
}

/**
 * 경로 주변 랜드마크(지하철역/편의점/카페/은행/약국)를 카카오 장소 검색으로 모은다.
 * 구간별 사각형 검색 → 경로 45m 이내만 필터 → 중복 제거.
 */
export async function findLandmarks(path: LatLng[]): Promise<Landmark[]> {
  if (path.length < 2) return [];
  const k = await loadKakao();
  const places = new k.maps.services.Places();
  const found = new Map<string, Landmark>();

  const searchOne = (code: (typeof CATEGORIES)[number]["code"], kind: LandmarkKind, bounds: kakao.maps.LatLngBounds) =>
    new Promise<void>((resolve) => {
      places.categorySearch(
        code,
        (result, status) => {
          if (status === k.maps.services.Status.OK) {
            for (const r of result) {
              const lat = Number(r.y), lng = Number(r.x);
              if (distToPath(path, { lat, lng }) <= NEAR_M && !found.has(r.id)) {
                found.set(r.id, { id: r.id, name: r.place_name, kind, lat, lng });
              }
            }
          }
          resolve();
        },
        { bounds, size: 15 },
      );
    });

  const jobs: Promise<void>[] = [];
  for (const chunk of chunksOf(path)) {
    const lats = chunk.map((p) => p.lat), lngs = chunk.map((p) => p.lng);
    const bounds = new k.maps.LatLngBounds(
      new k.maps.LatLng(Math.min(...lats) - PAD_DEG, Math.min(...lngs) - PAD_DEG),
      new k.maps.LatLng(Math.max(...lats) + PAD_DEG, Math.max(...lngs) + PAD_DEG),
    );
    for (const c of CATEGORIES) jobs.push(searchOne(c.code, c.kind, bounds));
  }
  await Promise.all(jobs);
  return [...found.values()];
}

export const LANDMARK_EMOJI: Record<LandmarkKind, string> = {
  subway: "🚇",
  store: "🏪",
  cafe: "☕",
  bank: "🏦",
  pharmacy: "💊",
};

/** "GS25 역삼테헤란점" → "GS25 역삼테헤란" 처럼 이름표에 맞게 줄인다 */
export function shortName(name: string, max = 10) {
  const n = name.replace(/\s*(점|지점|출구)$/u, "").trim();
  return n.length > max ? n.slice(0, max - 1) + "…" : n;
}
