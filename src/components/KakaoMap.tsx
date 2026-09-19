"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakao } from "@/lib/kakao";
import type { LatLng } from "@/lib/route/types";
import { charSpriteUrl, type Dir, type Vehicle } from "@/lib/charSprite";

export type MapPoint = { lat: number; lng: number; label?: string };

type Props = {
  /** 도착지 (항상 표시) */
  destination: MapPoint;
  /** 출발지 (선택되면 표시 + 두 지점이 모두 보이게 화면 맞춤) */
  origin?: MapPoint | null;
  /** 경로 좌표. 있으면 폴리라인으로 그리고 경로 전체가 보이게 맞춤 */
  path?: LatLng[] | null;
  /** 구간별 스타일 (대중교통). 없으면 path 전체를 도보 스타일로 */
  legs?: Array<{ pathStart: number; pathEnd: number; color?: string; mode: "walk" | "bus" | "subway" | "other" }> | null;
  /** 실시간 내 위치. 파란 점 + 정확도 원 */
  me?: (LatLng & { accuracy: number; heading: number | null }) | null;
  /** true면 내 위치가 바뀔 때마다 지도를 따라 움직인다 */
  follow?: boolean;
  /** 픽셀 캐릭터 (캐릭터 안내 모드). 있으면 내 위치 파란 점 대신 캐릭터를 그린다 */
  character?: (LatLng & { dir: Dir; frame: number; vehicle?: Vehicle }) | null;
  /** 캐릭터 위치에 지도를 맞출지 */
  followCharacter?: boolean;
  className?: string;
};

/**
 * 카카오맵을 띄우고 출발/도착 마커를 그린다.
 * 경로(polyline)는 2단계에서 이 컴포넌트 위에 얹는다.
 */
export default function KakaoMap({ destination, origin, path, legs, me, follow, character, followCharacter, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<Array<{ setMap(map: kakao.maps.Map | null): void }>>([]);
  const meRef = useRef<{ dot: kakao.maps.CustomOverlay; circle: kakao.maps.Circle } | null>(null);
  const charRef = useRef<{ overlay: kakao.maps.CustomOverlay; img: HTMLImageElement; key: string } | null>(null);
  const panningRef = useRef(false);
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
        latlngs.forEach((ll) => bounds.extend(ll));
        // 구간별로: 도보는 파란 점선, 버스/지하철은 노선색 실선. 흰 테두리를 깔아 지도 위에서 잘 보이게
        const segs = legs?.length
          ? legs.map((l) => ({ pts: latlngs.slice(l.pathStart, l.pathEnd + 1), mode: l.mode, color: l.color }))
          : [{ pts: latlngs, mode: "walk" as const, color: undefined }];
        for (const sg of segs) {
          if (sg.pts.length < 2) continue;
          const walk = sg.mode === "walk";
          const color = walk ? "#2563eb" : (sg.color ?? (sg.mode === "subway" ? "#0052a4" : "#3d8f3d"));
          const outline = new k.maps.Polyline({
            path: sg.pts, strokeWeight: walk ? 8 : 10, strokeColor: "#ffffff", strokeOpacity: 0.9, strokeStyle: "solid",
          });
          const line = new k.maps.Polyline({
            path: sg.pts, strokeWeight: walk ? 4 : 6, strokeColor: color, strokeOpacity: 1, strokeStyle: walk && legs?.length ? "shortdash" : "solid",
          });
          outline.setMap(map);
          line.setMap(map);
          overlaysRef.current.push(outline, line);
        }
      }

      if (points.length > 1) {
        map.setBounds(bounds, 60, 60, 60, 60);
      } else {
        map.setCenter(new k.maps.LatLng(destination.lat, destination.lng));
        map.setLevel(4);
      }
    });
    // 객체 identity 가 아니라 좌표 값이 바뀔 때만 다시 그린다.
    // (렌더마다 새 객체가 넘어와도 setBounds 가 반복 호출되어 지도가 튕기지 않도록)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination.lat, destination.lng, destination.label, origin?.lat, origin?.lng, origin?.label, path, legs]);

  // 내 위치 점: 경로/마커와 별도로 관리해서 위치 갱신 때 전체를 다시 그리지 않는다
  useEffect(() => {
    loadKakao().then((k) => {
      const map = mapRef.current;
      if (!map) return;
      if (!me) {
        meRef.current?.dot.setMap(null);
        meRef.current?.circle.setMap(null);
        meRef.current = null;
        return;
      }
      const pos = new k.maps.LatLng(me.lat, me.lng);
      const hideDot = !!character;
      if (!meRef.current) {
        const dot = new k.maps.CustomOverlay({
          position: pos,
          zIndex: 10,
          content: `<div class="relative h-5 w-5">
            <span class="absolute inset-0 animate-ping rounded-full bg-sky-400 opacity-60"></span>
            <span class="absolute inset-0 rounded-full border-[3px] border-white bg-sky-500 shadow"></span>
          </div>`,
        });
        const circle = new k.maps.Circle({
          center: pos, radius: me.accuracy,
          strokeWeight: 1, strokeColor: "#0ea5e9", strokeOpacity: 0.5,
          fillColor: "#38bdf8", fillOpacity: 0.15,
        });
        dot.setMap(hideDot ? null : map);
        circle.setMap(map);
        meRef.current = { dot, circle };
      } else {
        meRef.current.dot.setPosition(pos);
        meRef.current.dot.setMap(hideDot ? null : map);
        meRef.current.circle.setPosition(pos);
        meRef.current.circle.setRadius(me.accuracy);
      }
      if (follow) map.panTo(pos);
    });
  }, [me, follow, character]);

  // 픽셀 캐릭터 오버레이
  useEffect(() => {
    loadKakao().then((k) => {
      const map = mapRef.current;
      if (!map) return;
      if (!character) {
        charRef.current?.overlay.setMap(null);
        charRef.current = null;
        return;
      }
      const pos = new k.maps.LatLng(character.lat, character.lng);
      const key = `${character.vehicle ?? "walk"}:${character.dir}:${character.frame % 2}`;
      if (!charRef.current) {
        // 래퍼 크기를 명시해서 이미지 로드 전에도 앵커가 정확히 계산되게 한다.
        // 스프라이트의 발끝은 16px 중 15px 지점 → 48px 기준 45px. 그 지점을 좌표에 맞춘다.
        const SIZE = 48, FEET = 45;
        const wrap = document.createElement("div");
        wrap.style.cssText = `width:${SIZE}px;height:${FEET}px;position:relative;pointer-events:none;`;
        const img = document.createElement("img");
        img.width = SIZE;
        img.height = SIZE;
        img.style.cssText = "display:block;position:absolute;left:0;top:0;image-rendering:pixelated;filter:drop-shadow(0 3px 2px rgba(0,0,0,.35));";
        img.src = charSpriteUrl(character.dir, character.frame, SIZE, character.vehicle);
        wrap.appendChild(img);
        const overlay = new k.maps.CustomOverlay({ position: pos, content: wrap, xAnchor: 0.5, yAnchor: 1, zIndex: 20 });
        overlay.setMap(map);
        charRef.current = { overlay, img, key };
      } else {
        charRef.current.overlay.setPosition(pos);
        if (charRef.current.key !== key) {
          charRef.current.img.src = charSpriteUrl(character.dir, character.frame, 48, character.vehicle);
          charRef.current.key = key;
        }
      }

      // 따라가기: 매번 중심을 옮기지 않고, 캐릭터가 화면 안쪽 60% 영역을 벗어나려 할 때만 부드럽게 이동
      if (followCharacter && !panningRef.current) {
        const b = map.getBounds();
        const sw = b.getSouthWest(), ne = b.getNorthEast();
        const mLat = (ne.getLat() - sw.getLat()) * 0.2, mLng = (ne.getLng() - sw.getLng()) * 0.2;
        const inside =
          character.lat > sw.getLat() + mLat && character.lat < ne.getLat() - mLat &&
          character.lng > sw.getLng() + mLng && character.lng < ne.getLng() - mLng;
        if (!inside) {
          panningRef.current = true;
          map.panTo(pos);
          setTimeout(() => (panningRef.current = false), 400);
        }
      }
    });
  }, [character, followCharacter]);

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
