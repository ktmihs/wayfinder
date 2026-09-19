"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakao } from "@/lib/kakao";
import type { LatLng } from "@/lib/route/types";

export type MapPoint = { lat: number; lng: number; label?: string };

type Props = {
  /** 도착지 (항상 표시) */
  destination: MapPoint;
  /** 출발지 (선택되면 표시 + 두 지점이 모두 보이게 화면 맞춤) */
  origin?: MapPoint | null;
  /** 경로 좌표. 있으면 폴리라인으로 그리고 경로 전체가 보이게 맞춤 */
  path?: LatLng[] | null;
  className?: string;
};

/**
 * 카카오맵을 띄우고 출발/도착 마커를 그린다.
 * 경로(polyline)는 2단계에서 이 컴포넌트 위에 얹는다.
 */
export default function KakaoMap({ destination, origin, path, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<Array<{ setMap(map: kakao.maps.Map | null): void }>>([]);
  const [error, setError] = useState<string | null>(null);

  // 최초 1회: 지도 생성
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((k) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new k.maps.Map(containerRef.current, {
          center: new k.maps.LatLng(destination.lat, destination.lng),
          level: 4,
        });
        // 레이아웃이 아직 안 잡힌 상태에서 생성됐을 수 있으니 한 프레임 뒤에 크기 재계산
        requestAnimationFrame(() => mapRef.current?.relayout());
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // 지도는 한 번만 만들고, 이후 좌표 변화는 아래 effect에서 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 좌표가 바뀔 때마다: 마커 다시 그리기 + 화면 맞춤
  useEffect(() => {
    loadKakao().then((k) => {
      const map = mapRef.current;
      if (!map) return;

      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];

      const points: Array<MapPoint & { kind: "origin" | "dest" }> = [
        { ...destination, kind: "dest" },
      ];
      if (origin) points.unshift({ ...origin, kind: "origin" });

      const bounds = new k.maps.LatLngBounds();
      for (const p of points) {
        const pos = new k.maps.LatLng(p.lat, p.lng);
        bounds.extend(pos);

        const marker = new k.maps.Marker({ position: pos, map });
        overlaysRef.current.push(marker);

        const label = new k.maps.CustomOverlay({
          position: pos,
          yAnchor: 2.4,
          content: `<div class="rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow ${
            p.kind === "dest" ? "bg-rose-500" : "bg-sky-600"
          }">${p.kind === "dest" ? "도착" : "출발"}${p.label ? ` · ${escapeHtml(p.label)}` : ""}</div>`,
        });
        label.setMap(map);
        overlaysRef.current.push(label);
      }

      if (path && path.length > 1) {
        const latlngs = path.map((p) => new k.maps.LatLng(p.lat, p.lng));
        // 흰 테두리 + 파란 선, 두 겹으로 그려서 지도 위에서 잘 보이게
        const outline = new k.maps.Polyline({
          path: latlngs, strokeWeight: 9, strokeColor: "#ffffff", strokeOpacity: 0.9, strokeStyle: "solid",
        });
        const line = new k.maps.Polyline({
          path: latlngs, strokeWeight: 5, strokeColor: "#2563eb", strokeOpacity: 1, strokeStyle: "solid",
        });
        outline.setMap(map);
        line.setMap(map);
        overlaysRef.current.push(outline, line);
        latlngs.forEach((ll) => bounds.extend(ll));
      }

      if (points.length > 1) {
        map.setBounds(bounds, 60, 60, 60, 60);
      } else {
        map.setCenter(new k.maps.LatLng(destination.lat, destination.lng));
        map.setLevel(4);
      }
    });
  }, [destination, origin, path]);

  // 모바일에서 화면 회전/주소창 변화로 컨테이너 크기가 바뀌면 relayout
  useEffect(() => {
    const onResize = () => mapRef.current?.relayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className ?? ""}`}>
      {/* absolute로 채워야 부모가 min-height만 있어도 높이가 0이 되지 않는다 */}
      <div ref={containerRef} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-neutral-600">
          {error}
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
