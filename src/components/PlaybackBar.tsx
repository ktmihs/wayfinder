"use client";

type Props = {
  playing: boolean;
  arrived: boolean;
  dist: number;
  total: number;
  speed: number;
  onToggle: () => void;
  onSeek: (d: number) => void;
  onSpeed: () => void;
};

/** 캐릭터 재생 컨트롤 (▶/⏸ · 진행바 · 속도) — 지도 위에 얹는다 */
export default function PlaybackBar({ playing, arrived, dist, total, speed, onToggle, onSeek, onSpeed }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-[#3d2a2a] bg-[#fff8e7] px-2 py-1.5 shadow-[3px_3px_0_#3d2a2a]">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg px-2 py-1 text-sm font-bold text-[#3d2a2a]"
        aria-label={arrived ? "다시 보기" : playing ? "일시정지" : "재생"}
      >
        {arrived ? "↻ 다시" : playing ? "⏸" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(1, total)}
        step={1}
        value={dist}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="min-w-0 flex-1 accent-[#e5484d]"
        aria-label="진행도"
      />
      <button type="button" onClick={onSpeed} className="rounded-lg px-2 py-1 text-xs font-bold text-[#3d2a2a]" aria-label="속도 변경">
        속도 ×{speed}
      </button>
    </div>
  );
}
