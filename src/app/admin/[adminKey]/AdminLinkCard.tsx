"use client";

import { useState } from "react";

type Props = { adminUrl: string; name: string };

/**
 * 관리 링크 보관 카드. 로그인이 없으니 이 링크를 잃어버리면 수정할 방법이 없다.
 * 복사 / 내 메일로 보내기(mailto) / 공유 시트(카톡 '나에게 보내기')로 저장을 유도한다.
 */
export default function AdminLinkCard({ adminUrl, name }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(adminUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: `[관리 링크] ${name}`, text: "이 링크로 안내 페이지를 수정할 수 있어요. 남에게 보내지 마세요.", url: adminUrl }).catch(() => {});
    } else copy();
  }

  const mailto = `mailto:?subject=${encodeURIComponent(`[오시는 길 관리 링크] ${name}`)}&body=${encodeURIComponent(
    `안내 페이지를 수정하려면 아래 링크를 여세요.\n손님에게는 보내지 마세요.\n\n${adminUrl}`,
  )}`;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-semibold text-amber-900">관리 링크 (나만 보기)</div>
      <p className="mt-0.5 text-xs text-amber-800">
        로그인이 없어서 <b>이 링크를 잃어버리면 다시 수정할 수 없어요.</b> 지금 저장해 두세요.
      </p>
      <div className="mt-2 truncate rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-amber-900">{adminUrl}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white">
          {copied ? "복사됨 ✓" : "링크 복사"}
        </button>
        <a href={mailto} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900">
          ✉️ 내 메일로 보내기
        </a>
        <button type="button" onClick={share} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900">
          💬 나에게 보내기
        </button>
      </div>
    </div>
  );
}
