import type { LatLng, Route, RouteStep, TurnKind } from "./types";

// Tmap 보행자 경로 API (SK open API)
// https://openapi.sk.com/products/detail?linkMenuSeq=45
const ENDPOINT = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json";

// Tmap turnType 코드 → 공통 TurnKind
const TURN: Record<number, TurnKind> = {
  11: "straight",
  12: "left",
  13: "right",
  14: "uturn",
  16: "sharp-left",
  17: "slight-left",
  18: "slight-right",
  19: "sharp-right",
  125: "overpass",
  126: "underpass",
  127: "stairs",
  128: "stairs",
  129: "stairs",
  200: "start",
  201: "end",
  211: "crosswalk",
  212: "crosswalk",
  213: "crosswalk",
  214: "crosswalk",
  215: "crosswalk",
  216: "crosswalk",
  217: "crosswalk",
  218: "elevator",
  233: "straight",
};

type TmapPoint = {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    index: number;
    pointIndex: number;
    description: string;
    turnType: number;
    totalDistance?: number;
    totalTime?: number;
  };
};
type TmapLine = {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: { index: number; lineIndex: number; distance: number; time: number; description: string };
};
type TmapFeature = TmapPoint | TmapLine;

const isPoint = (f: TmapFeature): f is TmapPoint => f.geometry.type === "Point";

export async function tmapPedestrian(from: LatLng, to: LatLng): Promise<Route> {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) throw new Error("TMAP_APP_KEY가 설정되지 않았어요.");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", appKey },
    body: JSON.stringify({
      startX: from.lng,
      startY: from.lat,
      endX: to.lng,
      endY: to.lat,
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      startName: encodeURIComponent("출발"),
      endName: encodeURIComponent("도착"),
      searchOption: "0", // 0 추천, 4 큰길 우선, 10 최단, 30 계단 제외
    }),
    cache: "no-store", // 캐시는 findRoute 의 메모리 캐시가 담당
  });
  if (!res.ok) throw new Error(`Tmap 응답 오류 ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as { features: TmapFeature[] };
  const path: LatLng[] = [];
  const steps: RouteStep[] = [];
  let distance = 0;
  let duration = 0;

  // Point(안내 지점)와 LineString(구간)이 번갈아 온다.
  // LineString의 좌표를 이어붙여 path를 만들고, Point는 그 시점의 path 길이를 pathIndex로 기록한다.
  for (const f of data.features) {
    if (isPoint(f)) {
      const [lng, lat] = f.geometry.coordinates;
      if (f.properties.totalDistance != null) distance = f.properties.totalDistance;
      if (f.properties.totalTime != null) duration = f.properties.totalTime;
      steps.push({
        description: f.properties.description,
        distance: 0, // 다음 LineString에서 채움
        lat,
        lng,
        turn: TURN[f.properties.turnType] ?? "unknown",
        // 안내 지점 좌표는 직전 LineString 의 마지막 점과 같다 (중복 제거되어 새로 push 되지 않음)
        pathIndex: Math.max(0, path.length - 1),
      });
    } else {
      for (const [lng, lat] of f.geometry.coordinates) {
        const last = path[path.length - 1];
        if (!last || last.lat !== lat || last.lng !== lng) path.push({ lat, lng });
      }
      if (steps.length) steps[steps.length - 1].distance += f.properties.distance;
    }
  }

  return { provider: "tmap", travel: "walk", distance, duration, path, steps };
}
