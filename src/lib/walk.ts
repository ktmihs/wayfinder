"use client";

import { distanceM } from "@/lib/geo";
import type { LatLng } from "@/lib/route/types";

/** 위경도 경로의 누적 거리와, 거리 → 위치/방위 보간 */
export function makeWalker(path: LatLng[]) {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + distanceM(path[i - 1], path[i]));
  const total = cum[cum.length - 1];

  function at(d: number): LatLng & { bearing: number; index: number } {
    const dd = Math.max(0, Math.min(total, d));
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < dd) i++;
    const a = path[i], b = path[Math.min(i + 1, path.length - 1)];
    const seg = cum[i + 1] - cum[i] || 1;
    const t = Math.max(0, Math.min(1, (dd - cum[i]) / seg));
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, bearing: bearing(a, b), index: i };
  }

  return { cum, total, at };
}

export function bearing(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
