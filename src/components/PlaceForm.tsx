"use client";

import { useActionState, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import KakaoMap from "@/components/KakaoMap";
import ModePicker from "@/components/ModePicker";
import type { FormState } from "@/app/actions";
import type { ModeId } from "@/lib/modes";
import type { SearchResult } from "@/lib/kakao";

type Initial = {
  name: string;
  detail: string | null;
  mode: string;
  address: string;
  roadAddress: string | null;
  placeName: string | null;
  lat: number;
  lng: number;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  submitLabel: string;
};

/** 도착지 생성/수정 폼. /new 와 /admin/[key] 에서 같이 쓴다. */
export default function PlaceForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [dest, setDest] = useState<SearchResult | null>(
    initial
      ? {
          placeName: initial.placeName,
          address: initial.address,
          roadAddress: initial.roadAddress,
          lat: initial.lat,
          lng: initial.lng,
        }
      : null,
  );
  const [mode, setMode] = useState<ModeId>((initial?.mode as ModeId) ?? "map");

  return (
    <form action={formAction} className="space-y-6">
      <Field label="안내 페이지 이름" hint="손님에게 보이는 제목이에요.">
        <input
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="예: 민수네 집들이"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </Field>

      <Field label="도착지 주소" hint="검색 후 목록에서 선택해 주세요.">
        <AddressSearch
          initialText={initial ? (initial.placeName ?? initial.address) : ""}
          onSelect={setDest}
          placeholder="예: 테헤란로 123 / 래미안 아파트"
        />
        {dest && (
          <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200">
            <KakaoMap destination={{ lat: dest.lat, lng: dest.lng }} className="h-44" />
            <div className="bg-white px-3 py-2 text-xs text-neutral-600">
              {dest.placeName && <span className="font-medium text-neutral-900">{dest.placeName} · </span>}
              {dest.roadAddress ?? dest.address}
            </div>
          </div>
        )}
        {/* 서버 액션으로 넘길 숨은 값들 */}
        <input type="hidden" name="address" value={dest?.address ?? ""} />
        <input type="hidden" name="roadAddress" value={dest?.roadAddress ?? ""} />
        <input type="hidden" name="placeName" value={dest?.placeName ?? ""} />
        <input type="hidden" name="lat" value={dest?.lat ?? ""} />
        <input type="hidden" name="lng" value={dest?.lng ?? ""} />
      </Field>

      <Field label="도착 후 안내" hint="동/호수, 공동현관 비밀번호, 주차 안내 등 (선택)">
        <textarea
          name="detail"
          rows={3}
          defaultValue={initial?.detail ?? ""}
          placeholder={"예: 101동 1203호\n공동현관 #1234\n주차는 지하 2층"}
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </Field>

      <Field label="경로 안내 방식" hint="손님에게 어떤 형태로 길을 보여줄지 골라요.">
        <ModePicker value={mode} onChange={setMode} />
        <input type="hidden" name="mode" value={mode} />
      </Field>

      {state?.error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">저장했어요.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-neutral-900 py-3.5 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
      >
        {pending ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-900">{label}</label>
      {hint && <p className="mt-0.5 mb-2 text-xs text-neutral-500">{hint}</p>}
      {children}
    </div>
  );
}
