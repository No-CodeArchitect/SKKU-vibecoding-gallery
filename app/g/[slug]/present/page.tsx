import { notFound, redirect } from "next/navigation";
import { getProjects } from "@/lib/projects-data";
import { getCohortBySlug } from "@/lib/cohorts-store";
import { rankProjects } from "@/lib/ranking";
import { isAdmin } from "@/lib/admin-session";
import { getWeights } from "@/lib/weights-store";
import ResultsCeremony, { type CeremonyEntry } from "@/components/ResultsCeremony";

export const dynamic = "force-dynamic";

// 결과 발표 화면 (관리자 전용). 동료·심사위원·AI 종합 점수(관리자 배점)로 3위 → 2위 → 1위 순서로 발표한다.
export default async function SectionPresentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { slug } = await params;
  const cohort = await getCohortBySlug(slug);
  if (!cohort) notFound();

  const all = await rankProjects(await getProjects(cohort.id), cohort.minRaters);
  const entries: CeremonyEntry[] = all
    .filter((p) => p.rank !== null && p.totalScore !== null && p.breakdown)
    .sort((a, b) => a.rank! - b.rank!)
    .map((p) => ({
      id: p.id,
      rank: p.rank!,
      title: p.title,
      tagline: p.tagline,
      authorName: p.authorName,
      imageUrl: p.signatureImageUrl,
      total: p.totalScore!,
      raterCount: p.raterCount,
      breakdown: p.breakdown!,
    }));

  return (
    <ResultsCeremony
      cohortId={cohort.id}
      cohortName={cohort.name}
      slug={slug}
      rankRevealed={cohort.rankRevealed}
      scoringOpen={cohort.scoringOpen}
      entries={entries}
      unrankedCount={all.length - entries.length}
      minRaters={cohort.minRaters}
      weights={await getWeights()}
    />
  );
}
