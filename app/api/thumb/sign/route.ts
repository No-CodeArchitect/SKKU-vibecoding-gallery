import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getStudent } from "@/lib/session";
import { getCohortById } from "@/lib/cohorts-store";
import { getRecord, recordIdFor } from "@/lib/projects-data";
import { createThumbUpload, MAX_THUMB_BYTES } from "@/lib/thumbnails";

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// 썸네일 업로드용 서명 URL 발급.
// - 참가자: 본인 작품 경로만 (채점 마감 전까지)
// - 관리자: body.recordId 로 어떤 작품이든
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    ext?: string;
    size?: number;
    recordId?: string;
    cohortId?: string;
  } | null;
  const ext = String(body?.ext ?? "");
  if (!body?.size || body.size > MAX_THUMB_BYTES) {
    return bad("이미지가 5MB를 넘습니다.");
  }

  let recordId: string;
  if (body.recordId) {
    if (!(await isAdmin())) return bad("관리자 권한이 필요합니다.", 401);
    if (!(await getRecord(body.recordId))) return bad("작품을 찾을 수 없습니다.", 404);
    recordId = body.recordId;
  } else {
    const cohort = await getCohortById(String(body.cohortId ?? ""));
    const student = cohort ? await getStudent(cohort.id) : null;
    if (!cohort || !student) return bad("이 섹션에 가입·수락된 참가자만 올릴 수 있습니다.", 401);
    if (!cohort.scoringOpen || cohort.rankRevealed) {
      return bad("채점이 마감되어 작품 등록·수정이 잠겼습니다.", 403);
    }
    recordId = recordIdFor(student.id);
  }

  try {
    return NextResponse.json(await createThumbUpload(recordId, ext));
  } catch (err) {
    return bad((err as Error).message, 500);
  }
}
