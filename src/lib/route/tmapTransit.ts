import type { LatLng, Route, RouteLeg, RouteStep } from "./types";

// Tmap 대중교통 경로 API — https://transit.tmapmobility.com/docs/routes
const ENDPOINT = "https://apis.openapi.sk.com/transit/routes";

type TmapLeg = {
  mode: "WALK" | "BUS" | "SUBWAY" | "EXPRESSBUS" | "TRAIN" | "AIRPLANE" | "FERRY";
  sectionTime: number;
  distance: number;
  start: { name: string; lon: number; lat: number };
  end: { name: string; lon: number; lat: number };
  route?: string;
  routeColor?: string;
  // 문서에는 stationList 로 되어 있지만 실제 응답은 stations 다. 둘 다 받는다.
  passStopList?: { stations?: Array<{ stationName: string; lon: string; lat: string }>; stationList?: Array<{ stationName: string; lon: string; lat: string }> };
  passShape?: { linestring: string };
  steps?: Array<{ streetName?: string; distance: number; description: string; linestring?: string }>;
};

type TmapTransitResponse = {
  metaData?: {
    plan?: {
      itineraries?: Array<{
        totalTime: number;
        totalDistance: number;
        transferCount: number;
        pathType: number;
        fare?: { regular?: { totalFare?: number } };
        legs: TmapLeg[];
      }>;
    };
  };
  result?: { status?: number; message?: string };
};

/** "lon,lat lon,lat ..." → LatLng[] */
function parseLine(s: string | undefined): LatLng[] {
  if (!s) return [];
  return s
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number))
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
    .map(([lng, lat]) => ({ lat, lng }));
}

/** "간선:402" → "402", "수도권9호선(급행)" → "9호선(급행)" */
function cleanRouteName(name: string | undefined, mode: RouteLeg["mode"]) {
  if (!name) return undefined;
  if (mode === "bus") return name.replace(/^[^:]+:/, "");
  return name.replace(/^수도권/, "");
}

function stationCount(leg: TmapLeg) {
  const list = leg.passStopList?.stations ?? leg.passStopList?.stationList;
  return list?.length ? list.length - 1 : undefined;
}

function legMode(m: TmapLeg["mode"]): RouteLeg["mode"] {
  if (m === "WALK") return "walk";
  if (m === "BUS" || m === "EXPRESSBUS") return "bus";
  if (m === "SUBWAY" || m === "TRAIN") return "subway";
  return "other";
}

export async function tmapTransit(from: LatLng, to: LatLng): Promise<Route> {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) throw new Error("TMAP_APP_KEY가 설정되지 않았어요.");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json", appKey },
    body: JSON.stringify({
      startX: String(from.lng),
      startY: String(from.lat),
      endX: String(to.lng),
      endY: String(to.lat),
      count: 3,
      lang: 0,
      format: "json",
    }),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Tmap 대중교통 응답 오류 ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as TmapTransitResponse;
  const itineraries = data.metaData?.plan?.itineraries ?? [];
  if (!itineraries.length) {
    throw new Error(data.result?.message ?? "대중교통 경로를 찾지 못했어요. 거리가 너무 가깝거나 운행 시간이 아닐 수 있어요.");
  }
  // 첫 번째(추천) 경로. 지하철/버스 조합 중 가장 빠른 것
  const it = [...itineraries].sort((a, b) => a.totalTime - b.totalTime)[0];

  const path: LatLng[] = [];
  const steps: RouteStep[] = [];
  const legs: RouteLeg[] = [];
  const pushPath = (pts: LatLng[]) => {
    for (const p of pts) {
      const last = path[path.length - 1];
      if (!last || last.lat !== p.lat || last.lng !== p.lng) path.push(p);
    }
  };

  steps.push({ description: "출발", distance: 0, lat: from.lat, lng: from.lng, turn: "start", pathIndex: 0 });

  for (const leg of it.legs) {
    const mode = legMode(leg.mode);
    const pathStart = path.length;
    const startPt = { lat: leg.start.lat, lng: leg.start.lon };
    const endPt = { lat: leg.end.lat, lng: leg.end.lon };

    if (mode === "walk") {
      pushPath([startPt]);
      for (const st of leg.steps ?? []) {
        const idx = path.length - 1;
        pushPath(parseLine(st.linestring));
        if (st.description) {
          steps.push({
            description: st.description,
            distance: st.distance,
            lat: path[idx]?.lat ?? startPt.lat,
            lng: path[idx]?.lng ?? startPt.lng,
            turn: "walk",
            pathIndex: idx,
          });
        }
      }
      pushPath([endPt]);
      if (!leg.steps?.length && leg.distance > 0) {
        steps.push({
          description: `${leg.end.name}까지 도보`,
          distance: leg.distance,
          lat: startPt.lat,
          lng: startPt.lng,
          turn: "walk",
          pathIndex: pathStart,
        });
      }
    } else {
      const idx = Math.max(0, path.length - 1);
      const line = parseLine(leg.passShape?.linestring);
      pushPath(line.length ? line : [startPt, endPt]);
      const stops = stationCount(leg);
      const name = cleanRouteName(leg.route, mode);
      steps.push({
        description: `${name ? (mode === "bus" ? `${name}번 버스` : name) : mode === "subway" ? "지하철" : "버스"} 탑승 · ${leg.start.name} → ${leg.end.name}${stops ? ` (${stops}정거장)` : ""}`,
        distance: leg.distance,
        lat: startPt.lat,
        lng: startPt.lng,
        turn: mode === "subway" ? "subway" : "bus",
        pathIndex: idx,
      });
    }

    legs.push({
      mode,
      name: cleanRouteName(leg.route, mode),
      color: leg.routeColor ? `#${leg.routeColor.replace("#", "")}` : undefined,
      from: leg.start.name,
      to: leg.end.name,
      distance: leg.distance,
      duration: leg.sectionTime,
      pathStart,
      pathEnd: Math.max(pathStart, path.length - 1),
      stops: stationCount(leg),
    });
  }

  steps.push({ description: "목적지 도착", distance: 0, lat: to.lat, lng: to.lng, turn: "end", pathIndex: Math.max(0, path.length - 1) });

  return {
    provider: "tmap",
    travel: "transit",
    distance: it.totalDistance,
    duration: it.totalTime,
    path,
    steps,
    legs,
    fare: it.fare?.regular?.totalFare,
    transfers: it.transferCount,
  };
}
