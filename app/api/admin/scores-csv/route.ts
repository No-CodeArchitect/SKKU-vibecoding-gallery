import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getProjectById, getProjects } from "@/lib/projects-data";
import { getCohortById } from "@/lib/cohorts-store";
import { listScoreHistory } from "@/lib/score-history-store";
import { rankProjects } from "@/lib/ranking";
import { getWeights } from "@/lib/weights-store";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"); // BOM: 엑셀 한글

const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

// 관리자 전용 평가 데이터 내보내기.
//  ?projectId=…            → 그 작품의 평가 기록(누적)
//  ?cohortId=…             → 섹션 전체 평가 기록(누적)
//  ?cohortId=…&type=final  → 섹션 최종 순위·항목별 점수
export async function GET(req: Request) {
  if (!(await isAdmin())) return new NextResponse("forbidden", { status: 403 });
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const cohortId = url.searchParams.get("cohortId") ?? undefined;
  const type = url.searchParams.get("type");

  let csv: string;
  let name: string;

  if (cohortId && type === "final") {
    const cohort = await getCohortById(cohortId);
    if (!cohort) return new NextResponse("not found", { status: 404 });
    const w = await getWeights();
    const ranked = (await rankProjects(await getProjects(cohortId), cohort.minRaters)).sort(
      (a, b) => (a.rank ?? 9999) - (b.rank ?? 9999)
    );
    csv = toCsv([
      ["순위", "작품", "제작자", `동료(/${w.peer})`, "동료 평균(/10)", "동료 인원", `심사위원(/${w.judge})`, "심사 평균(/10)", "심사위원 인원", `AI(/${w.ai})`, "AI 평균(/5)", "종합(/100)"],
      ...ranked.map((p) => {
        const b = p.breakdown!;
        return [
          p.rank ?? "제외",
          p.title,
          p.authorName,
          b.peerPoints.toFixed(2),
          b.peerAvg?.toFixed(2) ?? "",
          p.raterCount,
          b.judgePoints.toFixed(2),
          b.judgeAvg?.toFixed(2) ?? "",
          b.judgeCount,
          b.aiPoints.toFixed(2),
          b.aiAvg.toFixed(1),
          p.totalScore?.toFixed(2) ?? "",
        ];
      }),
    ]);
    name = `final-${cohort.slug}`;
  } else if (projectId || cohortId) {
    const history = await listScoreHistory({ projectId, cohortId });
    const titles = new Map<string, string>();
    if (projectId) {
      const p = await getProjectById(projectId);
      if (!p) return new NextResponse("not found", { status: 404 });
      titles.set(p.id, p.title);
    } else {
      for (const p of await getProjects(cohortId)) titles.set(p.id, p.title);
    }
    csv = toCsv([
      ["시각(KST)", "작품", "구분", "평가자", "평가자 ID", "완성도", "창의성", "평균", "코멘트"],
      ...history.map((h) => [
        kst(h.createdAt),
        titles.get(h.projectId) ?? h.projectId,
        h.raterType === "judge" ? "심사위원" : "동료",
        h.raterName,
        h.raterId,
        h.completeness,
        h.creativity,
        ((h.completeness + h.creativity) / 2).toFixed(1),
        h.comment,
      ]),
    ]);
    name = `history-${projectId ?? cohortId}`;
  } else {
    return new NextResponse("projectId 또는 cohortId 가 필요합니다", { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      // 섹션 링크 주소에 한글이 있을 수 있어 filename* 로 인코딩
      "content-disposition": `attachment; filename="scores.csv"; filename*=UTF-8''${encodeURIComponent(name)}.csv`,
      "cache-control": "no-store",
    },
  });
}
