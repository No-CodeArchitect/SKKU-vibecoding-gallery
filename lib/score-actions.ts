"use server";

import { revalidatePath } from "next/cache";
import { getStudent } from "./session";
import { setScore } from "./scores-store";
import { getCohortById } from "./cohorts-store";
import { getProjectById } from "./projects-data";
import { parseRubricScore, SCORE_MAX } from "./scoring";

export interface ScoreState {
  ok: boolean;
  error: string | null;
}

export async function submitScore(
  _prevState: ScoreState,
  formData: FormData
): Promise<ScoreState> {
  const projectId = String(formData.get("projectId") ?? "");
  const project = await getProjectById(projectId);
  if (!project) {
    return { ok: false, error: "프로젝트를 찾을 수 없습니다." };
  }

  // 이 섹션에서 수락된 참가자만 채점 (섹션 간 분리)
  const student = await getStudent(project.cohortId);
  if (!student) {
    return { ok: false, error: "이 섹션에 가입·수락된 참가자만 채점할 수 있습니다." };
  }

  const cohort = await getCohortById(student.cohortId);
  if (!cohort?.scoringOpen) {
    return { ok: false, error: "채점이 마감되었습니다." };
  }

  // 본인 프로젝트 채점 차단 (서버측 검증).
  if (project.authorId === student.id) {
    return { ok: false, error: "본인 프로젝트는 채점할 수 없습니다." };
  }

  const completeness = parseRubricScore(formData.get("completeness"));
  const creativity = parseRubricScore(formData.get("creativity"));
  if (completeness === null || creativity === null) {
    return { ok: false, error: `두 항목 모두 1~${SCORE_MAX}점으로 선택해 주세요.` };
  }

  try {
    await setScore(projectId, student.id, completeness, creativity);
  } catch (err) {
    console.error("[score]", (err as Error).message);
    return { ok: false, error: "일시적인 오류로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath(`/g/${cohort.slug}`);
  revalidatePath(`/project/${projectId}`);
  return { ok: true, error: null };
}
