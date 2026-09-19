"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import { isModeId } from "@/lib/modes";
import { isThemeId } from "@/lib/themes";
import { deleteCoverByUrl, uploadCover } from "@/lib/supabase";

// 공유 ID는 URL에 들어가므로 헷갈리는 글자(0/O, 1/l)를 뺀 짧은 ID를 쓴다.
const shortId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);
const adminKey = customAlphabet("23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ", 24);

export type FormState = { error?: string; ok?: true } | null;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parsePlaceForm(formData: FormData) {
  const name = str(formData, "name");
  const address = str(formData, "address");
  const roadAddress = str(formData, "roadAddress") || null;
  const placeName = str(formData, "placeName") || null;
  const detail = str(formData, "detail") || null;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const mode = str(formData, "mode") || "map";

  // 온보딩(커버)
  const hostName = str(formData, "hostName") || null;
  const greeting = str(formData, "greeting") || null;
  const theme = str(formData, "theme") || "rose";
  const eventAtRaw = str(formData, "eventAt");
  const eventAt = eventAtRaw ? new Date(eventAtRaw) : null;

  const image = formData.get("image");
  const imageFile = image instanceof File && image.size > 0 ? image : null;
  const removeImage = formData.get("removeImage") === "1";

  if (!name) return { error: "안내 페이지 이름을 입력해 주세요." } as const;
  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "도착지 주소를 검색해서 목록에서 선택해 주세요." } as const;
  }
  if (!isModeId(mode)) return { error: "올바르지 않은 안내 방식이에요." } as const;
  if (!isThemeId(theme)) return { error: "올바르지 않은 테마예요." } as const;
  if (eventAt && Number.isNaN(eventAt.getTime())) return { error: "행사 일시가 올바르지 않아요." } as const;
  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) return { error: "이미지 파일만 올릴 수 있어요." } as const;
    if (imageFile.size > MAX_IMAGE_BYTES) return { error: "이미지가 너무 커요 (4MB 이하)." } as const;
  }

  return {
    data: { name, address, roadAddress, placeName, detail, lat, lng, mode, hostName, greeting, theme, eventAt },
    imageFile,
    removeImage,
  } as const;
}

export async function createPlace(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parsePlaceForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const place = await prisma.place.create({
    data: { id: shortId(), adminKey: adminKey(), ...parsed.data },
  });

  if (parsed.imageFile) {
    try {
      const imageUrl = await uploadCover(place.id, parsed.imageFile);
      await prisma.place.update({ where: { id: place.id }, data: { imageUrl } });
    } catch (e) {
      // 이미지만 실패해도 페이지는 만들어졌으니 관리 페이지로 보내고 거기서 다시 올리게 한다
      console.error("[createPlace] 이미지 업로드 실패:", e);
      redirect(`/admin/${place.adminKey}?created=1&imageError=1`);
    }
  }
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

  let imageUrl = existing.imageUrl;
  try {
    if (parsed.imageFile) {
      imageUrl = await uploadCover(existing.id, parsed.imageFile);
      await deleteCoverByUrl(existing.imageUrl);
    } else if (parsed.removeImage) {
      await deleteCoverByUrl(existing.imageUrl);
      imageUrl = null;
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  await prisma.place.update({ where: { adminKey: key }, data: { ...parsed.data, imageUrl } });
  revalidatePath(`/admin/${key}`);
  revalidatePath(`/go/${existing.id}`);
  return { ok: true };
}

export async function deletePlace(key: string) {
  const existing = await prisma.place.findUnique({ where: { adminKey: key } });
  if (existing) {
    await deleteCoverByUrl(existing.imageUrl);
    await prisma.place.delete({ where: { adminKey: key } });
  }
  redirect("/");
}
