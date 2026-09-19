"use client";

import KakaoMap from "@/components/KakaoMap";
import RouteSteps from "@/components/RouteSteps";
import { useRoute } from "@/lib/route/useRoute";
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
  const { status, route, error } = useRoute(origin, destination);

  return (
    <div className="flex h-full flex-col">
      {!info.ready && (
        <div className="mx-5 mb-3 rounded-xl bg-neutral-100 px-4 py-2.5 text-xs text-neutral-600">
          {info.emoji} <b>{info.label}</b> 안내는 준비 중이라 우선 지도로 보여드려요.
        </div>
      )}

      <div className="relative">
        <KakaoMap
          destination={destination}
          origin={origin}
          path={route?.path}
          className={origin ? "h-[45vh]" : "h-[55vh]"}
        />
        {status === "loading" && (
          <div className="absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow">
              경로 찾는 중…
            </span>
          </div>
        )}
      </div>

      {!origin && (
        <p className="px-5 py-3 text-center text-xs text-neutral-500">
          출발지를 입력하면 경로를 안내해 드려요.
        </p>
      )}
      {status === "error" && (
        <p className="mx-5 my-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}
      {route && <RouteSteps route={route} />}
    </div>
  );
}
