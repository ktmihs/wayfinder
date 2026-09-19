import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 text-center">
      <p className="text-4xl">🧭</p>
      <h1 className="mt-4 text-xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-neutral-600">링크가 잘못됐거나 삭제된 안내 페이지예요.</p>
      <Link href="/" className="mt-6 text-sm font-semibold text-sky-600">
        홈으로
      </Link>
    </main>
  );
}
