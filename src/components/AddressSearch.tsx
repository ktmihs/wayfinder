"use client";

import { useEffect, useRef, useState } from "react";
import { searchAddress, type SearchResult } from "@/lib/kakao";

type Props = {
  placeholder?: string;
  /** 초기 표시 텍스트 (수정 화면에서 기존 주소 표시용) */
  initialText?: string;
  /** 바깥에서 선택이 바뀌었을 때 입력창 텍스트를 맞춰줄 값 (예: "현재 위치") */
  displayText?: string | null;
  onSelect: (result: SearchResult) => void;
  autoFocus?: boolean;
};

/**
 * 주소/장소명을 입력하면 카카오 검색 결과를 아래에 띄우고,
 * 하나를 고르면 onSelect로 좌표를 넘긴다.
 */
export default function AddressSearch({ placeholder, initialText, displayText, onSelect, autoFocus }: Props) {
  const [text, setText] = useState(initialText ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef("");

  // 바깥에서 정한 텍스트(현재 위치 등)로 입력창을 맞추고, 그 텍스트로는 검색하지 않는다
  useEffect(() => {
    if (displayText == null) return;
    lastQuery.current = displayText;
    setText(displayText);
    setResults([]);
    setOpen(false);
  }, [displayText]);

  // 입력이 멈추고 300ms 뒤에 검색 (디바운스)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = text.trim();
    if (q.length < 2 || q === lastQuery.current) return;

    timer.current = setTimeout(async () => {
      lastQuery.current = q;
      setLoading(true);
      setError(null);
      try {
        const r = await searchAddress(q);
        setResults(r);
        setOpen(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text]);

  function pick(r: SearchResult) {
    lastQuery.current = r.placeName ?? r.address;
    setText(r.placeName ?? r.address);
    setOpen(false);
    onSelect(r);
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder ?? "주소 또는 장소명 검색"}
        autoComplete="off"
        enterKeyHint="search"
        className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
      {loading && (
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-neutral-400">
          검색 중…
        </span>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="block w-full px-4 py-3 text-left hover:bg-neutral-50 active:bg-neutral-100"
              >
                <div className="text-sm font-medium text-neutral-900">
                  {r.placeName ?? r.address}
                </div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  {r.roadAddress ?? r.address}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && results.length === 0 && text.trim().length >= 2 && (
        <p className="mt-1 text-xs text-neutral-500">검색 결과가 없어요.</p>
      )}
    </div>
  );
}
