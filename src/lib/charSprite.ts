"use client";

import sprites from "@/lib/tile2d/sprites.json";

export type Dir = "down" | "up" | "left" | "right";

const cache = new Map<string, string>();

/** 픽셀 캐릭터 한 프레임을 data URL 로 (지도 오버레이 <img> 에 쓴다) */
export function charSpriteUrl(dir: Dir, frame: number, px = 48): string {
  const key = `${dir}:${frame}:${px}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const c = sprites.character as Record<string, string[][]>;
  const rows = (dir === "left" ? c.right : c[dir])[frame % 2];
  const pal = sprites.palette as Record<string, string | null>;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const s = px / 16;
  if (dir === "left") {
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
