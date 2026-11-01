// 갤러리 카드 순서 (섹션 갤러리 · 심사위원 화면 공용).
// 순위 공개 후에는 순위순(순위 없는 작품은 뒤로), 그 외에는 최신 공개순.

import type { Project } from "./types";

export function sortForGallery<T extends Pick<Project, "rank" | "publishedAt">>(
  projects: T[],
  rankRevealed: boolean
): T[] {
  return [...projects].sort((a, b) => {
    if (rankRevealed) {
      const ar = a.rank ?? Infinity;
      const br = b.rank ?? Infinity;
      if (ar !== br) return ar - br;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}
