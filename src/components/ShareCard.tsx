"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = { url: string; title: string };

/** 손님에게 배포할 URL + QR 코드. 복사/공유 버튼 포함. */
export default function ShareCard({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, text: `${title} 오시는 길`, url }).catch(() => {});
    } else {
      copy();
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl border border-neutral-100 bg-white p-2">
          <QRCodeSVG value={url} size={112} level="M" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-neutral-900">손님용 링크</div>
          <p className="mt-0.5 text-xs text-neutral-500">
            QR을 초대장에 넣거나 링크를 단톡방에 올리세요.
          </p>
          <div className="mt-2 truncate rounded-lg bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700">
            {url}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {copied ? "복사됨 ✓" : "링크 복사"}
            </button>
            <button
              type="button"
              onClick={share}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800"
            >
              공유
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800"
            >
              미리보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
