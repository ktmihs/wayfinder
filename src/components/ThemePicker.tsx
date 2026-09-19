"use client";

import { THEMES, type ThemeId } from "@/lib/themes";

type Props = { value: ThemeId; onChange: (t: ThemeId) => void };

export default function ThemePicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(THEMES) as ThemeId[]).map((id) => {
        const t = THEMES[id];
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            aria-label={t.label}
            title={t.label}
            className={`h-9 w-9 rounded-full border ring-2 ring-offset-2 transition ${
              selected ? "ring-neutral-900" : "ring-transparent hover:ring-neutral-300"
            } ${t.overlay ? "border-transparent" : "border-neutral-300"}`}
            style={{
              background:
                "photoBg" in t && t.photoBg
                  ? "repeating-linear-gradient(135deg, #cfcfcf 0 4px, #f3f3f3 4px 8px)" // 사진 배경 = 체크 무늬 스와치
                  : `linear-gradient(135deg, ${t.from}, ${t.to})`,
            }}
          />
        );
      })}
    </div>
  );
}
