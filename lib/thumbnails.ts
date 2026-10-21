// 작품 썸네일(대표 이미지) — 참가자가 직접 올리고, 관리자가 교체·삭제할 수 있다.
// 파일은 서버를 거치지 않고 브라우저가 서명 URL로 Supabase Storage(media/thumbs/)에 바로 올린다.
// 저장(등록 폼 제출) 시점에 서버가 경로·크기·형식을 다시 확인한다.

import "server-only";
import { getSupabase } from "./supabase";
import { BUCKET, ensureBucket, publicUrlFor } from "./media-items";

export const MAX_THUMB_BYTES = 5 * 1024 * 1024; // 브라우저에서 줄여서 올리므로 보통 1MB 이하
export const THUMB_EXTS = ["jpg", "jpeg", "png", "webp"] as const;
const DIR = "thumbs";

// 작품(레코드)별 파일 이름 접두어 — 남의 작품 경로를 끼워 넣지 못하게 한다.
function prefixFor(recordId: string): string {
  return `${DIR}/${recordId}-`;
}

export async function createThumbUpload(
  recordId: string,
  ext: string
): Promise<{ signedUrl: string; path: string; publicUrl: string }> {
  const e = ext.toLowerCase();
  if (!(THUMB_EXTS as readonly string[]).includes(e)) {
    throw new Error("jpg·png·webp 이미지만 올릴 수 있습니다.");
  }
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase가 설정되지 않아 업로드할 수 없습니다.");
  await ensureBucket();
  const path = `${prefixFor(recordId)}${Date.now().toString(36)}.${e === "jpeg" ? "jpg" : e}`;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`업로드 주소 발급 실패: ${error?.message ?? "알 수 없음"}`);
  return { signedUrl: data.signedUrl, path, publicUrl: publicUrlFor(path) };
}

// 올라간 파일이 이 작품의 것이고, 실제로 존재하며, 크기 제한 안인지 확인.
export async function verifyThumb(recordId: string, path: string): Promise<string> {
  if (!path.startsWith(prefixFor(recordId)) || path.includes("..")) {
    throw new Error("썸네일 경로가 올바르지 않습니다.");
  }
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase가 설정되지 않았습니다.");
  const name = path.slice(DIR.length + 1);
  const { data, error } = await sb.storage.from(BUCKET).list(DIR, { search: name, limit: 5 });
  const file = data?.find((f) => f.name === name);
  if (error || !file) throw new Error("썸네일 파일을 찾을 수 없습니다. 다시 올려 주세요.");
  const size = Number((file.metadata as { size?: number } | null)?.size ?? 0);
  if (size > MAX_THUMB_BYTES) {
    await removeThumbFile(path);
    throw new Error("썸네일이 5MB를 넘습니다.");
  }
  return publicUrlFor(path);
}

export async function removeThumbFile(path: string | null): Promise<void> {
  const sb = getSupabase();
  if (!sb || !path) return;
  await sb.storage.from(BUCKET).remove([path]).catch(() => {});
}

// AI 분석 입력용으로 썸네일을 읽는다 (없거나 실패하면 null).
export async function loadThumbForAi(
  path: string | null
): Promise<{ mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string } | null> {
  const sb = getSupabase();
  if (!sb || !path) return null;
  try {
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    const bytes = Buffer.from(await data.arrayBuffer());
    if (bytes.byteLength > 3_700_000) return null; // AI 이미지 입력 한도(5MB, base64 기준) 여유
    const ext = path.split(".").pop();
    const mediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return { mediaType, base64: bytes.toString("base64") };
  } catch {
    return null;
  }
}
