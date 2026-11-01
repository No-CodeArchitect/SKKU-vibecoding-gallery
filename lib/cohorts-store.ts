// 섹션(기수/과정) 저장소. Supabase 활성 + cohorts 테이블이 있으면 그걸 쓰고,
// 테이블이 없거나 오류면 인메모리로 자동 폴백한다(마이그레이션 전에도 안 깨짐).

import "server-only";
import { getSupabase } from "./supabase";

export interface Cohort {
  id: string;
  slug: string;
  name: string;
  scoringOpen: boolean;
  rankRevealed: boolean;
  minRaters: number; // 순위에 들기 위한 최소 채점 인원
  createdAt: string;
}

export const DEFAULT_MIN_RATERS = 3;

const DEFAULT_COHORT: Cohort = {
  id: "c1",
  slug: "1cha",
  name: "바이브코딩 해커톤 1차",
  scoringOpen: true,
  rankRevealed: false,
  minRaters: DEFAULT_MIN_RATERS,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const g = globalThis as unknown as { __vgCohorts?: Cohort[] };
const mem: Cohort[] = g.__vgCohorts ?? (g.__vgCohorts = [{ ...DEFAULT_COHORT }]);

type Row = {
  id: string;
  slug: string;
  name: string;
  scoring_open: boolean;
  rank_revealed: boolean;
  min_raters?: number | null; // 마이그레이션 전에는 없을 수 있음
  created_at: string;
};
const fromRow = (r: Row): Cohort => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  scoringOpen: r.scoring_open,
  rankRevealed: r.rank_revealed,
  minRaters: r.min_raters ?? DEFAULT_MIN_RATERS,
  createdAt: r.created_at,
});

export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `section-${Date.now().toString(36)}`;
}

export async function listCohorts(): Promise<Cohort[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("cohorts")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) return (data as Row[]).map(fromRow);
    } catch {
      /* 테이블 없음/네트워크 → 폴백 */
    }
  }
  return [...mem].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// URL 경로의 [slug] 는 퍼센트 인코딩된 채로 들어온다 (예: "2기" → "2%EA%B8%B0").
// 한글 링크 주소도 찾을 수 있게 디코딩해서 비교한다.
function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).normalize("NFC");
  } catch {
    return raw;
  }
}

export async function getCohortBySlug(rawSlug: string): Promise<Cohort | null> {
  const slug = decodeSlug(rawSlug);
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("cohorts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!error) return data ? fromRow(data as Row) : null;
    } catch {
      /* 폴백 */
    }
  }
  return mem.find((c) => c.slug === slug) ?? null;
}

export async function getCohortById(id: string): Promise<Cohort | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("cohorts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error) return data ? fromRow(data as Row) : null;
    } catch {
      /* 폴백 */
    }
  }
  return mem.find((c) => c.id === id) ?? null;
}

export async function createCohort(
  name: string,
  slugInput?: string
): Promise<Cohort> {
  const cohort: Cohort = {
    id: `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    slug: slugify(slugInput || name),
    name: name.trim(),
    scoringOpen: true,
    rankRevealed: false,
    minRaters: DEFAULT_MIN_RATERS,
    createdAt: new Date().toISOString(),
  };
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from("cohorts").insert({
        id: cohort.id,
        slug: cohort.slug,
        name: cohort.name,
        scoring_open: true,
        rank_revealed: false,
        created_at: cohort.createdAt,
      });
      if (!error) return cohort;
    } catch {
      /* 폴백 */
    }
  }
  mem.push(cohort);
  return cohort;
}

export async function setCohortScoringOpen(
  id: string,
  v: boolean
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb
        .from("cohorts")
        .update({ scoring_open: v })
        .eq("id", id);
      if (!error) return;
    } catch {
      /* 폴백 */
    }
  }
  const c = mem.find((x) => x.id === id);
  if (c) c.scoringOpen = v;
}

export async function setCohortRankRevealed(
  id: string,
  v: boolean
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb
        .from("cohorts")
        .update({ rank_revealed: v })
        .eq("id", id);
      if (!error) return;
    } catch {
      /* 폴백 */
    }
  }
  const c = mem.find((x) => x.id === id);
  if (c) c.rankRevealed = v;
}

// 섹션 이름·링크 주소 변경. 다른 섹션이 이미 쓰는 링크면 거절한다.
// 링크가 바뀌면 예전 링크(/g/옛주소)는 더 이상 열리지 않는다.
export async function updateCohortInfo(
  id: string,
  nameInput: string,
  slugInput: string
): Promise<{ ok: boolean; error: string | null }> {
  const name = nameInput.trim();
  const slug = slugify(slugInput || name);
  if (!name) return { ok: false, error: "섹션 이름을 입력해 주세요." };
  const other = await getCohortBySlug(slug);
  if (other && other.id !== id) return { ok: false, error: `「${slug}」 링크는 다른 섹션이 쓰고 있습니다.` };

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("cohorts").update({ name, slug }).eq("id", id);
    if (!error) return { ok: true, error: null };
    if (process.env.VERCEL) return { ok: false, error: `저장 실패: ${error.message}` };
  }
  const c = mem.find((x) => x.id === id);
  if (c) {
    c.name = name;
    c.slug = slug;
  }
  return { ok: true, error: null };
}

export async function setCohortMinRaters(id: string, n: number): Promise<void> {
  const v = Math.max(1, Math.min(50, Math.round(n)));
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("cohorts").update({ min_raters: v }).eq("id", id);
    if (!error) return;
    if (process.env.VERCEL) {
      throw new Error("cohorts.min_raters 칸이 없습니다 (SUPABASE_MIGRATION_QC.md 의 SQL 실행 필요)");
    }
  }
  const c = mem.find((x) => x.id === id);
  if (c) c.minRaters = v;
}
