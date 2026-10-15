"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { analyzeProject } from "./analyze";
import { getStudent } from "./session";
import { getCohortById } from "./cohorts-store";
import { isAdmin } from "./admin-session";
import {
  deleteRecord,
  getRecord,
  recordIdFor,
  saveSubmission,
  updateRecord,
  type Submission,
} from "./projects-data";
import { removeThumbFile, verifyThumb } from "./thumbnails";
import { normalizePublicUrl } from "./url-safety";

export interface SubmitState {
  ok: boolean;
  error: string | null;
  fieldErrors?: Partial<Record<keyof Submission, string>>;
  values?: Submission; // 오류 시 입력값 유지용 (React 19 폼 자동 초기화 대응)
  thumbError?: string;
  thumbSaved?: string; // 저장까지 끝난 썸네일 경로
}

// 필드별 최대 길이
const LIMITS: Record<keyof Submission, number> = {
  title: 40,
  tagline: 80,
  liveUrl: 500,
  repoUrl: 500,
  problem: 600,
  features: 600,
  techStack: 200,
  militaryUseCase: 600,
  notes: 600,
};
const REQUIRED: (keyof Submission)[] = ["title", "tagline", "liveUrl", "problem", "features"];

// 교육생 작품 등록/수정 (1인 1작품). 채점 마감·순위 공개 후에는 잠긴다.
export async function submitProjectAction(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const cohort = await getCohortById(String(formData.get("cohortId") ?? ""));
  if (!cohort) return { ok: false, error: "섹션 정보를 찾을 수 없습니다." };
  const student = await getStudent(cohort.id);
  if (!student) return { ok: false, error: "이 섹션에 가입·수락된 교육생만 등록할 수 있습니다." };
  if (!cohort.scoringOpen || cohort.rankRevealed) {
    return { ok: false, error: "채점이 마감되어 작품 등록·수정이 잠겼습니다." };
  }

  const sub = {} as Submission;
  const fieldErrors: SubmitState["fieldErrors"] = {};
  for (const key of Object.keys(LIMITS) as (keyof Submission)[]) {
    const v = String(formData.get(key) ?? "").trim();
    if (REQUIRED.includes(key) && !v) fieldErrors[key] = "필수 항목입니다.";
    else if (v.length > LIMITS[key]) fieldErrors[key] = `${LIMITS[key]}자 이내로 입력해 주세요.`;
    sub[key] = v;
  }

  if (sub.liveUrl && !fieldErrors.liveUrl) {
    const url = normalizePublicUrl(sub.liveUrl);
    if (!url) {
      fieldErrors.liveUrl =
        "http:// 또는 https:// 로 시작하는 공개 배포 주소를 넣어 주세요. (localhost·내부망 주소 불가)";
    } else sub.liveUrl = url;
  }
  if (sub.repoUrl && !fieldErrors.repoUrl) {
    const url = normalizePublicUrl(sub.repoUrl);
    if (!url) fieldErrors.repoUrl = "올바른 공개 주소가 아닙니다.";
    else sub.repoUrl = url;
  }

  // 썸네일: 새로 올렸으면 경로 확인, 아니면 기존 것 유지. 첫 등록은 필수.
  const recordId = recordIdFor(student.id);
  const prev = await getRecord(recordId);
  const thumbPath = String(formData.get("thumbPath") ?? "").trim();
  let thumb: { url: string; path: string } | undefined;
  let thumbError: string | undefined;
  if (thumbPath && thumbPath !== prev?.thumbPath) {
    try {
      thumb = { url: await verifyThumb(recordId, thumbPath), path: thumbPath };
    } catch (err) {
      thumbError = (err as Error).message;
    }
  } else if (!prev?.thumbUrl) {
    thumbError = "썸네일 이미지를 올려 주세요.";
  }

  if (Object.keys(fieldErrors).length > 0 || thumbError) {
    return { ok: false, error: "입력 내용을 확인해 주세요.", fieldErrors, thumbError, values: sub };
  }

  try {
    await saveSubmission({
      cohortId: student.cohortId,
      authorId: student.id,
      authorName: student.name, // 닉네임 (공개 표시)
      submission: sub,
      thumb,
    });
  } catch (err) {
    return { ok: false, error: `저장에 실패했습니다: ${(err as Error).message}`, values: sub };
  }
  // 교체된 옛 썸네일 파일 정리
  if (thumb && prev?.thumbPath) await removeThumbFile(prev.thumbPath);

  // 아직 공개된 적 없는 작품(첫 등록)은 응답 후 바로 AI 분석 → 자동 공개.
  // 수정된 작품은 관리자가 「분석 실행」으로 다시 반영한다. 분석이 이미 도는 중이면 건너뜀.
  const analyzing =
    prev?.status === "processing" && Date.now() - new Date(prev.updatedAt).getTime() < 5 * 60_000;
  if (!prev?.ai && !analyzing) {
    after(async () => {
      await analyzeProject(recordId);
      revalidatePath(`/g/${cohort.slug}`);
    });
  }

  revalidatePath(`/g/${cohort.slug}`);
  revalidatePath(`/g/${cohort.slug}/submit`);
  revalidatePath("/admin");
  return { ok: true, error: null, values: sub, thumbSaved: thumb?.path ?? thumbPath };
}

// 관리자: 썸네일 교체 (업로드는 /api/thumb/sign 으로 먼저 끝낸 뒤 경로를 넘긴다)
export async function setThumbnailAction(
  id: string,
  path: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "관리자 권한이 필요합니다." };
  const rec = await getRecord(id);
  if (!rec) return { ok: false, error: "작품을 찾을 수 없습니다." };
  try {
    const url = await verifyThumb(id, path);
    await updateRecord(id, { thumbUrl: url, thumbPath: path });
    if (rec.thumbPath && rec.thumbPath !== path) await removeThumbFile(rec.thumbPath);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

// 관리자: 썸네일 내리기 (부적절한 이미지 등) → 카드는 플레이스홀더로 표시
export async function removeThumbnailAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("관리자 권한이 필요합니다.");
  const id = String(formData.get("id") ?? "");
  const rec = id ? await getRecord(id) : null;
  if (!rec?.thumbPath) return;
  await updateRecord(id, { thumbUrl: null, thumbPath: null });
  await removeThumbFile(rec.thumbPath);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

// 관리자: 작품 삭제 (썸네일 파일 포함)
export async function deleteProjectAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("관리자 권한이 필요합니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const removed = await deleteRecord(id);
  if (removed) await removeThumbFile(removed.thumbPath);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}
