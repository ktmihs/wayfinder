"use client";

import { useActionState, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import KakaoMap from "@/components/KakaoMap";
import ModePicker from "@/components/ModePicker";
import ThemePicker from "@/components/ThemePicker";
import ImageUpload from "@/components/ImageUpload";
import Cover from "@/components/Cover";
import type { FormState } from "@/app/actions";
import { parseModes, type ModeId } from "@/lib/modes";
import type { ThemeId } from "@/lib/themes";
import type { SearchResult } from "@/lib/kakao";
import { toDatetimeLocal } from "@/lib/format";

type Initial = {
  name: string;
  detail: string | null;
  modes: string;
  address: string;
  roadAddress: string | null;
  placeName: string | null;
  lat: number;
  lng: number;
  hostName: string | null;
  eventAt: Date | null;
  greeting: string | null;
  imageUrl: string | null;
  theme: string;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  submitLabel: string;
  storageReady: boolean;
};

const inputCls =
  "w-full rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

/** 도착지 생성/수정 폼. /new 와 /admin/[key] 에서 같이 쓴다. */
export default function PlaceForm({ action, initial, submitLabel, storageReady }: Props) {
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
  const [modes, setModes] = useState<ModeId[]>(initial ? parseModes(initial.modes) : ["map"]);

  // 커버 미리보기용 상태
  const [name, setName] = useState(initial?.name ?? "");
  const [hostName, setHostName] = useState(initial?.hostName ?? "");
  const [eventAtLocal, setEventAtLocal] = useState(toDatetimeLocal(initial?.eventAt));
  const [greeting, setGreeting] = useState(initial?.greeting ?? "");
  const [theme, setTheme] = useState<ThemeId>((initial?.theme as ThemeId) ?? "rose");
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);

  return (
    <form action={formAction} className="space-y-6">
      <Field label="안내 페이지 이름" hint="손님에게 보이는 제목이에요.">
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 민수네 집들이"
          className={inputCls}
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
          className={inputCls}
        />
      </Field>

      <Field label="경로 안내 방식" hint="여러 개 고르면 손님이 그중에서 골라 볼 수 있어요.">
        <ModePicker value={modes} onChange={setModes} />
        {modes.map((m) => (
          <input key={m} type="hidden" name="modes" value={m} />
        ))}
      </Field>

      {/* ───── 초대 커버 ───── */}
      <div className="border-t border-neutral-200 pt-6">
        <h2 className="text-base font-bold">초대 커버</h2>
        <p className="mt-0.5 mb-4 text-xs text-neutral-500">
          손님이 링크를 열면 가장 먼저 보는 화면이에요. 비워두면 기본 디자인으로 나가요.
        </p>

        <div className="space-y-5">
          <Field label="사진">
            <ImageUpload initialUrl={initial?.imageUrl} disabled={!storageReady} onChange={setImagePreview} />
          </Field>

          <Field label="초대하는 사람">
            <input
              name="hostName"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="예: 민수 & 지영"
              className={inputCls}
            />
          </Field>

          <Field label="행사 일시">
            <input
              type="datetime-local"
              value={eventAtLocal}
              onChange={(e) => setEventAtLocal(e.target.value)}
              className={inputCls}
            />
            {/* 서버(UTC)에서 시간대가 어긋나지 않게 한국 시간 오프셋을 붙여 보낸다 */}
            <input type="hidden" name="eventAt" value={eventAtLocal ? `${eventAtLocal}:00+09:00` : ""} />
          </Field>

          <Field label="인사말">
            <textarea
              name="greeting"
              rows={3}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder={"예: 드디어 이사했어요!\n편하게 오셔서 저녁 같이 해요 :)"}
              className={inputCls}
            />
          </Field>

          <Field label="색상 테마">
            <ThemePicker value={theme} onChange={setTheme} />
            <input type="hidden" name="theme" value={theme} />
          </Field>

          <Field label="미리보기">
            <div className="overflow-hidden rounded-2xl ring-1 ring-neutral-200">
              <Cover
                preview
                data={{
                  name: name || "안내 페이지 이름",
                  hostName,
                  eventAt: eventAtLocal ? `${eventAtLocal}:00+09:00` : null,
                  greeting,
                  imageUrl: imagePreview,
                  theme,
                  placeName: dest?.placeName,
                  address: dest?.roadAddress ?? dest?.address ?? "도착지 주소",
                }}
              />
            </div>
          </Field>
        </div>
      </div>

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
      {!hint && <div className="mb-2" />}
      {children}
    </div>
  );
}
