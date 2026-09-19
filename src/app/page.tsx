import Link from "next/link";
import { MODES } from "@/lib/modes";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <div className="flex-1">
        <p className="text-sm font-medium text-sky-600">집들이 · 모임 · 매장 안내</p>
        <h1 className="mt-2 text-3xl leading-tight font-bold">
          주소 하나로
          <br />
          오시는 길 페이지 만들기
        </h1>
        <p className="mt-3 text-neutral-600">
          도착지를 정하고 링크나 QR을 나눠주세요. 손님은 출발지만 입력하면 바로 길을 볼 수 있어요.
        </p>

        <Link
          href="/new"
          className="mt-8 block w-full rounded-xl bg-neutral-900 py-3.5 text-center text-base font-semibold text-white active:scale-[0.99]"
        >
          새 안내 페이지 만들기
        </Link>

        <h2 className="mt-12 text-sm font-semibold text-neutral-500">안내 방식</h2>
        <ul className="mt-3 space-y-2">
          {MODES.map((m) => (
            <li key={m.id} className="flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-neutral-200">
              <span className="text-2xl">{m.emoji}</span>
              <div>
                <div className="text-sm font-semibold">
                  {m.label}
                  {!m.ready && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                      준비 중
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500">{m.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-10 text-center text-xs text-neutral-400">
        회원가입 없이 사용해요. 만든 뒤 나오는 관리 링크를 꼭 저장하세요.
      </p>
    </main>
  );
}
