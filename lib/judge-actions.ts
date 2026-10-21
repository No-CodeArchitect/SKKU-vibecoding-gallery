"use server";

import { revalidatePath } from "next/cache";
import { getJudge } from "./judge-session";
import { setJudgeScore } from "./judge-scores-store";
import { getCohortById } from "./cohorts-store";
import { getProjectById } from "./projects-data";
import { parseRubricScore, SCORE_MAX } from "./scoring";

export interface JudgeScoreState {
  ok: boolean;
  error: string | null;
}

// 심사위원 채점. 결과 발표(순위 공개) 전까지 언제든 수정할 수 있다.
export async function submitJudgeScore(
  _prev: JudgeScoreState,
  formData: FormData
): Promise<JudgeScoreState> {
  const judge = await getJudge();
  if (!judge) return { ok: false, error: "등록된 심사위원만 채점할 수 있습니다." };

  const projectId = String(formData.get("projectId") ?? "");
  const project = await getProjectById(projectId);
  if (!project) return { ok: false, error: "프로젝트를 찾을 수 없습니다." };

  const cohort = await getCohortById(project.cohortId);
  if (!cohort || cohort.rankRevealed) {
    return { ok: false, error: "결과가 이미 발표되어 심사가 마감되었습니다." };
  }

  const completeness = parseRubricScore(formData.get("completeness"));
  const creativity = parseRubricScore(formData.get("creativity"));
  if (completeness === null || creativity === null) {
    return { ok: false, error: `두 항목 모두 1~${SCORE_MAX}점으로 선택해 주세요.` };
  }
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);

  try {
    await setJudgeScore({ projectId, judgeEmail: judge.email, completeness, creativity, comment });
  } catch (err) {
    console.error("[judge-score]", (err as Error).message);
    return { ok: false, error: "일시적인 오류로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/judge");
  revalidatePath("/admin");
  return { ok: true, error: null };
}
