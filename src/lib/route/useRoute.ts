"use client";

import { useEffect, useState } from "react";
import type { LatLng, Route } from "./types";

type State =
  | { status: "idle"; route: null; error: null }
  | { status: "loading"; route: null; error: null }
  | { status: "ok"; route: Route; error: null }
  | { status: "error"; route: null; error: string };

/** 출발/도착이 정해지면 /api/route 를 호출해 경로를 가져온다. */
export function useRoute(from: LatLng | null, to: LatLng): State {
  const [state, setState] = useState<State>({ status: "idle", route: null, error: null });

  useEffect(() => {
    if (!from) {
      setState({ status: "idle", route: null, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: "loading", route: null, error: null });

    const qs = new URLSearchParams({
      from: `${from.lat},${from.lng}`,
      to: `${to.lat},${to.lng}`,
    });
    fetch(`/api/route?${qs}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "경로를 찾지 못했어요.");
        setState({ status: "ok", route: body as Route, error: null });
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setState({ status: "error", route: null, error: e.message });
      });

    return () => ctrl.abort();
  }, [from?.lat, from?.lng, to.lat, to.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
