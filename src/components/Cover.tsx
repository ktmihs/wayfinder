"use client";

import { useState } from "react";
import { resolveTheme } from "@/lib/themes";
import { formatEventAt } from "@/lib/format";

export type CoverData = {
  name: string;
  hostName?: string | null;
  eventAt?: Date | string | null;
  greeting?: string | null;
  imageUrl?: string | null;
  theme: string;
  accent?: string | null;
  placeName?: string | null;
  address: string;
};

type Props = {
  data: CoverData;
  onStart?: () => void;
  /** 관리자 폼 안 미리보기용 (버튼 비활성, 높이 축소) */
  preview?: boolean;
};

/** 손님이 링크를 열면 가장 먼저 보는 초대 커버 */
export default function Cover({ data, onStart, preview }: Props) {
  const t = resolveTheme(data.theme, data.accent);
  const when = formatEventAt(data.eventAt);
  const [lightbox, setLightbox] = useState(false);

  return (
    <div
      className={`flex flex-col ${preview ? "min-h-[420px]" : "min-h-dvh"}`}
      style={{ background: t.bg, color: t.text }}
    >
      {data.imageUrl ? (
        <button
          type="button"
          onClick={() => !preview && setLightbox(true)}
          className="relative block aspect-square w-full overflow-hidden"
          aria-label="사진 크게 보기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="" decoding="async" className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className={`flex items-center justify-center ${preview ? "h-28" : "h-[30vh]"}`}>
          <span className={preview ? "text-5xl" : "text-7xl"} aria-hidden>🏠</span>
        </div>
      )}

      {/* 설명 영역 — 사진과 글 사이, 글 좌우에 넉넉한 여백 */}
      <div className="flex flex-1 flex-col px-7 pt-7 pb-8">
        {data.hostName && (
          <p className="text-sm font-medium" style={{ color: t.muted }}>{data.hostName}님의 초대</p>
        )}
        <h1 className={`mt-1 font-bold leading-tight ${preview ? "text-2xl" : "text-3xl"}`}>{data.name}</h1>
        {when && <p className="mt-3 text-base font-medium">{when}</p>}
        <p className="mt-1 text-sm" style={{ color: t.muted }}>{data.placeName ?? data.address}</p>

        {data.greeting && (
          <p className="mt-6 text-[15px] leading-relaxed whitespace-pre-line">{data.greeting}</p>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onStart}
          disabled={preview}
          className="mt-8 w-full rounded-xl py-3.5 text-base font-semibold shadow-md transition active:scale-[0.99]"
          style={{ background: t.buttonBg, color: t.buttonText }}
        >
          오시는 길 보기 →
        </button>
      </div>

      {/* 사진 전체 보기 */}
      {lightbox && data.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-label="사진"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
            aria-label="닫기"
          >
            닫기 ✕
          </button>
        </div>
      )}
    </div>
  );
}
