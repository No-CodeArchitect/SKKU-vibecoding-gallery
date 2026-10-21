// 심사위원 채점 저장소. Supabase 활성 시 judge_scores 테이블, 아니면 인메모리(globalThis) 폴백.
// 테이블 스키마: SUPABASE_MIGRATION_SKKU.md

import "server-only";
import { getSupabase } from "./supabase";

export interface JudgeScoreRow {
  projectId: string;
  judgeEmail: string;
  completeness: number; // 1~10
  creativity: number; // 1~10
  comment: string;
}

// key: `${projectId}::${judgeEmail}`
const g = globalThis as unknown as { __vgJudgeScores?: Map<string, JudgeScoreRow> };
const mem: Map<string, JudgeScoreRow> = g.__vgJudgeScores ?? (g.__vgJudgeScores = new Map());
const key = (p: string, j: string) => `${p}::${j}`;

type Row = {
  project_id: string;
  judge_email: string;
  completeness: number;
  creativity: number;
  comment: string | null;
};
const fromRow = (r: Row): JudgeScoreRow => ({
  projectId: r.project_id,
  judgeEmail: r.judge_email,
  completeness: r.completeness,
  creativity: r.creativity,
  comment: r.comment ?? "",
});

export async function setJudgeScore(row: JudgeScoreRow): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("judge_scores").upsert(
      {
        project_id: row.projectId,
        judge_email: row.judgeEmail,
        completeness: row.completeness,
        creativity: row.creativity,
        comment: row.comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,judge_email" }
    );
    if (error) throw new Error(`심사 점수 저장 실패: ${error.message}`);
    return;
  }
  mem.set(key(row.projectId, row.judgeEmail), row);
}

// 순위/집계용: 전체 심사 행을 한 번에.
export async function allJudgeScoreRows(): Promise<JudgeScoreRow[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("judge_scores")
      .select("project_id,judge_email,completeness,creativity,comment");
    if (!error) return ((data ?? []) as Row[]).map(fromRow);
    console.warn("[judge-scores] 조회 실패 (마이그레이션 필요?):", error.message);
    return [];
  }
  return [...mem.values()];
}

export async function judgeScoresBy(judgeEmail: string): Promise<Map<string, JudgeScoreRow>> {
  const out = new Map<string, JudgeScoreRow>();
  for (const r of await allJudgeScoreRows()) {
    if (r.judgeEmail === judgeEmail) out.set(r.projectId, r);
  }
  return out;
}
