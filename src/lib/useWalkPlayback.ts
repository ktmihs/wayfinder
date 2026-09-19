"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "@/lib/route/types";
import { makeWalker } from "@/lib/walk";
import { dirFromBearing, type Dir } from "@/lib/charSprite";

export type CharacterPose = { lat: number; lng: number; dir: Dir; frame: number };

/**
 * 경로를 따라 캐릭터를 자동으로 걷게 하는 재생기.
 * 전체 경로를 약 40초에 걷도록 속도를 잡고, 배속으로 조절한다.
 */
export function useWalkPlayback(route: Route | null, enabled: boolean) {
  const walker = useMemo(() => (route ? makeWalker(route.path) : null), [route]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [dist, setDist] = useState(0);
  const distRef = useRef(0);

  // 경로가 바뀌면 처음부터
  useEffect(() => {
    distRef.current = 0;
    setDist(0);
    setPlaying(true);
  }, [walker]);

  useEffect(() => {
    if (!enabled || !walker || !playing) return;
    const base = Math.min(25, Math.max(4, walker.total / 40)); // m/s
    let raf = 0;
    let last = performance.now();
    let lastRender = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      distRef.current = Math.min(walker.total, distRef.current + dt * base * speed);
      // 지도 오버레이/React 갱신은 초당 20번이면 충분하다 (매 프레임 갱신하면 지도가 버벅인다)
      if (now - lastRender > 50 || distRef.current >= walker.total) {
        lastRender = now;
        setDist(distRef.current);
      }
      if (distRef.current >= walker.total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, walker, playing, speed]);

  const pose: CharacterPose | null = useMemo(() => {
    if (!walker) return null;
    const p = walker.at(dist);
    return { lat: p.lat, lng: p.lng, dir: dirFromBearing(p.bearing), frame: Math.floor(dist / 3) % 2 };
  }, [walker, dist]);

  return {
    pose,
    playing,
    speed,
    dist,
    total: walker?.total ?? 0,
    arrived: !!walker && dist >= walker.total - 0.01,
    /** route.path 인덱스 → 누적 거리(m) */
    cumAt: (index: number) => walker?.cum[Math.min(index, (walker?.cum.length ?? 1) - 1)] ?? 0,
    toggle() {
      if (walker && distRef.current >= walker.total) {
        distRef.current = 0;
        setDist(0);
      }
      setPlaying((p) => !p);
    },
    seek(d: number) {
      distRef.current = d;
      setDist(d);
      setPlaying(false);
    },
    cycleSpeed() {
      setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));
    },
  };
}
