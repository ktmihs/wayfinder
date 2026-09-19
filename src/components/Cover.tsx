import { getTheme } from "@/lib/themes";
import { formatEventAt } from "@/lib/format";

export type CoverData = {
  name: string;
  hostName?: string | null;
  eventAt?: Date | string | null;
  greeting?: string | null;
  imageUrl?: string | null;
  theme: string;
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
  const t = getTheme(data.theme);
  const when = formatEventAt(data.eventAt);

  return (
    <div
      className={`flex flex-col ${preview ? "min-h-[420px]" : "min-h-dvh"}`}
      style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})`, color: t.text }}
    >
      {data.imageUrl ? (
        <div className={`relative w-full overflow-hidden ${preview ? "aspect-[4/3]" : "aspect-[4/3] max-h-[48vh]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="" className="h-full w-full object-cover" />
          {t.overlay && (
            <div
              className="absolute inset-x-0 bottom-0 h-24"
              style={{ background: `linear-gradient(to bottom, transparent, ${t.from})` }}
            />
          )}
        </div>
      ) : (
        <div className={`flex items-center justify-center ${preview ? "h-28" : "h-[30vh]"}`}>
          <span className={preview ? "text-5xl" : "text-7xl"} aria-hidden>🏠</span>
        </div>
      )}

      <div className="flex flex-1 flex-col px-6 pb-8">
        {data.hostName && (
          <p className="text-sm font-medium" style={{ opacity: t.overlay ? 0.9 : 0.6 }}>{data.hostName}님의 초대</p>
        )}
        <h1 className={`mt-1 font-bold leading-tight ${preview ? "text-2xl" : "text-3xl"}`}>{data.name}</h1>
        {when && <p className="mt-2 text-base font-medium opacity-95">{when}</p>}
        <p className="mt-1 text-sm opacity-80">{data.placeName ?? data.address}</p>

        {data.greeting && (
          <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-line opacity-95">{data.greeting}</p>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onStart}
          disabled={preview}
          className={`mt-8 w-full rounded-xl py-3.5 text-base font-semibold transition active:scale-[0.99] ${t.overlay ? "shadow-lg" : "shadow-md"}`}
          style={{ background: t.text, color: t.overlay ? t.to : "#ffffff" }}
        >
          오시는 길 보기 →
        </button>
      </div>
    </div>
  );
}
