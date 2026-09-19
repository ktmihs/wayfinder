export function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

export function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  if (min < 1) return "1분 이내";
  if (min < 60) return `${min}분`;
  return `${Math.floor(min / 60)}시간 ${min % 60}분`;
}
