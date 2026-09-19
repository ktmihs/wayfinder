import Link from "next/link";
import PlaceForm from "@/components/PlaceForm";
import { createPlace } from "@/app/actions";
import { isStorageConfigured } from "@/lib/supabase";

export const metadata = { title: "새 안내 페이지" };

export default function NewPlacePage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-6">
      <Link href="/" className="text-sm text-neutral-500">
        ← 홈
      </Link>
      <h1 className="mt-3 text-2xl font-bold">도착지 설정</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-600">
        손님이 도착해야 할 곳과 안내 방식을 정해요.
      </p>
      <PlaceForm action={createPlace} submitLabel="안내 페이지 만들기" storageReady={isStorageConfigured()} />
    </main>
  );
}
