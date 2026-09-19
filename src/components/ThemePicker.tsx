"use client";

import { THEME_IDS, THEME_LABEL, isValidHex, type ThemeId } from "@/lib/themes";

type Props = { value: ThemeId; accent: string | null; onChange: (t: ThemeId) => void };

/** 커버 테마: 화이트 / 블랙 / 사진 색(사진에서 추출) */
export default function ThemePicker({ value, accent, onChange }: Props) {
  const swatch: Record<ThemeId, string> = { white: "#ffffff", black: "#111111", auto: isValidHex(accent) ? accent : "#e5e5e5" };
  return (
    <div className="flex gap-3">
      {THEME_IDS.map((id) => {
        const selected = id === value;
        const disabled = id === "auto" && !isValidHex(accent);
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 disabled:opacity-40 ${selected ? "bg-neutral-100" : ""}`}
          >
            <span
              className={`h-9 w-9 rounded-full border ring-2 ring-offset-2 ${selected ? "ring-neutral-900" : "ring-transparent"} ${id === "white" ? "border-neutral-300" : "border-transparent"}`}
              style={{ background: swatch[id] }}
            />
            <span className="text-[11px] text-neutral-600">{THEME_LABEL[id]}</span>
          </button>
        );
      })}
      {!isValidHex(accent) && <p className="self-center text-[11px] text-neutral-400">사진을 올리면 '사진 색'이 생겨요</p>}
    </div>
  );
}
