// 채점 저장소. Supabase 활성 시 scores 테이블, 아니면 인메모리(globalThis) 폴백.

import "server-only";
import { getSupabase } from "./supabase";

export interface Score {
  completeness: number; // 완성도/작동성 (1~10)
  creativity: number; // 창의성/아이디어 (1~10)
  updatedAt: string;
}

export interface ScoreRow {
  projectId: string;
  studentId: string;
  completeness: number;
  creativity: number;
}

// key: `${projectId}::${studentId}`
const g = globalThis as unknown as { __vgScores?: Map<string, Score> };
const mem: Map<string, Score> = g.__vgScores ?? (g.__vgScores = new Map());
const key = (p: string, s: string) => `${p}::${s}`;

export async function getScore(
  projectId: string,
  studentId: string
): Promise<Score | null> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("scores")
      .select("completeness,creativity,updated_at")
      .eq("project_id", projectId)
      .eq("student_id", studentId)
      .maybeSingle();
    return data
      ? {
          completeness: data.completeness,
          creativity: data.creativity,
          updatedAt: data.updated_at ?? "",
        }
      : null;
  }
  return mem.get(key(projectId, studentId)) ?? null;
}

export async function setScore(
  projectId: string,
  studentId: string,
  completeness: number,
  creativity: number
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("scores").upsert(
      {
        project_id: projectId,
        student_id: studentId,
        completeness,
        creativity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,student_id" }
    );
    // 10점 루브릭 마이그레이션(SUPABASE_MIGRATION_SKKU.md) 전이면 check 제약에 걸린다
    if (error) throw new Error(`채점 저장 실패: ${error.message}`);
    return;
  }
  mem.set(key(projectId, studentId), {
    completeness,
    creativity,
    updatedAt: new Date().toISOString(),
  });
}

// 순위/집계용: 전체 채점 행을 한 번에.
export async function allScoreRows(): Promise<ScoreRow[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("scores")
      .select("project_id,student_id,completeness,creativity");
    return (data ?? []).map((r) => ({
      projectId: r.project_id,
      studentId: r.student_id,
      completeness: r.completeness,
      creativity: r.creativity,
    }));
  }
  const rows: ScoreRow[] = [];
  for (const [k, v] of mem.entries()) {
    const [projectId, studentId] = k.split("::");
    rows.push({
      projectId,
      studentId,
      completeness: v.completeness,
      creativity: v.creativity,
    });
  }
  return rows;
}

export async function scoredProjectIds(
  studentId: string
): Promise<Set<string>> {
  const rows = await allScoreRows();
  const ids = new Set<string>();
  for (const r of rows) if (r.studentId === studentId) ids.add(r.projectId);
  return ids;
}

// 특정 섹션(프로젝트 집합)에서 채점에 참여한 서로 다른 학생 수.
export async function distinctRaterCountFor(
  projectIds: Set<string>
): Promise<number> {
  const rows = await allScoreRows();
  const set = new Set<string>();
  for (const r of rows) if (projectIds.has(r.projectId)) set.add(r.studentId);
  return set.size;
}

// 집계(평균/인원)를 프로젝트별 Map으로. (동료·심사위원 채점 공용)
export function aggregateRows(
  rows: { projectId: string; completeness: number; creativity: number }[]
): Map<string, { avg: number; count: number }> {
  const acc = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const cur = acc.get(r.projectId) ?? { sum: 0, count: 0 };
    cur.sum += (r.completeness + r.creativity) / 2;
    cur.count += 1;
    acc.set(r.projectId, cur);
  }
  const out = new Map<string, { avg: number; count: number }>();
  for (const [pid, v] of acc.entries()) {
    out.set(pid, { avg: v.sum / v.count, count: v.count });
  }
  return out;
}
