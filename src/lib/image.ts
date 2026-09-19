"use client";

/**
 * 브라우저에서 이미지를 긴 변 maxSize px 이하로 줄이고 WebP로 변환한다.
 * 폰 사진(3~8MB)을 그대로 올리지 않기 위함. 결과는 보통 100~300KB.
 */
export async function resizeImage(file: File, maxSize = 1600, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
  if (!blob) throw new Error("이미지 변환에 실패했어요.");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}
