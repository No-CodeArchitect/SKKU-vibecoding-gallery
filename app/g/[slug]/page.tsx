import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectCard from "@/components/ProjectCard";
import { getProjects, getRecordByAuthor } from "@/lib/projects-data";
import EduBanner from "@/components/site/EduBanner";
import { getStudent } from "@/lib/session";
import { getMember } from "@/lib/member-session";
import { getMembership } from "@/lib/memberships-store";
import { logout } from "@/lib/auth-actions";
import { scoredProjectIds } from "@/lib/scores-store";
import { getCohortBySlug } from "@/lib/cohorts-store";
import { rankProjects } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default async function SectionGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cohort = await getCohortBySlug(slug);
  if (!cohort) notFound();

  // 이 섹션에서 수락된 교육생만 "로그인 상태"로 인정 (섹션 간 분리)
  const student = await getStudent(cohort.id);
  const member = student ? null : await getMember();
  const pendingJoin =
    member && (await getMembership(cohort.id, member.sub))?.status === "pending";

  const scoredIds = student
    ? await scoredProjectIds(student.id)
    : new Set<string>();

  const all = await getProjects(cohort.id);
  const base = cohort.rankRevealed ? await rankProjects(all, cohort.minRaters) : all;
  const myRecord = student ? await getRecordByAuthor(student.id) : null;
  const canSubmit = cohort.scoringOpen && !cohort.rankRevealed;

  const viewProjects = base.map((p) => {
    const isMine = student ? p.authorId === student.id : false;
    const hasScored = !!student && !isMine && scoredIds.has(p.id);
    return {
      ...p,
      isMine,
      isNew: isMine || hasScored ? false : p.isNew,
      hasScored,
    };
  });

  const projects = viewProjects.sort((a, b) => {
    if (cohort.rankRevealed) {
      const ar = a.rank ?? Infinity;
      const br = b.rank ?? Infinity;
      if (ar !== br) return ar - br;
    }
    return (
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  });

  const newCount = projects.filter((p) => p.isNew).length;
  const scoredCount = projects.filter((p) => p.hasScored).length;
  const total = projects.length;
  const scorable = projects.filter((p) => !p.isMine).length; // 내 작품은 채점 대상이 아님
  const hideAiScores = cohort.scoringOpen && !cohort.rankRevealed;

  return (
    <main className="min-h-screen bg-night text-white">
      <header className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Link
            href="/"
            className="text-xs font-semibold text-white/40 hover:text-gold"
          >
            ← 홈으로
          </Link>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                  {cohort.name}
                </span>
                {cohort.rankRevealed ? (
                  <span className="text-xs font-bold text-gold">🏆 순위 공개</span>
                ) : (
                  <span className="text-xs font-medium text-white/40">
                    {cohort.scoringOpen
                      ? "채점 진행 중 · 순위 비공개"
                      : "채점 마감 · 순위 집계 중"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                포트폴리오 갤러리
              </h1>
              <p className="text-sm text-white/50">
                교육생들이 만든 프로젝트를 둘러보고, 완성도와 창의성을 채점하고,
                댓글을 남겨보세요.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {cohort.rankRevealed && (
                <Link
                  href={`/g/${slug}/present`}
                  className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night transition hover:bg-gold-soft"
                >
                  발표 화면
                </Link>
              )}
              {student ? (
                <>
                  <span className="hidden text-sm text-white/60 sm:inline">
                    <span className="font-semibold text-white">
                      {student.name}
                    </span>
                    <span className="text-white/40"> 님</span>
                  </span>
                  <Link
                    href={`/g/${slug}/submit`}
                    className="rounded-lg border border-gold/60 px-3 py-1.5 text-xs font-bold text-gold transition hover:bg-gold hover:text-night"
                  >
                    {myRecord ? "내 작품" : "작품 등록"}
                  </Link>
                  <form action={logout}>
                    <input type="hidden" name="next" value={`/g/${slug}`} />
                    <button className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10">
                      로그아웃
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href={`/g/${slug}/join`}
                  className="rounded-full border border-gold/60 px-4 py-1.5 text-xs font-bold text-gold transition hover:bg-gold hover:text-night"
                >
                  {pendingJoin ? "가입 수락 대기 중" : member ? "이 섹션 가입 신청" : "로그인하고 참여하기"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <Stat label="전체 프로젝트" value={`${total}개`} />
          <Stat label="NEW" value={`${newCount}개`} accent />
          {student && (
            <Stat label="내가 채점함" value={`${scoredCount} / ${scorable}`} />
          )}
        </div>
      </div>

      {/* 내 작품 등록 상태 */}
      {student && (!myRecord || !myRecord.ai || myRecord.needsAnalysis) && (
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold/10 px-4 py-3 ring-1 ring-gold/30">
            <p className="text-sm text-white/80">
              {!myRecord
                ? canSubmit
                  ? "아직 내 작품을 등록하지 않았습니다. 썸네일과 배포 주소·설명을 남기면 AI가 카드로 만들어 줍니다."
                  : "작품 등록이 마감되었습니다."
                : !myRecord.ai
                  ? "내 작품이 접수되어 AI가 분석 중입니다. 보통 1분 안에 갤러리에 공개됩니다."
                  : "제목·소개·썸네일은 바로 바뀌고, AI 요약은 다음 분석 때 새로 만들어집니다."}
            </p>
            {(myRecord || canSubmit) && (
              <Link
                href={`/g/${slug}/submit`}
                className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-night transition hover:bg-gold-soft"
              >
                {myRecord ? "내 작품 보기·수정" : "작품 등록하기 →"}
              </Link>
            )}
          </div>
        </div>
      )}

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {projects.length === 0 ? (
          <p className="rounded-2xl bg-coal px-6 py-16 text-center text-sm text-white/40 ring-1 ring-white/10">
            아직 공개된 작품이 없습니다. 교육생이 작품을 등록하고 관리자가 분석을
            실행하면 여기에 카드로 표시됩니다.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                hideAiScores={hideAiScores}
                minRaters={cohort.rankRevealed ? cohort.minRaters : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <EduBanner compact />
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-2 ring-1 ${
        accent ? "bg-gold/10 ring-gold/30" : "bg-coal ring-white/10"
      }`}
    >
      <div className="text-xs text-white/50">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-gold" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
