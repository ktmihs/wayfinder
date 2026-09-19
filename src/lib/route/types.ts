// 모든 안내 방식(지도/2D/3D/영상)이 공통으로 소비하는 경로 데이터.
// 렌더러는 이 형태만 알면 되고, 어느 API에서 왔는지는 provider 필드로만 구분한다.

export type LatLng = { lat: number; lng: number };

export type RouteStep = {
  /** "우회전 후 120m 직진" 같은 안내 문구 */
  description: string;
  /** 이 안내 지점에서 다음 지점까지 거리(m) */
  distance: number;
  /** 안내 지점 좌표 */
  lat: number;
  lng: number;
  /** 화살표 아이콘 선택용 */
  turn: TurnKind;
  /** path 배열에서 이 지점의 인덱스 (캐릭터 이동 등에 사용) */
  pathIndex: number;
};

export type TurnKind =
  | "start"
  | "end"
  | "straight"
  | "left"
  | "right"
  | "slight-left"
  | "slight-right"
  | "sharp-left"
  | "sharp-right"
  | "uturn"
  | "crosswalk"
  | "stairs"
  | "overpass"
  | "underpass"
  | "elevator"
  | "walk"
  | "bus"
  | "subway"
  | "unknown";

export type TravelMode = "walk" | "transit";

/** 대중교통 경로의 구간. path 의 [pathStart, pathEnd] 범위를 차지한다 */
export type RouteLeg = {
  mode: "walk" | "bus" | "subway" | "other";
  /** 노선명: "2호선", "146" */
  name?: string;
  /** 노선 색 (#rrggbb) */
  color?: string;
  from: string;
  to: string;
  distance: number;
  duration: number;
  pathStart: number;
  pathEnd: number;
  /** 정거장 수 (대중교통 구간) */
  stops?: number;
};

export type Route = {
  provider: "tmap" | "osrm" | "odsay";
  travel: TravelMode;
  /** 총 거리(m) */
  distance: number;
  /** 총 소요 시간(초) */
  duration: number;
  /** 경로 전체 좌표. 폴리라인/캐릭터 이동에 사용 */
  path: LatLng[];
  steps: RouteStep[];
  /** 대중교통일 때만 */
  legs?: RouteLeg[];
  fare?: number;
  transfers?: number;
  /** 대중교통 대안 경로 요약. 선택하면 /api/route?alt=index 로 다시 받는다 */
  alternatives?: RouteAlternative[];
  /** 이 경로가 alternatives 중 몇 번째인지 */
  altIndex?: number;
};

export type RouteAlternative = {
  index: number;
  duration: number;
  fare?: number;
  transfers: number;
  /** 대중교통 구간만 (도보 제외) */
  rides: Array<{ mode: "bus" | "subway" | "other"; name?: string; color?: string }>;
};

export type RouteProvider = (from: LatLng, to: LatLng) => Promise<Route>;
