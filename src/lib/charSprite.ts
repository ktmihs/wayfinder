"use client";

import sprites from "@/lib/sprites.json";

export type Dir = "down" | "up" | "left" | "right";
export type Vehicle = "bus" | "subway";

const cache = new Map<string, string>();

/**
 * 픽셀 캐릭터(또는 탑승 중인 버스/지하철) 한 프레임을 data URL 로.
 * 차량 스프라이트는 오른쪽을 보는 옆모습 하나뿐이라 왼쪽으로 갈 때만 뒤집는다.
 */
export function charSpriteUrl(dir: Dir, frame: number, px = 48, vehicle?: Vehicle): string {
  const key = `${vehicle ?? "walk"}:${dir}:${frame % 2}:${px}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const c = sprites.character as Record<string, string[][]>;
  const v = sprites.vehicle as Record<Vehicle, string[][]>;
  const rows = vehicle ? v[vehicle][frame % 2] : (dir === "left" ? c.right : c[dir])[frame % 2];
  const flip = vehicle ? dir === "left" : dir === "left";
  const pal = sprites.palette as Record<string, string | null>;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const s = px / 16;
  if (flip) {
    ctx.translate(px, 0);
    ctx.scale(-1, 1);
  }
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      const col = pal[ch];
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x * s, y * s, s, s);
      }
    }),
  );
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

/** 이동 방향(방위각, 0=북) → 스프라이트 방향 */
export function dirFromBearing(bearingDeg: number): Dir {
  const b = ((bearingDeg % 360) + 360) % 360;
  if (b >= 45 && b < 135) return "right";
  if (b >= 135 && b < 225) return "down";
  if (b >= 225 && b < 315) return "left";
  return "up";
}
