"use server";

import { revalidatePath } from "next/cache";
import { getStudent } from "./session";
import { addComment, findNickname, listComments } from "./comments-store";
import { generateNickname } from "./pipeline/ai";
import { getProjectById } from "./projects-data";

export interface CommentState {
  ok: boolean;
  error: string | null;
}

const MAX_LEN = 500;

export async function postComment(
  _prevState: CommentState,
  formData: FormData
): Promise<CommentState> {
  const projectId = String(formData.get("projectId") ?? "");
  const project = await getProjectById(projectId);
  if (!project) {
    return { ok: false, error: "프로젝트를 찾을 수 없습니다." };
  }

  // 이 섹션에서 수락된 교육생만 댓글 (섹션 간 분리)
  const student = await getStudent(project.cohortId);
  if (!student) {
    return { ok: false, error: "이 섹션에 가입·수락된 교육생만 댓글을 남길 수 있습니다." };
  }

  const body = String(formData.get("body") ?? "").trim();
  if (body.length === 0) {
    return { ok: false, error: "댓글 내용을 입력해 주세요." };
  }
  if (body.length > MAX_LEN) {
    return { ok: false, error: `댓글은 ${MAX_LEN}자 이내로 작성해 주세요.` };
  }

  const isAuthorReply = project.authorId === student.id;
  // 위트 닉네임 생성: ANTHROPIC_API_KEY 있으면 Opus 4.8, 없으면 규칙 기반 목.
  // 같은 작품에서는 같은 별칭 유지 (작품이 다르면 다른 별칭 → 작품 간 동일인 추정 어렵게)
  let aiNickname = await findNickname(projectId, student.id);
  if (!aiNickname) {
    aiNickname = await generateNickname(body, student.id + project.id);
    // 같은 작품의 다른 사람과 별칭이 겹치면 번호를 붙여 구분
    const taken = new Set(
      (await listComments(projectId)).filter((c) => c.authorId !== student.id).map((c) => c.aiNickname)
    );
    const base = aiNickname;
    for (let n = 2; taken.has(aiNickname); n++) aiNickname = `${base}${n}`;
  }

  await addComment({
    projectId,
    authorId: student.id,
    authorName: student.realName, // 관리자 모더레이션용 (공개 화면엔 AI 닉네임)
    aiNickname,
    body,
    isAuthorReply,
  });

  revalidatePath(`/project/${projectId}`);
  return { ok: true, error: null };
}
