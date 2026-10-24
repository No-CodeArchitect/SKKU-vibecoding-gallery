// 평가 기록 (누적). 동료평가·심사위원 채점이 제출·수정될 때마다 한 줄씩 쌓인다.
// scores / judge_scores 는 "현재 점수"(덮어쓰기), 이 테이블은 "변경 이력"(추가만).
// Supabase 활성 시 score_history 테이블, 아니면 인메모리(globalThis) 폴백.
// 테이블 스키마: SUPABASE_SCHEMA_SKKU.sql / SUPABASE_MIGRATION_SKKU.md

import "server-only";
import { getSupabase } from "./supabase";

export type RaterType = "peer" | "judge";

export interface ScoreHistoryEntry {
  projectId: string;
  cohortId: string;
  raterType: RaterType;
  raterId: string; // 동료: 섹션 가입 ID, 심사위원: 이메일
  raterName: string; // 기록 시점의 이름 (동료: "닉네임 (실명)", 심사위원: 이름)
  completeness: number;
  creativity: number;
  comment: string;
  createdAt: string;
}

const g = globalThis as unknown as { __vgScoreHistory?: ScoreHistoryEntry[] };
const mem: ScoreHistoryEntry[] = g.__vgScoreHistory ?? (g.__vgScoreHistory = []);

type Row = {
  project_id: string;
  cohort_id: string;
  rater_type: RaterType;
  rater_id: string;
  rater_name: string;
  completeness: number;
  creativity: number;
  comment: string | null;
  created_at: string;
};
const fromRow = (r: Row): ScoreHistoryEntry => ({
  projectId: r.project_id,
  cohortId: r.cohort_id,
  raterType: r.rater_type,
  raterId: r.rater_id,
  raterName: r.rater_name,
  completeness: r.completeness,
  creativity: r.creativity,
  comment: r.comment ?? "",
  createdAt: r.created_at,
});

// 기록 실패가 채점 자체를 막지 않도록 오류는 로그만 남긴다.
export async function appendScoreHistory(
  e: Omit<ScoreHistoryEntry, "createdAt">
): Promise<void> {
  const createdAt = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("score_history").insert({
      project_id: e.projectId,
      cohort_id: e.cohortId,
      rater_type: e.raterType,
      rater_id: e.raterId,
      rater_name: e.raterName,
      completeness: e.completeness,
      creativity: e.creativity,
      comment: e.comment,
      created_at: createdAt,
    });
    if (error) console.error("[score-history] 기록 실패 (마이그레이션 필요?):", error.message);
    return;
  }
  mem.push({ ...e, createdAt });
}

// 최신순. projectId 또는 cohortId 로 거른다.
export async function listScoreHistory(
  filter: { projectId?: string; cohortId?: string }
): Promise<ScoreHistoryEntry[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb
      .from("score_history")
      .select("project_id,cohort_id,rater_type,rater_id,rater_name,completeness,creativity,comment,created_at")
      .order("created_at", { ascending: false });
    if (filter.projectId) q = q.eq("project_id", filter.projectId);
    if (filter.cohortId) q = q.eq("cohort_id", filter.cohortId);
    const { data, error } = await q;
    if (error) {
      console.warn("[score-history] 조회 실패:", error.message);
      return [];
    }
    return ((data ?? []) as Row[]).map(fromRow);
  }
  return mem
    .filter(
      (e) =>
        (!filter.projectId || e.projectId === filter.projectId) &&
        (!filter.cohortId || e.cohortId === filter.cohortId)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
