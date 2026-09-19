"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import KakaoMap from "@/components/KakaoMap";
import TileView from "@/components/tile2d/TileView";
import PlaybackBar from "@/components/PlaybackBar";
import { useWalkPlayback, type CharacterPose } from "@/lib/useWalkPlayback";
import { dirFromBearing } from "@/lib/charSprite";
import { bearing } from "@/lib/walk";
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
  /** 관리자가 허용한 안내 방식들. 손님이 이 중 하나를 고른다 */
  modes: ModeId[];
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
export default function RouteRenderer({ modes, place, origin, onReroute }: Props) {
  const [mode, setMode] = useState<ModeId>(modes[0]);
  const destination = useMemo(
    () => ({ lat: place.lat, lng: place.lng, label: place.placeName ?? undefined }),
    [place.lat, place.lng, place.placeName],
  );
  const info = getMode(mode);
  const { status, route, error } = useRoute(origin, destination);

  const useTile = mode === "tile2d" && !!route;
  const useCharacter = mode === "character" && !!route;

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

  // 캐릭터 안내: 재생 중이면 경로를 따라 걷고, 실시간 안내 중이면 내 위치에 선다
  const playback = useWalkPlayback(route, useCharacter && !navigating);
  const lastMe = useRef<{ lat: number; lng: number; dir: CharacterPose["dir"]; frame: number } | null>(null);
  const liveCharacter: CharacterPose | null = useMemo(() => {
    if (!useCharacter || !navigating || !me) return null;
    const prev = lastMe.current;
    const moved = prev ? distanceM(prev, me) : 0;
    const dir =
      me.heading != null ? dirFromBearing(me.heading) : prev && moved > 2 ? dirFromBearing(bearing(prev, me)) : (prev?.dir ?? "down");
    const frame = prev && moved > 1 ? (prev.frame + 1) % 2 : (prev?.frame ?? 0);
    const next = { lat: me.lat, lng: me.lng, dir, frame };
    lastMe.current = next;
    return next;
  }, [useCharacter, navigating, me]);
  const character = useCharacter ? (navigating ? liveCharacter : playback.pose) : null;

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
        {useTile ? (
          <TileView
            route={route}
            seed={place.id}
            me={navigating ? me : null}
            className={origin ? "h-[45vh]" : "h-[55vh]"}
          />
        ) : (
          <KakaoMap
            destination={destination}
            origin={origin}
            path={route?.path}
            me={me}
            follow={navigating && follow}
            character={character}
            followCharacter={useCharacter && !navigating && playback.playing}
            className={origin ? "h-[45vh]" : "h-[55vh]"}
          />
        )}

        {/* 캐릭터 재생 중 다음 안내 캡션 */}
        {useCharacter && !navigating && route && (() => {
          let idx = 0;
          route.steps.forEach((st, i) => { if (playback.cumAt(st.pathIndex) <= playback.dist + 0.5) idx = i; });
          const nx = route.steps[Math.min(idx + 1, route.steps.length - 1)];
          const left = Math.max(0, playback.cumAt(nx.pathIndex) - playback.dist);
          return (
            <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
              <div className="rounded-xl border-2 border-[#3d2a2a] bg-[#fff8e7] px-3 py-1.5 text-sm font-semibold text-[#3d2a2a] shadow-[3px_3px_0_#3d2a2a]">
                {playback.arrived ? "🏠 도착!" : `${TURN_ICON[nx.turn]} ${nx.description}`}
                {!playback.arrived && <span className="ml-2 font-normal opacity-70">{formatDistance(left)}</span>}
              </div>
            </div>
          );
        })()}

        {/* 캐릭터 재생 컨트롤 (실시간 안내 중엔 숨김) */}
        {useCharacter && !navigating && (
          <div className="absolute inset-x-3 bottom-3">
            <PlaybackBar
              playing={playback.playing}
              dist={playback.dist}
              total={playback.total}
              speed={playback.speed}
              onToggle={playback.toggle}
              onSeek={playback.seek}
              onSpeed={playback.cycleSpeed}
            />
          </div>
        )}

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
        {navigating && me && !useTile && (
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

      {/* 안내 방식 선택 (관리자가 여러 개 허용했을 때) */}
      {modes.length > 1 && route && (
        <div className="flex justify-center px-5 pt-3">
          <div className="inline-flex rounded-full bg-neutral-100 p-1 text-xs font-semibold">
            {modes.map((m) => {
              const mi = getMode(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1.5 ${mode === m ? "bg-white text-neutral-900 shadow" : "text-neutral-500"}`}
                >
                  {mi.emoji} {mi.label}
                </button>
              );
            })}
          </div>
        </div>
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
