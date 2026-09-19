"use client";

import KakaoMap from "@/components/KakaoMap";
import type { PublicPlace } from "@/lib/places";
import type { ModeId } from "@/lib/modes";
import { getMode } from "@/lib/modes";
import type { Origin } from "@/components/GuestView";

type Props = { mode: ModeId; place: PublicPlace; origin: Origin | null };

/**
 * 안내 방식(mode)에 따라 다른 렌더러를 고른다.
 * 지금은 "map"만 구현되어 있고, 나머지는 준비 중 안내 후 지도로 대체한다.
 * 2단계에서 경로 탐색 결과(좌표 배열 + 턴 안내)를 각 렌더러에 공통으로 넘길 예정.
 */
export default function RouteRenderer({ mode, place, origin }: Props) {
  const destination = { lat: place.lat, lng: place.lng, label: place.placeName ?? undefined };
  const info = getMode(mode);

  return (
    <div className="flex h-full flex-col">
      {!info.ready && (
        <div className="mx-5 mb-3 rounded-xl bg-neutral-100 px-4 py-2.5 text-xs text-neutral-600">
          {info.emoji} <b>{info.label}</b> 안내는 준비 중이라 우선 지도로 보여드려요.
        </div>
      )}
      <KakaoMap destination={destination} origin={origin} className="min-h-[55vh] flex-1" />
      {!origin && (
        <p className="px-5 py-3 text-center text-xs text-neutral-500">
          출발지를 입력하면 경로를 안내해 드려요.
        </p>
      )}
    </div>
  );
}
