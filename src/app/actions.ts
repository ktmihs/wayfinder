"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import { isModeId } from "@/lib/modes";

// 공유 ID는 URL에 들어가므로 헷갈리는 글자(0/O, 1/l)를 뺀 짧은 ID를 쓴다.
const shortId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);
const adminKey = customAlphabet("23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ", 24);

export type FormState = { error?: string; ok?: true } | null;

function parsePlaceForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const roadAddress = String(formData.get("roadAddress") ?? "").trim() || null;
  const placeName = String(formData.get("placeName") ?? "").trim() || null;
  const detail = String(formData.get("detail") ?? "").trim() || null;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const mode = String(formData.get("mode") ?? "map");

  if (!name) return { error: "안내 페이지 이름을 입력해 주세요." } as const;
  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "도착지 주소를 검색해서 목록에서 선택해 주세요." } as const;
  }
  if (!isModeId(mode)) return { error: "올바르지 않은 안내 방식이에요." } as const;

  return { data: { name, address, roadAddress, placeName, detail, lat, lng, mode } } as const;
}

export async function createPlace(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parsePlaceForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const place = await prisma.place.create({
    data: { id: shortId(), adminKey: adminKey(), ...parsed.data },
  });
  redirect(`/admin/${place.adminKey}?created=1`);
}

export async function updatePlace(
  key: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parsePlaceForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const existing = await prisma.place.findUnique({ where: { adminKey: key } });
  if (!existing) return { error: "존재하지 않는 관리 페이지예요." };

  await prisma.place.update({ where: { adminKey: key }, data: parsed.data });
  revalidatePath(`/admin/${key}`);
  revalidatePath(`/go/${existing.id}`);
  return { ok: true };
}

export async function deletePlace(key: string) {
  await prisma.place.delete({ where: { adminKey: key } });
  redirect("/");
}
