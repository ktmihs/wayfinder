"use client";

import { MODES, type ModeId } from "@/lib/modes";

type Props = { value: ModeId[]; onChange: (modes: ModeId[]) => void };

/**
 * 관리자가 손님에게 허용할 안내 방식을 고르는 카드 목록 (복수 선택).
 * 손님은 이 중에서 원하는 방식을 골라 본다. 준비 중인 방식은 고를 수 없다.
 */
export default function ModePicker({ value, onChange }: Props) {
  function toggle(id: ModeId) {
    if (value.includes(id)) {
      if (value.length === 1) return; // 최소 하나
      onChange(value.filter((m) => m !== id));
    } else onChange([...value, id]);
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((m) => {
        const selected = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            disabled={!m.ready}
            onClick={() => toggle(m.id)}
            aria-pressed={selected}
            className={`relative rounded-xl border p-3 text-left transition disabled:opacity-50 ${
              selected
                ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            {selected && (
              <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
                ✓
              </span>
            )}
            <div className="text-2xl">{m.emoji}</div>
            <div className="mt-1 text-sm font-semibold text-neutral-900">{m.label}</div>
            <div className="mt-0.5 text-xs leading-snug text-neutral-500">{m.description}</div>
            {!m.ready && (
              <span className="absolute top-2 right-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                준비 중
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
