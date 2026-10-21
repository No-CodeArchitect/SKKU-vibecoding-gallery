// 사이트 미디어(영상·이미지) 저장소.
// - 파일: Supabase Storage 버킷 "media" (공개). 브라우저가 서명 URL로 직접 업로드한다.
// - 목록: 같은 버킷의 _meta/items.json (SQL 불필요). 관리자만 쓰므로 동시성 문제 없음.
// - Supabase 미설정이면 인메모리(유튜브 링크만 동작).
// 슬롯: "about"(홈 해커톤 소개 대표 영상, 1개) / "sketch"(교육 현장 스케치, 여러 개)

import "server-only";
import { getSupabase } from "./supabase";

export type MediaSlot = "about" | "sketch";
export type MediaKind = "youtube" | "video" | "image";

export interface MediaItem {
  id: string;
  slot: MediaSlot;
  kind: MediaKind;
  title: string;
  youtubeId?: string; // kind=youtube
  url?: string; // kind=video|image (공개 URL)
  path?: string; // 스토리지 경로 (삭제용)
  createdAt: string;
}

export const BUCKET = "media";
const META_PATH = "_meta/items.json";
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // Supabase 무료 플랜 파일당 한도

const g = globalThis as unknown as { __vgMedia?: MediaItem[] };
const mem: MediaItem[] = g.__vgMedia ?? (g.__vgMedia = []);

async function readAll(): Promise<MediaItem[]> {
  const sb = getSupabase();
  if (!sb) return [...mem];
  try {
    const { data, error } = await sb.storage.from(BUCKET).download(META_PATH);
    if (error || !data) return [];
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? (parsed as MediaItem[]) : [];
  } catch {
    return [];
  }
}

export async function ensureBucket(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_BYTES,
  });
  // 이미 있으면 정상. 그 외 오류는 업로드 단계에서 드러난다.
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.warn("[media] createBucket:", error.message);
  }
}

async function writeAll(items: MediaItem[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    mem.length = 0;
    mem.push(...items);
    return;
  }
  await ensureBucket();
  const body = new Blob([JSON.stringify(items, null, 2)], {
    type: "application/json",
  });
  const { error } = await sb.storage.from(BUCKET).upload(META_PATH, body, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw new Error(`미디어 목록 저장 실패: ${error.message}`);
}

// 최신순 목록 (슬롯별). 기본값은 포함하지 않는다 (관리자 화면용).
export async function listMedia(slot: MediaSlot): Promise<MediaItem[]> {
  return (await readAll())
    .filter((m) => m.slot === slot)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// 홈 해커톤 소개 영상: 관리자가 올린 최신 1개. 없으면 null (홈에 자리표시 표시).
export async function getAboutMedia(): Promise<MediaItem | null> {
  return (await listMedia("about"))[0] ?? null;
}

export function publicUrlFor(path: string): string {
  const sb = getSupabase();
  return sb ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : "";
}

export async function addMedia(
  input: Omit<MediaItem, "id" | "createdAt">
): Promise<MediaItem> {
  const item: MediaItem = {
    ...input,
    id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const all = await readAll();
  // 소개 영상은 1개만 유지 (이전 것은 대체)
  const replaced =
    item.slot === "about" ? all.filter((m) => m.slot === "about") : [];
  const kept =
    item.slot === "about" ? all.filter((m) => m.slot !== "about") : all;
  await writeAll([...kept, item]);
  await removeFiles(replaced);
  return item;
}

async function removeFiles(items: MediaItem[]): Promise<void> {
  const sb = getSupabase();
  const paths = items.map((m) => m.path).filter((p): p is string => !!p);
  if (!sb || paths.length === 0) return;
  try {
    await sb.storage.from(BUCKET).remove(paths);
  } catch {
    /* 파일 정리 실패는 무시 (목록에서는 이미 제거됨) */
  }
}

export async function removeMedia(id: string): Promise<void> {
  const all = await readAll();
  const target = all.find((m) => m.id === id);
  if (!target) return;
  await writeAll(all.filter((m) => m.id !== id));
  await removeFiles([target]);
}
