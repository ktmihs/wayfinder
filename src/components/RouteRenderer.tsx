"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import KakaoMap from "@/components/KakaoMap";
import RouteSteps, { TURN_ICON } from "@/components/RouteSteps";
import { useRoute } from "@/lib/route/useRoute";
import { distanceM, nearestPathIndex, remainingDistance, useLiveLocation } from "@/lib/geo";
import { formatDistance } from "@/lib/format";
import type { PublicPlace } from "@/lib/places";
import type { ModeId } from "@/lib/modes";
import { getMode } from "@/lib/modes";
import type { Origin } from "@/components/GuestView";
import type { LatLng } from "@/lib/route/types";

type Props = {
  mode: ModeId;
  place: PublicPlace;
  origin: Origin | null;
  /** 경로 이탈 시 현재 위치를 새 출발지로 요청 */
  onReroute: (pos: LatLng) => void;
};

const ARRIVE_M = 25; // 도착지에서 이 거리 안이면 도착 처리
const OFF_ROUTE_M = 60; // 경로에서 이만큼 벗어나면 이탈로 판단
const OFF_ROUTE_ASK_MS = 10_000; // GPS 튐을 걸러내기 위해 이만큼 계속 벗어나 있어야 물어본다

/**
 * 안내 방식(mode)에 따라 다른 렌더러를 고른다.
 * 지금은 "map"만 구현되어 있고, 나머지는 준비 중 안내 후 지도로 대체한다.
 * 모든 렌더러는 useRoute 가 돌려주는 공통 Route JSON 을 소비한다.
 */
export default function RouteRenderer({ mode, place, origin, onReroute }: Props) {
  const destination = useMemo(
    () => ({ lat: place.lat, lng: place.lng, label: place.placeName ?? undefined }),
    [place.lat, place.lng, place.placeName],
  );
  const info = getMode(mode);
  const { status, route, error } = useRoute(origin, destination);

  // 실시간 안내
  const [navigating, setNavigating] = useState(false);
  const [follow, setFollow] = useState(true);
  const { pos: me, error: geoError } = useLiveLocation(navigating);

  // 경로 이탈 → 재안내 여부 묻기
  const [askReroute, setAskReroute] = useState(false);
  const offSince = useRef<number | null>(null);

  function stopNavigating() {
    setNavigating(false);
    setFollow(true);
    setAskReroute(false);
    offSince.current = null;
  }

  // 내 위치 → 경로상 위치 → 현재 구간 / 남은 거리 / 도착 여부
  const nav = useMemo(() => {
    if (!route || !me) return null;
    const { index, distance: offRoute } = nearestPathIndex(route.path, me);
    // 이미 지나온 안내 지점 중 마지막 = 현재 진행 중인 구간
    let step = 0;
    for (let i = 0; i < route.steps.length; i++) if (route.steps[i].pathIndex <= index) step = i;
    const next = route.steps[Math.min(step + 1, route.steps.length - 1)];
    const toNext = distanceM(me, next);
    const toDest = distanceM(me, destination);
    return {
      step,
      next,
      toNext,
      remaining: remainingDistance(route.path, index),
      arrived: toDest <= ARRIVE_M,
      offRoute: offRoute > OFF_ROUTE_M,
    };
  }, [route, me, destination.lat, destination.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // 이탈 상태가 OFF_ROUTE_ASK_MS 이상 이어지면 한 번 묻는다. 경로로 돌아오면 초기화.
  useEffect(() => {
    if (!navigating || !nav || nav.arrived || status === "loading") {
      offSince.current = null;
      return;
    }
    if (!nav.offRoute) {
      offSince.current = null;
      return;
    }
    const now = Date.now();
    if (offSince.current == null) offSince.current = now;
    else if (now - offSince.current >= OFF_ROUTE_ASK_MS && !askReroute) setAskReroute(true);
  }, [navigating, nav, status, askReroute]);

  function reroute() {
    if (!me) return;
    setAskReroute(false);
    offSince.current = null;
    onReroute({ lat: me.lat, lng: me.lng }); // origin 이 바뀌면 useRoute 가 새 경로를 받아온다
  }

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
          me={me}
          follow={navigating && follow}
          className={origin ? "h-[45vh]" : "h-[55vh]"}
        />

        {status === "loading" && (
          <div className="absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow">
              경로 찾는 중…
            </span>
          </div>
        )}

        {/* 실시간 안내 배너 — 오른쪽 ✕ 로 언제든 종료 */}
        {navigating && (
          <div className="absolute inset-x-3 top-3">
            <div
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg ${
                nav?.arrived
                  ? "bg-emerald-600 text-white"
                  : nav
                    ? "bg-neutral-900/95 text-white"
                    : "bg-white/95 text-neutral-700"
              }`}
            >
              {nav?.arrived ? (
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">도착했어요 🎉</p>
                  {place.detail && <p className="mt-0.5 text-sm opacity-90">아래 도착 안내를 확인하세요</p>}
                </div>
              ) : nav ? (
                <>
                  <span className="text-3xl leading-none">{TURN_ICON[nav.next.turn]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{nav.next.description}</p>
                    <p className="text-xs opacity-80">
                      {formatDistance(nav.toNext)} 앞 · 남은 거리 {formatDistance(nav.remaining)}
                      {nav.offRoute && " · 경로에서 벗어났어요"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="min-w-0 flex-1 text-sm">{geoError ?? "내 위치를 찾는 중… 📡"}</p>
              )}
              <button
                type="button"
                onClick={stopNavigating}
                aria-label="실시간 안내 종료"
                className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30"
              >
                종료 ✕
              </button>
            </div>
          </div>
        )}

        {/* 경로 이탈 → 재안내 묻기 */}
        {askReroute && (
          <div className="absolute inset-0 z-20 flex items-end bg-black/40 p-3">
            <div className="w-full rounded-2xl bg-white p-5 shadow-xl">
              <p className="text-base font-bold">경로에서 벗어났어요</p>
              <p className="mt-1 text-sm text-neutral-600">
                현재 위치에서 다시 길을 찾을까요? 취소하면 실시간 안내를 종료해요.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={stopNavigating}
                  className="flex-1 rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={reroute}
                  className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white"
                >
                  현재 위치에서 다시 안내
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 따라가기 토글 (지도를 손으로 움직인 뒤 다시 돌아올 때) */}
        {navigating && me && (
          <button
            type="button"
            onClick={() => setFollow((f) => !f)}
            className={`absolute right-3 bottom-3 rounded-full px-3 py-2 text-xs font-semibold shadow-lg ${
              follow ? "bg-sky-600 text-white" : "bg-white text-neutral-800"
            }`}
          >
            {follow ? "따라가는 중" : "내 위치로"}
          </button>
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

      {route && (
        <div className="px-5 pt-4">
          <button
            type="button"
            onClick={() => {
              if (navigating) stopNavigating();
              else {
                setNavigating(true);
                setFollow(true);
              }
            }}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition active:scale-[0.99] ${
              navigating
                ? "bg-neutral-200 text-neutral-800"
                : "bg-sky-600 text-white"
            }`}
          >
            {navigating ? "실시간 안내 종료" : "🧭 실시간 안내 시작"}
          </button>
          {!navigating && (
            <p className="mt-1.5 text-center text-[11px] text-neutral-400">
              걷는 동안 화면을 켜두면 내 위치와 다음 안내를 실시간으로 보여줘요
            </p>
          )}
        </div>
      )}

      {route && <RouteSteps route={route} currentStep={navigating ? nav?.step : null} />}
    </div>
  );
}
