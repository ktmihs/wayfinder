import type { Route } from "@/lib/route/types";
import type { Landmark } from "@/lib/landmarks";
import { LANDMARK_EMOJI, shortName } from "@/lib/landmarks";
import { buildTrack, hashString, mulberry32, type Track } from "./geometry";

// Kenney Tiny Town (public/tiles/tiny-town.png, 12x11 타일, 16px) 인덱스
export const TILE = {
  grass: 0, grassTuft: 1, grassFlower: 2,
  path: 43,
  treeYellowTop: 3, treeYellowBottom: 15, treeGreenTop: 4, treeGreenBottom: 16,
  bush: 5, treeSmallYellow: 27, treeSmallGreen: 28, sprout: 17, mushroom: 29,
  forestGreen: [[7, 8], [19, 20], [31, 32]],
  forestYellow: [[9, 10], [21, 22], [33, 34]],
  fenceL: 80, fenceM: 81, fenceR: 82, sign: 83,
  houseGrey: [[48, 49, 50], [60, 61, 62], [76, 78, 79], [88, 89, 88]],
  houseRed: [[52, 53, 54], [64, 65, 66], [72, 74, 75], [84, 85, 84]],
} as const;

export const TILE_M = 4; // 타일 하나 = 4m
export const SHEET_COLS = 12;

export type Cell = { x: number; y: number };
export type Prop =
  | { kind: "tile"; x: number; y: number; id: number }
  | { kind: "block"; x: number; y: number; rows: readonly (readonly number[])[] }
  | { kind: "heart"; x: number; y: number }
  | { kind: "sign"; x: number; y: number; step: number };

export type World = {
  track: Track;
  /** 캐릭터가 걷는 격자 셀 순서 */
  cells: Cell[];
  /** route.path[i] 가 몇 번째 셀인지 */
  pathToCell: number[];
  pathSet: Set<string>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  ground: (x: number, y: number) => number;
  props: Prop[];
  destHouse: Cell | null;
  /** 소품이 차지한 셀 (랜드마크 배치 시 회피용) */
  occupied: Set<string>;
};

const key = (x: number, y: number) => `${x},${y}`;

/** 경로를 격자에 스냅하고 주변에 마을을 배치한다 */
export function buildWorld(route: Route, seed: string): World {
  const track = buildTrack(route);
  const rnd = mulberry32(hashString(seed));

  // 1) 경로 → 셀 (연속 셀 사이는 L자로 잇는다)
  const cells: Cell[] = [];
  const pathSet = new Set<string>();
  const pathToCell: number[] = [];
  const push = (x: number, y: number) => {
    const k = key(x, y);
    if (!pathSet.has(k)) {
      pathSet.add(k);
      cells.push({ x, y });
    }
  };
  let prev: Cell | null = null;
  let flip = false;
  for (const p of track.pts) {
    const c = { x: Math.round(p.x / TILE_M), y: Math.round(p.y / TILE_M) };
    if (prev) {
      let { x, y } = prev;
      const sx = Math.sign(c.x - x), sy = Math.sign(c.y - y);
      // 대각선 이동은 x/y 를 번갈아 가며 계단식으로
      while (x !== c.x || y !== c.y) {
        if (x !== c.x && (y === c.y || flip)) x += sx;
        else y += sy;
        flip = !flip;
        push(x, y);
      }
    } else push(c.x, c.y);
    pathToCell.push(cells.length - 1);
    prev = c;
  }

  // 2) 경계
  const M = 14;
  const xs = cells.map((c) => c.x), ys = cells.map((c) => c.y);
  const bounds = {
    minX: Math.min(...xs) - M, maxX: Math.max(...xs) + M,
    minY: Math.min(...ys) - M, maxY: Math.max(...ys) + M,
  };

  // 3) 점유 관리 (경로 + 1칸 버퍼는 비워둔다)
  const occupied = new Set<string>();
  for (const c of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) occupied.add(key(c.x + dx, c.y + dy));
  const free = (x: number, y: number, w = 1, h = 1) => {
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (occupied.has(key(x + i, y + j))) return false;
    return true;
  };
  const take = (x: number, y: number, w = 1, h = 1) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) occupied.add(key(x + i, y + j));
  };
  const props: Prop[] = [];

  // 4) 도착 집: 마지막 셀 위쪽에 3x4, 안 되면 다른 방향
  const last = cells[cells.length - 1];
  let destHouse: Cell | null = null;
  for (const [ox, oy] of [[-1, -4], [1, -1], [-3, -1], [-1, 1]] as const) {
    const hx = last.x + ox, hy = last.y + oy;
    // 집 발자국은 경로 버퍼와 겹쳐도 되지만 경로 자체와는 안 겹쳐야 한다
    let ok = true;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) if (pathSet.has(key(hx + i, hy + j))) ok = false;
    if (!ok) continue;
    destHouse = { x: hx, y: hy };
    props.push({ kind: "block", x: hx, y: hy, rows: TILE.houseRed });
    props.push({ kind: "heart", x: hx + 1, y: hy - 1 });
    take(hx, hy, 3, 4);
    break;
  }

  // 5) 턴 지점 표지판 (경로 옆 빈 칸에)
  route.steps.forEach((s, i) => {
    if (s.turn === "start" || s.turn === "end") return;
    const c = cells[pathToCell[Math.min(s.pathIndex, pathToCell.length - 1)]];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = c.x + dx, y = c.y + dy;
      if (!pathSet.has(key(x, y)) && !occupied.has(key(x, y) + "!")) {
        // 표지판은 버퍼 칸에 놓아도 된다 (경로 바로 옆)
        props.push({ kind: "sign", x, y, step: i });
        occupied.add(key(x, y) + "!");
        break;
      }
    }
  });
  // 출발 표지판
  props.push({ kind: "sign", x: cells[0].x - 1, y: cells[0].y, step: 0 });

  // 6) 집: 경로를 따라 25칸마다 옆으로 3~6칸 떨어진 곳
  for (let i = 12; i < cells.length; i += 40) {
    const c = cells[i];
    const n = cells[Math.min(i + 1, cells.length - 1)];
    const dx = n.x - c.x, dy = n.y - c.y;
    const side = rnd() < 0.5 ? 1 : -1;
    const off = 3 + Math.floor(rnd() * 4);
    const hx = c.x + (-dy) * off * side - 1, hy = c.y + dx * off * side - 2;
    if (free(hx, hy, 3, 4)) {
      props.push({ kind: "block", x: hx, y: hy, rows: rnd() < 0.5 ? TILE.houseGrey : TILE.houseRed });
      take(hx, hy, 3, 4);
      // 집 앞 울타리 가끔
      if (rnd() < 0.3 && free(hx, hy + 5, 3, 1)) {
        props.push({ kind: "tile", x: hx, y: hy + 5, id: TILE.fenceL });
        props.push({ kind: "tile", x: hx + 1, y: hy + 5, id: TILE.fenceM });
        props.push({ kind: "tile", x: hx + 2, y: hy + 5, id: TILE.fenceR });
        take(hx, hy + 5, 3, 1);
      }
    }
  }

  // 7) 숲 덩어리 (경로에서 좀 떨어진 곳) + 나무/덤불 흩뿌리기
  const W = bounds.maxX - bounds.minX, H = bounds.maxY - bounds.minY;
  const forests = Math.floor((W * H) / 600);
  for (let i = 0; i < forests; i++) {
    const x = bounds.minX + Math.floor(rnd() * W), y = bounds.minY + Math.floor(rnd() * H);
    if (free(x, y, 2, 3)) {
      props.push({ kind: "block", x, y, rows: rnd() < 0.75 ? TILE.forestGreen : TILE.forestYellow });
      take(x, y, 2, 3);
    }
  }
  const nearPath = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (pathSet.has(key(x + dx, y + dy))) return true;
    return false;
  };
  const singles = Math.floor((W * H) / 90);
  for (let i = 0; i < singles; i++) {
    const x = bounds.minX + Math.floor(rnd() * W), y = bounds.minY + Math.floor(rnd() * H);
    const r = rnd();
    // 경로에서 3칸 이내는 비워서 길이 잘 보이게
    if (nearPath(x, y, 3)) continue;
    if (r < 0.45 && free(x, y, 1, 2)) {
      const green = rnd() < 0.75;
      props.push({ kind: "block", x, y, rows: green ? [[TILE.treeGreenTop], [TILE.treeGreenBottom]] : [[TILE.treeYellowTop], [TILE.treeYellowBottom]] });
      take(x, y, 1, 2);
    } else if (free(x, y)) {
      const id = r < 0.6 ? TILE.bush : r < 0.75 ? TILE.treeSmallGreen : r < 0.85 ? TILE.treeSmallYellow : r < 0.93 ? TILE.sprout : TILE.mushroom;
      props.push({ kind: "tile", x, y, id });
      take(x, y);
    }
  }

  // 8) 바닥: 결정적 해시로 잔디 변형
  const ground = (x: number, y: number) => {
    const h = hashString(`${seed}:${x}:${y}`) % 100;
    return h < 2 ? TILE.grassFlower : h < 8 ? TILE.grassTuft : TILE.grass;
  };

  return { track, cells, pathToCell, pathSet, bounds, ground, props, destHouse, occupied };
}

export type LandmarkMark = { x: number; y: number; label: string; kind: Landmark["kind"] };

/**
 * 실제 POI 를 경로 바로 옆 칸에 이름표로 놓는다. (약도의 "GS25 끼고 우회전" 역할)
 * 경로에서 어느 쪽에 있는지(좌/우)를 유지해서 방향감이 맞게.
 */
export function placeLandmarks(world: World, landmarks: Landmark[]): LandmarkMark[] {
  const used = new Set<string>(
    world.props.filter((p) => p.kind === "sign").map((p) => key(p.x, p.y)),
  );
  const out: LandmarkMark[] = [];
  const { pts } = world.track;

  for (const lm of landmarks) {
    const p = world.track.project(lm);
    // 가장 가까운 경로 점
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y);
      if (d < bd) { bd = d; bi = i; }
    }
    const ci = world.pathToCell[bi];
    const c = world.cells[ci];
    const n = world.cells[Math.min(ci + 1, world.cells.length - 1)];
    const pr = world.cells[Math.max(ci - 1, 0)];
    const dx = Math.sign(n.x - pr.x), dy = Math.sign(n.y - pr.y);
    // 진행 방향 기준 POI 가 왼쪽인지 오른쪽인지 (외적 부호)
    const vx = p.x - pts[bi].x, vy = p.y - pts[bi].y;
    const cross = dx * vy - dy * vx;
    const side = cross >= 0 ? 1 : -1;
    const nx = -dy * side, ny = dx * side; // 수직 방향 (둘 다 0이면 아래쪽으로)
    const cand: Cell[] = [];
    for (const off of [1, 2]) for (const along of [0, 1, -1, 2, -2]) {
      cand.push({ x: c.x + (nx || 0) * off + dx * along, y: c.y + (ny || (nx ? 0 : 1)) * off + dy * along });
    }
    const spot = cand.find((q) => {
      const k = key(q.x, q.y);
      return !world.pathSet.has(k) && !used.has(k) && !world.occupied.has(k + "!") && !isBlockCell(world, q);
    });
    if (!spot) continue;
    used.add(key(spot.x, spot.y));
    out.push({ x: spot.x, y: spot.y, label: `${LANDMARK_EMOJI[lm.kind]} ${shortName(lm.name)}`, kind: lm.kind });
  }
  return out;
}

/** 집/숲 같은 다중 타일 소품 위인지 */
function isBlockCell(world: World, c: Cell) {
  return world.props.some(
    (p) => p.kind === "block" && c.x >= p.x && c.x < p.x + p.rows[0].length && c.y >= p.y && c.y < p.y + p.rows.length,
  );
}

/** 경로 누적 거리(m) → 셀 진행도 (셀 인덱스, 소수) */
export function distanceToCellProgress(world: World, d: number) {
  const { cum } = world.track;
  const dd = Math.max(0, Math.min(world.track.total, d));
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < dd) i++;
  const seg = cum[i + 1] - cum[i] || 1;
  const t = Math.max(0, Math.min(1, (dd - cum[i]) / seg));
  const a = world.pathToCell[i], b = world.pathToCell[Math.min(i + 1, world.pathToCell.length - 1)];
  return a + (b - a) * t;
}
