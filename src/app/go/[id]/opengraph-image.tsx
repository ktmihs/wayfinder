import { ImageResponse } from "next/og";
import { getPlaceById } from "@/lib/places";
import { getTheme } from "@/lib/themes";
import { formatEventAt } from "@/lib/format";

export const runtime = "nodejs";
export const alt = "오시는 길";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 카톡/슬랙 등에 링크를 붙였을 때 뜨는 미리보기 이미지 */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const place = await getPlaceById(id);
  const t = getTheme(place?.theme ?? "rose");
  const when = formatEventAt(place?.eventAt);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
          color: t.text,
          fontFamily: "sans-serif",
        }}
      >
        {place?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.imageUrl}
            alt=""
            width={520}
            height={630}
            style={{ width: 520, height: 630, objectFit: "cover" }}
          />
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 72px",
          }}
        >
          <div style={{ fontSize: 28, opacity: 0.9, display: "flex" }}>
            {place?.hostName ? `${place.hostName}님의 초대` : "오시는 길"}
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.15, marginTop: 12, display: "flex" }}>
            {place?.name ?? "오시는 길"}
          </div>
          {when && <div style={{ fontSize: 34, marginTop: 24, display: "flex" }}>{when}</div>}
          <div style={{ fontSize: 26, opacity: 0.85, marginTop: 10, display: "flex" }}>
            {place?.placeName ?? place?.address ?? ""}
          </div>
          <div
            style={{
              marginTop: 48,
              display: "flex",
              alignSelf: "flex-start",
              background: t.text,
              color: t.overlay ? t.to : "#ffffff",
              borderRadius: 999,
              padding: "16px 32px",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            출발지만 입력하면 길 안내 →
          </div>
        </div>
      </div>
    ),
    size,
  );
}
