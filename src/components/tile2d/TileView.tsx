"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Route, LatLng } from "@/lib/route/types";
import { buildWorld, distanceToCellProgress, placeLandmarks, SHEET_COLS } from "@/lib/tile2d/world";
import { findLandmarks, type Landmark } from "@/lib/landmarks";
import { nearestPathIndex } from "@/lib/geo";
import { formatDistance } from "@/lib/format";
import { TURN_ICON } from "@/components/RouteSteps";
import sprites from "@/lib/tile2d/sprites.json";

type Props = {
  route: Route;
  seed: string;
  /** 실시간 안내 중 내 위치. 있으면 캐릭터가 여기 선다 */
  me?: LatLng | null;
  /** 타일시트 경로 (기본 /tiles/tiny-town.png) */
  sheetSrc?: string;
  className?: string;
};

const T = 16;
const SPEED_CELLS = 2; // 초당 셀 = 8m/s (배속 1). 5는 너무 빨라 길을 못 따라간다

// 픽셀 문자열 → 오프스크린 캔버스
function bake(rows: string[]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = T;
  c.height = T;
  const ctx = c.getContext("2d")!;
  const pal = sprites.palette as Record<string, string | null>;
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      const col = pal[ch];
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }),
  );
  return c;
}

function flipX(src: HTMLCanvasElement) {
  const c = document.createElement("canvas");
  c.width = T;
  c.height = T;
  const ctx = c.getContext("2d")!;
  ctx.translate(T, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** 2D 타일 렌더러: 경로를 마을 지도로 그리고 캐릭터가 걸어간다 */
export default function TileView({ route, seed, me, sheetSrc = "/tiles/tiny-town.png", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useMemo(() => buildWorld(route, seed), [route, seed]);
  const [sheet, setSheet] = useState<HTMLImageElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0); // 셀 단위 진행도
  const progressRef = useRef(0);
  const [scale, setScale] = useState(3);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  // 경로 주변 실제 POI (편의점/카페/지하철…) → 약도 이름표
  useEffect(() => {
    let cancelled = false;
    findLandmarks(route.path)
      .then((l) => !cancelled && setLandmarks(l))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [route.path]);
  const marks = useMemo(() => placeLandmarks(world, landmarks), [world, landmarks]);
  const marksRef = useRef(marks);
  marksRef.current = marks;

  // 타일시트 로드
  useEffect(() => {
    const img = new Image();
    img.src = sheetSrc;
    img.onload = () => setSheet(img);
  }, [sheetSrc]);

  const chars = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = sprites.character as Record<string, string[][]>;
    const right = c.right.map(bake);
    return {
      down: c.down.map(bake),
      up: c.up.map(bake),
      right,
      left: right.map(flipX),
      heart: bake(sprites.heart as string[]),
    };
  }, []);

  // 내 위치가 있으면 캐릭터는 내 위치로
  const liveProgress = useMemo(() => {
    if (!me) return null;
    const { index } = nearestPathIndex(route.path, me);
    return distanceToCellProgress(world, world.track.cum[index]);
  }, [me, route.path, world]);

  // 진행 루프
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const maxP = world.cells.length - 1;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (liveProgress != null) {
        progressRef.current = liveProgress;
      } else if (playing) {
        progressRef.current = Math.min(maxP, progressRef.current + dt * SPEED_CELLS * speed);
        if (progressRef.current >= maxP) setPlaying(false);
      }
      setProgress(progressRef.current);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, sheet, chars, playing, speed, liveProgress, scale]);

  // 캔버스 크기: 컨테이너에 맞추고 DPR 반영
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.floor(cv.clientWidth * dpr);
      cv.height = Math.floor(cv.clientHeight * dpr);
    });
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  function charAt(p: number) {
    const i = Math.min(world.cells.length - 2, Math.floor(p));
    const t = p - i;
    const a = world.cells[i], b = world.cells[Math.min(i + 1, world.cells.length - 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : dy < 0 ? "up" : "down";
    return { x: a.x + dx * t, y: a.y + dy * t, dir, frame: Math.floor(p * 3) % 2 };
  }

  function draw() {
    const cv = canvasRef.current;
    if (!cv || !sheet || !chars) return;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = scale * dpr; // 화면 px per tile px
    const TS = T * S;
    ctx.imageSmoothingEnabled = false;
    const W = cv.width, H = cv.height;

    const ch = charAt(progressRef.current);
    // 카메라: 캐릭터 중심, 정수 픽셀로 스냅해서 떨림 방지
    const camX = Math.round(ch.x * TS + TS / 2 - W / 2);
    const camY = Math.round(ch.y * TS + TS / 2 - H / 2);

    const tile = (id: number, x: number, y: number) => {
      const sx = (id % SHEET_COLS) * T, sy = Math.floor(id / SHEET_COLS) * T;
      ctx.drawImage(sheet, sx, sy, T, T, Math.round(x * TS - camX), Math.round(y * TS - camY), TS, TS);
    };

    // 바닥 (보이는 범위만)
    const x0 = Math.floor(camX / TS) - 1, x1 = Math.ceil((camX + W) / TS) + 1;
    const y0 = Math.floor(camY / TS) - 1, y1 = Math.ceil((camY + H) / TS) + 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        tile(world.ground(x, y), x, y);
        if (world.pathSet.has(`${x},${y}`)) tile(43, x, y);
      }
    }

    // 이름표: 타일 위 중앙에 흰 판 + 진한 테두리
    const plate = (text: string, cx: number, topY: number) => {
      const fs = Math.round(10 * dpr);
      ctx.font = `bold ${fs}px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
      const pw = Math.ceil(ctx.measureText(text).width) + 8 * dpr;
      const ph = fs + 6 * dpr;
      const x = Math.round(cx - pw / 2), y = Math.round(topY - ph - 2 * dpr);
      ctx.fillStyle = "#3d2a2a";
      ctx.fillRect(x - dpr, y - dpr, pw + 2 * dpr, ph + 2 * dpr);
      ctx.fillStyle = "#fff8e7";
      ctx.fillRect(x, y, pw, ph);
      ctx.fillStyle = "#3d2a2a";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(text, x + pw / 2, y + ph / 2 + dpr * 0.5);
    };

    // 소품 + 캐릭터를 y 순으로 (앞뒤 겹침 자연스럽게)
    type Item = { z: number; draw: () => void };
    const items: Item[] = [];
    const labels: Array<() => void> = []; // 이름표는 맨 위에
    const LABEL_R = 8; // 캐릭터에서 이 거리(칸) 안의 이름표만 보여준다
    const nearChar = (x: number, y: number) => Math.hypot(x - ch.x, y - ch.y) <= LABEL_R;
    for (const p of world.props) {
      if (p.kind === "block") {
        const h = p.rows.length, w = p.rows[0].length;
        if (p.x + w < x0 || p.x > x1 || p.y + h < y0 || p.y > y1) continue;
        items.push({ z: p.y + h, draw: () => p.rows.forEach((row, j) => row.forEach((id, i) => tile(id, p.x + i, p.y + j))) });
      } else if (p.kind === "tile") {
        if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        items.push({ z: p.y + 1, draw: () => tile(p.id, p.x, p.y) });
      } else if (p.kind === "sign") {
        if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        items.push({ z: p.y + 1, draw: () => tile(83, p.x, p.y) });
        const step = route.steps[p.step];
        const text = step ? (p.step === 0 ? "🚩 출발" : `${TURN_ICON[step.turn]} ${step.description.slice(0, 14)}`) : "";
        if (text && nearChar(p.x, p.y)) labels.push(() => plate(text, p.x * TS - camX + TS / 2, p.y * TS - camY + 2 * S));
      } else if (p.kind === "heart") {
        const bob = Math.sin(performance.now() / 300) * 2;
        items.push({ z: 9999, draw: () => ctx.drawImage(chars.heart, Math.round(p.x * TS - camX), Math.round(p.y * TS - camY + bob * S), TS, TS) });
      }
    }
    for (const m of marksRef.current) {
      if (m.x < x0 || m.x > x1 || m.y < y0 || m.y > y1) continue;
      items.push({ z: m.y + 1, draw: () => tile(83, m.x, m.y) });
      if (nearChar(m.x, m.y)) labels.push(() => plate(m.label, m.x * TS - camX + TS / 2, m.y * TS - camY + 2 * S));
    }
    items.push({
      z: ch.y + 1,
      draw: () => {
        const img = chars[ch.dir as "down" | "up" | "left" | "right"][ch.frame];
        ctx.drawImage(img, Math.round(ch.x * TS - camX), Math.round((ch.y - 0.2) * TS - camY), TS, TS);
      },
    });
    items.sort((a, b) => a.z - b.z).forEach((i) => i.draw());
    labels.forEach((l) => l());
  }

  // 현재 진행도 기준 다음 안내
  const maxP = world.cells.length - 1;
  const distNow = (() => {
    // 셀 진행도 → 경로 거리 (근사: 셀 인덱스에 해당하는 path 점 찾기)
    const p = liveProgress ?? progress;
    let bestI = 0;
    for (let i = 0; i < world.pathToCell.length; i++) if (world.pathToCell[i] <= p) bestI = i;
    return world.track.cum[bestI];
  })();
  let stepIdx = 0;
  world.track.steps.forEach((s, i) => { if (s.at <= distNow + 0.5) stepIdx = i; });
  const next = world.track.steps[Math.min(stepIdx + 1, world.track.steps.length - 1)];
  const arrived = (liveProgress ?? progress) >= maxP - 0.01;

  return (
    <div className={`relative overflow-hidden bg-[#7ec850] ${className ?? ""}`}>
      <canvas ref={canvasRef} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />

      {/* 다음 안내 캡션 (실시간 안내 중엔 상위 배너가 대신한다) */}
      {liveProgress == null && (
      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
        <div className="rounded-xl border-2 border-[#3d2a2a] bg-[#fff8e7] px-3 py-1.5 text-sm font-semibold text-[#3d2a2a] shadow-[3px_3px_0_#3d2a2a]">
          {arrived ? "🏠 도착!" : `${TURN_ICON[next.turn]} ${next.description}`}
          {!arrived && <span className="ml-2 font-normal opacity-70">{formatDistance(Math.max(0, next.at - distNow))}</span>}
        </div>
      </div>
      )}

      {/* 컨트롤 */}
      {liveProgress == null && (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl border-2 border-[#3d2a2a] bg-[#fff8e7] px-2 py-1.5 shadow-[3px_3px_0_#3d2a2a]">
          <button
            type="button"
            onClick={() => {
              if (progressRef.current >= maxP) progressRef.current = 0;
              setPlaying((p) => !p);
            }}
            className="rounded-lg px-2 py-1 text-base"
            aria-label={playing ? "일시정지" : "재생"}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <input
            type="range"
            min={0}
            max={maxP}
            step={0.01}
            value={progress}
            onChange={(e) => {
              progressRef.current = Number(e.target.value);
              setProgress(progressRef.current);
              setPlaying(false);
            }}
            className="min-w-0 flex-1 accent-[#e5484d]"
            aria-label="진행도"
          />
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
            className="rounded-lg px-2 py-1 text-xs font-bold text-[#3d2a2a]"
          >
            ×{speed}
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => (s === 3 ? 2 : s === 2 ? 4 : 3))}
            className="rounded-lg px-2 py-1 text-xs font-bold text-[#3d2a2a]"
            aria-label="확대 비율"
          >
            🔍{scale}
          </button>
        </div>
      )}
      {liveProgress != null && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <span className="rounded-full border-2 border-[#3d2a2a] bg-[#fff8e7] px-3 py-1 text-xs font-semibold text-[#3d2a2a]">
            📡 내 위치를 따라가는 중
          </span>
        </div>
      )}
    </div>
  );
}
