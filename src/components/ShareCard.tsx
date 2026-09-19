"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Props = { url: string; title: string };

/** 손님에게 배포할 URL + QR 코드. 링크 복사/공유, QR 이미지 저장/공유. */
export default function ShareCard({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrMsg, setQrMsg] = useState<string | null>(null);
  const qrWrap = useRef<HTMLDivElement>(null);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, text: `${title} 오시는 길`, url }).catch(() => {});
    } else copy();
  }

  /** QR 을 여백 있는 PNG 로 만들어 공유 시트(사진 저장 가능)로 보내거나, 안 되면 다운로드 */
  async function saveQr() {
    const src = qrWrap.current?.querySelector("canvas");
    if (!src) return;
    const PAD = 48, SIZE = 768;
    const out = document.createElement("canvas");
    out.width = SIZE + PAD * 2;
    out.height = SIZE + PAD * 2 + 80;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, PAD, PAD, SIZE, SIZE);
    ctx.fillStyle = "#171717";
    ctx.font = "bold 36px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, out.width / 2, SIZE + PAD + 52);

    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], `${title}-QR.png`, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `${title} QR` }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setQrMsg("QR 이미지를 내려받았어요.");
    setTimeout(() => setQrMsg(null), 2000);
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-sm font-semibold text-neutral-900">손님용 링크</div>
      <p className="mt-0.5 text-xs text-neutral-500">QR을 초대장에 넣거나 링크를 단톡방에 올리세요.</p>

      <div className="mt-3 flex flex-col items-center">
        <div ref={qrWrap} className="rounded-xl border border-neutral-100 bg-white p-3">
          {/* 화면용은 작게 그리되 내부 해상도는 크게 (저장 시 선명하게) */}
          <QRCodeCanvas value={url} size={512} level="M" includeMargin={false} style={{ width: 176, height: 176 }} />
        </div>
        <button
          type="button"
          onClick={saveQr}
          className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800"
        >
          ⬇️ QR 이미지 저장 / 공유
        </button>
        {qrMsg && <p className="mt-1 text-xs text-emerald-700">{qrMsg}</p>}
      </div>

      <div className="mt-4 truncate rounded-lg bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700">{url}</div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={copy} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">
          {copied ? "복사됨 ✓" : "링크 복사"}
        </button>
        <button type="button" onClick={share} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800">
          공유
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800">
          미리보기
        </a>
      </div>
    </div>
  );
}
