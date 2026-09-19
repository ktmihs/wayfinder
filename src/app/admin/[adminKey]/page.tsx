import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceForm from "@/components/PlaceForm";
import ShareCard from "@/components/ShareCard";
import DeleteButton from "./DeleteButton";
import { getPlaceByAdminKey } from "@/lib/places";
import { getBaseUrl } from "@/lib/url";
import { updatePlace } from "@/app/actions";
import { getMode } from "@/lib/modes";
import { isStorageConfigured } from "@/lib/supabase";

export const metadata = { title: "관리" };

export default async function AdminPage({
  params,
  searchParams,
}: PageProps<"/admin/[adminKey]">) {
  const { adminKey } = await params;
  const { created, imageError } = await searchParams;
  const place = await getPlaceByAdminKey(adminKey);
  if (!place) notFound();

  const base = await getBaseUrl();
  const guestUrl = `${base}/go/${place.id}`;
  const adminUrl = `${base}/admin/${place.adminKey}`;
  const mode = getMode(place.mode);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-6">
      <Link href="/" className="text-sm text-neutral-500">
        ← 홈
      </Link>

      {created && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          안내 페이지가 만들어졌어요! 🎉
        </div>
      )}
      {imageError && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          페이지는 만들어졌지만 사진 업로드에 실패했어요. 아래에서 다시 올려주세요.
        </div>
      )}

      <h1 className="mt-3 text-2xl font-bold">{place.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {place.placeName ? `${place.placeName} · ` : ""}
        {place.roadAddress ?? place.address}
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        현재 안내 방식: {mode.emoji} {mode.label}
      </p>

      <div className="mt-5">
        <ShareCard url={guestUrl} title={place.name} />
      </div>

      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-semibold text-amber-900">관리 링크 (나만 보기)</div>
        <p className="mt-0.5 text-xs text-amber-800">
          이 주소를 알면 누구나 수정할 수 있어요. 북마크해 두고 손님에게는 보내지 마세요.
        </p>
        <div className="mt-2 truncate rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-amber-900">
          {adminUrl}
        </div>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold">설정 수정</h2>
      <PlaceForm
        key={place.updatedAt.toISOString()}
        action={updatePlace.bind(null, place.adminKey)}
        initial={place}
        submitLabel="변경 사항 저장"
        storageReady={isStorageConfigured()}
      />

      <div className="mt-12 border-t border-neutral-200 pt-6">
        <DeleteButton adminKey={place.adminKey} />
      </div>
    </main>
  );
}
