import type { LatLng, Route, RouteStep, TurnKind } from "./types";

// OSRM 공개 데모 서버. 키가 필요 없지만 자동차 경로만 제공하므로
// Tmap 키가 없을 때의 폴백으로만 쓴다. 소요 시간은 도보 속도로 다시 계산한다.
const ENDPOINT = "https://router.project-osrm.org/route/v1/foot";
const WALK_SPEED_MPS = 1.25; // 약 4.5km/h

function turnKind(maneuver: { type: string; modifier?: string }): TurnKind {
  if (maneuver.type === "depart") return "start";
  if (maneuver.type === "arrive") return "end";
  switch (maneuver.modifier) {
    case "left": return "left";
    case "right": return "right";
    case "slight left": return "slight-left";
    case "slight right": return "slight-right";
    case "sharp left": return "sharp-left";
    case "sharp right": return "sharp-right";
    case "uturn": return "uturn";
    case "straight": return "straight";
    default: return maneuver.type === "continue" ? "straight" : "unknown";
  }
}

const KO: Record<TurnKind, string> = {
  start: "출발",
  end: "도착",
  straight: "직진",
  left: "좌회전",
  right: "우회전",
  "slight-left": "왼쪽 방향",
  "slight-right": "오른쪽 방향",
  "sharp-left": "급좌회전",
  "sharp-right": "급우회전",
  uturn: "유턴",
  crosswalk: "횡단보도",
  stairs: "계단",
  overpass: "육교",
  underpass: "지하보도",
  elevator: "엘리베이터",
  walk: "도보",
  bus: "버스",
  subway: "지하철",
  unknown: "이동",
};

export async function osrmFoot(from: LatLng, to: LatLng): Promise<Route> {
  const url = `${ENDPOINT}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`OSRM 응답 오류 ${res.status}`);
  const data = (await res.json()) as {
    code: string;
    routes: Array<{
      distance: number;
      geometry: { coordinates: [number, number][] };
      legs: Array<{
        steps: Array<{
          distance: number;
          name: string;
          maneuver: { type: string; modifier?: string; location: [number, number] };
          geometry: { coordinates: [number, number][] };
        }>;
      }>;
    }>;
  };
  if (data.code !== "Ok" || !data.routes.length) throw new Error("OSRM 경로를 찾지 못했어요.");

  const r = data.routes[0];
  const path: LatLng[] = r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  const steps: RouteStep[] = [];
  let pathIndex = 0;
  for (const s of r.legs[0].steps) {
    const [lng, lat] = s.maneuver.location;
    const turn = turnKind(s.maneuver);
    const road = s.name ? ` (${s.name})` : "";
    steps.push({
      description: turn === "end" ? "목적지 도착" : `${KO[turn]}${road} 후 ${Math.round(s.distance)}m`,
      distance: s.distance,
      lat,
      lng,
      turn,
      pathIndex,
    });
    pathIndex += Math.max(0, s.geometry.coordinates.length - 1);
  }

  return {
    provider: "osrm",
    travel: "walk",
    distance: r.distance,
    duration: Math.round(r.distance / WALK_SPEED_MPS),
    path,
    steps,
  };
}
