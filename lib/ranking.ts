// 순위 산정: 해커톤식 종합 점수 (100점 만점)
//   동료평가 평균(1~10) → 70점 + 심사위원 평균(1~10) → 20점 + AI 평가(1~5) → 10점
// 평가가 없는 항목은 0점으로 계산한다. 전체 채점을 한 번 조회해 계산한다.
// 동료평가 인원이 minRaters 미만인 작품은 순위에서 빠진다 (rank=null, 점수는 그대로 둠).

import "server-only";
import type { Project, ScoreBreakdown } from "./types";
import { allScoreRows, aggregateRows } from "./scores-store";
import { allJudgeScoreRows } from "./judge-scores-store";
import { AI_SCORE_MAX, SCORE_MAX, WEIGHTS, toPoints } from "./scoring";

export async function rankProjects(projects: Project[], minRaters = 1): Promise<Project[]> {
  const [peerRows, judgeRows] = await Promise.all([allScoreRows(), allJudgeScoreRows()]);
  const peer = aggregateRows(peerRows);
  const judge = aggregateRows(judgeRows);

  const withAgg = projects.map((p) => {
    const pa = peer.get(p.id);
    const ja = judge.get(p.id);
    const aiAvg = (p.aiReview.scoreCompleteness + p.aiReview.scoreCreativity) / 2;
    const breakdown: ScoreBreakdown = {
      peerAvg: pa ? pa.avg : null,
      judgeAvg: ja ? ja.avg : null,
      judgeCount: ja ? ja.count : 0,
      aiAvg,
      peerPoints: toPoints(pa ? pa.avg : null, SCORE_MAX, WEIGHTS.peer),
      judgePoints: toPoints(ja ? ja.avg : null, SCORE_MAX, WEIGHTS.judge),
      aiPoints: toPoints(aiAvg, AI_SCORE_MAX, WEIGHTS.ai),
    };
    const total = breakdown.peerPoints + breakdown.judgePoints + breakdown.aiPoints;
    return {
      ...p,
      breakdown,
      totalScore: pa || ja ? total : null,
      raterCount: pa ? pa.count : 0,
    };
  });

  // 동점 시 동료평가 → 심사위원 → AI 창의성 순.
  const scored = withAgg
    .filter((p) => p.totalScore !== null && p.raterCount >= minRaters)
    .sort((a, b) => {
      if (b.totalScore! !== a.totalScore!) return b.totalScore! - a.totalScore!;
      if (b.breakdown.peerPoints !== a.breakdown.peerPoints)
        return b.breakdown.peerPoints - a.breakdown.peerPoints;
      if (b.breakdown.judgePoints !== a.breakdown.judgePoints)
        return b.breakdown.judgePoints - a.breakdown.judgePoints;
      return b.aiReview.scoreCreativity - a.aiReview.scoreCreativity;
    });

  const rankMap = new Map<string, number>();
  scored.forEach((p, i) => rankMap.set(p.id, i + 1));

  return withAgg.map((p) => ({ ...p, rank: rankMap.get(p.id) ?? null }));
}
