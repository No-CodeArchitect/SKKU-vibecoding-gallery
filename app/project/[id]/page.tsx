import Link from "next/link";
import { notFound } from "next/navigation";
import ScoreWidget from "@/components/ScoreWidget";
import CommentList from "@/components/CommentList";
import CommentForm from "@/components/CommentForm";
import { getProjectById, getProjects } from "@/lib/projects-data";
import { getStudent } from "@/lib/session";
import { getScore } from "@/lib/scores-store";
import { listComments } from "@/lib/comments-store";
import { getCohortById } from "@/lib/cohorts-store";
import { rankProjects } from "@/lib/ranking";
import { getWeights } from "@/lib/weights-store";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stars({ value }: { value: number }) {
  return (
    <span className="text-gold">
      {"★".repeat(value)}
      <span className="text-white/20">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function Hero({
  title,
  failed,
  imageUrl,
  liveUrl,
}: {
  title: string;
  failed: boolean;
  imageUrl: string | null;
  liveUrl: string;
}) {
  if (!failed && imageUrl) {
    return (
      <a
        href={liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-2xl ring-1 ring-white/10 transition hover:ring-gold/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`${title} 썸네일`} className="aspect-[16/10] w-full object-cover object-top" />
      </a>
    );
  }
  const initial = title.trim().charAt(0);
  return (
    <div className="flex aspect-[16/8] w-full items-center justify-center rounded-2xl bg-white/[0.05] ring-1 ring-white/10">
      <span className="text-6xl font-black text-white/25">{initial}</span>
      {failed && (
        <span className="sr-only">썸네일 없음 · 플레이스홀더</span>
      )}
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const cohort = await getCohortById(project.cohortId);
  const slug = cohort?.slug ?? "";
  const rankRevealed = cohort?.rankRevealed ?? false;
  const scoringOpen = cohort?.scoringOpen ?? false;
  // 채점 진행 중에는 AI 점수·심사평을 숨긴다 (참가자 채점에 영향 주지 않도록)
  const hideAi = scoringOpen && !rankRevealed;

  // 이 섹션에서 수락된 참가자만 채점/댓글 (섹션 간 분리)
  const student = cohort ? await getStudent(cohort.id) : null;

  const isMine = student ? project.authorId === student.id : false;
  const existing = student ? await getScore(project.id, student.id) : null;
  const comments = await listComments(project.id);
  const failed =
    project.status === "capture_failed" || !project.signatureImageUrl;

  let rank: number | null = null;
  let ranked: Project | undefined;
  if (rankRevealed) {
    ranked = (await rankProjects(await getProjects(project.cohortId), cohort?.minRaters)).find(
      (p) => p.id === project.id
    );
    rank = ranked?.rank ?? null;
  }
  const b = ranked?.breakdown;
  const WEIGHTS = await getWeights();

  return (
    <main className="min-h-screen bg-night text-white">
      <div className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href={slug ? `/g/${slug}` : "/"}
            className="text-sm font-semibold text-white/50 hover:text-gold"
          >
            ← 갤러리로
          </Link>
          <span className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
            {cohort?.name ?? ""}
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Hero
            title={project.title}
            failed={failed}
            imageUrl={project.signatureImageUrl}
            liveUrl={project.liveUrl}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {rankRevealed && rank !== null && (
                <span className="inline-flex items-center rounded-full bg-gold/20 px-2.5 py-0.5 text-sm font-bold text-gold">
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : ""}{" "}
                  {rank}위
                </span>
              )}
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {project.title}
              </h1>
              {isMine && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">
                  내 작품
                </span>
              )}
            </div>
            {rankRevealed && b && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-gold/15 px-3 py-1.5 text-sm">
                <span className="font-bold text-gold">
                  종합 {ranked?.totalScore != null ? ranked.totalScore.toFixed(1) : "-"} / 100
                </span>
                <span className="text-white/50">
                  · 동료 {b.peerPoints.toFixed(1)}/{WEIGHTS.peer} ({ranked?.raterCount ?? 0}명) · 심사위원{" "}
                  {b.judgePoints.toFixed(1)}/{WEIGHTS.judge} ({b.judgeCount}명) · AI {b.aiPoints.toFixed(1)}/{WEIGHTS.ai}
                </span>
                {rank === null && (
                  <span className="text-white/40">
                    · 동료평가 최소 {cohort?.minRaters}명 미달로 순위 제외
                  </span>
                )}
              </div>
            )}
            <p className="mt-1 text-base text-white/50">{project.tagline}</p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="font-semibold text-white">
                {project.authorName}
              </span>
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gold hover:text-gold-soft"
              >
                사이트 열기 ↗
              </a>
            </div>
          </div>

          <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
            <h2 className="text-sm font-bold text-white">AI 요약</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {project.aiSummary}
            </p>
            <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-white/40">
              주요 특징
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {project.features.map((f) => (
                <li
                  key={f}
                  className="rounded-full bg-gold/15 px-3 py-1 text-sm font-medium text-gold"
                >
                  {f}
                </li>
              ))}
            </ul>
            {project.details?.highlights && (
              <p className="mt-4 text-sm text-white/50">
                <span className="font-semibold text-white/70">하이라이트 · </span>
                {project.details.highlights}
              </p>
            )}
          </section>

          {project.details && (
            <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
              <h2 className="text-sm font-bold text-white">제작자 설명</h2>
              <dl className="mt-3 flex flex-col gap-4 text-sm">
                {(
                  [
                    ["해결하려는 문제", project.details.problem],
                    ["활용 시나리오", project.details.militaryUseCase],
                    ["사용한 도구·기술", project.details.techStack],
                    ["제작 후기", project.details.notes],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-bold uppercase tracking-wide text-white/40">{k}</dt>
                      <dd className="mt-1 whitespace-pre-line leading-relaxed text-white/70">{v}</dd>
                    </div>
                  ))}
                {project.repoUrl && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-white/40">소스코드</dt>
                    <dd className="mt-1">
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-gold hover:text-gold-soft"
                      >
                        {project.repoUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">AI 심사평</h2>
              <span className="text-xs text-white/40">종합 점수의 {WEIGHTS.ai}% 반영</span>
            </div>
            {hideAi ? (
              <p className="mt-3 rounded-lg bg-white/5 px-3 py-3 text-sm text-white/50">
                공정한 채점을 위해 AI 점수와 심사평은 채점이 마감된 뒤 공개됩니다.
              </p>
            ) : (
            <>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-white/50">완성도</span>
                <Stars value={project.aiReview.scoreCompleteness} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/50">창의성</span>
                <Stars value={project.aiReview.scoreCreativity} />
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-white/5 px-3 py-3 text-sm leading-relaxed text-white/60">
              {project.aiReview.rationale}
            </p>
            </>
            )}
          </section>

          <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">댓글</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60">
                {comments.length}
              </span>
            </div>
            <div className="mb-5">
              {student ? (
                <CommentForm projectId={project.id} isAuthor={isMine} />
              ) : (
                <Link
                  href={slug ? `/g/${slug}/join` : "/"}
                  className="block rounded-xl border border-white/15 bg-coal-soft px-4 py-3 text-center text-sm font-semibold text-gold transition hover:bg-white/5"
                >
                  이 섹션 참가자로 로그인하면 댓글을 남길 수 있어요
                </Link>
              )}
            </div>
            <CommentList comments={comments} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <ScoreWidget
            projectId={project.id}
            isLoggedIn={!!student}
            loginHref={slug ? `/g/${slug}/join` : "/me"}
            isMine={isMine}
            isScoringOpen={scoringOpen}
            existing={
              existing
                ? {
                    completeness: existing.completeness,
                    creativity: existing.creativity,
                  }
                : null
            }
          />
        </aside>
      </div>
    </main>
  );
}
