"use client";

import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image";

type Props = {
  /** 기존 이미지 URL (수정 화면) */
  initialUrl?: string | null;
  /** 저장소 미설정 시 비활성화 */
  disabled?: boolean;
  onChange?: (previewUrl: string | null) => void;
};

/**
 * 커버 이미지 선택. 고른 즉시 브라우저에서 리사이즈해서
 * <input name="image">의 files 를 교체한다 → 폼 제출 시 함께 올라간다.
 * 기존 이미지를 지우면 <input name="removeImage" value="1">이 붙는다.
 */
export default function ImageUpload({ initialUrl, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || !inputRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const resized = await resizeImage(file);
      // input.files 는 읽기 전용이라 DataTransfer 로 교체한다
      const dt = new DataTransfer();
      dt.items.add(resized);
      inputRef.current.files = dt.files;
      const url = URL.createObjectURL(resized);
      setPreview(url);
      setRemoved(false);
      onChange?.(url);
    } catch (e) {
      setError((e as Error).message);
      inputRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setRemoved(Boolean(initialUrl));
    onChange?.(null);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name="image"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {removed && <input type="hidden" name="removeImage" value="1" />}

      {preview ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-neutral-200">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            className="block w-full"
            aria-label="사진 바꾸기"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="커버 미리보기" className="aspect-[4/3] w-full object-cover" />
          </button>
          <div className="flex divide-x divide-neutral-200 bg-white">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
              className="flex-1 py-2.5 text-sm font-semibold text-neutral-800 active:bg-neutral-50 disabled:opacity-50"
            >
              {busy ? "처리 중…" : "📷 다른 사진으로 바꾸기"}
            </button>
            <button
              type="button"
              onClick={clear}
              className="px-5 py-2.5 text-sm font-semibold text-rose-600 active:bg-rose-50"
            >
              삭제
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-neutral-400 disabled:opacity-50"
        >
          <span className="text-3xl">🖼️</span>
          <span className="mt-1 text-sm font-medium">
            {busy ? "이미지 처리 중…" : disabled ? "이미지 저장소 미설정" : "사진 올리기"}
          </span>
          {!disabled && <span className="text-xs">집 사진, 초대 일러스트 등</span>}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
