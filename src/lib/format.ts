export function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

export function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  if (min < 1) return "1분 이내";
  if (min < 60) return `${min}분`;
  return `${Math.floor(min / 60)}시간 ${min % 60}분`;
}

/**
 * 행사 일시를 "9월 27일 (토) 오후 6:00" 형태로.
 * 서버(UTC)와 클라이언트가 같은 결과를 내도록 시간대를 고정한다.
 */
export function formatEventAt(d: Date | string | null | undefined) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Date → <input type="datetime-local"> 값 (Asia/Seoul 기준) */
export function toDatetimeLocal(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date); // "2026-09-27 18:00"
  return parts.replace(" ", "T");
}
