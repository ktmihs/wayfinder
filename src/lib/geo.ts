"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/route/types";

export type LivePosition = LatLng & { accuracy: number; heading: number | null; at: number };

/**
 * 실시간 위치 추적. enabled 동안 watchPosition 으로 계속 갱신하고,
 * 화면이 꺼지지 않게 Wake Lock 도 잡는다 (지원 브라우저에서만).
 */
export function useLiveLocation(enabled: boolean) {
  const [pos, setPos] = useState<LivePosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPos(null);
      setError(null);
      return;
    }
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 기능을 지원하지 않아요.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
          at: p.timestamp,
        });
      },
      (e) => {
        setError(
          e.code === e.PERMISSION_DENIED
            ? "위치 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요."
            : "위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );

    // 안내 중 화면 꺼짐 방지 (iOS 16.4+, Chrome). 실패해도 무시.
    const requestLock = async () => {
      try {
        wakeLock.current = await navigator.wakeLock?.request("screen");
      } catch {}
    };
    requestLock();
    // 탭 전환 후 돌아오면 락이 풀리므로 다시 잡는다
    const onVisible = () => document.visibilityState === "visible" && requestLock();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.geolocation.clearWatch(id);
      document.removeEventListener("visibilitychange", onVisible);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [enabled]);

  return { pos, error };
}

/** 두 좌표 사이 거리(m) */
export function distanceM(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** path 에서 pos 와 가장 가까운 점의 인덱스와 거리 */
export function nearestPathIndex(path: LatLng[], pos: LatLng) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = distanceM(path[i], pos);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { index: best, distance: bestD };
}

/** path[from] 부터 끝까지의 길이(m) */
export function remainingDistance(path: LatLng[], from: number) {
  let sum = 0;
  for (let i = Math.max(0, from); i < path.length - 1; i++) sum += distanceM(path[i], path[i + 1]);
  return sum;
}
