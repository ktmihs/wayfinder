"use client";

import { useEffect, useState } from "react";
import type { LatLng, Route, TravelMode } from "./types";

type State =
  | { status: "idle"; route: null; error: null }
  | { status: "loading"; route: null; error: null }
  | { status: "ok"; route: Route; error: null }
  | { status: "error"; route: null; error: string; code?: string };

/** 출발/도착이 정해지면 /api/route 를 호출해 경로를 가져온다. */
export function useRoute(from: LatLng | null, to: LatLng, travel: TravelMode = "walk", alt = 0): State {
  const [state, setState] = useState<State>({ status: "idle", route: null, error: null });

  useEffect(() => {
    if (!from) {
      setState({ status: "idle", route: null, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((prev) => (prev.status === "ok" && alt !== (prev.route.altIndex ?? 0) ? prev : { status: "loading", route: null, error: null }));

    const qs = new URLSearchParams({
      from: `${from.lat},${from.lng}`,
      to: `${to.lat},${to.lng}`,
      travel,
      alt: String(alt),
    });
    fetch(`/api/route?${qs}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          const err = new Error(body.error ?? "경로를 찾지 못했어요.") as Error & { code?: string };
          err.code = body.code;
          throw err;
        }
        setState({ status: "ok", route: body as Route, error: null });
      })
      .catch((e: Error & { code?: string }) => {
        if (e.name === "AbortError") return;
        // 네트워크 자체가 끊긴 경우 (fetch 가 TypeError 를 던진다) 는 한글로
        const offline = e instanceof TypeError || /fetch/i.test(e.message);
        setState({
          status: "error",
          route: null,
          error: offline ? "인터넷 연결을 확인해 주세요. 연결되면 다시 시도할게요." : e.message,
          code: e.code,
        });
      });

    return () => ctrl.abort();
  }, [from?.lat, from?.lng, to.lat, to.lng, travel, alt]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
