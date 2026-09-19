import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서버 전용. Storage 업로드에 service role(secret) 키를 쓴다 — 절대 클라이언트로 내보내지 않는다.
export const COVER_BUCKET = "covers";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** 커버 이미지를 올리고 공개 URL을 돌려준다. */
export async function uploadCover(placeId: string, file: File): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("이미지 저장소가 설정되지 않았어요 (SUPABASE_URL / SUPABASE_SECRET_KEY).");

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const path = `${placeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);

  return supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 이전 커버 이미지 삭제 (실패해도 무시) */
export async function deleteCoverByUrl(url: string | null | undefined) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !url) return;
  const marker = `/object/public/${COVER_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  await supabase.storage.from(COVER_BUCKET).remove([url.slice(i + marker.length)]).catch(() => {});
}
