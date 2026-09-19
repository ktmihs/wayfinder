import type { LatLng, Route } from "@/lib/route/types";

export type XY = { x: number; y: number };

/**
 * 위경도 → 경로 중심 기준 미터 평면. y는 캔버스처럼 아래가 +.
 * 수 km 이내에서는 이 단순 투영으로 충분하다.
 */
export function makeProjector(path: LatLng[]) {
  const lat0 = path.reduce((s, p) => s + p.lat, 0) / path.length;
  const lng0 = path.reduce((s, p) => s + p.lng, 0) / path.length;
  const kx = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110_540;
  return (p: LatLng): XY => ({ x: (p.lng - lng0) * kx, y: -(p.lat - lat0) * ky });
}

/** 경로를 미터 평면 좌표 + 누적 거리로 변환 */
export function buildTrack(route: Route) {
  const project = makeProjector(route.path);
  const pts = route.path.map(project);
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = cum[cum.length - 1];
  const steps = route.steps.map((s) => ({
    ...s,
    xy: pts[Math.min(s.pathIndex, pts.length - 1)],
    at: cum[Math.min(s.pathIndex, cum.length - 1)],
  }));
  const bounds = pts.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
      minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  return { pts, cum, total, steps, bounds, project };
}

export type Track = ReturnType<typeof buildTrack>;

/** 누적 거리 d 지점의 좌표와 진행 방향 */
export function pointAt(track: Track, d: number): XY & { dir: XY; index: number } {
  const { pts, cum } = track;
  const dd = Math.max(0, Math.min(track.total, d));
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < dd) i++;
  const a = pts[i];
  const b = pts[Math.min(i + 1, pts.length - 1)];
  const seg = cum[i + 1] - cum[i] || 1;
  const t = Math.max(0, Math.min(1, (dd - cum[i]) / seg));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * t, y: a.y + dy * t, dir: { x: dx / len, y: dy / len }, index: i };
}

/** 점에서 폴리라인까지 최단 거리(m) */
export function distToTrack(track: Track, p: XY) {
  let best = Infinity;
  const { pts } = track;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
  }
  return best;
}

/** 결정적 난수 (같은 seed → 같은 동네) */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Building = { x: number; y: number; w: number; h: number; color: string; kind: "building" | "tree" };

const PALETTE = ["#fca5a5", "#fdba74", "#fde68a", "#bef264", "#a5f3fc", "#c4b5fd", "#f9a8d4", "#d6d3d1", "#fbcfe8", "#99f6e4"];

/**
 * 도로 양옆에 건물/나무를 절차 생성. 도로와 겹치지 않고 서로 겹치지 않게.
 * 단위는 모두 미터.
 */
export function generateTown(track: Track, seed: number, roadHalf: number): Building[] {
  const rnd = mulberry32(seed);
  const out: Building[] = [];
  const overlaps = (b: Building) =>
    out.some((o) => b.x < o.x + o.w + 2 && b.x + b.w + 2 > o.x && b.y < o.y + o.h + 2 && b.y + b.h + 2 > o.y);

  for (let d = 6; d < track.total; d += 12) {
    const p = pointAt(track, d);
    const nx = -p.dir.y, ny = p.dir.x; // 진행 방향의 수직
    for (const side of [-1, 1]) {
      if (rnd() < 0.25) continue; // 빈터
      const isTree = rnd() < 0.3;
      const w = isTree ? 5 : 8 + rnd() * 12;
      const h = isTree ? 5 : 8 + rnd() * 12;
      const off = roadHalf + 4 + rnd() * 10 + Math.max(w, h) / 2;
      const cx = p.x + nx * off * side;
      const cy = p.y + ny * off * side;
      const b: Building = {
        x: cx - w / 2, y: cy - h / 2, w, h,
        color: PALETTE[Math.floor(rnd() * PALETTE.length)],
        kind: isTree ? "tree" : "building",
      };
      // 건물 모서리가 도로를 침범하면 버린다
      const corners: XY[] = [
        { x: b.x, y: b.y }, { x: b.x + w, y: b.y }, { x: b.x, y: b.y + h }, { x: b.x + w, y: b.y + h },
      ];
      if (corners.some((c) => distToTrack(track, c) < roadHalf + 2)) continue;
      if (overlaps(b)) continue;
      out.push(b);
    }
  }
  return out;
}
