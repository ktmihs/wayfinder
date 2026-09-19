"use client";

import { useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import RouteRenderer from "@/components/RouteRenderer";
import type { PublicPlace } from "@/lib/places";
import { coordToRegionName, type SearchResult } from "@/lib/kakao";
import { getMode } from "@/lib/modes";

export type Origin = { lat: number; lng: number; label: string };

/**
 * 손님이 보는 화면.
 * 1) 도착지 정보 확인 → 2) 출발지 입력(검색 or 현재 위치) → 3) 관리자가 고른 방식으로 경로 표시
 */
export default function GuestView({ place }: { place: PublicPlace }) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const mode = getMode(place.mode);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("이 브라우저는 위치 기능을 지원하지 않아요.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setOrigin({ lat, lng, label: "현재 위치" });
        setLocating(false);
        // 어디로 잡혔는지 알 수 있게 지역명을 붙여준다
        const region = await coordToRegionName(lat, lng).catch(() => null);
        if (region) setOrigin({ lat, lng, label: `현재 위치 · ${region}` });
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 거부됐어요. 주소를 직접 입력해 주세요."
            : "현재 위치를 가져오지 못했어요. 주소를 직접 입력해 주세요.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function pickAddress(r: SearchResult) {
    setOrigin({ lat: r.lat, lng: r.lng, label: r.placeName ?? r.address });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      {/* 도착지 헤더 */}
      <header className="px-5 pt-6 pb-4">
        <p className="text-xs font-medium text-rose-500">도착지</p>
        <h1 className="mt-1 text-2xl font-bold">{place.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {place.placeName && <span className="font-medium text-neutral-900">{place.placeName} · </span>}
          {place.roadAddress ?? place.address}
        </p>
      </header>

      {/* 출발지 입력 */}
      <section className="px-5 pb-4">
        <label className="block text-sm font-semibold">어디서 출발하세요?</label>
        <div className="mt-2">
          <AddressSearch onSelect={pickAddress} placeholder="출발지 주소 또는 역 이름" autoFocus={!origin} />
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-800 active:bg-neutral-50 disabled:opacity-50"
        >
          <span aria-hidden>📍</span>
          {locating ? "위치 확인 중…" : "현재 위치에서 출발"}
        </button>
        {geoError && <p className="mt-2 text-xs text-rose-600">{geoError}</p>}
        {origin && (
          <p className="mt-2 text-xs text-neutral-500">
            출발: <span className="font-medium text-neutral-800">{origin.label}</span>
          </p>
        )}
      </section>

      {/* 경로 표시 영역 — 관리자가 고른 모드로 렌더링 */}
      <section className="flex-1">
        <RouteRenderer mode={mode.id} place={place} origin={origin} />
      </section>

      {/* 도착 후 안내 */}
      {place.detail && (
        <section className="px-5 py-5">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm font-semibold">도착하면</div>
            <p className="mt-1 text-sm whitespace-pre-line text-neutral-700">{place.detail}</p>
          </div>
        </section>
      )}
    </main>
  );
}
