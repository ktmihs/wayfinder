import type { LatLng, Route, RouteLeg, RouteStep } from "./types";
import { osrmFoot } from "./osrm";
import { tmapPedestrian } from "./tmap";
import { haversine } from "./geo";

// ODsay 대중교통 API — https://lab.odsay.com/guide/releaseReference
// Web(URI) 키라 Referer 로 등록 도메인을 보낸다. Tmap 대중교통 한도 초과 시 폴백.
const SEARCH = "https://api.odsay.com/v1/api/searchPubTransPathT";
const LANE = "https://api.odsay.com/v1/api/loadLane";

type OdsayLane = { busNo?: string; type?: number; name?: string; subwayCode?: number; subwayCityCode?: number };
type OdsaySubPath = {
  trafficType: 1 | 2 | 3; // 1 지하철, 2 버스, 3 도보
  distance: number;
  sectionTime: number; // 분
  stationCount?: number;
  lane?: OdsayLane[];
  startName?: string;
  startX?: number;
  startY?: number;
  endName?: string;
  endX?: number;
  endY?: number;
  passStopList?: { stations: Array<{ stationName: string; x: string; y: string }> };
};
type OdsayPath = {
  pathType: number;
  info: { totalTime: number; payment: number; totalDistance: number; mapObj: string; busTransitCount: number; subwayTransitCount: number };
  subPath: OdsaySubPath[];
};

// 수도권 지하철 노선색 (subwayCode 기준). 없으면 이름으로 추정, 그래도 없으면 기본 파랑
const SUBWAY_COLOR: Record<number, string> = {
  1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A5DE", 5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
  101: "#0090D2", // 공항철도
  104: "#77C4A3", // 경의중앙
  107: "#7CA8D5", // 에버라인
  108: "#0C8E72", // 경춘
  109: "#D4003B", // 신분당
  110: "#6FB245", // 의정부경전철
  112: "#B0CE18", // 경강
  113: "#B7C452", // 우이신설
  114: "#8FC31F", // 서해
  115: "#77C4A3", // 김포골드
  116: "#F5A200", // 수인분당
  117: "#F5A200", // 신림선
  21: "#F06A00", // 인천1
  22: "#ED8B00", // 인천2
};
const BUS_COLOR: Record<number, string> = {
  1: "#53B332", 2: "#0068B7", 3: "#53B332", 4: "#E60012", 5: "#4A90E2", 6: "#E60012",
  10: "#E60012", 11: "#0068B7", 12: "#53B332", 13: "#F2B70A", 14: "#E60012", 15: "#E60012", 16: "#53B332",
};

function subwayColor(lane: OdsayLane) {
  if (lane.subwayCode != null && SUBWAY_COLOR[lane.subwayCode]) return SUBWAY_COLOR[lane.subwayCode];
  const n = lane.name ?? "";
  if (/신분당/.test(n)) return "#D4003B";
  if (/경의|중앙/.test(n)) return "#77C4A3";
  if (/공항/.test(n)) return "#0090D2";
  return "#0052A4";
}

async function odsayGet(url: string) {
  const res = await fetch(url, {
    headers: { Referer: `${process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000")}/` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ODsay 응답 오류 ${res.status}`);
  const data = await res.json();
  if (data.error) {
    const e = Array.isArray(data.error) ? data.error[0] : data.error;
    throw new Error(`ODsay 오류 ${e?.code ?? ""}: ${e?.message ?? JSON.stringify(e).slice(0, 100)}`);
  }
  return data;
}

/** 도보 구간 좌표: Tmap 보행자 → OSRM. 아주 짧으면 직선 */
async function walkGeometry(from: LatLng, to: LatLng): Promise<{ path: LatLng[]; steps: RouteStep[] }> {
  if (haversine(from, to) < 40) return { path: [from, to], steps: [] };
  try {
    const r = process.env.TMAP_APP_KEY ? await tmapPedestrian(from, to) : await osrmFoot(from, to);
    // start/end 스텝은 상위에서 붙이므로 중간 안내만 가져온다
    return { path: r.path, steps: r.steps.filter((s) => s.turn !== "start" && s.turn !== "end") };
  } catch {
    try {
      const r = await osrmFoot(from, to);
      return { path: r.path, steps: r.steps.filter((s) => s.turn !== "start" && s.turn !== "end") };
    } catch {
      return { path: [from, to], steps: [] };
    }
  }
}

export async function odsayTransit(from: LatLng, to: LatLng): Promise<Route> {
  const apiKey = process.env.ODSAY_API_KEY;
  if (!apiKey) throw new Error("ODSAY_API_KEY가 설정되지 않았어요.");

  const q = new URLSearchParams({ SX: String(from.lng), SY: String(from.lat), EX: String(to.lng), EY: String(to.lat), apiKey });
  const data = (await odsayGet(`${SEARCH}?${q}`)) as { result?: { path?: OdsayPath[] } };
  const p = data.result?.path?.[0];
  if (!p) throw new Error("대중교통 경로를 찾지 못했어요. 거리가 너무 가깝거나 운행 시간이 아닐 수 있어요.");

  // 대중교통 구간 좌표 (subPath 의 대중교통 구간 순서대로 lane 이 온다)
  const laneData = (await odsayGet(`${LANE}?${new URLSearchParams({ mapObject: `0:0@${p.info.mapObj}`, apiKey })}`)) as {
    result?: { lane?: Array<{ section: Array<{ graphPos: Array<{ x: number; y: number }> }> }> };
  };
  const lanes = laneData.result?.lane ?? [];

  const path: LatLng[] = [];
  const steps: RouteStep[] = [];
  const legs: RouteLeg[] = [];
  const pushPath = (pts: LatLng[]) => {
    for (const pt of pts) {
      const last = path[path.length - 1];
      if (!last || last.lat !== pt.lat || last.lng !== pt.lng) path.push(pt);
    }
  };

  steps.push({ description: "출발", distance: 0, lat: from.lat, lng: from.lng, turn: "start", pathIndex: 0 });

  // 도보 구간의 양 끝 좌표는 앞뒤 대중교통 구간의 정류장 좌표로 정한다
  const transitSubs = p.subPath.filter((s) => s.trafficType !== 3);
  let laneIdx = 0;
  let cursor: LatLng = from;

  // 도보 좌표는 병렬로 미리 받아둔다
  const walkJobs = p.subPath.map((sp, i) => {
    if (sp.trafficType !== 3) return null;
    const prev = p.subPath.slice(0, i).reverse().find((s) => s.trafficType !== 3);
    const next = p.subPath.slice(i + 1).find((s) => s.trafficType !== 3);
    const a: LatLng = prev ? { lat: prev.endY!, lng: prev.endX! } : from;
    const b: LatLng = next ? { lat: next.startY!, lng: next.startX! } : to;
    return walkGeometry(a, b);
  });
  const walks = await Promise.all(walkJobs);

  p.subPath.forEach((sp, i) => {
    const pathStart = path.length;
    if (sp.trafficType === 3) {
      const w = walks[i]!;
      if (sp.distance <= 0 && haversine(w.path[0], w.path[w.path.length - 1]) < 5) return; // 환승 제자리 도보
      const base = path.length;
      pushPath(w.path);
      for (const st of w.steps) steps.push({ ...st, turn: "walk", pathIndex: Math.min(base + st.pathIndex, path.length - 1) });
      if (!w.steps.length) {
        const next = p.subPath.slice(i + 1).find((s) => s.trafficType !== 3);
        steps.push({
          description: `${next?.startName ?? "목적지"}까지 도보`,
          distance: sp.distance,
          lat: w.path[0].lat,
          lng: w.path[0].lng,
          turn: "walk",
          pathIndex: Math.max(0, base),
        });
      }
      legs.push({ mode: "walk", from: "", to: "", distance: sp.distance, duration: sp.sectionTime * 60, pathStart, pathEnd: Math.max(pathStart, path.length - 1) });
      cursor = w.path[w.path.length - 1];
    } else {
      const mode = sp.trafficType === 1 ? "subway" : "bus";
      const lane = sp.lane?.[0] ?? {};
      const startPt = { lat: sp.startY!, lng: sp.startX! };
      const endPt = { lat: sp.endY!, lng: sp.endX! };
      const geom = lanes[laneIdx++]?.section.flatMap((s) => s.graphPos.map((g) => ({ lat: g.y, lng: g.x }))) ?? [];
      const idx = Math.max(0, path.length - 1);
      pushPath(geom.length ? [startPt, ...geom, endPt] : [startPt, endPt]);
      const name = mode === "bus" ? lane.busNo : (lane.name ?? "").replace(/^수도권/, "");
      const stops = sp.stationCount ?? (sp.passStopList?.stations.length ? sp.passStopList.stations.length - 1 : undefined);
      steps.push({
        description: `${name ? (mode === "bus" ? `${name}번 버스` : name) : mode === "subway" ? "지하철" : "버스"} 탑승 · ${sp.startName} → ${sp.endName}${stops ? ` (${stops}정거장)` : ""}`,
        distance: sp.distance,
        lat: startPt.lat,
        lng: startPt.lng,
        turn: mode,
        pathIndex: idx,
      });
      legs.push({
        mode,
        name,
        color: mode === "bus" ? (BUS_COLOR[lane.type ?? 0] ?? "#0068B7") : subwayColor(lane),
        from: sp.startName ?? "",
        to: sp.endName ?? "",
        distance: sp.distance,
        duration: sp.sectionTime * 60,
        pathStart,
        pathEnd: Math.max(pathStart, path.length - 1),
        stops,
      });
      cursor = endPt;
    }
  });
  void cursor;

  steps.push({ description: "목적지 도착", distance: 0, lat: to.lat, lng: to.lng, turn: "end", pathIndex: Math.max(0, path.length - 1) });

  return {
    provider: "odsay",
    travel: "transit",
    distance: p.info.totalDistance,
    duration: p.info.totalTime * 60,
    path,
    steps,
    legs,
    fare: p.info.payment,
    transfers: p.info.busTransitCount + p.info.subwayTransitCount,
  };
}
