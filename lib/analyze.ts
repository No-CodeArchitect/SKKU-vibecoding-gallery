// 관리자 "분석 실행" 1건 처리: 배포 페이지 텍스트 수집 + 참가자 썸네일 → AI 분석 → 카드 공개.
// 서버리스 시간 제한 때문에 요청 1번 = 작품 1개. (관리자 화면이 대기 목록을 차례로 호출)

import "server-only";
import { getRecord, updateRecord, type ProjectRecord } from "./projects-data";
import { curateProject, hasApiKey } from "./pipeline/ai";
import { fetchPageText } from "./pipeline/page-text";
import { loadThumbForAi } from "./thumbnails";
import { assertPublicUrl } from "./url-safety";

export interface AnalyzeResult {
  ok: boolean;
  status: ProjectRecord["status"];
  title: string;
  hasThumb: boolean;
  mock: boolean;
  error?: string;
  notes: string[];
}

export async function analyzeProject(id: string): Promise<AnalyzeResult> {
  const rec = await getRecord(id);
  if (!rec) {
    return { ok: false, status: "failed", title: "", hasThumb: false, mock: false, error: "작품을 찾을 수 없습니다.", notes: [] };
  }
  const sub = rec.submission;
  const notes: string[] = [];
  await updateRecord(id, { status: "processing", error: null });

  try {
    const [image, pageText] = await Promise.all([
      loadThumbForAi(rec.thumbPath),
      fetchPageText(sub.liveUrl, assertPublicUrl).catch((err) => {
        notes.push(`페이지 텍스트 수집 실패: ${(err as Error).message}`);
        return "";
      }),
    ]);

    // 키가 있으면 실패 시 예외 → 임시(목) 결과로 공개되지 않게
    const c = await curateProject(
      {
        authorId: rec.authorId,
        authorName: rec.authorName,
        title: sub.title,
        tagline: sub.tagline,
        liveUrl: sub.liveUrl,
        repoUrl: sub.repoUrl,
        problem: sub.problem,
        features: sub.features,
        techStack: sub.techStack,
        militaryUseCase: sub.militaryUseCase,
        notes: sub.notes,
      },
      { image, pageText, strict: true }
    );

    const now = new Date().toISOString();
    const status = rec.thumbUrl ? "generated" : "capture_failed";
    await updateRecord(id, {
      ai: { ...c, mock: !hasApiKey() },
      status,
      needsAnalysis: false,
      error: null,
      analyzedAt: now,
      publishedAt: rec.publishedAt ?? now,
    });
    return { ok: true, status, title: sub.title, hasThumb: !!rec.thumbUrl, mock: !hasApiKey(), notes };
  } catch (err) {
    const message = (err as Error).message || "알 수 없는 오류";
    await updateRecord(id, { status: "failed", error: message.slice(0, 500) });
    return { ok: false, status: "failed", title: sub.title, hasThumb: !!rec.thumbUrl, mock: false, error: message, notes };
  }
}
