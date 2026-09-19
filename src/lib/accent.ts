"use client";

/**
 * 이미지의 대표색을 뽑는다. 작은 캔버스에 그려서 채도가 있는 픽셀을 4비트 버킷으로 세고,
 * 가장 많은 버킷의 평균색을 돌려준다. 전부 무채색이면 전체 평균.
 */
export async function extractAccent(src: File | string): Promise<string | null> {
  try {
    const img = await loadImage(src);
    const N = 48;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, N, N);
    const { data } = ctx.getImageData(0, 0, N, N);

    const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
    let ar = 0, ag = 0, ab = 0, an = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      ar += r; ag += g; ab += b; an++;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const light = (max + min) / 510;
      if (sat < 0.25 || light < 0.12 || light > 0.9) continue; // 회색·너무 어둡거나 밝은 건 제외
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      bk.r += r; bk.g += g; bk.b += b; bk.n++;
      buckets.set(key, bk);
    }
    let best: { r: number; g: number; b: number; n: number } | null = null;
    for (const bk of buckets.values()) if (!best || bk.n > best.n) best = bk;
    const pick = best && best.n >= an * 0.02 ? best : { r: ar, g: ag, b: ab, n: an };
    const hex = (v: number) => Math.round(v / pick.n).toString(16).padStart(2, "0");
    return `#${hex(pick.r)}${hex(pick.g)}${hex(pick.b)}`;
  } catch {
    return null;
  }
}

function loadImage(src: File | string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Supabase 공개 URL 은 CORS 허용
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요"));
    img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  });
}
