// 순위 산정: 교육생 채점 평균 기준. 전체 채점을 한 번 조회해 계산한다.
// 채점 인원이 minRaters 미만인 작품은 순위에서 빠진다 (rank=null, 인원·평균은 그대로 둠).

import "server-only";
import type { Project } from "./types";
import { allScoreRows, aggregateRows } from "./scores-store";

export async function rankProjects(projects: Project[], minRaters = 1): Promise<Project[]> {
  const agg = aggregateRows(await allScoreRows());

  const withAgg = projects.map((p) => {
    const a = agg.get(p.id);
    return { ...p, avgScore: a ? a.avg : null, raterCount: a ? a.count : 0 };
  });

  // 채점된 프로젝트만 순위 부여. 동점 시 채점자 수 → 창의성 순.
  const scored = withAgg
    .filter((p) => p.avgScore !== null && p.raterCount >= minRaters)
    .sort((a, b) => {
      if (b.avgScore! !== a.avgScore!) return b.avgScore! - a.avgScore!;
      if (b.raterCount !== a.raterCount) return b.raterCount - a.raterCount;
      return b.aiReview.scoreCreativity - a.aiReview.scoreCreativity;
    });

  const rankMap = new Map<string, number>();
  scored.forEach((p, i) => rankMap.set(p.id, i + 1));

  return withAgg.map((p) => ({ ...p, rank: rankMap.get(p.id) ?? null }));
}
