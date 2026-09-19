"use client";

/**
 * 브라우저에서 이미지를 긴 변 maxSize px 이하로 줄이고 JPEG로 변환한다.
 * 폰 사진(3~8MB)을 그대로 올리지 않기 위함. 1280px/0.8 이면 보통 100~200KB — 폰 화면에 충분하고 손님 데이터도 아낀다.
 */
export async function resizeImage(file: File, maxSize = 1280, quality = 0.8): Promise<File> {
  // 리사이즈가 불가능한 환경이면 원본을 그대로 쓴다 (서버에서 크기 제한으로 걸러짐)
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // JPEG 는 모든 브라우저가 인코딩 가능. (사파리 일부 버전은 WebP 인코딩 미지원)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("이미지 변환에 실패했어요.");
  const type = blob.type || "image/jpeg";
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type });
}
