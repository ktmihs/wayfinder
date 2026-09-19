import type { Route, TurnKind } from "@/lib/route/types";
import { formatDistance, formatDuration } from "@/lib/format";

export const TURN_ICON: Record<TurnKind, string> = {
  start: "🚩",
  end: "🏁",
  straight: "⬆️",
  left: "⬅️",
  right: "➡️",
  "slight-left": "↖️",
  "slight-right": "↗️",
  "sharp-left": "↩️",
  "sharp-right": "↪️",
  uturn: "🔄",
  crosswalk: "🚸",
  stairs: "🪜",
  overpass: "🌉",
  underpass: "🚇",
  elevator: "🛗",
  walk: "🚶",
  bus: "🚌",
  subway: "🚇",
  unknown: "•",
};

type Props = {
  route: Route;
  /** 실시간 안내 중 현재 구간 인덱스 (강조 표시) */
  currentStep?: number | null;
};

/** 경로 요약 + 턴바이턴 목록 */
export default function RouteSteps({ route, currentStep }: Props) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold">{formatDuration(route.duration)}</span>
        <span className="text-sm text-neutral-500">
          {route.travel === "transit" ? "대중교통" : "도보"} {formatDistance(route.distance)}
          {route.fare != null && ` · ${route.fare.toLocaleString()}원`}
          {route.transfers != null && route.transfers > 0 && ` · 환승 ${route.transfers}회`}
        </span>
        {route.provider === "osrm" && (
          <span
            className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
            title="Tmap 키가 없어 자동차 도로 기준 경로예요"
          >
            대략적인 경로
          </span>
        )}
      </div>

      {route.legs && route.legs.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {route.legs.map((l, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-neutral-300">›</span>}
              {l.mode === "walk" ? (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">🚶 {formatDistance(l.distance)}</span>
              ) : (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ background: l.color ?? (l.mode === "subway" ? "#0052a4" : "#3d8f3d") }}
                >
                  {l.mode === "subway" ? "🚇" : "🚌"} {l.name}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <ol className="mt-4 space-y-1">
        {route.steps.map((s, i) => {
          const active = currentStep === i;
          const done = currentStep != null && i < currentStep;
          return (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ring-1 transition ${
                active
                  ? "bg-sky-50 ring-sky-300"
                  : done
                    ? "bg-neutral-50 opacity-50 ring-neutral-200"
                    : "bg-white ring-neutral-200"
              }`}
            >
              <span className="w-6 shrink-0 text-center text-lg leading-6" aria-hidden>
                {done ? "✓" : TURN_ICON[s.turn]}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${active ? "font-semibold text-sky-900" : "text-neutral-900"}`}>
                  {s.description}
                </p>
                {s.distance > 0 && s.turn !== "end" && (
                  <p className="text-xs text-neutral-500">{formatDistance(s.distance)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
