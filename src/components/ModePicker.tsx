"use client";

import { MODES, type ModeId } from "@/lib/modes";

type Props = { value: ModeId; onChange: (mode: ModeId) => void };

/** 관리자가 손님에게 보여줄 안내 방식을 고르는 카드 목록 */
export default function ModePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((m) => {
        const selected = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={selected}
            className={`relative rounded-xl border p-3 text-left transition ${
              selected
                ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
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
